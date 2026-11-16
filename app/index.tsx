import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, RotateCcw, Settings } from 'lucide-react-native';
import { COLORS } from '@/game/config';
import { createMatch } from '@/game/engine';
import { toSavedMatch, type SavedMatch } from '@/game/savedMatch';
import { SkiaGate } from '@/components/game/SkiaGate';
import { ActionButton } from '@/components/ui/ActionButton';
import { FONTS, shadowText } from '@/components/ui/theme';
import { matchStore } from '@/lib/matchStore';
import { t } from '@/lib/i18n';

const loadTitleArt = () => import('@/components/home/TitleArt');

function newSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}

export default function Home() {
  const router = useRouter();
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

  const newGame = () => {
    matchStore
      .save(toSavedMatch(createMatch(newSeed())))
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
              {t('home.continueScore', { us: inProgress.scores[0], them: inProgress.scores[1] })}
            </Text>
          </>
        )}
        <ActionButton label={t('home.newGame')} icon={RotateCcw} variant={inProgress ? 'secondary' : 'primary'} onPress={newGame} />
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
    paddingTop: 36,
    gap: 8,
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
    gap: 12,
  },
  continueScore: {
    marginTop: -4,
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
