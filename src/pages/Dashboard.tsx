import { useEffect, useMemo, useState } from 'react';
import { auth, db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { useToast } from '../context/toast';
import type { MediaItem, MediaStatus } from '../types';
import { Download, Layers, ListChecks, PlayCircle, CheckCircle2, Clock3 } from 'lucide-react';
import { getStatusLabel } from '../utils/statusLabels';

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
  const [exporting, setExporting] = useState(false);
  const [libraryItems, setLibraryItems] = useState<MediaItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    if (!auth.currentUser) {
      return;
    }

    const userRef = collection(db, 'users', auth.currentUser.uid, 'media');
    const unsubscribe = onSnapshot(userRef, (librarySnapshot) => {
      const fetchedItems = librarySnapshot.docs.map(documentSnapshot => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data()
      })) as MediaItem[];

      setLibraryItems(sortLibraryItems(fetchedItems));
      setLibraryLoading(false);
    }, (error) => {
      console.error(error);
      showToast('Could not load your library.', 'error');
      setLibraryLoading(false);
    });

    return unsubscribe;
  }, [showToast]);

  const libraryStats = useMemo(() => {
    const statusCounts: Record<MediaStatus, number> = {
      Watching: 0,
      Completed: 0,
      'Plan to Watch': 0,
      Dropped: 0
    };

    libraryItems.forEach(item => {
      statusCounts[item.status] += 1;
    });

    return {
      total: libraryItems.length,
      categories: new Set(libraryItems.map(item => item.category)).size,
      statusCounts,
      recentlyUpdated: [...libraryItems]
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
        .slice(0, 6)
    };
  }, [libraryItems]);

  const handleExportLibrary = async () => {
    setExporting(true);

    try {
      if (libraryItems.length === 0) {
        showToast('No shows found to export.', 'info');
        return;
      }

      const exportText = formatLibraryExport(libraryItems);
      const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const dateLabel = new Date().toISOString().slice(0, 10);

      anchor.href = url;
      anchor.download = `mediatracker-export-${dateLabel}.txt`;
      anchor.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${libraryItems.length} shows.`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Could not export your library.', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p style={{color: 'var(--text-secondary)'}}>Welcome back! {auth.currentUser?.email}</p>
      </div>

      <section className="dashboard-overview">
        <div className="stat-card">
          <Layers size={20} />
          <span>Total Items</span>
          <strong>{libraryStats.total}</strong>
        </div>
        <div className="stat-card">
          <PlayCircle size={20} />
          <span>Watching</span>
          <strong>{libraryStats.statusCounts.Watching}</strong>
        </div>
        <div className="stat-card">
          <CheckCircle2 size={20} />
          <span>Completed</span>
          <strong>{libraryStats.statusCounts.Completed}</strong>
        </div>
        <div className="stat-card">
          <Clock3 size={20} />
          <span>{getStatusLabel('Plan to Watch')}</span>
          <strong>{libraryStats.statusCounts['Plan to Watch']}</strong>
        </div>
        <div className="stat-card">
          <ListChecks size={20} />
          <span>Categories</span>
          <strong>{libraryStats.categories}</strong>
        </div>
      </section>

      <section className="dashboard-panel">
        <div className="tool-card-header">
          <div>
            <h3>Recently Updated</h3>
            <p>Your latest progress changes across every category.</p>
          </div>
        </div>

        {libraryLoading ? (
          <p className="tool-muted">Loading your library...</p>
        ) : libraryStats.recentlyUpdated.length > 0 ? (
          <div className="recent-list">
            {libraryStats.recentlyUpdated.map(item => (
              <div className="recent-item" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.category}</span>
                </div>
                <span>
                  {item.status === 'Completed'
                    ? 'Completed'
                    : item.trackingType === 'season'
                      ? `S${item.season ?? 1} E${item.episode ?? 1}`
                      : `Ep ${item.episode ?? 1}`}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="tool-muted">No media items yet.</p>
        )}
      </section>
      
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
