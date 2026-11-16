// Pestaña Jugar: «Continuar partida», los tres modos, los retos de hoy y la racha. Se puede desplazar, respeta la
// zona segura y, en pantallas bajas, el título se encoge para que los botones se vean sin desplazar.
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, Flame, Play, Smartphone, User, Users } from 'lucide-react-native';
import { COLORS } from '@/game/config';
import { isComplete } from '@/game/challenges';
import { localDateKey } from '@/game/dates';
import { createMatch, type GameMode } from '@/game/engine';
import { toSavedMatch, type SavedMatch } from '@/game/savedMatch';
import { streakReward, visibleStreak } from '@/game/streak';
import { rival } from '@/game/tournament';
import { SkiaGate } from '@/components/game/SkiaGate';
import { titleArtSize } from '@/components/home/titleSize';
import { ActionButton } from '@/components/ui/ActionButton';
import { TabHeader } from '@/components/ui/TabHeader';
import { FONTS, shadowText } from '@/components/ui/theme';
import { useDaily, useStreak } from '@/hooks/useProgress';
import { useSettings } from '@/hooks/useSettings';
import { claimDailyChallenge, loadTodayChallenges } from '@/lib/activity';
import { matchStore } from '@/lib/matchStore';
import { settingsStore } from '@/lib/settings';
import { levelName, rivalName, t, teamName, type TranslationKey } from '@/lib/i18n';

const loadTitleArt = () => import('@/components/home/TitleArt');

function newSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}

export default function PlayTab() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const art = titleArtSize(height);
  const { settings } = useSettings();
  const daily = useDaily();
  const streak = useStreak();
  const [saved, setSaved] = useState<SavedMatch | null>(() => matchStore.current());

  useEffect(() => {
    let active = true;
    matchStore
      .load()
      .then((value) => {
        if (active) setSaved(value);
      })
      .catch(() => undefined);
    const unsubscribe = matchStore.subscribe((value) => {
      if (active) setSaved(value);
    });
    loadTodayChallenges().catch(() => undefined);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const inProgress = saved && saved.match.winnerTeam === null ? saved.match : null;
  const today = localDateKey();
  const streakDays = visibleStreak(streak, today);
  const challenges = daily.date === today ? daily.challenges : [];

  const newGame = (mode: GameMode) => {
    const current = settingsStore.current() ?? settings;
    matchStore
      .save(toSavedMatch(createMatch(newSeed(), current.rules, { mode, aiLevel: current.aiLevel })))
      .catch(() => undefined)
      .finally(() => router.push('/game'));
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <TabHeader title={t('tabs.play')} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={{ width: art.width, height: art.height }}>
            <SkiaGate getComponent={loadTitleArt} />
          </View>
          <Text style={[styles.title, shadowText, { fontSize: art.titleFont }]}>{t('app.title')}</Text>
          {!art.compact && <Text style={styles.tagline}>{t('home.tagline')}</Text>}
        </View>

        <View style={styles.buttons}>
          {inProgress && (
            <>
              <ActionButton label={t('home.continue')} icon={Play} onPress={() => router.push('/game')} />
              <Text style={styles.continueScore}>
                {inProgress.tournament !== null ? `${t('home.continueTour', { name: rivalName(rival(inProgress.tournament).id) })} · ` : ''}
                {teamName(0, inProgress.mode)} {inProgress.scores[0]} · {teamName(1, inProgress.mode)} {inProgress.scores[1]}
              </Text>
            </>
          )}
          <Text style={styles.section}>{t('home.newGameTitle')}</Text>
          <ActionButton label={t('home.partners')} icon={Users} variant={inProgress ? 'secondary' : 'primary'} onPress={() => newGame('partners')} />
          <Text style={styles.modeHint}>{t('home.partnersHint')}</Text>
          <ActionButton label={t('home.single')} icon={User} variant="secondary" onPress={() => newGame('single')} />
          <Text style={styles.modeHint}>{t('home.singleHint')}</Text>
          <ActionButton label={t('home.hotseat')} icon={Smartphone} variant="secondary" onPress={() => newGame('hotseat')} />
          <Text style={styles.modeHint}>{t('home.hotseatHint')}</Text>
          <Text style={styles.level}>{t('home.levelLine', { level: levelName(settings.aiLevel) })}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.streakRow}>
            <Flame size={20} color={streakDays > 0 ? '#FF8A3D' : COLORS.textMuted} />
            <Text style={styles.streakText}>
              {streakDays === 0 ? t('play.streakNone') : streakDays === 1 ? t('play.streakOne') : t('play.streak', { n: streakDays })}
            </Text>
            {streakDays > 0 && <Text style={styles.streakNext}>{t('play.streakNext', { n: streakReward(streakDays + 1) })}</Text>}
          </View>
          <Text style={styles.cardTitle}>{t('play.challenges')}</Text>
          {challenges.map((c) => {
            const done = isComplete(c);
            return (
              <View key={c.id} style={styles.challenge}>
                <View style={styles.challengeText}>
                  <Text style={styles.challengeName}>{t(`challenge.${c.kind}` as TranslationKey, { n: c.target })}</Text>
                  <View style={styles.bar}>
                    <View style={[styles.barFill, { width: `${Math.round((Math.min(c.progress, c.target) / c.target) * 100)}%` }]} />
                  </View>
                  <Text style={styles.challengeMeta}>
                    {Math.min(c.progress, c.target)}/{c.target} · {t('play.reward', { n: c.reward })}
                  </Text>
                </View>
                {c.claimed ? (
                  <CheckCircle2 size={24} color={COLORS.us} />
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    disabled={!done}
                    onPress={() => claimDailyChallenge(c.id).catch(() => undefined)}
                    style={({ pressed }) => [styles.claim, !done && styles.claimOff, pressed && styles.pressed]}
                  >
                    <Text style={[styles.claimText, !done && styles.claimTextOff]}>{t('play.claim')}</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
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
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 16,
  },
  hero: {
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontFamily: FONTS.title,
    color: COLORS.accent,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 15,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 330,
  },
  buttons: {
    alignItems: 'center',
    gap: 10,
  },
  section: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  modeHint: {
    marginTop: -8,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  level: {
    fontSize: 12,
    color: COLORS.accent,
  },
  continueScore: {
    marginTop: -4,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  card: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    gap: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  streakText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  streakNext: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  challenge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  challengeText: {
    flex: 1,
    gap: 4,
  },
  challengeName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  bar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  challengeMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  claim: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
  },
  claimOff: {
    backgroundColor: COLORS.background,
  },
  claimText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.accentText,
  },
  claimTextOff: {
    color: COLORS.textMuted,
  },
  pressed: {
    opacity: 0.85,
  },
});
