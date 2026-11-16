// Todo lo que pasa al terminar una mano o una partida, de una vez: monedas, torneo, retos, racha, estadísticas,
// ELO y logros. Puro: lib/activity.ts carga y guarda los almacenes y llama a `applyActivity`.
import { newlyUnlocked } from '@/game/achievements';
import { applyEvent, challengesForToday, claim, type Challenge, type DailyChallenges } from '@/game/challenges';
import { addCoins, buy, handCoins, matchCoins, type Progress } from '@/game/economy';
import type { ActivityEvent } from '@/game/events';
import { applyStats, type Stats } from '@/game/stats';
import { applyActivityToStreak, type StreakState } from '@/game/streak';
import { applyTournamentResult } from '@/game/tournament';

export interface ActivityState {
  progress: Progress;
  daily: DailyChallenges;
  streak: StreakState;
  stats: Stats;
  achievements: string[];
}

export type CoinReason = 'hand' | 'capicua' | 'match' | 'zapatero' | 'tournament' | 'streak' | 'challenge';

export interface ActivityReport {
  coins: number;
  /** De dónde salen las monedas (para enseñarlo en el resumen). */
  breakdown: { reason: CoinReason; amount: number }[];
  completedChallenges: Challenge[];
  newAchievements: string[];
  streakDays: number | null;
  tournament: { stars: number; champion: boolean; unlockedNext: boolean } | null;
  eloBefore: number;
  eloAfter: number;
}

export function applyActivity(state: ActivityState, event: ActivityEvent, today: string): { state: ActivityState; report: ActivityReport } {
  const breakdown: ActivityReport['breakdown'] = [];
  let progress = state.progress;
  let streak = state.streak;
  let streakDays: number | null = null;
  let tournament: ActivityReport['tournament'] = null;
  const add = (reason: CoinReason, amount: number) => {
    if (amount > 0) {
      breakdown.push({ reason, amount });
      progress = addCoins(progress, amount);
    }
  };

  if (event.type === 'hand') {
    add('hand', handCoins(event.won, false));
    if (event.capicua) add('capicua', handCoins(true, true) - handCoins(true, false));
  } else if (event.type === 'match') {
    add('match', matchCoins(event.won, event.level, false));
    if (event.zapatero) add('zapatero', matchCoins(true, event.level, true) - matchCoins(true, event.level, false));
    if (event.tournament !== null) {
      const r = applyTournamentResult(progress, event.tournament, event.won, event.scores[0] - event.scores[1], event.zapatero);
      progress = r.progress;
      add('tournament', r.coins);
      tournament = { stars: r.stars, champion: r.champion, unlockedNext: r.unlockedNext };
    }
    // Racha: la primera partida terminada del día.
    const s = applyActivityToStreak(streak, today);
    if (s.state !== streak) {
      streak = s.state;
      streakDays = s.state.days;
      add('streak', s.reward);
    }
  }

  const { daily, completed } = applyEvent(challengesForToday(state.daily, today), event);
  const stats = applyStats(state.stats, event);
  const achievementsNew = newlyUnlocked({ stats, progress, streak }, state.achievements);
  const coins = breakdown.reduce((a, b) => a + b.amount, 0);
  return {
    state: { progress, daily, streak, stats, achievements: [...state.achievements, ...achievementsNew] },
    report: {
      coins,
      breakdown,
      completedChallenges: completed,
      newAchievements: achievementsNew,
      streakDays,
      tournament,
      eloBefore: state.stats.elo.rating,
      eloAfter: stats.elo.rating,
    },
  };
}

/** Cobrar un reto completado. */
export function claimChallenge(state: ActivityState, id: string, today: string): { state: ActivityState; reward: number; newAchievements: string[] } | null {
  const r = claim(challengesForToday(state.daily, today), id);
  if (!r) return null;
  const progress = addCoins(state.progress, r.reward);
  const stats = { ...state.stats, challengesClaimed: state.stats.challengesClaimed + 1 };
  const fresh = newlyUnlocked({ stats, progress, streak: state.streak }, state.achievements);
  return { state: { ...state, daily: r.daily, progress, stats, achievements: [...state.achievements, ...fresh] }, reward: r.reward, newAchievements: fresh };
}

/** Comprar en la tienda (cuenta para las estadísticas y los logros). */
export function purchase(state: ActivityState, id: string): { state: ActivityState; newAchievements: string[] } | null {
  const r = buy(state.progress, id);
  if (!r.ok) return null;
  const stats = { ...state.stats, purchases: state.stats.purchases + 1 };
  const fresh = newlyUnlocked({ stats, progress: r.progress, streak: state.streak }, state.achievements);
  return { state: { ...state, progress: r.progress, stats, achievements: [...state.achievements, ...fresh] }, newAchievements: fresh };
}
