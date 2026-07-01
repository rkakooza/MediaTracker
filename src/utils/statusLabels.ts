import type { MediaStatus } from '../types';

export const getStatusLabel = (status: MediaStatus | 'All') => {
  if (status === 'Plan to Watch') return 'Planned';
  return status;
};

