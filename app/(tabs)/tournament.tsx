import { StyleSheet, View } from 'react-native';
import { SkiaGate } from '@/components/game/SkiaGate';
import { COLORS } from '@/game/config';
import { progressStore } from '@/lib/progress';

// Se lee el progreso antes de montar la pantalla (que dibuja el camino con Skia).
const loadTournament = () => Promise.all([progressStore.load(), import('@/components/tournament/TournamentScreen')]).then(([, screen]) => screen);

export default function TournamentTab() {
  return (
    <View style={styles.root}>
      <SkiaGate getComponent={loadTournament} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
