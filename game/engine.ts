// Motor del dominó por parejas (lógica pura, sin React). Estado inmutable: cada jugada devuelve un estado nuevo.
// Asientos: 0 = tú (abajo), 1 = derecha, 2 = compañero (arriba), 3 = izquierda. El turno pasa a la derecha
// (0 → 1 → 2 → 3). Parejas: 0 y 2 («nosotros», equipo 0) contra 1 y 3 («ellos», equipo 1).
import { DEFAULT_RULES, PLAYERS, type DominoRules } from '@/game/config';
import { nextRandom } from '@/game/random';
import { DOUBLE_SIX, TILE_COUNT, handPips, hasNumber, isDouble, otherSide, tileOf, type TileId } from '@/game/tiles';

export type Team = 0 | 1;
export type End = 'left' | 'right';
export type Ends = [number, number];

/** Una ficha en la mesa, con el número que queda a cada lado (de izquierda a derecha). */
export interface LinePiece {
  tile: TileId;
  left: number;
  right: number;
  player: number;
}

export interface Move {
  tile: TileId;
  end: End;
}

/** Lo que todos ven en la mesa (la IA solo puede usar esto y su propia mano). */
export type PublicEvent =
  | { type: 'play'; player: number; tile: TileId; end: End; endsBefore: Ends | null }
  | { type: 'pass'; player: number; ends: Ends };

export interface HandResult {
  kind: 'domino' | 'tranque';
  /** Pareja que anota (null = tranque empatado, nadie anota). */
  winnerTeam: Team | null;
  /** Quien dominó, o el jugador con menos puntos en el tranque. */
  winnerPlayer: number | null;
  /** Puntos de las fichas que quedaron en cada mano. */
  handPips: number[];
  /** Suma por pareja. */
  teamPips: [number, number];
  /** Puntos de las fichas que se lleva la pareja ganadora. */
  points: number;
  capicua: boolean;
  bonus: number;
  /** points + bonus. */
  total: number;
  /** Marcador después de esta mano. */
  scoresAfter: [number, number];
}

export interface HandState {
  /** 1 = primera mano de la partida. */
  number: number;
  starter: number;
  hands: TileId[][];
  line: LinePiece[];
  /** Posición en `line` de la ficha de salida. */
  origin: number;
  turn: number;
  log: PublicEvent[];
  result: HandResult | null;
}

export interface MatchState {
  rules: DominoRules;
  /** Estado del azar (para repartir la mano siguiente). */
  seed: number;
  scores: [number, number];
  hand: HandState;
  history: HandResult[];
  winnerTeam: Team | null;
  zapatero: boolean;
}

export function teamOf(player: number): Team {
  return (player % 2) as Team;
}

export function nextPlayer(player: number): number {
  return (player + 1) % PLAYERS;
}

export function partnerOf(player: number): number {
  return (player + 2) % PLAYERS;
}

export function lineEnds(line: readonly LinePiece[]): Ends | null {
  if (line.length === 0) return null;
  return [line[0].left, line[line.length - 1].right];
}

/** Baraja con semilla (Fisher-Yates). */
export function shuffle(seed: number): { order: TileId[]; seed: number } {
  const order = Array.from({ length: TILE_COUNT }, (_, i) => i);
  let s = seed;
  for (let i = order.length - 1; i > 0; i--) {
    const r = nextRandom(s);
    s = r.seed;
    const j = Math.floor(r.value * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { order, seed: s };
}

function sortHand(hand: TileId[]): TileId[] {
  return [...hand].sort((x, y) => {
    const a = tileOf(x);
    const b = tileOf(y);
    return a.b - b.b || a.a - b.a;
  });
}

export function dealHands(seed: number, rules: DominoRules): { hands: TileId[][]; seed: number } {
  const { order, seed: next } = shuffle(seed);
  const hands = Array.from({ length: PLAYERS }, (_, p) => sortHand(order.slice(p * rules.handSize, (p + 1) * rules.handSize)));
  return { hands, seed: next };
}

function createHand(number: number, starterHint: number, hands: TileId[][], rules: DominoRules): HandState {
  let starter = starterHint;
  if (number === 1 && rules.firstHandOpensWithDoubleSix) {
    const holder = hands.findIndex((h) => h.includes(DOUBLE_SIX));
    // Con menos de 7 fichas por jugador el doble seis puede quedarse dormido: sale quien se indicó.
    if (holder >= 0) starter = holder;
  }
  return { number, starter, hands, line: [], origin: 0, turn: starter, log: [], result: null };
}

export function createMatch(seed: number, rules: DominoRules = DEFAULT_RULES): MatchState {
  const dealt = dealHands(seed >>> 0, rules);
  return {
    rules,
    seed: dealt.seed,
    scores: [0, 0],
    hand: createHand(1, 0, dealt.hands, rules),
    history: [],
    winnerTeam: null,
    zapatero: false,
  };
}

/** ¿La ficha de salida está obligada (doble seis en la primera mano)? */
function forcedOpening(hand: HandState, rules: DominoRules): TileId | null {
  if (hand.line.length > 0 || hand.number !== 1 || !rules.firstHandOpensWithDoubleSix) return null;
  return hand.hands[hand.starter].includes(DOUBLE_SIX) ? DOUBLE_SIX : null;
}

function armLength(hand: HandState, end: End): number {
  return end === 'left' ? hand.origin : hand.line.length - 1 - hand.origin;
}

/** Jugadas posibles de una mano con estas puntas (también para la IA, que solo conoce su mano). */
export function movesForTiles(tiles: readonly TileId[], ends: Ends | null, preferredEqualEnd: End = 'right'): Move[] {
  const moves: Move[] = [];
  for (const tile of tiles) {
    if (!ends) {
      moves.push({ tile, end: 'left' });
      continue;
    }
    const left = hasNumber(tile, ends[0]);
    const right = hasNumber(tile, ends[1]);
    if (left && right && ends[0] === ends[1]) {
      // Las dos puntas son el mismo número: da igual por dónde, se ofrece una sola.
      moves.push({ tile, end: preferredEqualEnd });
      continue;
    }
    if (left) moves.push({ tile, end: 'left' });
    if (right) moves.push({ tile, end: 'right' });
  }
  return moves;
}

export function legalMoves(match: MatchState, player: number): Move[] {
  const hand = match.hand;
  if (hand.result) return [];
  const forced = forcedOpening(hand, match.rules);
  if (forced !== null) return player === hand.starter ? [{ tile: forced, end: 'left' }] : [];
  const preferred: End = armLength(hand, 'left') <= armLength(hand, 'right') ? 'left' : 'right';
  return movesForTiles(hand.hands[player], lineEnds(hand.line), preferred);
}

export function canPlay(match: MatchState, player: number): boolean {
  return legalMoves(match, player).length > 0;
}

export function isLegal(match: MatchState, player: number, move: Move): boolean {
  return legalMoves(match, player).some((m) => m.tile === move.tile && m.end === move.end);
}

/** Por qué puntas cabe una ficha (para preguntar al jugador cuando caben las dos). */
export function endsForTile(match: MatchState, player: number, tile: TileId): End[] {
  return legalMoves(match, player)
    .filter((m) => m.tile === tile)
    .map((m) => m.end);
}

function placePiece(hand: HandState, move: Move, player: number): { line: LinePiece[]; origin: number } {
  const t = tileOf(move.tile);
  const ends = lineEnds(hand.line);
  if (!ends) return { line: [{ tile: move.tile, left: t.a, right: t.b, player }], origin: 0 };
  if (move.end === 'left') {
    const piece = { tile: move.tile, left: otherSide(move.tile, ends[0]), right: ends[0], player };
    return { line: [piece, ...hand.line], origin: hand.origin + 1 };
  }
  const piece = { tile: move.tile, left: ends[1], right: otherSide(move.tile, ends[1]), player };
  return { line: [...hand.line, piece], origin: hand.origin };
}

function isCapicua(tile: TileId, endsBefore: Ends | null, rules: DominoRules): boolean {
  if (!endsBefore || rules.capicuaBonus <= 0) return false;
  const [x, y] = endsBefore;
  if (rules.capicuaNeedsDifferentEnds && x === y) return false;
  return hasNumber(tile, x) && hasNumber(tile, y) && (x !== y || isDouble(tile));
}

function finishMatchScores(match: MatchState, hand: HandState, result: Omit<HandResult, 'scoresAfter'>): MatchState {
  const scores: [number, number] = [...match.scores];
  if (result.winnerTeam !== null) scores[result.winnerTeam] += result.total;
  const full: HandResult = { ...result, scoresAfter: [scores[0], scores[1]] };
  let winnerTeam: Team | null = null;
  if (scores[0] >= match.rules.targetScore || scores[1] >= match.rules.targetScore) {
    winnerTeam = scores[0] >= scores[1] ? 0 : 1;
  }
  const loser = winnerTeam === null ? null : winnerTeam === 0 ? 1 : 0;
  return {
    ...match,
    scores,
    hand: { ...hand, result: full },
    history: [...match.history, full],
    winnerTeam,
    zapatero: loser !== null && match.rules.zapatero && scores[loser] === 0,
  };
}

function teamTotals(pipsByPlayer: number[]): [number, number] {
  return [pipsByPlayer[0] + pipsByPlayer[2], pipsByPlayer[1] + pipsByPlayer[3]];
}

function dominoResult(match: MatchState, hand: HandState, player: number, tile: TileId, endsBefore: Ends | null) {
  const pipsByPlayer = hand.hands.map(handPips);
  const team = teamOf(player);
  const teamPips = teamTotals(pipsByPlayer);
  const points = match.rules.dominoCounts === 'all' ? teamPips[0] + teamPips[1] : teamPips[team === 0 ? 1 : 0];
  const capicua = isCapicua(tile, endsBefore, match.rules);
  const bonus = capicua ? match.rules.capicuaBonus : 0;
  return finishMatchScores(match, hand, {
    kind: 'domino',
    winnerTeam: team,
    winnerPlayer: player,
    handPips: pipsByPlayer,
    teamPips,
    points,
    capicua,
    bonus,
    total: points + bonus,
  });
}

function tranqueResult(match: MatchState, hand: HandState, blocker: number) {
  const rules = match.rules;
  const pipsByPlayer = hand.hands.map(handPips);
  const teamPips = teamTotals(pipsByPlayer);
  let winnerTeam: Team | null = null;
  let winnerPlayer: number | null = null;
  if (rules.tranqueCompare === 'team') {
    if (teamPips[0] !== teamPips[1]) winnerTeam = teamPips[0] < teamPips[1] ? 0 : 1;
  } else {
    const min = Math.min(...pipsByPlayer);
    const teams = new Set(pipsByPlayer.flatMap((p, i) => (p === min ? [teamOf(i)] : [])));
    if (teams.size === 1) winnerTeam = [...teams][0];
  }
  if (winnerTeam === null && rules.tranqueTie === 'blocker') winnerTeam = teamOf(blocker);
  if (winnerTeam !== null) {
    // El jugador de la pareja ganadora con menos puntos (el que «gana el tranque»).
    const members = [winnerTeam, winnerTeam + 2];
    winnerPlayer = pipsByPlayer[members[0]] <= pipsByPlayer[members[1]] ? members[0] : members[1];
  }
  const points =
    winnerTeam === null ? 0 : rules.tranqueCounts === 'all' ? teamPips[0] + teamPips[1] : teamPips[winnerTeam === 0 ? 1 : 0];
  return finishMatchScores(match, hand, {
    kind: 'tranque',
    winnerTeam,
    winnerPlayer,
    handPips: pipsByPlayer,
    teamPips,
    points,
    capicua: false,
    bonus: 0,
    total: points,
  });
}

export class IllegalMoveError extends Error {}

/** Juega una ficha del jugador que tiene el turno. */
export function playMove(match: MatchState, move: Move): MatchState {
  const hand = match.hand;
  const player = hand.turn;
  if (match.winnerTeam !== null || hand.result) throw new IllegalMoveError('La mano ya terminó');
  if (!isLegal(match, player, move)) throw new IllegalMoveError(`Jugada ilegal: ficha ${move.tile} por ${move.end}`);
  const endsBefore = lineEnds(hand.line);
  const { line, origin } = placePiece(hand, move, player);
  const hands = hand.hands.map((h, i) => (i === player ? h.filter((id) => id !== move.tile) : h));
  const next: HandState = {
    ...hand,
    hands,
    line,
    origin,
    turn: nextPlayer(player),
    log: [...hand.log, { type: 'play', player, tile: move.tile, end: move.end, endsBefore }],
  };
  if (hands[player].length === 0) return dominoResult(match, next, player, move.tile, endsBefore);
  const after: MatchState = { ...match, hand: next };
  if (![0, 1, 2, 3].some((p) => canPlay(after, p))) return tranqueResult(match, next, player);
  return after;
}

/** «Paso»: solo cuando el jugador del turno no puede jugar. */
export function passTurn(match: MatchState): MatchState {
  const hand = match.hand;
  const player = hand.turn;
  const ends = lineEnds(hand.line);
  if (match.winnerTeam !== null || hand.result || !ends) throw new IllegalMoveError('No se puede pasar ahora');
  if (canPlay(match, player)) throw new IllegalMoveError('Solo se pasa cuando no se puede jugar');
  return {
    ...match,
    hand: { ...hand, turn: nextPlayer(player), log: [...hand.log, { type: 'pass', player, ends }] },
  };
}

/** Reparte la mano siguiente (tras el resumen de la anterior). */
export function startNextHand(match: MatchState): MatchState {
  const prev = match.hand;
  if (!prev.result) throw new IllegalMoveError('La mano no ha terminado');
  if (match.winnerTeam !== null) throw new IllegalMoveError('La partida ya terminó');
  const dealt = dealHands(match.seed, match.rules);
  const starter =
    match.rules.nextStarter === 'handWinner' && prev.result.winnerPlayer !== null ? prev.result.winnerPlayer : nextPlayer(prev.starter);
  return { ...match, seed: dealt.seed, hand: createHand(prev.number + 1, starter, dealt.hands, match.rules) };
}
