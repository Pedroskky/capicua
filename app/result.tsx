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
import { playerName, t } from '@/lib/i18n';

function newSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}

function describeHand(r: HandResult): string {
  if (r.kind === 'domino') return `${t('result.handDomino')} · ${playerName(r.winnerPlayer ?? 0)}`;
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

  const playAgain = () => {
    matchStore
      .save(toSavedMatch(createMatch(newSeed())))
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
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, shadowText, { color: won ? COLORS.accent : COLORS.them }]}>{won ? t('result.win') : t('result.lose')}</Text>
        {match.zapatero && (
          <Text style={styles.zapatero}>
            {t('call.zapatero')} {won ? t('result.zapatero') : t('result.zapateroThem')}
          </Text>
        )}
        <Text style={styles.section}>{t('result.final')}</Text>
        <View style={styles.scoreRow}>
          <View style={[styles.scoreBox, won && styles.winnerBox]}>
            <Text style={[styles.scoreTeam, { color: COLORS.us }]}>{t('team.us')}</Text>
            <Text style={styles.score}>{match.scores[0]}</Text>
          </View>
          <View style={[styles.scoreBox, !won && styles.winnerBox]}>
            <Text style={[styles.scoreTeam, { color: COLORS.them }]}>{t('team.them')}</Text>
            <Text style={styles.score}>{match.scores[1]}</Text>
          </View>
        </View>

        <Text style={styles.section}>{t('result.hands')}</Text>
        <View style={styles.table}>
          {match.history.map((r, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.handNo}>{t('result.handRow', { n: i + 1 })}</Text>
              <Text style={styles.handKind} numberOfLines={2}>
                {describeHand(r)}
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
          <ActionButton label={t('result.playAgain')} icon={RotateCcw} onPress={playAgain} />
          <ActionButton label={t('result.home')} icon={Home} variant="secondary" onPress={() => router.replace('/')} />
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
