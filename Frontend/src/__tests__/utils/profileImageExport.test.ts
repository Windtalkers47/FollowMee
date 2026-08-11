import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadImageBlob, renderProfileImage, shareImageBlob } from '../../utils/profileImageExport';
import { toBlob } from 'html-to-image';

vi.mock('html-to-image', () => ({ toBlob: vi.fn() }));

describe('profile image export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:followmee-image'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders and downloads a PNG without invoking native share', async () => {
    const blob = new Blob(['png'], { type: 'image/png' });
    vi.mocked(toBlob).mockResolvedValue(blob);
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      userAgent: navigator.userAgent,
      share: nativeShare,
      canShare: vi.fn(() => true),
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const element = document.createElement('div');

    const rendered = await renderProfileImage(element, { pixelRatio: 2 });
    const result = downloadImageBlob(rendered, 'profile-followmee.png');

    expect(result).toBe('downloaded');
    expect(click).toHaveBeenCalledOnce();
    expect(nativeShare).not.toHaveBeenCalled();
    expect(toBlob).toHaveBeenCalledWith(element, expect.objectContaining({ cacheBust: true, pixelRatio: 2 }));
  });

  it('uses native file sharing only for the explicit share-image action', async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      userAgent: navigator.userAgent,
      share: nativeShare,
      canShare: vi.fn(() => true),
    });

    await shareImageBlob(new Blob(['png'], { type: 'image/png' }), 'profile.png', 'Profile');

    expect(nativeShare).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Profile',
      files: [expect.any(File)],
    }));
  });

  it('fails when image rendering does not produce a blob', async () => {
    vi.mocked(toBlob).mockResolvedValue(null);
    await expect(renderProfileImage(document.createElement('div'))).rejects.toThrow('PROFILE_IMAGE_RENDER_FAILED');
  });
});
