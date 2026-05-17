import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, updateDoc, doc, deleteDoc, addDoc, onSnapshot } from 'firebase/firestore';
import { MediaCard } from '../components/MediaCard';
import { MediaModal } from '../components/MediaModal';
import { useToast } from '../context/toast';
import type { MediaItem, MediaCategory } from '../types';
import { Search, X } from 'lucide-react';

const categoryMap: Record<string, MediaCategory> = {
  'tv': 'TV Shows',
  'anime-jp': 'Japanese Anime',
  'anime-cn': 'Chinese Anime',
  'manga': 'Manga'
};

const sortItems = (mediaItems: MediaItem[]) => {
  return [...mediaItems].sort((a, b) => {
    if (a.status === 'Watching' && b.status !== 'Watching') return -1;
    if (a.status !== 'Watching' && b.status === 'Watching') return 1;
    return a.title.localeCompare(b.title);
  });
};

export function CategoryView() {
  const { id } = useParams();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const { showToast } = useToast();

  const categoryName = categoryMap[id || 'tv'] ?? 'TV Shows';

  useEffect(() => {
    if (!auth.currentUser) {
      return;
    }

    const q = query(
      collection(db, 'users', auth.currentUser.uid, 'media'),
      where('category', '==', categoryName)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedItems: MediaItem[] = [];
      querySnapshot.forEach((docSnapshot) => {
        fetchedItems.push({ id: docSnapshot.id, ...docSnapshot.data() } as MediaItem);
      });

      setItems(sortItems(fetchedItems));
      setLoading(false);
    }, (error) => {
      console.error('Error subscribing to items:', error);
      showToast('Could not load this list in realtime.', 'error');
      setLoading(false);
    });

    return unsubscribe;
  }, [categoryName, showToast]);

  const handleIncrement = async (itemId: string) => {
    if (!auth.currentUser) return;
    const previousItems = items;
    const itemToUpdate = items.find(i => i.id === itemId);
    if (!itemToUpdate) return;

    const newEpisode = (itemToUpdate.episode || 0) + 1;
    setItems(currentItems => currentItems.map(i => i.id === itemId ? { ...i, episode: newEpisode, updatedAt: Date.now() } : i));

    try {
      const docRef = doc(db, 'users', auth.currentUser.uid, 'media', itemId);
      await updateDoc(docRef, { episode: newEpisode, updatedAt: Date.now() });
      showToast(`Progress updated for ${itemToUpdate.title}.`, 'success');
    } catch (error) {
      console.error('Error updating progress', error);
      setItems(previousItems);
      showToast('Could not update progress. Reverted the change.', 'error');
    }
  };
  
  const handleDelete = async (itemId: string) => {
    if (!auth.currentUser) return;
    if (!confirm('Are you sure you want to permanently delete this show?')) return;

    const previousItems = items;
    const itemToDelete = items.find(i => i.id === itemId);
    setItems(currentItems => currentItems.filter(i => i.id !== itemId));
    
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'media', itemId));
      showToast(`${itemToDelete?.title || 'Item'} deleted.`, 'success');
    } catch (err) {
      console.error('Error deleting', err);
      setItems(previousItems);
      showToast('Could not delete this item. Reverted the change.', 'error');
    }
  };
  
  const handleSaveModal = async (savedData: Partial<MediaItem>) => {
     if (!auth.currentUser) return;
     const previousItems = items;
     const { id: savedId, ...dataToSave } = savedData;

     try {
       if (savedId) {
         const updatedItem = { ...items.find(i => i.id === savedId), ...savedData } as MediaItem;
         setItems(currentItems => sortItems(currentItems.map(i => i.id === savedId ? updatedItem : i)));

         const docRef = doc(db, 'users', auth.currentUser.uid, 'media', savedId);
         await updateDoc(docRef, dataToSave);
         showToast(`${savedData.title} updated.`, 'success');
       } else {
         const optimisticId = `pending-${Date.now()}`;
         const optimisticItem = { ...savedData, id: optimisticId } as MediaItem;
         setItems(currentItems => sortItems([optimisticItem, ...currentItems]));

         const colRef = collection(db, 'users', auth.currentUser.uid, 'media');
         const newDoc = await addDoc(colRef, dataToSave);
         setItems(currentItems => sortItems(currentItems.map(i => i.id === optimisticId ? { ...optimisticItem, id: newDoc.id } : i)));
         showToast(`${savedData.title} added.`, 'success');
       }
     } catch (err) {
       console.error('Error saving data', err);
       setItems(previousItems);
       showToast('Could not save this item. Reverted the change.', 'error');
       throw err;
     }
  };

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const searchResults = normalizedSearchQuery
    ? items.filter(item => {
      const searchableText = [
        item.title,
        item.alternateTitle,
        item.status,
        item.trackingType,
        item.trackingType === 'season' ? `season ${item.season} episode ${item.episode}` : `episode ${item.episode}`
      ].join(' ').toLowerCase();

      return searchableText.includes(normalizedSearchQuery);
    })
    : [];

  const handleSearchResultClick = (itemId: string) => {
    const element = document.getElementById(`media-item-${itemId}`);

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedItemId(itemId);
      window.setTimeout(() => setHighlightedItemId(currentId => currentId === itemId ? null : currentId), 1800);
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

      <div className="category-search">
        <div className="search-control">
          <Search size={18} />
          <input
            type="search"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder={`Search ${categoryName}...`}
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </div>

        {normalizedSearchQuery && (
          <div className="category-search-results">
            {searchResults.length > 0 ? (
              searchResults.slice(0, 8).map(item => (
                <button key={item.id} onClick={() => handleSearchResultClick(item.id)}>
                  <strong>{item.title}</strong>
                  <span>{item.status}</span>
                  <span>
                    {item.status === 'Completed'
                      ? 'Completed'
                      : item.trackingType === 'season'
                        ? `S${item.season ?? 1} E${item.episode ?? 1}`
                        : `Ep ${item.episode ?? 1}`}
                  </span>
                </button>
              ))
            ) : (
              <p>No matches in this category.</p>
            )}
          </div>
        )}
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
              isHighlighted={highlightedItemId === item.id}
              onIncrement={handleIncrement} 
              onEdit={(item) => { setEditingItem(item); setIsModalOpen(true); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
      
      {isModalOpen && (
        <MediaModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveModal}
          item={editingItem}
          defaultCategory={categoryName}
        />
      )}
    </div>
  );
}
