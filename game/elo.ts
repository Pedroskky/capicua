// ELO propio contra la máquina (fórmula de Elo, K = 32). TypeScript puro.
import { ELO_HISTORY, ELO_K, ELO_START, LEVEL_ELO, type AiLevel } from '@/game/config';

export function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + Math.pow(10, (opponent - rating) / 400));
}

/** Nuevo ELO tras una partida: score 1 = victoria, 0,5 = tablas, 0 = derrota. */
export function updateElo(rating: number, opponent: number, score: number, k = ELO_K): number {
  return Math.round(rating + k * (score - expectedScore(rating, opponent)));
}

export function levelRating(level: AiLevel): number {
  return LEVEL_ELO[level];
}

export interface EloState {
  rating: number;
  /** Últimos valores (el más reciente al final) para la gráfica. */
  history: number[];
}

export const INITIAL_ELO: EloState = { rating: ELO_START, history: [] };

export function applyEloGame(state: EloState, level: AiLevel, score: number): EloState {
  const rating = updateElo(state.rating, levelRating(level), score);
  return { rating, history: [...state.history, rating].slice(-ELO_HISTORY) };
}
