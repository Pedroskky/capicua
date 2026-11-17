// Resultado de la partida: marcador final, zapatero y el detalle mano a mano.
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Home, RotateCcw } from 'lucide-react-native';
import { COLORS } from '@/game/config';
import { createMatch, type HandResult } from '@/game/engine';
import { toSavedMatch, type SavedMatch } from '@/game/savedMatch';
import { ActionButton } from '@/components/ui/ActionButton';
import { FONTS, shadowText } from '@/components/ui/theme';
import { matchStore } from '@/lib/matchStore';
import { settingsStore } from '@/lib/settings';
import { playerName, rivalName, t, teamName } from '@/lib/i18n';
import { RIVALS, isUnlocked, rival } from '@/game/tournament';
import { TOURNAMENT } from '@/game/config';
import { RewardLines } from '@/components/game/HandSummary';
import { getLastMatchReport } from '@/lib/lastReport';
import { progressStore } from '@/lib/progress';
import { Clapperboard, Star } from 'lucide-react-native';
import { canRetryKeepingStreak, doubleCoinsBonus } from '@/game/ads';
import { maybeShowInterstitial, showRewarded } from '@/lib/ads';
import { useRewardedReady } from '@/hooks/useRewardedAd';
import { addDoubleCoins, keepWinStreak } from '@/lib/activity';
import { ShareButton } from '@/components/share/ShareButton';
import { matchShareCard } from '@/components/share/cards';

function newSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}

function describeHand(r: HandResult, mode: 'partners' | 'single' | 'hotseat', rivalId: string | null): string {
  if (r.kind === 'domino') return `${t('result.handDomino')} · ${playerName(r.winnerPlayer ?? 0, mode, rivalId)}`;
  return r.winnerTeam === null ? `${t('result.handTranque')} · ${t('result.handTie')}` : t('result.handTranque');
}

export default function ResultScreen() {
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
    return () => {
      active = false;
    };
  }, []);

  const match = saved?.match.winnerTeam !== null ? saved?.match : null;
  const [doubled, setDoubled] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const doubleReady = useRewardedReady('doubleCoins');
  const retryReady = useRewardedReady('tournamentRetry');

  /** Al salir del resultado de una partida a 100: intersticial si toca (reglas en game/ads.ts) y luego seguir. */
  const leave = (go: () => void) => {
    maybeShowInterstitial('matchOver')
      .catch(() => false)
      .finally(go);
  };

  const playAgain = () => {
    const old = saved?.match;
    const current = settingsStore.current();
    matchStore
      .save(toSavedMatch(createMatch(newSeed(), current?.rules ?? old?.rules, { mode: old?.mode ?? 'partners', aiLevel: current?.aiLevel ?? old?.aiLevel })))
      .catch(() => undefined)
      .finally(() => router.replace('/game'));
  };

  if (!match) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <Text style={styles.none}>{t('result.none')}</Text>
        <ActionButton label={t('result.home')} icon={Home} onPress={() => router.replace('/')} />
      </SafeAreaView>
    );
  }

  const won = match.winnerTeam === 0;
  const doubleBonus = doubleCoinsBonus(won, getLastMatchReport()?.coins ?? 0);
  const onDouble = () => {
    showRewarded('doubleCoins')
      .then((earned) => {
        if (!earned || doubled) return;
        setDoubled(true);
        addDoubleCoins(doubleBonus).catch(() => undefined);
      })
      .catch(() => undefined);
  };
  const mode = match.mode;
  const rivalId = match.tournament !== null ? rival(match.tournament).id : null;
  const report = getLastMatchReport();
  const progress = progressStore.current();
  const nextPair = match.tournament !== null && match.tournament + 1 < RIVALS.length && progress && isUnlocked(progress, match.tournament + 1) ? match.tournament + 1 : null;
  const retryAllowed = canRetryKeepingStreak(match.tournament, won, report?.winStreakBefore ?? 0);
  /** Vídeo visto entero: se devuelve la racha de victorias y se vuelve a jugar contra la misma pareja. */
  const onRetryKeeping = () => {
    showRewarded('tournamentRetry')
      .then((earned) => {
        if (!earned) {
          setNotice(t('ads.noVideo'));
          return;
        }
        keepWinStreak(report?.winStreakBefore ?? 0)
          .catch(() => undefined)
          .finally(() => playTournament(match.tournament ?? 0));
      })
      .catch(() => undefined);
  };
  const playTournament = (index: number) => {
    const current = settingsStore.current();
    const rules = { ...(current?.rules ?? match.rules), targetScore: TOURNAMENT.targetScore };
    matchStore
      .save(toSavedMatch(createMatch(newSeed(), rules, { mode: 'partners', aiLevel: RIVALS[index].level, tournament: index })))
      .catch(() => undefined)
      .finally(() => router.replace('/game'));
  };
  const title =
    mode === 'partners'
      ? won
        ? t('result.win')
        : t('result.lose')
      : mode === 'single'
        ? won
          ? t('result.youWin')
          : t('result.youLose', { name: playerName(1, mode) })
        : t('result.winPlayer', { name: playerName(match.winnerTeam ?? 0, mode) });
  const zapateroLine = mode === 'partners' ? (won ? t('result.zapatero') : t('result.zapateroThem')) : t('result.zapateroWin');
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, shadowText, { color: won || mode === 'hotseat' ? COLORS.accent : COLORS.them }]}>{title}</Text>
        {match.zapatero && (
          <Text style={styles.zapatero}>{zapateroLine}</Text>
        )}
        {rivalId && <Text style={styles.vs}>{t('tour.vs', { name: rivalName(rivalId) })}</Text>}
        {report?.tournament && report.tournament.stars > 0 && (
          <View style={styles.starsRow}>
            {[1, 2, 3].map((k) => (
              <Star key={k} size={30} color={COLORS.accent} fill={report.tournament && report.tournament.stars >= k ? COLORS.accent : 'transparent'} />
            ))}
          </View>
        )}
        {report && (
          <View style={styles.rewardCard}>
            {report.coins > 0 && <Text style={styles.rewardTotal}>{t('reward.total', { n: report.coins + (doubled ? doubleBonus : 0) })}</Text>}
            <RewardLines report={report} />
            <Text style={styles.eloLine}>{t('reward.elo', { before: report.eloBefore, after: report.eloAfter })}</Text>
            {doubleBonus > 0 && !doubled && doubleReady && (
              <ActionButton label={t('ads.doubleCoins', { n: doubleBonus })} icon={Clapperboard} onPress={onDouble} />
            )}
            {doubled && <Text style={styles.notice}>{t('ads.doubled')}</Text>}
          </View>
        )}
        {notice && <Text style={styles.notice}>{notice}</Text>}
        {won && match.zapatero && mode !== 'hotseat' && <ShareButton card={matchShareCard('zapatero', match)} />}
        <Text style={styles.section}>{t('result.final')}</Text>
        <View style={styles.scoreRow}>
          <View style={[styles.scoreBox, won && styles.winnerBox]}>
            <Text style={[styles.scoreTeam, { color: COLORS.us }]}>{teamName(0, mode, rivalId)}</Text>
            <Text style={styles.score}>{match.scores[0]}</Text>
          </View>
          <View style={[styles.scoreBox, !won && styles.winnerBox]}>
            <Text style={[styles.scoreTeam, { color: COLORS.them }]}>{teamName(1, mode, rivalId)}</Text>
            <Text style={styles.score}>{match.scores[1]}</Text>
          </View>
        </View>

        <Text style={styles.section}>{t('result.hands')}</Text>
        <View style={styles.table}>
          {match.history.map((r, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.handNo}>{t('result.handRow', { n: i + 1 })}</Text>
              <Text style={styles.handKind} numberOfLines={2}>
                {describeHand(r, match.mode, rivalId)}
                {r.capicua ? ` · ${t('call.capicua')}` : ''}
              </Text>
              <Text style={[styles.points, { color: r.winnerTeam === 0 ? COLORS.us : r.winnerTeam === 1 ? COLORS.them : COLORS.textMuted }]}>
                {r.winnerTeam === null ? '—' : `+${r.total}`}
              </Text>
              <Text style={styles.running}>
                {r.scoresAfter[0]}–{r.scoresAfter[1]}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.buttons}>
          {match.tournament !== null ? (
            <>
              {won && nextPair !== null && <ActionButton label={t('tour.next')} onPress={() => leave(() => playTournament(nextPair))} />}
              {retryAllowed && retryReady && (
                <ActionButton label={t('ads.retryKeep', { n: report?.winStreakBefore ?? 0 })} icon={Clapperboard} onPress={onRetryKeeping} />
              )}
              <ActionButton
                label={t('tour.replay')}
                icon={RotateCcw}
                variant={(won && nextPair !== null) || (retryAllowed && retryReady) ? 'secondary' : 'primary'}
                onPress={() => leave(() => playTournament(match.tournament ?? 0))}
              />
              <ActionButton label={t('tour.back')} variant="secondary" onPress={() => leave(() => router.replace('/tournament'))} />
            </>
          ) : (
            <ActionButton label={t('result.playAgain')} icon={RotateCcw} onPress={() => leave(playAgain)} />
          )}
          <ActionButton label={t('result.home')} icon={Home} variant="secondary" onPress={() => leave(() => router.replace('/'))} />
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
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 24,
  },
  none: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
  },
  content: {
    padding: 20,
    gap: 12,
  },
  title: {
    marginTop: 16,
    fontFamily: FONTS.title,
    fontSize: 40,
    textAlign: 'center',
  },
  notice: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.us,
    textAlign: 'center',
  },
  vs: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  rewardCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.accent,
    gap: 6,
  },
  rewardTotal: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.accent,
    textAlign: 'center',
  },
  eloLine: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  zapatero: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.accent,
    textAlign: 'center',
  },
  section: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 12,
  },
  scoreBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  winnerBox: {
    borderColor: COLORS.accent,
    borderWidth: 2,
  },
  scoreTeam: {
    fontSize: 15,
    fontWeight: '800',
  },
  score: {
    fontSize: 40,
    fontWeight: '900',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  table: {
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  handNo: {
    width: 62,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  handKind: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  points: {
    width: 44,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  running: {
    width: 64,
    textAlign: 'right',
    fontSize: 13,
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  buttons: {
    marginTop: 12,
    alignItems: 'center',
    gap: 12,
  },
});
