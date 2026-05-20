import { useState } from 'react';
import type { MediaItem, TrackingType, MediaStatus, MediaCategory } from '../types';
import { X } from 'lucide-react';
import { SimilarTitleError } from '../utils/mediaTitle';

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<MediaItem>, options?: { allowSimilarTitle?: boolean }) => Promise<void>;
  item?: MediaItem | null;
  defaultCategory: MediaCategory;
}

export function MediaModal({ isOpen, onClose, onSave, item, defaultCategory }: MediaModalProps) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [alternateTitle, setAlternateTitle] = useState(item?.alternateTitle ?? '');
  const [status, setStatus] = useState<MediaStatus>(item?.status ?? 'Watching');
  const [trackingType, setTrackingType] = useState<TrackingType>(item?.trackingType ?? 'linear');
  const [season, setSeason] = useState<number | ''>(item?.season ?? '');
  const [episode, setEpisode] = useState<number | ''>(item?.episode ?? 1);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [similarTitle, setSimilarTitle] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const savedItem: Partial<MediaItem> = {
      title: title.trim(),
      alternateTitle: alternateTitle.trim(),
      status,
      trackingType,
      season: trackingType === 'season' ? Number(season) || 1 : null,
      episode: Number(episode) || 1,
      category: item?.category || defaultCategory,
      updatedAt: Date.now()
    };

    if (item?.id) {
      savedItem.id = item.id;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      await onSave(savedItem, { allowSimilarTitle: Boolean(similarTitle) });
      onClose();
    } catch (error) {
      console.error('Error saving media item', error);
      if (error instanceof SimilarTitleError) {
        setSimilarTitle(error.similarTitle);
      } else {
        setSimilarTitle('');
      }

      setErrorMessage(error instanceof Error ? error.message : 'Could not save this item. Please try again.');
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{item ? 'Edit Media' : 'Add New Media'}</h3>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Primary Title</label>
            <input
              required
              type="text"
              value={title}
              onChange={e => {
                setTitle(e.target.value);
                setSimilarTitle('');
                setErrorMessage('');
              }}
              placeholder="e.g. Naruto"
            />
          </div>
          
          <div className="form-group">
            <label>Alternate Title (Optional)</label>
            <input type="text" value={alternateTitle} onChange={e => setAlternateTitle(e.target.value)} placeholder="e.g. 鸣人" />
          </div>
          
          <div className="form-group">
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as MediaStatus)}>
              <option value="Watching">Watching</option>
              <option value="Completed">Completed</option>
              <option value="Plan to Watch">Plan to Watch</option>
              <option value="Dropped">Dropped</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Tracking Format</label>
            <select value={trackingType} onChange={e => setTrackingType(e.target.value as TrackingType)}>
              <option value="linear">Linear (e.g. Ep 235)</option>
              <option value="season">Season-based (e.g. S4 E2)</option>
            </select>
          </div>
          
          <div className="form-row">
            {trackingType === 'season' && (
              <div className="form-group">
                <label>Season</label>
                <input type="number" min="1" value={season} onChange={e => setSeason(e.target.value ? Number(e.target.value) : '')} />
              </div>
            )}
            <div className="form-group">
              <label>Episode/Chapter</label>
              <input type="number" min="1" value={episode} onChange={e => setEpisode(e.target.value ? Number(e.target.value) : '')} />
            </div>
          </div>
          
          {errorMessage && (
            <p className={similarTitle ? 'form-warning' : 'form-error'}>{errorMessage}</p>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : similarTitle ? 'Save Anyway' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
