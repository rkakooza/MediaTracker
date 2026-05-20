import type { MediaItem } from '../types';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface MediaCardProps {
  item: MediaItem;
  isHighlighted?: boolean;
  onIncrement?: (id: string) => void;
  onEdit?: (item: MediaItem) => void;
  onDelete?: (id: string) => void;
}

export function MediaCard({ item, isHighlighted = false, onIncrement, onEdit, onDelete }: MediaCardProps) {
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Watching': return 'status-watching';
      case 'Completed': return 'status-completed';
      case 'Plan to Watch': return 'status-plan-to-watch';
      case 'Dropped': return 'status-dropped';
      default: return 'status-watching';
    }
  };

  const displayProgress = () => {
    if (item.status === 'Completed') return null; // Hide numbers if completed
    if (item.trackingType === 'season') {
      return `S${item.season} E${item.episode}`;
    }
    return `Ep ${item.episode}`;
  };

  return (
    <div id={`media-item-${item.id}`} className={`media-list-item ${isHighlighted ? 'media-list-item-highlighted' : ''}`}>
      <div className="list-item-main">
        <div className={`status-dot ${getStatusClass(item.status)}`}></div>
        <div className="list-item-titles">
          <h3 className="item-title">{item.title}</h3>
          {item.alternateTitle && <span className="item-alt-title">({item.alternateTitle})</span>}
        </div>
      </div>
      
      <div className="list-item-actions">
        {item.status !== 'Completed' && (
          <div className="item-progress">
            <span>{displayProgress()}</span>
            <button 
              className="icon-btn btn-plus"
              onClick={() => onIncrement && onIncrement(item.id)}
              title="Increment Progress"
            >
              <Plus size={16} />
            </button>
          </div>
        )}
        
        <button className="icon-btn btn-edit" onClick={() => onEdit && onEdit(item)} title="Edit Show">
          <Edit2 size={16} />
        </button>
        <button className="icon-btn btn-delete" onClick={() => onDelete && onDelete(item.id)} title="Delete Show">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
