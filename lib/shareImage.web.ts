import { SHARE_IMAGE } from '@/game/config';
export type ShareOutcome = 'shared' | 'downloaded' | 'unavailable' | 'failed';

const FILE_NAME = SHARE_IMAGE.fileName;

function toBlob(base64: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}

/** Web: comparte con el menú del navegador si puede; si no, descarga la imagen. */
export async function shareImage(base64: string, title: string): Promise<ShareOutcome> {
  try {
    const blob = toBlob(base64);
    const file = new File([blob], FILE_NAME, { type: 'image/png' });
    if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title });
        return 'shared';
      } catch (error) {
        // Si la persona cierra el menú no hay que descargar nada.
        if (error instanceof DOMException && error.name === 'AbortError') return 'shared';
      }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = FILE_NAME;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}
