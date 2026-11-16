import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Settings, Smartphone, User, Users } from 'lucide-react-native';
import { COLORS } from '@/game/config';
import { createMatch, type GameMode } from '@/game/engine';
import { toSavedMatch, type SavedMatch } from '@/game/savedMatch';
import { SkiaGate } from '@/components/game/SkiaGate';
import { ActionButton } from '@/components/ui/ActionButton';
import { FONTS, shadowText } from '@/components/ui/theme';
import { matchStore } from '@/lib/matchStore';
import { settingsStore } from '@/lib/settings';
import { useSettings } from '@/hooks/useSettings';
import { levelName, t, teamName } from '@/lib/i18n';

const loadTitleArt = () => import('@/components/home/TitleArt');

function newSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}

export default function Home() {
  const router = useRouter();
  const { settings } = useSettings();
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
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const inProgress = saved && saved.match.winnerTeam === null ? saved.match : null;

  const newGame = (mode: GameMode) => {
    const current = settingsStore.current() ?? settings;
    matchStore
      .save(toSavedMatch(createMatch(newSeed(), current.rules, { mode, aiLevel: current.aiLevel })))
      .catch(() => undefined)
      .finally(() => router.push('/game'));
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.hero}>
        <View style={styles.art}>
          <SkiaGate getComponent={loadTitleArt} />
        </View>
        <Text style={[styles.title, shadowText]}>{t('app.title')}</Text>
        <Text style={styles.tagline}>{t('home.tagline')}</Text>
        <Text style={styles.rules}>{t('home.rules')}</Text>
      </View>
      <View style={styles.buttons}>
        {inProgress && (
          <>
            <ActionButton label={t('home.continue')} icon={Play} onPress={() => router.push('/game')} />
            <Text style={styles.continueScore}>
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
        <ActionButton label={t('home.settings')} icon={Settings} variant="secondary" onPress={() => router.push('/settings')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 16,
    gap: 6,
  },
  art: {
    width: 300,
    height: 170,
  },
  title: {
    fontFamily: FONTS.title,
    fontSize: 56,
    color: COLORS.accent,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  rules: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
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
  },
  level: {
    fontSize: 12,
    color: COLORS.accent,
  },
  continueScore: {
    marginTop: -4,
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
