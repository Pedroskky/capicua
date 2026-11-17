// Botón «Compartir» (capicúa, zapatero, campeones). No importa Skia: la imagen se dibuja en ShareButtonImpl, que se
// carga detrás de SkiaGate (en la web hace falta CanvasKit; en Android, que nada de Skia corra al cargar).
import { StyleSheet, View } from 'react-native';
import { SkiaGate } from '@/components/game/SkiaGate';
import type { ShareCard } from './shareCard';

export function ShareButton({ card }: { card: ShareCard }) {
  return (
    <View style={styles.slot}>
      <SkiaGate
        getComponent={() =>
          import('./ShareButtonImpl').then((module) => ({
            default: function BoundShareButton() {
              return <module.ShareButtonImpl card={card} />;
            },
          }))
        }
      />
    </View>
  );
}

// Alto fijo: en la web el envoltorio de Skia ocupa todo el sitio libre.
const styles = StyleSheet.create({
  slot: {
    height: 56,
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    justifyContent: 'center',
  },
});
