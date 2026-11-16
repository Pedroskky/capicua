import { StyleSheet, View } from 'react-native';
import { SkiaGate } from '@/components/game/SkiaGate';
import { COLORS } from '@/game/config';
import { settingsStore } from '@/lib/settings';
import { matchStore } from '@/lib/matchStore';

// Se leen los ajustes y la partida guardada antes de montar la pantalla (que usa Skia).
const loadGameScreen = () =>
  Promise.all([settingsStore.load(), matchStore.load(), import('@/components/game/GameScreen')]).then(([, , screen]) => screen);

export default function GameRoute() {
  return (
    <View style={styles.root}>
      <SkiaGate getComponent={loadGameScreen} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
