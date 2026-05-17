import { useState } from 'react';
import { auth, db } from '../firebase';
import { collection, writeBatch, doc, getDocs } from 'firebase/firestore';
import initialData from '../data/initialData.json';

export function Dashboard() {
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  const handleImport = async () => {
    if (!auth.currentUser) return;
    setImporting(true);
    setImportStatus('Checking for duplicates...');
    
    try {
      const userRef = collection(db, 'users', auth.currentUser.uid, 'media');
      
      const existingDocs = await getDocs(userRef);
      const existingTitles = new Set();
      existingDocs.forEach(d => existingTitles.add(d.data().title.toLowerCase()));
      
      const newItems = initialData.filter(item => !existingTitles.has(item.title.toLowerCase()));
      
      if (newItems.length === 0) {
        setImportStatus('All shows are already in your database! No new items to import.');
        setImporting(false);
        return;
      }
      
      setImportStatus(`Importing ${newItems.length} new items...`);
      
      const batch = writeBatch(db);
      newItems.forEach((item) => {
        const newDocRef = doc(userRef);
        batch.set(newDocRef, item);
      });
      
      await batch.commit();
      setImportStatus(`Successfully imported ${newItems.length} items!`);
    } catch (error) {
      console.error(error);
      setImportStatus('Error importing data.');
    }
    setImporting(false);
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
          Click the button below to import shows from your text file into your database. 
          It will safely skip any shows that you already have, so you don't have to worry about duplicates!
        </p>
        <button className="btn-primary" onClick={handleImport} disabled={importing}>
          {importing ? 'Importing...' : 'Import Data from Text File'}
        </button>
        
        {importStatus && (
          <p style={{ marginTop: '1rem', color: 'var(--accent-green)', fontWeight: 500 }}>
            {importStatus}
          </p>
        )}
      </div>
    </div>
  );
}
