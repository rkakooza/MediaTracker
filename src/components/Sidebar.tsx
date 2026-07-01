import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail, signOut } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, onSnapshot, query, setDoc, where, writeBatch } from 'firebase/firestore';
import { Tv, PlaySquare, Sword, BookOpen, LayoutDashboard, LogOut, KeyRound, Folder, Plus, Pencil, Trash2, X, MoreHorizontal } from 'lucide-react';
import { auth, db } from '../firebase';
import { useToast } from '../context/toast';
import { getCategoryDocumentId, getCategoryRoute } from '../utils/categories';
import { normalizeMediaTitle } from '../utils/mediaTitle';
import type { MediaCategoryRecord, MediaItem } from '../types';

type CategoryEditorState =
  | { mode: 'add'; name: string }
  | { mode: 'rename'; currentName: string; name: string }
  | null;

const getCategoryIcon = (categoryName: string) => {
  switch (categoryName) {
    case 'TV Shows':
      return Tv;
    case 'Japanese Anime':
      return PlaySquare;
    case 'Chinese Anime':
      return Sword;
    case 'Manga':
      return BookOpen;
    default:
      return Folder;
  }
};

export function Sidebar() {
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [savedCategories, setSavedCategories] = useState<string[]>([]);
  const [mediaCategoryCounts, setMediaCategoryCounts] = useState<Map<string, number>>(new Map());
  const [categoryEditor, setCategoryEditor] = useState<CategoryEditorState>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [openCategoryMenu, setOpenCategoryMenu] = useState<string | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const categories = useMemo(() => {
    const categoryMap = new Map<string, string>();
    [...savedCategories, ...Array.from(mediaCategoryCounts.keys())].forEach(categoryName => {
      const trimmedName = categoryName.trim();
      if (!trimmedName) return;

      categoryMap.set(normalizeMediaTitle(trimmedName), trimmedName);
    });

    return Array.from(categoryMap.values()).sort((a, b) => a.localeCompare(b));
  }, [mediaCategoryCounts, savedCategories]);

  const categoryCountsByNormalizedName = useMemo(() => {
    const counts = new Map<string, number>();
    mediaCategoryCounts.forEach((count, categoryName) => {
      const normalizedName = normalizeMediaTitle(categoryName);
      counts.set(normalizedName, (counts.get(normalizedName) ?? 0) + count);
    });

    return counts;
  }, [mediaCategoryCounts]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const categoriesRef = collection(db, 'users', auth.currentUser.uid, 'categories');
    const unsubscribe = onSnapshot(categoriesRef, (snapshot) => {
      const fetchedCategories = snapshot.docs
        .map(documentSnapshot => ({ id: documentSnapshot.id, ...documentSnapshot.data() } as MediaCategoryRecord))
        .map(category => category.name);

      setSavedCategories(fetchedCategories);
    }, (error) => {
      console.error('Error loading categories', error);
      showToast('Could not load custom categories.', 'error');
    });

    return unsubscribe;
  }, [showToast]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const mediaRef = collection(db, 'users', auth.currentUser.uid, 'media');
    const unsubscribe = onSnapshot(mediaRef, (snapshot) => {
      const nextCounts = new Map<string, number>();
      snapshot.docs
        .map(documentSnapshot => ({ id: documentSnapshot.id, ...documentSnapshot.data() } as MediaItem))
        .forEach(item => {
          const categoryName = item.category.trim();
          if (!categoryName) return;

          nextCounts.set(categoryName, (nextCounts.get(categoryName) ?? 0) + 1);
        });

      setMediaCategoryCounts(nextCounts);
    }, (error) => {
      console.error('Error loading media categories', error);
      showToast('Could not load media categories.', 'error');
    });

    return unsubscribe;
  }, [showToast]);

  const handlePasswordReset = async () => {
    const email = auth.currentUser?.email;

    if (!email) {
      showToast('Could not find an email address for this account.', 'error');
      return;
    }

    try {
      setIsSendingReset(true);
      await sendPasswordResetEmail(auth, email);
      showToast(`Password reset email sent to ${email}.`, 'success');
    } catch (error) {
      console.error('Error sending password reset email', error);
      showToast('Could not send a password reset email. Please try again.', 'error');
    } finally {
      setIsSendingReset(false);
    }
  };

  const saveNewCategory = async (categoryName: string) => {
    if (!auth.currentUser) return;

    const trimmedName = categoryName.trim();

    if (!trimmedName) return;

    const alreadyExists = categories.some(existingCategory => normalizeMediaTitle(existingCategory) === normalizeMediaTitle(trimmedName));
    if (alreadyExists) {
      showToast(`${trimmedName} already exists.`, 'info');
      return;
    }

    try {
      const categoryRef = doc(db, 'users', auth.currentUser.uid, 'categories', getCategoryDocumentId(trimmedName));
      await setDoc(categoryRef, {
        name: trimmedName,
        createdAt: Date.now()
      });
      showToast(`${trimmedName} added.`, 'success');
      navigate(getCategoryRoute(trimmedName));
      setCategoryEditor(null);
    } catch (error) {
      console.error('Error adding category', error);
      showToast('Could not add this category.', 'error');
    }
  };

  const renameCategory = async (currentName: string, nextCategoryName: string) => {
    if (!auth.currentUser) return;

    const nextName = nextCategoryName.trim();
    if (!nextName || normalizeMediaTitle(nextName) === normalizeMediaTitle(currentName)) return;

    const alreadyExists = categories.some(existingCategory => normalizeMediaTitle(existingCategory) === normalizeMediaTitle(nextName));
    if (alreadyExists) {
      showToast(`${nextName} already exists.`, 'info');
      return;
    }

    try {
      const userId = auth.currentUser.uid;
      const mediaRef = collection(db, 'users', userId, 'media');
      const mediaQuery = query(mediaRef, where('category', '==', currentName));
      const matchingMedia = await getDocs(mediaQuery);
      const batch = writeBatch(db);

      matchingMedia.docs.forEach(mediaDoc => {
        batch.update(mediaDoc.ref, { category: nextName, updatedAt: Date.now() });
      });

      const nextCategoryRef = doc(db, 'users', userId, 'categories', getCategoryDocumentId(nextName));
      batch.set(nextCategoryRef, { name: nextName, createdAt: Date.now() });

      const currentCategoryRef = doc(db, 'users', userId, 'categories', getCategoryDocumentId(currentName));
      batch.delete(currentCategoryRef);

      await batch.commit();
      showToast(`${currentName} renamed to ${nextName}.`, 'success');
      navigate(getCategoryRoute(nextName));
      setCategoryEditor(null);
    } catch (error) {
      console.error('Error renaming category', error);
      showToast('Could not rename this category.', 'error');
    }
  };

  const handleCategoryEditorSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!categoryEditor) return;

    try {
      setIsSavingCategory(true);

      if (categoryEditor.mode === 'add') {
        await saveNewCategory(categoryEditor.name);
      } else {
        await renameCategory(categoryEditor.currentName, categoryEditor.name);
      }
    } finally {
      setIsSavingCategory(false);
    }
  };

  const deleteCategory = async (categoryName: string) => {
    if (!auth.currentUser) return;

    try {
      const userId = auth.currentUser.uid;
      const mediaRef = collection(db, 'users', userId, 'media');
      const mediaQuery = query(mediaRef, where('category', '==', categoryName));
      const matchingMedia = await getDocs(mediaQuery);

      if (!matchingMedia.empty) {
        showToast('Move or delete items in this category before deleting it.', 'error');
        return;
      }

      await deleteDoc(doc(db, 'users', userId, 'categories', getCategoryDocumentId(categoryName)));
      showToast(`${categoryName} deleted.`, 'success');
      setCategoryToDelete(null);
      setOpenCategoryMenu(null);
    } catch (error) {
      console.error('Error deleting category', error);
      showToast('Could not delete this category.', 'error');
    }
  };

  return (
    <aside className="sidebar">
      <div>
        <h1>MediaTracker</h1>
      
        <nav className="nav-links">
          <NavLink to="/" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`} end>
            <LayoutDashboard size={20} />
            Dashboard
          </NavLink>

          <div className="nav-section-label">Categories</div>
          {categories.map(categoryName => {
            const Icon = getCategoryIcon(categoryName);
            const itemCount = categoryCountsByNormalizedName.get(normalizeMediaTitle(categoryName)) ?? 0;
            const isCategoryMenuOpen = openCategoryMenu === categoryName;

            return (
              <div className="category-nav-row" key={categoryName}>
                <NavLink to={getCategoryRoute(categoryName)} className={({isActive}) => `nav-link category-nav-link ${isActive ? 'active' : ''}`}>
                  <Icon size={20} />
                  <span>{categoryName}</span>
                  <span className="category-count">{itemCount}</span>
                </NavLink>

                <div className="category-menu-wrap">
                  <button
                    className="category-action-button"
                    onClick={() => setOpenCategoryMenu(currentCategory => currentCategory === categoryName ? null : categoryName)}
                    aria-expanded={isCategoryMenuOpen}
                    aria-label={`Open actions for ${categoryName}`}
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  {isCategoryMenuOpen && (
                    <div className="category-menu">
                      <button
                        onClick={() => {
                          setCategoryEditor({ mode: 'rename', currentName: categoryName, name: categoryName });
                          setOpenCategoryMenu(null);
                        }}
                      >
                        <Pencil size={14} />
                        Rename
                      </button>
                      <button
                        className="danger-menu-item"
                        onClick={() => {
                          setCategoryToDelete(categoryName);
                          setOpenCategoryMenu(null);
                        }}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <button className="nav-link add-category-button" onClick={() => setCategoryEditor({ mode: 'add', name: '' })}>
            <Plus size={20} />
            Add Category
          </button>
        </nav>
      </div>

      <div className="sidebar-actions">
        <button className="nav-link sidebar-action-button" onClick={handlePasswordReset} disabled={isSendingReset}>
          <KeyRound size={20} />
          {isSendingReset ? 'Sending...' : 'Change Password'}
        </button>

        <button className="nav-link sidebar-action-button logout-button" onClick={() => signOut(auth)}>
          <LogOut size={20} />
          Sign Out
        </button>
      </div>

      {categoryEditor && (
        <div className="modal-overlay">
          <div className="modal-content category-modal">
            <div className="modal-header">
              <h3>{categoryEditor.mode === 'add' ? 'Add Category' : 'Rename Category'}</h3>
              <button className="icon-btn" onClick={() => setCategoryEditor(null)} aria-label="Close category dialog">
                <X size={20} />
              </button>
            </div>

            <form className="modal-form" onSubmit={handleCategoryEditorSubmit}>
              <div className="form-group">
                <label>Category Name</label>
                <input
                  required
                  autoFocus
                  type="text"
                  value={categoryEditor.name}
                  onChange={event => setCategoryEditor(currentEditor => currentEditor ? { ...currentEditor, name: event.target.value } : currentEditor)}
                  placeholder="e.g. Movies"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setCategoryEditor(null)} disabled={isSavingCategory}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isSavingCategory}>
                  {isSavingCategory ? 'Saving...' : categoryEditor.mode === 'add' ? 'Add Category' : 'Rename Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {categoryToDelete && (
        <div className="modal-overlay">
          <div className="modal-content category-modal">
            <div className="modal-header">
              <h3>Delete Category</h3>
              <button className="icon-btn" onClick={() => setCategoryToDelete(null)} aria-label="Close delete dialog">
                <X size={20} />
              </button>
            </div>

            <div className="modal-form">
              <p className="modal-copy">
                Delete {categoryToDelete}? This is only allowed when the category has no saved items.
              </p>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setCategoryToDelete(null)}>Cancel</button>
                <button type="button" className="btn-danger" onClick={() => deleteCategory(categoryToDelete)}>
                  Delete Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
