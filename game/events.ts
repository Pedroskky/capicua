// Lo que cuenta de cada mano y de cada partida (para monedas, retos, racha, ELO, estadísticas y logros).
// Siempre desde el punto de vista del asiento 0 (tú). Dos en el teléfono no cuenta (son dos personas).
import type { AiLevel } from '@/game/config';
import type { MatchState } from '@/game/engine';

export interface HandEvent {
  type: 'hand';
  mode: 'partners' | 'single';
  level: AiLevel;
  /** Tu pareja (o tú) anotó la mano. */
  won: boolean;
  kind: 'domino' | 'tranque';
  /** Dominaste tú (asiento 0). */
  dominoSelf: boolean;
  /** Capicúa de tu pareja. */
  capicua: boolean;
  /** Puntos que anotó tu pareja en la mano. */
  points: number;
  tournament: boolean;
}

export interface MatchEvent {
  type: 'match';
  mode: 'partners' | 'single';
  level: AiLevel;
  won: boolean;
  /** Le diste zapatero al rival. */
  zapatero: boolean;
  /** [tus puntos, los del rival]. */
  scores: [number, number];
  /** Pareja del torneo (0–11) o null. */
  tournament: number | null;
}

/** Partida de Dos en el teléfono terminada (solo para un logro). */
export interface HotseatEvent {
  type: 'hotseat';
}

export type ActivityEvent = HandEvent | MatchEvent | HotseatEvent;

export function handEvent(match: MatchState): HandEvent | null {
  const r = match.hand.result;
  if (!r || match.mode === 'hotseat') return null;
  const won = r.winnerTeam === 0;
  return {
    type: 'hand',
    mode: match.mode,
    level: match.aiLevel,
    won,
    kind: r.kind,
    dominoSelf: r.kind === 'domino' && r.winnerPlayer === 0,
    capicua: won && r.capicua,
    points: won ? r.total : 0,
    tournament: match.tournament !== null,
  };
}

export function matchEvent(match: MatchState): MatchEvent | HotseatEvent | null {
  if (match.winnerTeam === null) return null;
  if (match.mode === 'hotseat') return { type: 'hotseat' };
  const won = match.winnerTeam === 0;
  return {
    type: 'match',
    mode: match.mode,
    level: match.aiLevel,
    won,
    zapatero: won && match.zapatero,
    scores: [match.scores[0], match.scores[1]],
    tournament: match.tournament,
  };
}
