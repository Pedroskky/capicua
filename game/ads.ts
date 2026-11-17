// Reglas de los anuncios de Capicúa (cuándo se puede enseñar cada uno). TypeScript puro: nada de React ni del SDK.
// Misma estructura que en Jaque Épico; cambian los momentos y las recompensas.
import { DOUBLE_COINS_FACTOR, FREE_HINTS_PER_MATCH, INTERSTITIAL_MIN_GAMES_TODAY, INTERSTITIAL_MIN_SECONDS } from './config';
import type { Stats } from './stats';

/**
 * Dónde está el jugador cuando el juego se plantea un intersticial. Solo `matchOver` (terminó una partida a 100
 * y sale del resultado) lo permite; el resto existe para que las reglas digan explícitamente que ahí jamás sale uno.
 */
export type AdMoment = 'matchOver' | 'inHand' | 'handSummary' | 'tutorial';

export interface InterstitialState {
  /** Partidas terminadas hoy, contando la que acaba de terminar. */
  gamesToday: number;
  /** Último anuncio a pantalla completa (intersticial o vídeo con recompensa), en ms. 0 = ninguno. */
  lastAdAt: number;
}

/** Intersticial al terminar una partida: nunca la primera del día, nunca en mitad de una mano y como mucho 1 cada 3 min. */
export function shouldShowInterstitial(moment: AdMoment, state: InterstitialState, now: number): boolean {
  if (moment !== 'matchOver') return false;
  if (state.gamesToday < INTERSTITIAL_MIN_GAMES_TODAY) return false;
  if (state.lastAdAt > 0 && now - state.lastAdAt < INTERSTITIAL_MIN_SECONDS * 1000) return false;
  return true;
}

/** Partidas terminadas hoy (`today` = AAAAMMDD) según las estadísticas. */
export function gamesFinishedToday(stats: Stats, today: string): number {
  return stats.todayDate === today ? stats.gamesToday : 0;
}

/** Monedas extra al duplicar la recompensa de una victoria (lo que se suma a lo ya cobrado). */
export function doubleCoinsBonus(won: boolean, coins: number): number {
  if (!won || coins <= 0) return 0;
  return coins * (DOUBLE_COINS_FACTOR - 1);
}

/** Pistas que quedan en una partida (las gratis más las ganadas con vídeo, menos las usadas). */
export function hintsLeft(hintsUsed: number, hintsEarned: number): number {
  return Math.max(0, FREE_HINTS_PER_MATCH + hintsEarned - hintsUsed);
}

/** Pista gratis con vídeo: solo cuando ya no te quedan. */
export function canHintByAd(hintsUsed: number, hintsEarned: number): boolean {
  return hintsLeft(hintsUsed, hintsEarned) === 0;
}

/** Reintentar un rival del torneo sin perder la racha de victorias: al perder una partida del torneo con racha. */
export function canRetryKeepingStreak(tournament: number | null, won: boolean, winStreakBefore: number): boolean {
  return tournament !== null && !won && winStreakBefore > 0;
}
