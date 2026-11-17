import { SHARE_IMAGE } from '@/game/config';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export type ShareOutcome = 'shared' | 'downloaded' | 'unavailable' | 'failed';

/** Móvil: escribe el PNG en la caché y abre el menú de compartir del sistema. */
export async function shareImage(base64: string, title: string): Promise<ShareOutcome> {
  try {
    if (!(await Sharing.isAvailableAsync())) return 'unavailable';
    const file = new File(Paths.cache, SHARE_IMAGE.fileName);
    if (file.exists) file.delete();
    file.create();
    file.write(base64, { encoding: 'base64' });
    await Sharing.shareAsync(file.uri, { mimeType: 'image/png', dialogTitle: title, UTI: 'public.png' });
    return 'shared';
  } catch {
    return 'failed';
  }
}
