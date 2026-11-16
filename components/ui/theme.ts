// Estilos de texto compartidos. Los colores salen de game/config.ts.
import { Platform } from 'react-native';
import { COLORS } from '@/game/config';

export const FONTS = {
  title: 'Lobster_400Regular',
  heading: 'Lobster_400Regular',
} as const;

export const shadowText = Platform.select({
  web: { textShadow: '0px 2px 6px rgba(0,0,0,0.8)' },
  default: { textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
});

export { COLORS };
