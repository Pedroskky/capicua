import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES } from './config';
import { createMatch, isLegal, passTurn, playMove, startNextHand, canPlay, type MatchState } from './engine';
import { aiView, chooseMove, knownMissing } from './ai';
import { tileId } from './tiles';

const T = tileId;

function withHands(hands: number[][], line: MatchState['hand']['line'], log: MatchState['hand']['log'] = []): MatchState {
  const base = createMatch(3);
  return { ...base, hand: { ...base.hand, number: 2, starter: 0, turn: 0, hands, line, origin: 0, log, result: null } };
}

describe('IA básica', () => {
  it('nunca juega ilegal y siempre pasa cuando no puede (miles de turnos)', () => {
    let turns = 0;
    let passes = 0;
    for (let seed = 1; seed <= 60; seed++) {
      let m = createMatch(seed * 7919, DEFAULT_RULES);
      while (m.winnerTeam === null) {
        while (!m.hand.result) {
          const player = m.hand.turn;
          const move = chooseMove(aiView(m, player));
          if (move === null) {
            expect(canPlay(m, player)).toBe(false);
            m = passTurn(m);
            passes++;
          } else {
            expect(isLegal(m, player, move)).toBe(true);
            m = playMove(m, move);
          }
          turns++;
        }
        if (m.winnerTeam === null) m = startNextHand(m);
      }
    }
    expect(turns).toBeGreaterThan(3000);
    expect(passes).toBeGreaterThan(100);
  });

  it('no mira manos ajenas: con la misma información decide lo mismo', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const m = startNextHand({ ...createMatch(seed), hand: { ...createMatch(seed).hand, result: {} as never } });
      const player = m.hand.turn;
      // Mismas fichas propias, las de los demás repartidas de otra forma.
      const others = m.hand.hands.flatMap((h, i) => (i === player ? [] : h)).reverse();
      const shuffled = m.hand.hands.map((h, i) => (i === player ? h : others.splice(0, h.length)));
      const alt: MatchState = { ...m, hand: { ...m.hand, hands: shuffled } };
      expect(chooseMove(aiView(alt, player))).toEqual(chooseMove(aiView(m, player)));
      const view = aiView(m, player);
      expect(JSON.stringify(view)).not.toContain('"hands"');
    }
  });

  it('suelta primero la ficha de más puntos', () => {
    const m = withHands(
      [[T(6, 5), T(1, 0), T(5, 0)], [T(2, 2)], [T(3, 3)], [T(4, 4)]],
      [{ tile: T(5, 3), left: 5, right: 0, player: 1 }],
    );
    expect(chooseMove(aiView(m, 0))).toEqual({ tile: T(6, 5), end: 'left' });
  });

  it('evita dejar al rival una punta que puede jugar si sabe por sus pases cuál le falta', () => {
    // El rival de la derecha (1) pasó con 2 y 4 en las puntas: no tiene ni 2 ni 4.
    const log: MatchState['hand']['log'] = [{ type: 'pass', player: 1, ends: [2, 4] }];
    const m = withHands(
      [[T(4, 2), T(4, 6), T(1, 1)], [T(0, 0)], [T(3, 3)], [T(5, 5)]],
      [{ tile: T(0, 4), left: 2, right: 4, player: 3 }],
      log,
    );
    expect(knownMissing(log)[1]).toEqual(new Set([2, 4]));
    // 4-6 tiene más puntos pero dejaría un 6 que el rival puede tener; 4-2 deja solo 2 y 4 (pasa seguro).
    expect(chooseMove(aiView(m, 0))?.tile).toBe(T(4, 2));
  });

  it('si puede dominar, domina', () => {
    const m = withHands([[T(1, 2)], [T(0, 0)], [T(3, 3)], [T(5, 5)]], [{ tile: T(2, 4), left: 2, right: 4, player: 3 }]);
    expect(chooseMove(aiView(m, 0))).toEqual({ tile: T(1, 2), end: 'left' });
  });
});
