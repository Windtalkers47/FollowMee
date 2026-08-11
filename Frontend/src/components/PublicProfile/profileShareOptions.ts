export type ProfileShareFormat = 'square' | 'story' | 'landscape';

export const profileShareDimensions = {
  square: { width: 540, height: 540 },
  story: { width: 540, height: 960 },
  landscape: { width: 800, height: 450 },
} as const;

export const profileQrDimensions = { width: 720, height: 720 } as const;
