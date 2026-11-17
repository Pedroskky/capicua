// Botón «Compartir» de verdad (usa Skia: se carga detrás de SkiaGate desde ShareButton.tsx).
import { useState } from 'react';
import { useFont } from '@shopify/react-native-skia';
import { Share2 } from 'lucide-react-native';
import { SHARE_IMAGE } from '@/game/config';
import { ActionButton } from '@/components/ui/ActionButton';
import { t } from '@/lib/i18n';
import { shareImage } from '@/lib/shareImage';
import { drawShareCard, renderShareImage, type ShareCard, type ShareFonts } from './shareCard';

const LOBSTER = require('@expo-google-fonts/lobster/400Regular/Lobster_400Regular.ttf');

function useShareFonts(): ShareFonts | null {
  const title = useFont(LOBSTER, SHARE_IMAGE.titleSize);
  const line = useFont(LOBSTER, SHARE_IMAGE.lineSize);
  const footer = useFont(LOBSTER, SHARE_IMAGE.footerSize);
  return title && line && footer ? { title, line, footer } : null;
}

export function ShareButtonImpl({ card }: { card: ShareCard }) {
  const fonts = useShareFonts();
  const [busy, setBusy] = useState(false);
  const onPress = async () => {
    if (!fonts || busy) return;
    setBusy(true);
    try {
      const base64 = renderShareImage((canvas) => drawShareCard(canvas, card, fonts));
      if (base64) await shareImage(base64, t('share.dialogTitle'));
    } finally {
      setBusy(false);
    }
  };
  return <ActionButton variant="secondary" icon={Share2} label={t('share.button')} disabled={!fonts || busy} onPress={onPress} />;
}
