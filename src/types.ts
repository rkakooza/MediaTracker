export type MediaCategory = 'TV Shows' | 'Japanese Anime' | 'Chinese Anime' | 'Manga';
export type MediaStatus = 'Watching' | 'Completed' | 'Plan to Watch' | 'Dropped';
export type TrackingType = 'linear' | 'season';

export interface MediaItem {
  id: string;
  title: string;
  alternateTitle?: string;
  category: MediaCategory;
  status: MediaStatus;
  trackingType: TrackingType;
  season?: number | null;
  episode?: number | null;
  updatedAt: number;
}
