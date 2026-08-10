export const primaryRouteLoaders = {
  '/dashboard': () => import('../pages/Dashboard'),
  '/my-work': () => import('../pages/MyWork'),
  '/schedule': () => import('../pages/Schedule'),
  '/customer': () => import('../pages/Customer'),
} as const;

const prefetched = new Set<string>();

export const prefetchPrimaryRoute = (path: string) => {
  const key = Object.keys(primaryRouteLoaders).find(route => path === route || path.startsWith(`${route}/`)) as keyof typeof primaryRouteLoaders | undefined;
  if (!key || prefetched.has(key)) return;
  prefetched.add(key);
  void primaryRouteLoaders[key]().catch(() => prefetched.delete(key));
};
