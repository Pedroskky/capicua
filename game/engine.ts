// Motor del dominó (lógica pura, sin React). Estado inmutable: cada jugada devuelve un estado nuevo.
// Parejas (4 jugadores): asientos 0 = tú (abajo), 1 = derecha, 2 = compañero (arriba), 3 = izquierda. El turno pasa
// a la derecha (0 → 1 → 2 → 3). Parejas: 0 y 2 (equipo 0) contra 1 y 3 (equipo 1).
// Mano a mano y Dos en el teléfono (2 jugadores): asientos 0 y 1, cada uno es su propio «equipo», y quien no puede
// jugar roba del pozo hasta poder (si el pozo está vacío, pasa).
import { DEFAULT_RULES, MAX_PIP, type AiLevel, type DominoRules } from '@/game/config';
import { nextRandom } from '@/game/random';
import { TILE_COUNT, handPips, hasNumber, otherSide, tileId, tileOf, type TileId } from '@/game/tiles';

export type Team = 0 | 1;
export type End = 'left' | 'right';
export type Ends = [number, number];
/** Parejas contra la máquina, mano a mano contra la máquina, o dos personas en el mismo teléfono (mano a mano). */
export type GameMode = 'partners' | 'single' | 'hotseat';

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

/** Lo que todos ven en la mesa (la IA solo puede usar esto y su propia mano). Al robar solo se ve que robó. */
export type PublicEvent =
  | { type: 'play'; player: number; tile: TileId; end: End; endsBefore: Ends | null }
  | { type: 'pass'; player: number; ends: Ends }
  | { type: 'draw'; player: number; ends: Ends | null };

export interface HandResult {
  kind: 'domino' | 'tranque';
  /** Equipo que anota (null = tranque empatado, nadie anota). En mano a mano, el equipo es el jugador. */
  winnerTeam: Team | null;
  /** Quien dominó, o el jugador con menos puntos en el tranque. */
  winnerPlayer: number | null;
  /** Puntos de las fichas que quedaron en cada mano. */
  handPips: number[];
  /** Suma por equipo. */
  teamPips: [number, number];
  /** Puntos de las fichas que se lleva el equipo ganador. */
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
  /** Ficha con la que hay que salir (doble más alto en la primera mano), o null si vale cualquiera. */
  opening: TileId | null;
  hands: TileId[][];
  /** Fichas sin repartir (en parejas quedan 0; en mano a mano es el pozo para robar). */
  boneyard: TileId[];
  line: LinePiece[];
  /** Posición en `line` de la ficha de salida. */
  origin: number;
  turn: number;
  log: PublicEvent[];
  result: HandResult | null;
}

export interface MatchState {
  mode: GameMode;
  rules: DominoRules;
  /** Nivel de los jugadores de la máquina. */
  aiLevel: AiLevel;
  /** Estado del azar (para repartir la mano siguiente). */
  seed: number;
  scores: [number, number];
  hand: HandState;
  history: HandResult[];
  winnerTeam: Team | null;
  zapatero: boolean;
  /** Pareja del Torneo del barrio (0–11) o null. */
  tournament: number | null;
  /** Manos ya apuntadas en monedas, retos y estadísticas (para no contarlas dos veces al volver a abrir). */
  recordedHands: number;
  /** La partida terminada ya se apuntó. */
  recordedMatch: boolean;
}

export interface MatchOptions {
  mode?: GameMode;
  aiLevel?: AiLevel;
  tournament?: number | null;
}

export function playersFor(mode: GameMode): number {
  return mode === 'partners' ? 4 : 2;
}

export function playerCount(match: MatchState): number {
  return match.hand.hands.length;
}

export function teamOf(player: number, players = 4): Team {
  return (players === 2 ? player : player % 2) as Team;
}

export function nextPlayer(player: number, players = 4): number {
  return (player + 1) % players;
}

/** Compañero (solo en parejas). */
export function partnerOf(player: number): number {
  return (player + 2) % 4;
}

/** Asientos de la máquina (los demás son personas). */
export function isHumanSeat(match: MatchState, seat: number): boolean {
  return seat === 0 || (match.mode === 'hotseat' && seat === 1);
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

export function dealHands(seed: number, rules: DominoRules, players = 4): { hands: TileId[][]; boneyard: TileId[]; seed: number } {
  const { order, seed: next } = shuffle(seed);
  const hands = Array.from({ length: players }, (_, p) => sortHand(order.slice(p * rules.handSize, (p + 1) * rules.handSize)));
  return { hands, boneyard: order.slice(players * rules.handSize), seed: next };
}

/** El doble más alto que tiene alguien: [jugador, ficha] o null. */
function highestDouble(hands: TileId[][]): [number, TileId] | null {
  for (let n = MAX_PIP; n >= 0; n--) {
    const id = tileId(n, n);
    const holder = hands.findIndex((h) => h.includes(id));
    if (holder >= 0) return [holder, id];
  }
  return null;
}

function createHand(number: number, starterHint: number, dealt: { hands: TileId[][]; boneyard: TileId[] }, rules: DominoRules): HandState {
  let starter = starterHint;
  let opening: TileId | null = null;
  if (number === 1 && rules.firstHandOpensWithDoubleSix) {
    // En parejas se reparten las 28 y siempre sale el doble seis; en mano a mano puede estar en el pozo y
    // sale el doble más alto que haya en las manos.
    const found = highestDouble(dealt.hands);
    if (found) [starter, opening] = found;
  }
  return {
    number,
    starter,
    opening,
    hands: dealt.hands,
    boneyard: dealt.boneyard,
    line: [],
    origin: 0,
    turn: starter,
    log: [],
    result: null,
  };
}

export function createMatch(seed: number, rules: DominoRules = DEFAULT_RULES, options: MatchOptions = {}): MatchState {
  const mode = options.mode ?? 'partners';
  const dealt = dealHands(seed >>> 0, rules, playersFor(mode));
  return {
    mode,
    rules,
    aiLevel: options.aiLevel ?? 'veteran',
    seed: dealt.seed,
    scores: [0, 0],
    hand: createHand(1, 0, dealt, rules),
    history: [],
    winnerTeam: null,
    zapatero: false,
    tournament: options.tournament ?? null,
    recordedHands: 0,
    recordedMatch: false,
  };
}

function armLength(hand: HandState, end: End): number {
  return end === 'left' ? hand.origin : hand.line.length - 1 - hand.origin;
}

/** Jugadas posibles de unas fichas con estas puntas (también para la IA, que solo conoce su mano). */
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
  if (hand.line.length === 0 && hand.opening !== null) {
    return player === hand.starter && hand.hands[player].includes(hand.opening) ? [{ tile: hand.opening, end: 'left' }] : [];
  }
  const preferred: End = armLength(hand, 'left') <= armLength(hand, 'right') ? 'left' : 'right';
  return movesForTiles(hand.hands[player], lineEnds(hand.line), preferred);
}

export function canPlay(match: MatchState, player: number): boolean {
  return legalMoves(match, player).length > 0;
}

/** ¿Puede robar el jugador del turno? (solo con 2 jugadores, sin jugada posible y con fichas en el pozo). */
export function canDraw(match: MatchState): boolean {
  const hand = match.hand;
  return !hand.result && hand.hands.length === 2 && hand.boneyard.length > 0 && !canPlay(match, hand.turn);
}

/** ¿Tiene que pasar el jugador del turno? */
export function mustPass(match: MatchState): boolean {
  const hand = match.hand;
  return !hand.result && hand.line.length > 0 && !canPlay(match, hand.turn) && !canDraw(match);
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

/** Coloca la ficha: por la izquierda queda [otra mitad | punta]; por la derecha [punta | otra mitad]. */
export function placePiece(line: readonly LinePiece[], origin: number, move: Move, player: number): { line: LinePiece[]; origin: number } {
  const t = tileOf(move.tile);
  const ends = lineEnds(line);
  if (!ends) return { line: [{ tile: move.tile, left: t.a, right: t.b, player }], origin: 0 };
  if (move.end === 'left') {
    const piece = { tile: move.tile, left: otherSide(move.tile, ends[0]), right: ends[0], player };
    return { line: [piece, ...line], origin: origin + 1 };
  }
  const piece = { tile: move.tile, left: ends[1], right: otherSide(move.tile, ends[1]), player };
  return { line: [...line, piece], origin };
}

/** ¿Cada ficha de la fila comparte número con su vecina? */
export function isChainValid(line: readonly LinePiece[]): boolean {
  for (let i = 0; i < line.length; i++) {
    const t = tileOf(line[i].tile);
    const sameTile = (t.a === line[i].left && t.b === line[i].right) || (t.b === line[i].left && t.a === line[i].right);
    if (!sameTile) return false;
    if (i + 1 < line.length && line[i].right !== line[i + 1].left) return false;
  }
  return true;
}

export function isCapicua(tile: TileId, endsBefore: Ends | null, rules: DominoRules): boolean {
  if (!endsBefore || rules.capicuaBonus <= 0) return false;
  const [x, y] = endsBefore;
  if (x === y) return !rules.capicuaNeedsDifferentEnds && hasNumber(tile, x);
  return hasNumber(tile, x) && hasNumber(tile, y);
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
  if (pipsByPlayer.length === 2) return [pipsByPlayer[0], pipsByPlayer[1]];
  return [pipsByPlayer[0] + pipsByPlayer[2], pipsByPlayer[1] + pipsByPlayer[3]];
}

function teamMembers(team: Team, players: number): number[] {
  return players === 2 ? [team] : [team, team + 2];
}

function dominoResult(match: MatchState, hand: HandState, player: number, tile: TileId, endsBefore: Ends | null) {
  const players = hand.hands.length;
  const pipsByPlayer = hand.hands.map(handPips);
  const team = teamOf(player, players);
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
  const players = hand.hands.length;
  const pipsByPlayer = hand.hands.map(handPips);
  const teamPips = teamTotals(pipsByPlayer);
  let winnerTeam: Team | null = null;
  let winnerPlayer: number | null = null;
  if (rules.tranqueCompare === 'team' || players === 2) {
    if (teamPips[0] !== teamPips[1]) winnerTeam = teamPips[0] < teamPips[1] ? 0 : 1;
  } else {
    const min = Math.min(...pipsByPlayer);
    const teams = new Set(pipsByPlayer.flatMap((p, i) => (p === min ? [teamOf(i, players)] : [])));
    if (teams.size === 1) winnerTeam = [...teams][0];
  }
  if (winnerTeam === null && rules.tranqueTie === 'blocker') winnerTeam = teamOf(blocker, players);
  if (winnerTeam !== null) {
    // El jugador del equipo ganador con menos puntos (el que «gana el tranque»).
    const members = teamMembers(winnerTeam, players);
    winnerPlayer = members.reduce((best, p) => (pipsByPlayer[p] < pipsByPlayer[best] ? p : best), members[0]);
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

/** Mesa trancada: ninguna ficha que quede (en manos o en el pozo) cabe por ninguna punta. */
export function isBlocked(hand: Pick<HandState, 'hands' | 'boneyard' | 'line'>): boolean {
  const ends = lineEnds(hand.line);
  if (!ends) return false;
  const fits = (id: TileId) => hasNumber(id, ends[0]) || hasNumber(id, ends[1]);
  return !hand.hands.some((h) => h.some(fits)) && !hand.boneyard.some(fits);
}

export class IllegalMoveError extends Error {}

/** Juega una ficha del jugador que tiene el turno. */
export function playMove(match: MatchState, move: Move): MatchState {
  const hand = match.hand;
  const player = hand.turn;
  const players = hand.hands.length;
  if (match.winnerTeam !== null || hand.result) throw new IllegalMoveError('La mano ya terminó');
  if (!isLegal(match, player, move)) throw new IllegalMoveError(`Jugada ilegal: ficha ${move.tile} por ${move.end}`);
  const endsBefore = lineEnds(hand.line);
  const { line, origin } = placePiece(hand.line, hand.origin, move, player);
  const hands = hand.hands.map((h, i) => (i === player ? h.filter((id) => id !== move.tile) : h));
  const next: HandState = {
    ...hand,
    hands,
    line,
    origin,
    turn: nextPlayer(player, players),
    log: [...hand.log, { type: 'play', player, tile: move.tile, end: move.end, endsBefore }],
  };
  if (hands[player].length === 0) return dominoResult(match, next, player, move.tile, endsBefore);
  if (isBlocked(next)) return tranqueResult(match, next, player);
  return { ...match, hand: next };
}

/** «Paso»: solo cuando el jugador del turno no puede jugar ni robar. */
export function passTurn(match: MatchState): MatchState {
  const hand = match.hand;
  const player = hand.turn;
  const ends = lineEnds(hand.line);
  if (match.winnerTeam !== null || hand.result || !ends) throw new IllegalMoveError('No se puede pasar ahora');
  if (canPlay(match, player)) throw new IllegalMoveError('Solo se pasa cuando no se puede jugar');
  if (canDraw(match)) throw new IllegalMoveError('Hay que robar del pozo');
  return {
    ...match,
    hand: { ...hand, turn: nextPlayer(player, hand.hands.length), log: [...hand.log, { type: 'pass', player, ends }] },
  };
}

/** Robar una ficha del pozo (mano a mano, cuando no se puede jugar). El turno sigue siendo del mismo jugador. */
export function drawTile(match: MatchState): MatchState {
  if (match.winnerTeam !== null || !canDraw(match)) throw new IllegalMoveError('No se puede robar ahora');
  const hand = match.hand;
  const player = hand.turn;
  const [tile, ...boneyard] = hand.boneyard;
  const hands = hand.hands.map((h, i) => (i === player ? sortHand([...h, tile]) : h));
  return {
    ...match,
    hand: { ...hand, hands, boneyard, log: [...hand.log, { type: 'draw', player, ends: lineEnds(hand.line) }] },
  };
}

/** Reparte la mano siguiente (tras el resumen de la anterior). */
export function startNextHand(match: MatchState): MatchState {
  const prev = match.hand;
  if (!prev.result) throw new IllegalMoveError('La mano no ha terminado');
  if (match.winnerTeam !== null) throw new IllegalMoveError('La partida ya terminó');
  const players = prev.hands.length;
  const dealt = dealHands(match.seed, match.rules, players);
  const starter =
    match.rules.nextStarter === 'handWinner' && prev.result.winnerPlayer !== null
      ? prev.result.winnerPlayer
      : nextPlayer(prev.starter, players);
  return { ...match, seed: dealt.seed, hand: createHand(prev.number + 1, starter, dealt, match.rules) };
}

/** Cuántas fichas de cada número (0–6) hay ya en la mesa (ayuda «contador de fichas»). Un doble cuenta una vez. */
export function playedByNumber(line: readonly LinePiece[]): number[] {
  const counts = new Array<number>(MAX_PIP + 1).fill(0);
  for (const p of line) {
    const t = tileOf(p.tile);
    counts[t.a]++;
    if (t.b !== t.a) counts[t.b]++;
  }
  return counts;
}
