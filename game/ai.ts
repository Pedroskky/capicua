// IA en 4 niveles. Nunca mira manos ajenas: solo recibe una `AiView` (su mano, las puntas, lo que todos vieron en
// la mesa —jugadas, pases y robos— y cuántas fichas tiene cada uno).
// - Principiante: juega cualquier ficha que quepa.
// - Jugador de plaza: suelta primero las fichas gordas y los dobles y conserva fichas para las puntas que quedan.
// - Veterano: además cuenta fichas y recuerda pases (sabe qué números le faltan a cada uno), tapa los números del
//   rival y respeta los de su compañero, y busca trancar cuando sus cuentas le dicen que gana el tranque.
// - Maestro: además estima la probabilidad de que cada jugador tenga cada número y juega a cerrarle al rival.
import { AI_TUNING, AI_WEIGHTS, MAX_PIP, type AiLevel } from '@/game/config';
import {
  legalMoves,
  lineEnds,
  teamOf,
  type Ends,
  type MatchState,
  type Move,
  type PublicEvent,
} from '@/game/engine';
import { TILES, hasNumber, isDouble, otherSide, pips, tileOf, type TileId } from '@/game/tiles';

/** Lo único que puede saber un jugador: su mano y lo que pasó en la mesa. */
export interface AiView {
  player: number;
  /** 2 o 4. */
  players: number;
  hand: TileId[];
  ends: Ends | null;
  log: PublicEvent[];
  handCounts: number[];
  boneyardCount: number;
  /** Jugadas legales calculadas por el motor (no revelan nada de otras manos). */
  moves: Move[];
  level: AiLevel;
  /** Reglas que importan para decidir un tranque. */
  tranqueTieGoesToBlocker: boolean;
}

export function aiView(match: MatchState, player: number, level: AiLevel = match.aiLevel): AiView {
  const hand = match.hand;
  return {
    player,
    players: hand.hands.length,
    hand: [...hand.hands[player]],
    ends: lineEnds(hand.line),
    log: [...hand.log],
    handCounts: hand.hands.map((h) => h.length),
    boneyardCount: hand.boneyard.length,
    moves: legalMoves(match, player),
    level,
    tranqueTieGoesToBlocker: match.rules.tranqueTie === 'blocker',
  };
}

/** Números que cada jugador seguro que no tiene (pasó, o robó, con esas puntas en la mesa). */
export function knownMissing(log: readonly PublicEvent[], players = 4): Set<number>[] {
  const missing = Array.from({ length: players }, () => new Set<number>());
  for (const e of log) {
    if (e.type === 'pass' || (e.type === 'draw' && e.ends)) {
      const ends = e.type === 'pass' ? e.ends : (e.ends as Ends);
      missing[e.player]?.add(ends[0]);
      missing[e.player]?.add(ends[1]);
    }
  }
  return missing;
}

interface Knowledge {
  view: AiView;
  /** Fichas que no he visto (en otras manos o en el pozo). */
  unseen: TileId[];
  missing: Set<number>[];
  /** Cuántas veces cada jugador dejó cada número de punta (señal de que lo tiene). */
  created: number[][];
  partner: number | null;
  opponents: number[];
  nextOpponent: number;
}

function buildKnowledge(view: AiView): Knowledge {
  const onTable = new Set<TileId>();
  const created = Array.from({ length: view.players }, () => new Array<number>(MAX_PIP + 1).fill(0));
  for (const e of view.log) {
    if (e.type !== 'play') continue;
    onTable.add(e.tile);
    const t = tileOf(e.tile);
    const madeEnd = e.endsBefore ? otherSide(e.tile, e.end === 'left' ? e.endsBefore[0] : e.endsBefore[1]) : null;
    if (madeEnd !== null) created[e.player][madeEnd]++;
    else {
      created[e.player][t.a]++;
      if (t.b !== t.a) created[e.player][t.b]++;
    }
  }
  const mine = new Set(view.hand);
  const unseen = TILES.map((t) => t.id).filter((id) => !onTable.has(id) && !mine.has(id));
  const partner = view.players === 4 ? (view.player + 2) % 4 : null;
  const opponents = Array.from({ length: view.players }, (_, p) => p).filter(
    (p) => teamOf(p, view.players) !== teamOf(view.player, view.players),
  );
  return {
    view,
    unseen,
    missing: knownMissing(view.log, view.players),
    created,
    partner,
    opponents,
    nextOpponent: (view.player + 1) % view.players,
  };
}

function endsAfter(ends: Ends | null, move: Move): Ends {
  const t = tileOf(move.tile);
  if (!ends) return [t.a, t.b];
  return move.end === 'left' ? [otherSide(move.tile, ends[0]), ends[1]] : [ends[0], otherSide(move.tile, ends[1])];
}

/** El número de la punta que tapa la jugada (null al salir). */
function coveredEnd(ends: Ends | null, move: Move): number | null {
  if (!ends) return null;
  return move.end === 'left' ? ends[0] : ends[1];
}

const fits = (id: TileId, e: Ends) => hasNumber(id, e[0]) || hasNumber(id, e[1]);

/** ¿Seguro que el jugador `p` no puede jugar con estas puntas? (por pases/robos, o porque no quedan fichas así). */
function surelyBlocked(k: Knowledge, p: number, e: Ends): boolean {
  const lacks = (n: number) => k.missing[p].has(n) || !k.unseen.some((id) => hasNumber(id, n));
  return lacks(e[0]) && lacks(e[1]);
}

/** Probabilidad de que cada ficha que no he visto esté en la mano de `p` (modelo de pesos por fichas en mano). */
function holdProbabilities(k: Knowledge): Map<TileId, number[]> {
  const v = k.view;
  const out = new Map<TileId, number[]>();
  for (const id of k.unseen) {
    const t = tileOf(id);
    const weights = v.handCounts.map((count, p) =>
      p === v.player || k.missing[p].has(t.a) || k.missing[p].has(t.b) ? 0 : count,
    );
    const pool = v.boneyardCount;
    const total = weights.reduce((a, b) => a + b, 0) + pool;
    out.set(
      id,
      weights.map((w) => (total > 0 ? w / total : 0)),
    );
  }
  return out;
}

/** Probabilidad de que `p` pueda jugar por alguna de las puntas. */
function canPlayProbability(k: Knowledge, probs: Map<TileId, number[]>, p: number, e: Ends): number {
  let none = 1;
  for (const id of k.unseen) if (fits(id, e)) none *= 1 - (probs.get(id)?.[p] ?? 0);
  return 1 - none;
}

/** Puntos que se espera que tenga `p` en la mano (media de las fichas que puede tener). */
function expectedPips(k: Knowledge, probs: Map<TileId, number[]>, p: number): number {
  let sum = 0;
  let weight = 0;
  for (const id of k.unseen) {
    const q = probs.get(id)?.[p] ?? 0;
    sum += q * pips(id);
    weight += q;
  }
  const count = k.view.handCounts[p];
  return weight > 0 ? (sum / weight) * count : count * 6;
}

/** Si la jugada tranca la mesa (seguro, con lo que sé): valor del tranque para mi equipo; si no, null. */
function tranqueValue(k: Knowledge, probs: Map<TileId, number[]>, after: Ends, rest: TileId[]): number | null {
  if (rest.some((id) => fits(id, after)) || k.unseen.some((id) => fits(id, after))) return null;
  const v = k.view;
  let mine = rest.reduce((s, id) => s + pips(id), 0);
  if (k.partner !== null) mine += expectedPips(k, probs, k.partner);
  const theirs = k.opponents.reduce((s, p) => s + expectedPips(k, probs, p), 0);
  const pot = mine + theirs;
  if (mine < theirs - AI_TUNING.tranqueMargin) return pot;
  if (Math.abs(mine - theirs) <= AI_TUNING.tranqueMargin && v.tranqueTieGoesToBlocker) return pot * 0.3;
  return -pot;
}

/** Hash pequeño y fijo de la vista (para que el principiante «elija al azar» pero siempre igual). */
function viewHash(view: AiView): number {
  let h = 2166136261;
  const mix = (n: number) => {
    h ^= n;
    h = Math.imul(h, 16777619) >>> 0;
  };
  view.hand.forEach(mix);
  mix(view.log.length);
  mix(view.player);
  if (view.ends) {
    mix(view.ends[0]);
    mix(view.ends[1]);
  }
  return h;
}

export function scoreMove(view: AiView, move: Move, k: Knowledge = buildKnowledge(view)): number {
  const W = AI_WEIGHTS;
  if (view.hand.length === 1) return W.domino;
  const after = endsAfter(view.ends, move);
  const rest = view.hand.filter((id) => id !== move.tile);
  let score = pips(move.tile) * W.pips;
  if (isDouble(move.tile)) score += W.double;
  const stillPlayable = rest.filter((id) => fits(id, after)).length;
  score += stillPlayable * W.keepControl;
  // Variedad: quedarse con números distintos para poder responder a más puntas.
  const numbers = new Set(rest.flatMap((id) => [tileOf(id).a, tileOf(id).b]));
  score += numbers.size * W.variety;
  if (view.level === 'plaza') return score;

  // Veterano y Maestro: cuentas, pases, señales de cada jugador y tranque.
  const covered = coveredEnd(view.ends, move);
  const probs = holdProbabilities(k);
  const urgency = (p: number) => (view.handCounts[p] <= 2 ? W.urgency : 1);
  if (view.level === 'veteran') {
    if (surelyBlocked(k, k.nextOpponent, after)) score += W.blockNextOpponent * urgency(k.nextOpponent);
    for (const o of k.opponents) if (o !== k.nextOpponent && surelyBlocked(k, o, after)) score += W.blockOtherOpponent * urgency(o);
    if (k.partner !== null && surelyBlocked(k, k.partner, after)) score += W.blockPartner;
  } else {
    // Maestro: probabilidades en vez de certezas.
    score -= canPlayProbability(k, probs, k.nextOpponent, after) * W.probNextOpponent * urgency(k.nextOpponent);
    for (const o of k.opponents) if (o !== k.nextOpponent) score -= canPlayProbability(k, probs, o, after) * W.probOtherOpponent * urgency(o);
    if (k.partner !== null) score += canPlayProbability(k, probs, k.partner, after) * W.probPartner * urgency(k.partner);
  }
  // Señales: tapar los números del rival, no tapar los del compañero.
  if (covered !== null) {
    for (const o of k.opponents) score += Math.min(2, k.created[o][covered]) * W.coverOpponentNumber;
    if (k.partner !== null) score -= Math.min(2, k.created[k.partner][covered]) * W.coverPartnerNumber;
  }
  if (k.partner !== null) for (const n of new Set(after)) score += Math.min(2, k.created[k.partner][n]) * W.openPartnerNumber;
  for (const o of k.opponents) for (const n of new Set(after)) score -= Math.min(2, k.created[o][n]) * W.openOpponentNumber;
  // Trancar solo si las cuentas dicen que gana mi equipo.
  const tranque = tranqueValue(k, probs, after, rest);
  if (tranque !== null) score += tranque * W.tranque;
  return score;
}

/** Elige jugada, o null si toca robar o pasar. Siempre la misma para la misma vista (desempates fijos). */
export function chooseMove(view: AiView): Move | null {
  if (view.moves.length === 0) return null;
  if (view.level === 'beginner') return view.moves[viewHash(view) % view.moves.length];
  const k = buildKnowledge(view);
  let best: Move | null = null;
  let bestScore = -Infinity;
  for (const move of view.moves) {
    const score = scoreMove(view, move, k);
    const better =
      score > bestScore + 1e-9 ||
      (Math.abs(score - bestScore) <= 1e-9 && best !== null && (move.tile < best.tile || (move.tile === best.tile && move.end === 'left')));
    if (best === null || better) {
      best = move;
      bestScore = score;
    }
  }
  return best;
}

/** La mejor jugada para el jugador (pista): la que elegiría el Maestro. */
export function bestMoveHint(match: MatchState, player: number): Move | null {
  return chooseMove(aiView(match, player, 'master'));
}

const LEVEL_ORDER: AiLevel[] = ['beginner', 'plaza', 'veteran', 'master'];

/** Nivel con el que juega cada asiento de la máquina: tu compañero juega siempre al menos como Veterano. */
export function aiLevelFor(match: MatchState, seat: number): AiLevel {
  if (match.mode === 'partners' && seat === 2) {
    return LEVEL_ORDER.indexOf(match.aiLevel) >= LEVEL_ORDER.indexOf('veteran') ? match.aiLevel : 'veteran';
  }
  return match.aiLevel;
}
