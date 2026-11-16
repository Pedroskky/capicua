// Cabecera de las pestañas: título, monedas y el engranaje de Ajustes arriba a la derecha.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Coins, Settings } from 'lucide-react-native';
import { COLORS } from '@/game/config';
import { FONTS } from '@/components/ui/theme';
import { useProgress } from '@/hooks/useProgress';
import { t } from '@/lib/i18n';

export function TabHeader({ title }: { title: string }) {
  const router = useRouter();
  const progress = useProgress();
  return (
    <View style={styles.row}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.coins} accessibilityLabel={t('header.coins', { n: progress.coins })}>
        <Coins size={16} color={COLORS.accent} strokeWidth={2.4} />
        <Text style={styles.coinText}>{progress.coins}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('header.settings')}
        onPress={() => router.push('/settings')}
        hitSlop={8}
        style={({ pressed }) => [styles.gear, pressed && styles.pressed]}
      >
        <Settings size={20} color={COLORS.text} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  title: {
    flex: 1,
    fontFamily: FONTS.heading,
    fontSize: 26,
    color: COLORS.accent,
  },
  coins: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  coinText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  gear: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  pressed: {
    opacity: 0.8,
  },
});
