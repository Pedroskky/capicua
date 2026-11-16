import { describe, expect, it } from 'vitest';
import { AI_LEVELS, DEFAULT_RULES, type AiLevel } from './config';
import { aiView, bestMoveHint, chooseMove, knownMissing } from './ai';
import { duel } from './aiMatch';
import { canDraw, canPlay, createMatch, drawTile, isLegal, passTurn, playMove, startNextHand, type GameMode, type MatchState } from './engine';
import { tileId } from './tiles';

const T = tileId;

function withHands(hands: number[][], line: MatchState['hand']['line'], log: MatchState['hand']['log'] = [], turn = 0): MatchState {
  const base = createMatch(3);
  return { ...base, hand: { ...base.hand, number: 2, starter: 0, opening: null, boneyard: [], turn, hands, line, origin: 0, log, result: null } };
}

describe('IA: siempre legal', () => {
  for (const mode of ['partners', 'single'] as GameMode[]) {
    it(`${mode}: nunca juega ilegal, roba o pasa solo cuando no puede jugar (todos los niveles)`, () => {
      let turns = 0;
      let passes = 0;
      for (let seed = 1; seed <= 40; seed++) {
        let m = createMatch(seed * 7919, DEFAULT_RULES, { mode });
        while (m.winnerTeam === null) {
          while (!m.hand.result) {
            const player = m.hand.turn;
            const level = AI_LEVELS[(seed + player) % AI_LEVELS.length];
            const move = chooseMove(aiView(m, player, level));
            if (move === null) {
              expect(canPlay(m, player)).toBe(false);
              if (canDraw(m)) m = drawTile(m);
              else {
                m = passTurn(m);
                passes++;
              }
            } else {
              expect(isLegal(m, player, move)).toBe(true);
              m = playMove(m, move);
            }
            turns++;
          }
          if (m.winnerTeam === null) m = startNextHand(m);
        }
      }
      expect(turns).toBeGreaterThan(1500);
      expect(passes).toBeGreaterThan(20);
    });
  }

  it('no mira manos ajenas: con la misma información decide lo mismo (todos los niveles)', () => {
    for (const level of AI_LEVELS) {
      for (let seed = 1; seed <= 30; seed++) {
        let m = createMatch(seed);
        // Unas cuantas jugadas para que haya pases y señales en la mesa.
        for (let i = 0; i < 6 + (seed % 7) && !m.hand.result; i++) {
          const mv = chooseMove(aiView(m, m.hand.turn, 'plaza'));
          m = mv ? playMove(m, mv) : passTurn(m);
        }
        if (m.hand.result) continue;
        const player = m.hand.turn;
        const others = m.hand.hands.flatMap((h, i) => (i === player ? [] : h)).reverse();
        const shuffled = m.hand.hands.map((h, i) => (i === player ? h : others.splice(0, h.length)));
        const alt: MatchState = { ...m, hand: { ...m.hand, hands: shuffled } };
        expect(chooseMove(aiView(alt, player, level))).toEqual(chooseMove(aiView(m, player, level)));
        expect(JSON.stringify(aiView(m, player, level))).not.toContain('"hands"');
      }
    }
  });
});

describe('IA: cada nivel le gana al anterior en 500 partidas simuladas', () => {
  const pairs: [AiLevel, AiLevel][] = [
    ['plaza', 'beginner'],
    ['veteran', 'plaza'],
    ['master', 'veteran'],
  ];
  for (const [strong, weak] of pairs) {
    it(`${strong} gana a ${weak} (parejas, a duplicado)`, () => {
      const wins = duel(strong, weak, 500);
      expect(wins).toBeGreaterThan(275);
    }, 120000);
  }
  it('también en mano a mano', () => {
    for (const [strong, weak] of pairs) expect(duel(strong, weak, 200, 'single'), `${strong} vs ${weak}`).toBeGreaterThan(105);
  }, 120000);
});

describe('IA: decisiones', () => {
  it('Jugador de plaza suelta primero la ficha de más puntos', () => {
    const m = withHands([[T(6, 5), T(1, 0), T(5, 0)], [T(2, 2)], [T(3, 3)], [T(4, 4)]], [{ tile: T(5, 3), left: 5, right: 0, player: 1 }]);
    expect(chooseMove(aiView(m, 0, 'plaza'))).toEqual({ tile: T(6, 5), end: 'left' });
  });

  it('Veterano evita dejar al rival una punta que puede jugar si sabe por sus pases cuál le falta', () => {
    const log: MatchState['hand']['log'] = [{ type: 'pass', player: 1, ends: [2, 4] }];
    const m = withHands([[T(4, 2), T(4, 6), T(1, 1)], [T(0, 0)], [T(3, 3)], [T(5, 5)]], [{ tile: T(0, 4), left: 2, right: 4, player: 3 }], log);
    expect(knownMissing(log)[1]).toEqual(new Set([2, 4]));
    expect(chooseMove(aiView(m, 0, 'veteran'))?.tile).toBe(T(4, 2));
  });

  it('robar en mano a mano cuenta como pase para la IA: el rival no tenía esas puntas', () => {
    const missing = knownMissing([{ type: 'draw', player: 1, ends: [3, 5] }], 2);
    expect(missing[1]).toEqual(new Set([3, 5]));
  });

  it('si puede dominar, domina (todos los niveles salvo el principiante, que puede equivocarse)', () => {
    const m = withHands([[T(1, 2)], [T(0, 0)], [T(3, 3)], [T(5, 5)]], [{ tile: T(2, 4), left: 2, right: 4, player: 3 }]);
    for (const level of ['plaza', 'veteran', 'master'] as AiLevel[]) expect(chooseMove(aiView(m, 0, level))).toEqual({ tile: T(1, 2), end: 'left' });
  });

  it('Veterano tranca cuando sus cuentas dicen que gana, y no tranca cuando pierde', () => {
    // Puntas 6 y 3. Ya se jugaron todos los ceros y treses, y todos los seises salvo 6-0 y 6-5, que tengo yo.
    // 6-0 por el 6 deja 0 y 3: nadie puede jugar → tranque. 6-5 deja 5 y 3: sigue la mano.
    const played = new Set<number>();
    for (let n = 0; n <= 6; n++) {
      played.add(T(0, n));
      played.add(T(3, n));
      played.add(T(6, n));
    }
    played.delete(T(6, 0));
    played.delete(T(6, 5));
    const table = [...played];
    const line = table.map((tile, i) => ({ tile, left: i === 0 ? 6 : 9, right: i === table.length - 1 ? 3 : 9, player: 1 }));
    const log: MatchState['hand']['log'] = table.map((tile) => ({ type: 'play', player: 1, tile, end: 'right', endsBefore: null }));
    const m = withHands([[T(6, 0), T(6, 5)], [T(1, 1), T(1, 2), T(1, 4)], [T(2, 2)], [T(4, 4), T(4, 5), T(5, 5)]], line, log);
    const base = aiView(m, 0, 'veteran');
    expect(base.moves.map((mv) => mv.tile).sort()).toEqual([T(6, 0), T(6, 5)].sort());
    // Los rivales tienen 3 fichas cada uno y mi compañero 1: el tranque es nuestro.
    expect(chooseMove({ ...base, handCounts: [2, 3, 1, 3] })?.tile).toBe(T(6, 0));
    // Los rivales tienen 1 ficha cada uno y mi compañero 3: el tranque lo perderíamos.
    expect(chooseMove({ ...base, handCounts: [2, 1, 3, 1] })?.tile).toBe(T(6, 5));
    // El de plaza no hace cuentas: suelta la gorda.
    expect(chooseMove({ ...aiView(m, 0, 'plaza'), handCounts: [2, 3, 1, 3] })?.tile).toBe(T(6, 5));
  });

  it('compañero inteligente: no le tapa a su compañero la punta que puso y protege sus números', () => {
    // Puntas 3 (la puso mi compañero, asiento 0) y 5 (la puso el rival 3). Juego yo, asiento 2, con 3-2 y 5-2.
    const log: MatchState['hand']['log'] = [
      { type: 'play', player: 3, tile: T(1, 5), end: 'left', endsBefore: [1, 1] },
      { type: 'play', player: 0, tile: T(1, 3), end: 'right', endsBefore: [5, 1] },
    ];
    const line = [
      { tile: T(1, 5), left: 5, right: 1, player: 3 },
      { tile: T(1, 1), left: 1, right: 1, player: 1 },
      { tile: T(1, 3), left: 1, right: 3, player: 0 },
    ];
    const m = withHands([[T(0, 0)], [T(4, 4)], [T(3, 2), T(5, 2), T(6, 6)], [T(0, 6)]], line, log, 2);
    for (const level of ['veteran', 'master'] as AiLevel[]) {
      const mv = chooseMove(aiView(m, 2, level));
      expect(mv, level).toEqual({ tile: T(5, 2), end: 'left' });
    }
  });

  it('la pista es una jugada legal (la del Maestro)', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const m = createMatch(seed);
      const hint = bestMoveHint(m, m.hand.turn);
      expect(hint && isLegal(m, m.hand.turn, hint)).toBe(true);
    }
  });
});
