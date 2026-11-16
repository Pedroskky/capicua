// IA básica: nunca mira manos ajenas. Solo recibe una `AiView` (su mano, las puntas y lo que todos vieron).
// Suelta primero las fichas de más puntos y evita dejar al rival una punta que puede jugar: por sus pases sabe
// qué números le faltan e intenta dejarle solo esos.
import { AI_WEIGHTS, MAX_PIP, PLAYERS } from '@/game/config';
import {
  legalMoves,
  lineEnds,
  nextPlayer,
  partnerOf,
  type Ends,
  type MatchState,
  type Move,
  type PublicEvent,
} from '@/game/engine';
import { hasNumber, isDouble, otherSide, pips, tileOf, type TileId } from '@/game/tiles';

/** Lo único que puede saber un jugador: su mano y lo que pasó en la mesa. */
export interface AiView {
  player: number;
  hand: TileId[];
  ends: Ends | null;
  log: PublicEvent[];
  handCounts: number[];
  /** Jugadas legales calculadas por el motor (no revelan nada de otras manos). */
  moves: Move[];
}

export function aiView(match: MatchState, player: number): AiView {
  const hand = match.hand;
  return {
    player,
    hand: [...hand.hands[player]],
    ends: lineEnds(hand.line),
    log: [...hand.log],
    handCounts: hand.hands.map((h) => h.length),
    moves: legalMoves(match, player),
  };
}

/** Números que cada jugador seguro que no tiene (pasó con esa punta en la mesa). */
export function knownMissing(log: readonly PublicEvent[]): Set<number>[] {
  const missing = Array.from({ length: PLAYERS }, () => new Set<number>());
  for (const e of log) {
    if (e.type === 'pass') {
      missing[e.player].add(e.ends[0]);
      missing[e.player].add(e.ends[1]);
    }
  }
  return missing;
}

/** Cuántas fichas con el número `n` puede tener todavía otro jugador (las 7 menos las vistas). */
function unseenWith(n: number, hand: readonly TileId[], log: readonly PublicEvent[]): number {
  let seen = 0;
  for (const id of hand) if (hasNumber(id, n)) seen++;
  for (const e of log) if (e.type === 'play' && hasNumber(e.tile, n)) seen++;
  return MAX_PIP + 1 - seen;
}

function endsAfter(ends: Ends | null, move: Move): Ends {
  const t = tileOf(move.tile);
  if (!ends) return [t.a, t.b];
  return move.end === 'left' ? [otherSide(move.tile, ends[0]), ends[1]] : [ends[0], otherSide(move.tile, ends[1])];
}

export function scoreMove(view: AiView, move: Move): number {
  if (view.hand.length === 1) return AI_WEIGHTS.domino;
  const missing = knownMissing(view.log);
  const after = endsAfter(view.ends, move);
  const rest = view.hand.filter((id) => id !== move.tile);
  const lacks = (p: number, n: number) => missing[p].has(n) || unseenWith(n, view.hand, view.log) <= 0;
  const blocked = (p: number) => lacks(p, after[0]) && lacks(p, after[1]);

  let score = pips(move.tile) * AI_WEIGHTS.pips;
  if (isDouble(move.tile)) score += AI_WEIGHTS.double;
  const nextOpponent = nextPlayer(view.player);
  const otherOpponent = partnerOf(nextOpponent);
  if (blocked(nextOpponent)) score += AI_WEIGHTS.blockNextOpponent;
  if (blocked(otherOpponent)) score += AI_WEIGHTS.blockOtherOpponent;
  if (blocked(partnerOf(view.player))) score += AI_WEIGHTS.blockPartner;
  const stillPlayable = rest.filter((id) => hasNumber(id, after[0]) || hasNumber(id, after[1])).length;
  score += stillPlayable * AI_WEIGHTS.keepControl;
  return score;
}

/** Elige jugada, o null si toca pasar. Siempre la misma para la misma vista (desempates fijos). */
export function chooseMove(view: AiView): Move | null {
  if (view.moves.length === 0) return null;
  let best: Move | null = null;
  let bestScore = -Infinity;
  for (const move of view.moves) {
    const score = scoreMove(view, move);
    const better =
      score > bestScore ||
      (score === bestScore && best !== null && (move.tile < best.tile || (move.tile === best.tile && move.end === 'left')));
    if (best === null || better) {
      best = move;
      bestScore = score;
    }
  }
  return best;
}
