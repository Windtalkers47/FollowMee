export type PublicProfileErrorState = 'unavailable' | 'permission' | 'network';

export const publicProfileErrorState = (status?: number): PublicProfileErrorState => {
  if (status === 404) return 'unavailable';
  if (status === 401 || status === 403) return 'permission';
  return 'network';
};
