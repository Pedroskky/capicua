// Resumen de una mano: cómo terminó, fichas que quedaron (por jugador y pareja), puntos, capicúa, total y marcador.
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/game/config';
import type { HandResult, MatchState } from '@/game/engine';
import { tileOf } from '@/game/tiles';
import { ActionButton } from '@/components/ui/ActionButton';
import { FONTS } from '@/components/ui/theme';
import { playerName, t, teamName, type TranslationKey } from '@/lib/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ActivityReport } from '@/game/activity';
import { rival } from '@/game/tournament';
import { ShareButton } from '@/components/share/ShareButton';
import { matchShareCard } from '@/components/share/cards';

interface HandSummaryProps {
  match: MatchState;
  onNext: () => void;
  /** «Revisar la mano»: ver la mesa con todas las fichas descubiertas. */
  onReview: () => void;
  /** Monedas y retos que dio esta mano (null mientras se apunta o si no cuenta). */
  report?: ActivityReport | null;
}

/** Líneas de monedas, retos completados y logros nuevos de un informe (también para el resultado). */
export function RewardLines({ report }: { report: ActivityReport }) {
  if (report.coins === 0 && report.completedChallenges.length === 0 && report.newAchievements.length === 0) return null;
  return (
    <View style={styles.rewards}>
      {report.breakdown.map((b, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.label}>{t(`reward.${b.reason}` as TranslationKey, { n: report.streakDays ?? 0 })}</Text>
          <Text style={[styles.value, styles.bonus]}>+{b.amount}</Text>
        </View>
      ))}
      {report.completedChallenges.map((c) => (
        <Text key={c.id} style={styles.rewardNote}>
          {t('reward.challengeDone', { name: t(`challenge.${c.kind}` as TranslationKey, { n: c.target }) })}
        </Text>
      ))}
      {report.newAchievements.map((id) => (
        <Text key={id} style={styles.rewardNote}>
          {t('reward.achievement', { name: t(`ach.${id}` as TranslationKey) })}
        </Text>
      ))}
    </View>
  );
}

export function headline(result: HandResult, mode: MatchState['mode'], rivalId: string | null = null): string {
  if (result.kind === 'domino') return t('hand.domino', { name: playerName(result.winnerPlayer ?? 0, mode, rivalId) });
  return result.winnerTeam === null ? t('hand.tranqueTie') : t('hand.tranque');
}

function winsLine(match: MatchState, team: 0 | 1): string {
  if (match.mode === 'partners' && match.tournament !== null && team === 1) return t('hand.winsPlayer', { name: teamName(1, 'partners', rival(match.tournament).id) });
  if (match.mode === 'partners') return team === 0 ? t('hand.winsUs') : t('hand.winsThem');
  return t('hand.winsPlayer', { name: teamName(team, match.mode) });
}

export function HandSummary({ match, onNext, onReview, report }: HandSummaryProps) {
  const insets = useSafeAreaInsets();
  const mode = match.mode;
  const rivalId = match.tournament !== null ? rival(match.tournament).id : null;
  const seats = match.hand.hands.map((_, i) => i);
  const result = match.hand.result;
  if (!result) return null;
  const finished = match.winnerTeam !== null;
  const teamColor = result.winnerTeam === 0 ? COLORS.us : COLORS.them;
  return (
    <View style={[styles.backdrop, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.card}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{t('hand.title', { n: match.hand.number })}</Text>
          <Text style={styles.headline}>{headline(result, mode, rivalId)}</Text>
          {result.winnerTeam !== null && (
            <Text style={[styles.winner, { color: teamColor }]}>{winsLine(match, result.winnerTeam)}</Text>
          )}

          <Text style={styles.section}>{t('hand.pipsTitle')}</Text>
          {seats.map((seat) => (
            <View key={seat} style={styles.row}>
              <Text style={[styles.player, { color: seat % 2 === 0 ? COLORS.us : COLORS.them }]}>{playerName(seat, mode, rivalId)}</Text>
              <Text style={styles.tiles} numberOfLines={2}>
                {match.hand.hands[seat].length === 0
                  ? t('hand.noTiles')
                  : match.hand.hands[seat].map((id) => `${tileOf(id).a}|${tileOf(id).b}`).join('  ')}
              </Text>
              <Text style={styles.value}>{result.handPips[seat]}</Text>
            </View>
          ))}
          <View style={styles.row}>
            <Text style={styles.team}>{t('hand.pipsTeam', { team: teamName(0, mode, rivalId), n: result.teamPips[0] })}</Text>
            <Text style={styles.team}>{t('hand.pipsTeam', { team: teamName(1, mode, rivalId), n: result.teamPips[1] })}</Text>
          </View>

          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>{t('hand.points')}</Text>
            <Text style={styles.value}>{result.points}</Text>
          </View>
          {result.capicua && (
            <View style={styles.row}>
              <Text style={[styles.label, styles.bonus]}>{t('hand.capicuaBonus')}</Text>
              <Text style={[styles.value, styles.bonus]}>+{result.bonus}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.totalLabel}>{t('hand.total')}</Text>
            <Text style={styles.totalValue}>{result.total}</Text>
          </View>

          {report && <RewardLines report={report} />}

          <View style={styles.divider} />
          <Text style={styles.section}>{t('hand.score')}</Text>
          <View style={styles.scoreRow}>
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreTeam, { color: COLORS.us }]}>{teamName(0, mode, rivalId)}</Text>
              <Text style={styles.score}>{match.scores[0]}</Text>
            </View>
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreTeam, { color: COLORS.them }]}>{teamName(1, mode, rivalId)}</Text>
              <Text style={styles.score}>{match.scores[1]}</Text>
            </View>
          </View>
          <Text style={styles.target}>{t('game.target', { n: match.rules.targetScore })}</Text>

          <View style={styles.button}>
            <ActionButton label={finished ? t('hand.seeResult') : t('hand.next')} onPress={onNext} />
            <ActionButton label={t('hand.review')} variant="secondary" onPress={onReview} />
            {result.capicua && (mode === 'hotseat' || result.winnerTeam === 0) && <ShareButton card={matchShareCard('capicua', match)} />}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '92%',
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  content: {
    padding: 18,
    gap: 8,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 26,
    color: COLORS.accent,
    textAlign: 'center',
  },
  headline: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  winner: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  section: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  player: {
    width: 104,
    fontSize: 13,
    fontWeight: '800',
  },
  tiles: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  team: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  label: {
    fontSize: 15,
    color: COLORS.text,
  },
  value: {
    minWidth: 36,
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  bonus: {
    color: COLORS.accent,
  },
  rewards: {
    marginTop: 4,
    gap: 4,
  },
  rewardNote: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.us,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.accent,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.surfaceBorder,
    marginVertical: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 12,
  },
  scoreBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  scoreTeam: {
    fontSize: 14,
    fontWeight: '800',
  },
  score: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  target: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textMuted,
  },
  button: {
    marginTop: 10,
    alignItems: 'center',
    gap: 10,
  },
});
