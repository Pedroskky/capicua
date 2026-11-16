// Racha diaria (como en Jaque Épico). TypeScript puro: nada de React.
import { STREAK_REWARDS } from '@/game/config';
import { daysBetween } from '@/game/dates';

export interface StreakState {
  /** Días seguidos con al menos una partida terminada contra la máquina. */
  days: number;
  best: number;
  /** Último día (AAAAMMDD local) en que se apuntó actividad y se dio el premio. */
  lastDate: string;
}

export const EMPTY_STREAK: StreakState = { days: 0, best: 0, lastDate: '' };

export function streakReward(days: number): number {
  if (days <= 0) return 0;
  return STREAK_REWARDS[Math.min(days, STREAK_REWARDS.length) - 1];
}

/**
 * Apunta actividad hoy. Solo cuenta la primera del día.
 * - Ayer hubo actividad: la racha sube 1. Pasó al menos un día sin jugar: vuelve a 1.
 * - Si la fecha es igual o anterior a la última apuntada (otra actividad hoy, o la hora del móvil
 *   se movió hacia atrás), no cambia nada y no hay premio: así no se cobra dos veces.
 */
export function applyActivityToStreak(state: StreakState, today: string): { state: StreakState; reward: number } {
  const gap = state.lastDate ? daysBetween(state.lastDate, today) : Number.POSITIVE_INFINITY;
  if (Number.isNaN(gap) && state.lastDate) return { state, reward: 0 };
  if (gap <= 0) return { state, reward: 0 };
  const days = gap === 1 ? state.days + 1 : 1;
  return { state: { days, best: Math.max(state.best, days), lastDate: today }, reward: streakReward(days) };
}

/** Racha que se enseña hoy: si ayer o hoy hubo actividad sigue viva; si no, está rota (0). */
export function visibleStreak(state: StreakState, today: string): number {
  if (!state.lastDate) return 0;
  const gap = daysBetween(state.lastDate, today);
  return gap === 0 || gap === 1 ? state.days : 0;
}
