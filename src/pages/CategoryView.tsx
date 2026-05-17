import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc, addDoc } from 'firebase/firestore';
import { MediaCard } from '../components/MediaCard';
import { MediaModal } from '../components/MediaModal';
import type { MediaItem, MediaCategory } from '../types';

export function CategoryView() {
  const { id } = useParams();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);

  const categoryMap: Record<string, string> = {
    'tv': 'TV Shows',
    'anime-jp': 'Japanese Anime',
    'anime-cn': 'Chinese Anime',
    'manga': 'Manga'
  };

  const categoryName = categoryMap[id || 'tv'] as MediaCategory;

  const fetchItems = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users', auth.currentUser.uid, 'media'),
        where('category', '==', categoryName)
      );
      const querySnapshot = await getDocs(q);
      const fetchedItems: MediaItem[] = [];
      querySnapshot.forEach((doc) => {
        fetchedItems.push({ id: doc.id, ...doc.data() } as MediaItem);
      });
      
      // Sort watching first, then completed
      fetchedItems.sort((a, b) => {
        if (a.status === 'Watching' && b.status !== 'Watching') return -1;
        if (a.status !== 'Watching' && b.status === 'Watching') return 1;
        return a.title.localeCompare(b.title);
      });
      
      setItems(fetchedItems);
    } catch (error) {
      console.error("Error fetching items:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [categoryName]);

  const handleIncrement = async (itemId: string) => {
    if (!auth.currentUser) return;
    try {
      const itemToUpdate = items.find(i => i.id === itemId);
      if (!itemToUpdate) return;
      
      const newEpisode = (itemToUpdate.episode || 0) + 1;
      
      const docRef = doc(db, 'users', auth.currentUser.uid, 'media', itemId);
      await updateDoc(docRef, { episode: newEpisode });
      
      setItems(items.map(i => i.id === itemId ? { ...i, episode: newEpisode } : i));
    } catch (error) {
      console.error("Error updating progress", error);
    }
  };
  
  const handleDelete = async (itemId: string) => {
    if (!auth.currentUser) return;
    if (!confirm('Are you sure you want to permanently delete this show?')) return;
    
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'media', itemId));
      setItems(items.filter(i => i.id !== itemId));
    } catch (err) {
      console.error("Error deleting", err);
    }
  };
  
  const handleSaveModal = async (savedData: Partial<MediaItem>) => {
     if (!auth.currentUser) return;
     try {
       if (savedData.id) {
         // Update existing
         const docRef = doc(db, 'users', auth.currentUser.uid, 'media', savedData.id);
         await updateDoc(docRef, savedData as any);
         setItems(items.map(i => i.id === savedData.id ? { ...i, ...savedData } as MediaItem : i));
       } else {
         // Add new
         const colRef = collection(db, 'users', auth.currentUser.uid, 'media');
         const newDoc = await addDoc(colRef, savedData);
         setItems([{ ...savedData, id: newDoc.id } as MediaItem, ...items]);
       }
     } catch (err) {
       console.error("Error saving data", err);
     }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{categoryName}</h2>
        <button className="btn-primary" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>
          + Add New Show
        </button>
      </div>
      
      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading your list...</p>
      ) : items.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>No items found. Click "+ Add New Show" to start tracking!</p>
      ) : (
        <div className="media-list">
          {items.map(item => (
            <MediaCard 
              key={item.id} 
              item={item} 
              onIncrement={handleIncrement} 
              onEdit={(item) => { setEditingItem(item); setIsModalOpen(true); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
      
      <MediaModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        item={editingItem}
        defaultCategory={categoryName}
      />
    </div>
  );
}
