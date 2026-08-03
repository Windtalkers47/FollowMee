import { getAllowedOrigins, isAllowedOrigin } from '../../config/security.config';

describe('security configuration', () => {
  const previousFrontendUrl = process.env.FRONTEND_URL;
  const previousPreviewOrigins = process.env.CORS_PREVIEW_ORIGINS;

  afterEach(() => {
    process.env.FRONTEND_URL = previousFrontendUrl;
    process.env.CORS_PREVIEW_ORIGINS = previousPreviewOrigins;
  });

  it('uses exact origin matching and rejects prefix lookalikes', () => {
    process.env.FRONTEND_URL = 'https://followmee.vercel.app/';
    expect(isAllowedOrigin('https://followmee.vercel.app')).toBe(true);
    expect(isAllowedOrigin('https://followmee.vercel.app.evil.example')).toBe(false);
  });

  it('normalizes configured preview origins', () => {
    process.env.CORS_PREVIEW_ORIGINS = 'https://one.vercel.app/, https://two.vercel.app';
    expect(getAllowedOrigins()).toEqual(expect.arrayContaining([
      'https://one.vercel.app',
      'https://two.vercel.app',
    ]));
  });
});
