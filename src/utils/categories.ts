import { normalizeMediaTitle } from './mediaTitle';

export const DEFAULT_MEDIA_CATEGORIES = [
  'TV Shows',
  'Japanese Anime',
  'Chinese Anime',
  'Manga'
];

const legacyCategoryMap: Record<string, string> = {
  tv: 'TV Shows',
  'anime-jp': 'Japanese Anime',
  'anime-cn': 'Chinese Anime',
  manga: 'Manga'
};

export const getCategoryNameFromRoute = (routeCategory: string | undefined) => {
  if (!routeCategory) return DEFAULT_MEDIA_CATEGORIES[0];

  return legacyCategoryMap[routeCategory] ?? decodeURIComponent(routeCategory);
};

export const getCategoryRoute = (categoryName: string) => {
  return `/category/${encodeURIComponent(categoryName)}`;
};

export const getCategoryDocumentId = (categoryName: string) => {
  return encodeURIComponent(normalizeMediaTitle(categoryName));
};

