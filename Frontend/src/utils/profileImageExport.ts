export interface RenderProfileImageOptions {
  width?: number;
  height?: number;
  pixelRatio?: number;
  backgroundColor?: string;
}

export type DownloadResult = 'downloaded' | 'preview';

const isIosWebKit = () => {
  const userAgent = navigator.userAgent || '';
  return /iP(ad|hone|od)/i.test(userAgent) && /WebKit/i.test(userAgent);
};

export const renderProfileImage = async (
  element: HTMLElement,
  options: RenderProfileImageOptions = {},
): Promise<Blob> => {
  const { toBlob } = await import('html-to-image');
  const blob = await toBlob(element, {
    cacheBust: true,
    pixelRatio: options.pixelRatio ?? 2,
    backgroundColor: options.backgroundColor,
    width: options.width,
    height: options.height,
  });
  if (!blob) throw new Error('PROFILE_IMAGE_RENDER_FAILED');
  return blob;
};

export const downloadImageBlob = (blob: Blob, filename: string): DownloadResult => {
  const objectUrl = URL.createObjectURL(blob);
  const revokeObjectUrl = URL.revokeObjectURL.bind(URL);
  const anchor = document.createElement('a');

  // iOS WebKit may ignore the download attribute. Opening the PNG lets the user
  // save it from the browser without unexpectedly invoking the native share sheet.
  if (!('download' in anchor) || isIosWebKit()) {
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => revokeObjectUrl(objectUrl), 60_000);
    return 'preview';
  }

  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => revokeObjectUrl(objectUrl), 1_000);
  return 'downloaded';
};

export const createImageFile = (blob: Blob, filename: string) =>
  new File([blob], filename, { type: blob.type || 'image/png' });

export const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const response = await fetch(dataUrl);
  return response.blob();
};

export const supportsImageSharing = (): boolean => {
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
  try {
    return navigator.canShare({ files: [new File([new Uint8Array([0])], 'followmee.png', { type: 'image/png' })] });
  } catch {
    return false;
  }
};

export const canShareImageFile = (blob: Blob, filename: string): boolean => {
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
  return navigator.canShare({ files: [createImageFile(blob, filename)] });
};

export const shareImageBlob = async (
  blob: Blob,
  filename: string,
  title?: string,
): Promise<void> => {
  const file = createImageFile(blob, filename);
  if (typeof navigator.share !== 'function' || !navigator.canShare?.({ files: [file] })) {
    throw new Error('PROFILE_IMAGE_SHARE_UNSUPPORTED');
  }
  await navigator.share({ files: [file], title });
};
