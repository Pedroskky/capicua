import { StyleSheet, View } from 'react-native';
import { SkiaGate } from '@/components/game/SkiaGate';
import { COLORS } from '@/game/config';
import { progressStore } from '@/lib/progress';

// La tienda dibuja la vista previa con Skia.
const loadShop = () => Promise.all([progressStore.load(), import('@/components/shop/ShopScreen')]).then(([, screen]) => screen);

export default function ShopTab() {
  return (
    <View style={styles.root}>
      <SkiaGate getComponent={loadShop} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
