// Almacenes de la fase 3 (todo con createStoredValue: sin almacenamiento el juego sigue).
// `capicua.progress` (monedas, tienda, torneo; PROGRESS_VERSION), `capicua.challenges`, `capicua.streak`,
// `capicua.stats` (estadísticas y ELO) y `capicua.achievements`.
import { normalizeAchievements } from '@/game/achievements';
import { EMPTY_DAILY, normalizeDaily, type DailyChallenges } from '@/game/challenges';
import { INITIAL_PROGRESS, normalizeProgress, type Progress } from '@/game/economy';
import { INITIAL_STATS, normalizeStats, type Stats } from '@/game/stats';
import { EMPTY_STREAK, type StreakState } from '@/game/streak';
import { createStoredValue } from '@/lib/storedValue';

function normalizeStreak(raw: unknown): StreakState {
  if (!raw || typeof raw !== 'object') return EMPTY_STREAK;
  const s = raw as Partial<StreakState>;
  const n = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : 0);
  return { days: n(s.days), best: Math.max(n(s.best), n(s.days)), lastDate: typeof s.lastDate === 'string' ? s.lastDate : '' };
}

export const progressStore = createStoredValue<Progress>('capicua.progress', INITIAL_PROGRESS, normalizeProgress);
export const dailyStore = createStoredValue<DailyChallenges>('capicua.challenges', EMPTY_DAILY, normalizeDaily);
export const streakStore = createStoredValue<StreakState>('capicua.streak', EMPTY_STREAK, normalizeStreak);
export const statsStore = createStoredValue<Stats>('capicua.stats', INITIAL_STATS, normalizeStats);
export const achievementsStore = createStoredValue<string[]>('capicua.achievements', [], normalizeAchievements);
