import { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { collection, writeBatch, doc, getDocs, getDoc, setDoc } from 'firebase/firestore';
import initialData from '../data/initialData.json';
import { useToast } from '../context/toast';
import type { MediaItem } from '../types';
import { Download } from 'lucide-react';

type ImportItem = Omit<MediaItem, 'id'>;

interface ImportPreview {
  newItems: ImportItem[];
  duplicateCount: number;
  existingCount: number;
}

const seedItems = initialData as ImportItem[];

const sortLibraryItems = (items: MediaItem[]) => {
  return [...items].sort((a, b) => {
    const categoryCompare = a.category.localeCompare(b.category);
    if (categoryCompare !== 0) return categoryCompare;
    return a.title.localeCompare(b.title);
  });
};

const getProgressText = (item: MediaItem) => {
  if (item.status === 'Completed') return 'Completed';
  if (item.trackingType === 'season') return `Season ${item.season ?? 1}, Episode ${item.episode ?? 1}`;
  return `Episode/Chapter ${item.episode ?? 1}`;
};

const formatLibraryExport = (items: MediaItem[]) => {
  const lines = [
    'MediaTracker Export',
    `Exported: ${new Date().toLocaleString()}`,
    `Total items: ${items.length}`,
    ''
  ];

  const categories = Array.from(new Set(items.map(item => item.category)));
  categories.forEach(category => {
    lines.push(category);
    lines.push('='.repeat(category.length));

    items.filter(item => item.category === category).forEach(item => {
      lines.push(`Title: ${item.title}`);
      if (item.alternateTitle) lines.push(`Alternate Title: ${item.alternateTitle}`);
      lines.push(`Status: ${item.status}`);
      lines.push(`Progress: ${getProgressText(item)}`);
      lines.push(`Tracking: ${item.trackingType}`);
      lines.push(`Last Updated: ${item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'Unknown'}`);
      lines.push('');
    });
  });

  return lines.join('\n');
};

export function Dashboard() {
  const [importing, setImporting] = useState(false);
  const [checkingImport, setCheckingImport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [libraryItems, setLibraryItems] = useState<MediaItem[]>([]);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importLocked, setImportLocked] = useState(false);
  const [importLockChecked, setImportLockChecked] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const checkImportLock = async () => {
      if (!auth.currentUser) return;

      try {
        const importRef = doc(db, 'users', auth.currentUser.uid, 'settings', 'seedImport');
        const importDoc = await getDoc(importRef);
        const isLocked = importDoc.exists() && importDoc.data().completed === true;

        setImportLocked(isLocked);
        setImportStatus(isLocked ? 'Seed import is complete. Your Firestore library is now the source of truth.' : '');
      } catch (error) {
        console.error(error);
        showToast('Could not check import status.', 'error');
      } finally {
        setImportLockChecked(true);
      }
    };

    checkImportLock();
  }, [showToast]);

  const loadLibraryItems = async () => {
    if (!auth.currentUser) return [];

    setLibraryLoading(true);

    try {
      const userRef = collection(db, 'users', auth.currentUser.uid, 'media');
      const librarySnapshot = await getDocs(userRef);
      const fetchedItems = librarySnapshot.docs.map(documentSnapshot => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data()
      })) as MediaItem[];
      const sortedItems = sortLibraryItems(fetchedItems);

      setLibraryItems(sortedItems);
      setLibraryLoaded(true);
      return sortedItems;
    } catch (error) {
      console.error(error);
      showToast('Could not load your library.', 'error');
      return [];
    } finally {
      setLibraryLoading(false);
    }
  };

  const handleExportLibrary = async () => {
    setExporting(true);

    try {
      const items = libraryLoaded ? libraryItems : await loadLibraryItems();
      if (items.length === 0) {
        showToast('No shows found to export.', 'info');
        return;
      }

      const exportText = formatLibraryExport(items);
      const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const dateLabel = new Date().toISOString().slice(0, 10);

      anchor.href = url;
      anchor.download = `mediatracker-export-${dateLabel}.txt`;
      anchor.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${items.length} shows.`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Could not export your library.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const lockSeedImport = async (importedCount: number, skippedCount: number) => {
    if (!auth.currentUser) return;

    const importRef = doc(db, 'users', auth.currentUser.uid, 'settings', 'seedImport');
    await setDoc(importRef, {
      completed: true,
      completedAt: Date.now(),
      importedCount,
      skippedCount,
      seedCount: seedItems.length
    });
    setImportLocked(true);
    setImportPreview(null);
    setImportStatus('Seed import is complete. Your Firestore library is now the source of truth.');
  };

  const markImportComplete = async () => {
    setImporting(true);

    try {
      await lockSeedImport(0, seedItems.length);
      showToast('Import locked. Existing library is now the source of truth.', 'success');
    } catch (error) {
      console.error(error);
      showToast('Could not lock the import.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const getImportPreview = async () => {
    if (!auth.currentUser) return;
    if (importLocked) {
      showToast('Seed import is already complete.', 'info');
      return;
    }

    setCheckingImport(true);
    setImportPreview(null);
    setImportStatus('Scanning your library...');
    
    try {
      const userRef = collection(db, 'users', auth.currentUser.uid, 'media');
      
      const existingDocs = await getDocs(userRef);
      const existingTitles = new Set<string>();
      existingDocs.forEach(d => existingTitles.add(String(d.data().title).trim().toLowerCase()));
      
      const newItems = seedItems.filter(item => !existingTitles.has(item.title.trim().toLowerCase()));
      const preview = {
        newItems,
        duplicateCount: seedItems.length - newItems.length,
        existingCount: existingDocs.size
      };
      
      if (newItems.length === 0) {
        setImportStatus('All seed items are already in your database.');
        setImportPreview(preview);
        showToast('No new items to import.', 'info');
        return;
      }

      setImportPreview(preview);
      setImportStatus('');
      showToast(`Found ${newItems.length} new items ready to import.`, 'success');
    } catch (error) {
      console.error(error);
      setImportStatus('Error checking import data.');
      showToast('Could not scan import data.', 'error');
    } finally {
      setCheckingImport(false);
    }
  };

  const handleImport = async () => {
    if (!auth.currentUser || !importPreview) return;
    if (importLocked) {
      showToast('Seed import is already complete.', 'info');
      return;
    }

    setImporting(true);
    setImportStatus(`Importing ${importPreview.newItems.length} new items...`);
    
    try {
      if (importPreview.newItems.length === 0) {
        setImportStatus('No new items to import.');
        setImporting(false);
        return;
      }
      
      const userRef = collection(db, 'users', auth.currentUser.uid, 'media');
      const batch = writeBatch(db);
      importPreview.newItems.forEach((item) => {
        const newDocRef = doc(userRef);
        batch.set(newDocRef, { ...item, updatedAt: item.updatedAt || Date.now() });
      });
      
      await batch.commit();
      await lockSeedImport(importPreview.newItems.length, importPreview.duplicateCount);
      showToast(`Imported ${importPreview.newItems.length} items.`, 'success');
    } catch (error) {
      console.error(error);
      setImportStatus('Error importing data.');
      showToast('Could not import these items.', 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p style={{color: 'var(--text-secondary)'}}>Welcome back! {auth.currentUser?.email}</p>
      </div>
      
      <div className="media-card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h3>Initial Setup</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Import your starter shows once, then Firestore becomes your source of truth. 
          After the import is locked, this button cannot add the seed list again.
        </p>
        <button className="btn-primary" onClick={getImportPreview} disabled={!importLockChecked || importLocked || checkingImport || importing}>
          {importLocked ? 'Import Complete' : checkingImport ? 'Scanning...' : 'Preview Import'}
        </button>

        {importPreview && (
          <div className="import-preview">
            <div className="import-preview-stats">
              <div>
                <strong>{importPreview.newItems.length}</strong>
                <span>New</span>
              </div>
              <div>
                <strong>{importPreview.duplicateCount}</strong>
                <span>Skipped</span>
              </div>
              <div>
                <strong>{importPreview.existingCount}</strong>
                <span>Existing</span>
              </div>
            </div>

            <p className="import-preview-note">
              Once you confirm, this seed import will be locked so renamed titles and progress changes are never overwritten by the starter file.
            </p>

            {importPreview.newItems.length > 0 ? (
              <>
                <div className="import-preview-list">
                  {importPreview.newItems.slice(0, 6).map(item => (
                    <span key={`${item.category}-${item.title}`}>{item.title}</span>
                  ))}
                  {importPreview.newItems.length > 6 && <span>+ {importPreview.newItems.length - 6} more</span>}
                </div>

                <div className="import-preview-actions">
                  <button className="btn-secondary" onClick={() => setImportPreview(null)} disabled={importing}>Cancel</button>
                  <button className="btn-primary" onClick={handleImport} disabled={importing}>
                    {importing ? 'Importing...' : `Import ${importPreview.newItems.length} Items`}
                  </button>
                </div>
              </>
            ) : (
              <div className="import-preview-actions">
                <button className="btn-secondary" onClick={() => setImportPreview(null)} disabled={importing}>Cancel</button>
                <button className="btn-primary" onClick={markImportComplete} disabled={importing}>
                  {importing ? 'Locking...' : 'Mark Import Complete'}
                </button>
              </div>
            )}
          </div>
        )}
        
        {importStatus && (
          <p style={{ marginTop: '1rem', color: 'var(--accent-green)', fontWeight: 500 }}>
            {importStatus}
          </p>
        )}
      </div>

      <div className="dashboard-tools">
        <section className="media-card dashboard-tool-card">
          <div className="tool-card-header">
            <div>
              <h3>Download Backup</h3>
              <p>Export every saved show and progress value into a plain text file.</p>
            </div>
            <Download size={22} />
          </div>

          <button className="btn-primary" onClick={handleExportLibrary} disabled={exporting || libraryLoading}>
            {exporting ? 'Preparing...' : 'Download TXT'}
          </button>
        </section>
      </div>
    </div>
  );
}
