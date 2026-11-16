import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, type DominoRules } from './config';
import {
  canPlay,
  createMatch,
  endsForTile,
  IllegalMoveError,
  legalMoves,
  lineEnds,
  nextPlayer,
  passTurn,
  playMove,
  startNextHand,
  teamOf,
  type HandState,
  type MatchState,
} from './engine';
import { DOUBLE_SIX, TILE_COUNT, handPips, tileId } from './tiles';
import { aiView, chooseMove } from './ai';

/** Juega la mano entera con la IA en los cuatro asientos. */
function playHandWithAi(match: MatchState): MatchState {
  let m = match;
  let guard = 0;
  while (!m.hand.result) {
    const move = chooseMove(aiView(m, m.hand.turn));
    m = move ? playMove(m, move) : passTurn(m);
    if (++guard > 200) throw new Error('mano infinita');
  }
  return m;
}

/** Partida preparada a mano (manos concretas). */
function withHands(hands: number[][], opts: Partial<HandState> = {}, rules: DominoRules = DEFAULT_RULES): MatchState {
  const base = createMatch(1, rules);
  return { ...base, hand: { ...base.hand, number: 2, starter: 0, turn: 0, hands, line: [], origin: 0, log: [], result: null, ...opts } };
}

const T = tileId;

describe('reparto', () => {
  it('28 fichas distintas, 7 por jugador', () => {
    const m = createMatch(42);
    const all = m.hand.hands.flat();
    expect(m.hand.hands.every((h) => h.length === 7)).toBe(true);
    expect(new Set(all).size).toBe(TILE_COUNT);
  });

  it('el reparto depende de la semilla y se repite con la misma', () => {
    expect(createMatch(7).hand.hands).toEqual(createMatch(7).hand.hands);
    expect(createMatch(7).hand.hands).not.toEqual(createMatch(8).hand.hands);
  });

  it('primera mano: sale quien tiene el doble seis y tiene que salir con él', () => {
    for (let seed = 1; seed < 30; seed++) {
      const m = createMatch(seed);
      expect(m.hand.hands[m.hand.starter]).toContain(DOUBLE_SIX);
      expect(m.hand.turn).toBe(m.hand.starter);
      expect(legalMoves(m, m.hand.starter)).toEqual([{ tile: DOUBLE_SIX, end: 'left' }]);
      for (const p of [0, 1, 2, 3].filter((p) => p !== m.hand.starter)) expect(legalMoves(m, p)).toEqual([]);
    }
  });

  it('turno a la derecha y parejas enfrentadas', () => {
    expect([0, 1, 2, 3].map(nextPlayer)).toEqual([1, 2, 3, 0]);
    expect([0, 1, 2, 3].map(teamOf)).toEqual([0, 1, 0, 1]);
  });
});

describe('jugadas', () => {
  it('se juega por las dos puntas y la fila queda bien orientada', () => {
    let m = withHands([[T(3, 5), T(0, 0)], [T(5, 6), T(1, 1)], [T(2, 3), T(1, 2)], [T(4, 4), T(1, 3)]]);
    m = playMove(m, { tile: T(3, 5), end: 'left' });
    expect(lineEnds(m.hand.line)).toEqual([3, 5]);
    expect(endsForTile(m, 1, T(5, 6))).toEqual(['right']);
    m = playMove(m, { tile: T(5, 6), end: 'right' });
    expect(lineEnds(m.hand.line)).toEqual([3, 6]);
    m = playMove(m, { tile: T(2, 3), end: 'left' });
    expect(lineEnds(m.hand.line)).toEqual([2, 6]);
    expect(m.hand.origin).toBe(1);
    expect(m.hand.line.map((p) => [p.left, p.right])).toEqual([
      [2, 3],
      [3, 5],
      [5, 6],
    ]);
  });

  it('rechaza jugadas ilegales, fuera de turno o fichas ajenas', () => {
    let m = withHands([[T(3, 5), T(0, 0)], [T(5, 6), T(1, 1)], [T(2, 3)], [T(4, 4)]]);
    m = playMove(m, { tile: T(3, 5), end: 'left' });
    expect(() => playMove(m, { tile: T(1, 1), end: 'left' })).toThrow(IllegalMoveError);
    expect(() => playMove(m, { tile: T(0, 0), end: 'left' })).toThrow(IllegalMoveError);
    expect(() => playMove(m, { tile: T(5, 6), end: 'left' })).toThrow(IllegalMoveError);
  });

  it('una ficha que cabe en las dos puntas ofrece las dos', () => {
    let m = withHands([[T(3, 5), T(0, 0)], [T(3, 6), T(5, 6)], [T(2, 2)], [T(4, 4)]]);
    m = playMove(m, { tile: T(3, 5), end: 'left' });
    expect(endsForTile(m, 1, T(3, 6)).sort()).toEqual(['left']);
    m = { ...m, hand: { ...m.hand, line: [{ tile: T(3, 5), left: 3, right: 6, player: 0 }] } };
    expect(endsForTile(m, 1, T(3, 6)).sort()).toEqual(['left', 'right']);
  });

  it('«paso» solo cuando no se puede jugar', () => {
    let m = withHands([[T(3, 5), T(0, 0)], [T(1, 1), T(2, 4)], [T(5, 5), T(0, 1)], [T(4, 4)]]);
    m = playMove(m, { tile: T(3, 5), end: 'left' });
    expect(canPlay(m, 1)).toBe(false);
    m = passTurn(m);
    expect(m.hand.turn).toBe(2);
    expect(m.hand.log.at(-1)).toEqual({ type: 'pass', player: 1, ends: [3, 5] });
    expect(() => passTurn(m)).toThrow(IllegalMoveError);
  });
});

describe('fin de mano', () => {
  it('dominó: la pareja ganadora suma todas las fichas que quedan en las manos', () => {
    let m = withHands([[T(3, 5), T(0, 0)], [T(1, 1), T(2, 4)], [T(5, 6)], [T(4, 4), T(6, 6)]]);
    m = playMove(m, { tile: T(3, 5), end: 'left' });
    m = passTurn(m);
    m = playMove(m, { tile: T(5, 6), end: 'right' });
    const r = m.hand.result!;
    expect(r.kind).toBe('domino');
    expect(r.winnerTeam).toBe(0);
    expect(r.winnerPlayer).toBe(2);
    expect(r.points).toBe(0 + 2 + 6 + 8 + 12);
    expect(r.capicua).toBe(false);
    expect(m.scores).toEqual([28, 0]);
  });

  it('capicúa: +25 si la última ficha cabe por las dos puntas', () => {
    const line = [
      { tile: T(3, 4), left: 3, right: 4, player: 1 },
      { tile: T(4, 6), left: 4, right: 6, player: 2 },
    ];
    let m = withHands([[T(3, 6)], [T(1, 1)], [T(2, 2)], [T(0, 0)]], { line });
    m = playMove(m, { tile: T(3, 6), end: 'right' });
    const r = m.hand.result!;
    expect(r.capicua).toBe(true);
    expect(r.bonus).toBe(25);
    expect(r.total).toBe(2 + 4 + 0 + 25);
  });

  it('sin capicúa si las dos puntas son el mismo número', () => {
    const line = [{ tile: T(3, 3), left: 3, right: 3, player: 1 }];
    const m = playMove(withHands([[T(3, 6)], [T(1, 1)], [T(2, 2)], [T(0, 0)]], { line }), { tile: T(3, 6), end: 'left' });
    expect(m.hand.result!.capicua).toBe(false);
  });

  it('tranque: gana la pareja con menos puntos en la mano y se lleva la suma', () => {
    // Todas las fichas con 0 y 6 fuera salvo la que cierra: tras jugarla nadie puede.
    const line = [
      { tile: T(0, 1), left: 0, right: 1, player: 1 },
      { tile: T(1, 6), left: 1, right: 6, player: 2 },
    ];
    const used = [T(0, 1), T(1, 6), T(0, 6)];
    const zeros = [0, 2, 3, 4, 5].map((n) => T(0, n)).filter((t) => !used.includes(t));
    const sixes = [2, 3, 4, 5, 6].map((n) => T(6, n)).filter((t) => !used.includes(t));
    const lineFull = [
      ...zeros.map((t) => ({ tile: t, left: 0, right: 0, player: 3 })),
      ...line,
      ...sixes.map((t) => ({ tile: t, left: 6, right: 6, player: 3 })),
    ];
    // La línea «falsa» de arriba solo sirve para que esas fichas no estén en ninguna mano; las puntas reales son 0 y 6.
    const realLine = [{ ...lineFull[0], left: 0 }, ...lineFull.slice(1, -1), { ...lineFull[lineFull.length - 1], right: 6 }];
    let m = withHands([[T(0, 6), T(1, 1)], [T(5, 5), T(4, 4)], [T(1, 2)], [T(3, 3)]], { line: realLine, origin: zeros.length });
    m = playMove(m, { tile: T(0, 6), end: 'left' });
    const r = m.hand.result!;
    expect(r.kind).toBe('tranque');
    expect(r.teamPips).toEqual([2 + 3, 10 + 8 + 6]);
    expect(r.winnerTeam).toBe(0);
    expect(r.points).toBe(5 + 24);
    expect(m.scores).toEqual([29, 0]);
  });

  it('tranque empatado: nadie anota (o la pareja que trancó, según las reglas)', () => {
    const line = [
      { tile: T(1, 2), left: 6, right: 2, player: 1 },
      { tile: T(2, 3), left: 2, right: 6, player: 1 },
    ];
    const hands = [[T(6, 6), T(2, 2)], [T(4, 0)], [T(1, 1)], [T(3, 0)]];
    const allSixes = [0, 1, 2, 3, 4, 5].map((n) => T(6, n));
    // Las demás fichas con 6 se dan por jugadas (fuera de las manos).
    expect(hands.flat().some((t) => allSixes.includes(t))).toBe(false);
    const win = playMove(withHands(hands, { line }), { tile: T(6, 6), end: 'left' });
    expect(win.hand.result).toMatchObject({ kind: 'tranque', teamPips: [6, 7], winnerTeam: 0, total: 13 });
    const tieHands = [[T(6, 6), T(2, 2)], [T(3, 0)], [T(0, 0)], [T(1, 0)]];
    const t1 = playMove(withHands(tieHands, { line }), { tile: T(6, 6), end: 'left' });
    expect(t1.hand.result).toMatchObject({ kind: 'tranque', teamPips: [4, 4], winnerTeam: null, total: 0 });
    expect(t1.scores).toEqual([0, 0]);
    const t2 = playMove(withHands(tieHands, { line }, { ...DEFAULT_RULES, tranqueTie: 'blocker' }), { tile: T(6, 6), end: 'left' });
    expect(t2.hand.result).toMatchObject({ winnerTeam: 0, total: 8 });
  });
});

describe('partida', () => {
  it('se juega entera a 100 con la IA, sin jugadas ilegales y con el marcador cuadrado', () => {
    for (let seed = 1; seed <= 40; seed++) {
      let m = createMatch(seed * 977);
      let hands = 0;
      while (m.winnerTeam === null) {
        m = playHandWithAi(m);
        hands++;
        const r = m.hand.result!;
        // Cada mano termina en dominó (alguien sin fichas) o en tranque (nadie puede jugar).
        if (r.kind === 'domino') expect(m.hand.hands[r.winnerPlayer!]).toHaveLength(0);
        else expect([0, 1, 2, 3].some((p) => canPlay(m, p))).toBe(false);
        expect(r.handPips).toEqual(m.hand.hands.map(handPips));
        if (m.winnerTeam === null) m = startNextHand(m);
        if (hands > 60) throw new Error('partida infinita');
      }
      const sum: [number, number] = [0, 0];
      for (const r of m.history) if (r.winnerTeam !== null) sum[r.winnerTeam] += r.total;
      expect(sum).toEqual(m.scores);
      expect(m.scores[m.winnerTeam]).toBeGreaterThanOrEqual(100);
      expect(m.zapatero).toBe(m.scores[m.winnerTeam === 0 ? 1 : 0] === 0);
    }
  });

  it('manos siguientes: sale el jugador que sigue a quien salió antes, con cualquier ficha', () => {
    let m = playHandWithAi(createMatch(5));
    const first = m.hand.starter;
    m = startNextHand(m);
    expect(m.hand.number).toBe(2);
    expect(m.hand.starter).toBe(nextPlayer(first));
    expect(legalMoves(m, m.hand.starter)).toHaveLength(7);
    m = startNextHand(playHandWithAi(m));
    expect(m.hand.starter).toBe(nextPlayer(nextPlayer(first)));
  });

  it('zapatero: el rival termina sin anotar', () => {
    const m = withHands([[T(3, 6)], [T(6, 6)], [T(5, 5)], [T(4, 4)]], {
      line: [
        { tile: T(3, 4), left: 3, right: 4, player: 1 },
        { tile: T(4, 6), left: 4, right: 6, player: 2 },
      ],
    });
    const end = playMove({ ...m, scores: [80, 0] }, { tile: T(3, 6), end: 'left' });
    expect(end.winnerTeam).toBe(0);
    expect(end.zapatero).toBe(true);
    expect(() => startNextHand(end)).toThrow(IllegalMoveError);
    const notZap = playMove({ ...m, scores: [80, 5] }, { tile: T(3, 6), end: 'left' });
    expect(notZap.zapatero).toBe(false);
  });

  it('las reglas se pueden cambiar (meta y bono de capicúa)', () => {
    const rules = { ...DEFAULT_RULES, targetScore: 50, capicuaBonus: 0 };
    const m = withHands([[T(3, 6)], [T(6, 6)], [T(5, 5)], [T(4, 4)]], {
      line: [
        { tile: T(3, 4), left: 3, right: 4, player: 1 },
        { tile: T(4, 6), left: 4, right: 6, player: 2 },
      ],
    }, rules);
    const end = playMove({ ...m, scores: [20, 10] }, { tile: T(3, 6), end: 'left' });
    expect(end.hand.result).toMatchObject({ capicua: false, total: 30 });
    expect(end.winnerTeam).toBe(0);
  });
});
