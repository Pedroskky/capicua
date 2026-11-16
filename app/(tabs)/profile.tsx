// Perfil: ranking ELO contra la máquina con su gráfica, estadísticas y logros.
import type { ComponentType } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import {
  Calendar,
  Coins,
  Crown,
  Flame,
  Lock,
  Medal,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  User,
  Users,
  Zap,
  type LucideProps,
} from 'lucide-react-native';
import { COLORS } from '@/game/config';
import { ACHIEVEMENTS, type AchievementIcon } from '@/game/achievements';
import { TabHeader } from '@/components/ui/TabHeader';
import { useAchievements, useStats, useStreak } from '@/hooks/useProgress';
import { t, type TranslationKey } from '@/lib/i18n';

const ICONS: Record<AchievementIcon, ComponentType<LucideProps>> = {
  trophy: Trophy,
  medal: Medal,
  crown: Crown,
  star: Star,
  flame: Flame,
  zap: Zap,
  lock: Lock,
  coins: Coins,
  shopping: ShoppingBag,
  target: Target,
  users: Users,
  user: User,
  smartphone: Smartphone,
  trending: TrendingUp,
  calendar: Calendar,
  sparkles: Sparkles,
};

function EloChart({ values }: { values: number[] }) {
  const width = 320;
  const height = 120;
  const min = Math.min(...values) - 20;
  const max = Math.max(...values) + 20;
  const x = (i: number) => (values.length === 1 ? width / 2 : (i / (values.length - 1)) * (width - 16) + 8);
  const y = (v: number) => height - 8 - ((v - min) / (max - min || 1)) * (height - 16);
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={0} y1={y(1000)} x2={width} y2={y(1000)} stroke={COLORS.surfaceBorder} strokeWidth={1} strokeDasharray="4 4" />
      <Polyline points={points} fill="none" stroke={COLORS.accent} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={5} fill={COLORS.accent} />
    </Svg>
  );
}

export default function ProfileTab() {
  const stats = useStats();
  const streak = useStreak();
  const unlocked = useAchievements();
  const rows: [TranslationKey, number][] = [
    ['stat.matchesPlayed', stats.matchesPlayed],
    ['stat.matchesWon', stats.matchesWon],
    ['stat.handsWon', stats.handsWon],
    ['stat.capicuas', stats.capicuas],
    ['stat.zapateros', stats.zapateros],
    ['stat.tranquesWon', stats.tranquesWon],
    ['stat.dominoesSelf', stats.dominoesSelf],
    ['stat.pointsScored', stats.pointsScored],
    ['stat.bestWinStreak', stats.bestWinStreak],
    ['stat.bestDayStreak', streak.best],
  ];
  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <TabHeader title={t('tabs.profile')} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.elo')}</Text>
          <View style={styles.eloRow}>
            <Text style={styles.elo}>{stats.elo.rating}</Text>
            <Text style={styles.muted}>{t('profile.eloBest', { n: stats.eloBest })}</Text>
          </View>
          {stats.elo.history.length >= 2 ? (
            <>
              <EloChart values={stats.elo.history} />
              <Text style={styles.muted}>{t('profile.eloChart', { n: stats.elo.history.length })}</Text>
            </>
          ) : (
            <Text style={styles.muted}>{t('profile.eloEmpty')}</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.stats')}</Text>
          {rows.map(([key, value]) => (
            <View key={key} style={styles.statRow}>
              <Text style={styles.statLabel}>{t(key)}</Text>
              <Text style={styles.statValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.achievements', { n: unlocked.length, total: ACHIEVEMENTS.length })}</Text>
          <View style={styles.grid}>
            {ACHIEVEMENTS.map((a) => {
              const done = unlocked.includes(a.id);
              const Icon = ICONS[a.icon];
              return (
                <View key={a.id} style={[styles.ach, !done && styles.achOff]}>
                  <Icon size={22} color={done ? COLORS.accent : COLORS.textMuted} />
                  <Text style={[styles.achName, !done && styles.muted]} numberOfLines={2}>
                    {t(`ach.${a.id}` as TranslationKey)}
                  </Text>
                  <Text style={styles.achDesc} numberOfLines={3}>
                    {t(`ach.${a.id}.desc` as TranslationKey)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 14,
  },
  card: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    gap: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  eloRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  elo: {
    fontSize: 40,
    fontWeight: '900',
    color: COLORS.accent,
    fontVariant: ['tabular-nums'],
  },
  muted: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 15,
    color: COLORS.text,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ach: {
    width: '31%',
    flexGrow: 1,
    padding: 8,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    gap: 4,
  },
  achOff: {
    opacity: 0.55,
  },
  achName: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  achDesc: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
