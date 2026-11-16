// Fallo visto en un Android real (fase 2): en la mesa, fichas vecinas que no comparten número.
// 1) El motor: en 2.000 manos completas, tras cada jugada, la cadena es válida.
// 2) La colocación en pantalla: las mitades que se tocan (como se dibujan) tienen el mismo número.
import { describe, expect, it } from 'vitest';
import { AI_LEVELS } from './config';
import { aiView, chooseMove } from './ai';
import { canDraw, createMatch, drawTile, isChainValid, passTurn, playMove, startNextHand, type GameMode, type LinePiece, type MatchState } from './engine';
import { drawnHalves, layoutLine, tileDrawSpec, type TileHalf } from './layout';
import { tileOf } from './tiles';

function step(m: MatchState): MatchState {
  const level = AI_LEVELS[m.hand.turn % AI_LEVELS.length];
  const move = chooseMove(aiView(m, m.hand.turn, level));
  if (move) return playMove(m, move);
  return canDraw(m) ? drawTile(m) : passTurn(m);
}

/** Comprueba que, tal y como se dibuja, cada ficha toca a su vecina con el número que coincide. */
function checkDrawnChain(line: LinePiece[], origin: number): void {
  const { tiles } = layoutLine(line, origin);
  const drawn = tiles.map((t) => drawnHalves(tileDrawSpec(t)));
  for (let i = 0; i + 1 < line.length; i++) {
    let best = Infinity;
    let pairs: [TileHalf, TileHalf][] = [];
    for (const a of drawn[i])
      for (const b of drawn[i + 1]) {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < best - 1e-6) {
          best = d;
          pairs = [[a, b]];
        } else if (Math.abs(d - best) < 1e-6) pairs.push([a, b]);
      }
    // Se tocan (lado con lado, o de lado contra un doble atravesado).
    expect(best, `fichas ${i} y ${i + 1} separadas`).toBeLessThanOrEqual(1.12);
    for (const [a, b] of pairs) {
      expect(a.value, `ficha ${i}: la mitad que toca a la siguiente`).toBe(line[i].right);
      expect(b.value, `ficha ${i + 1}: la mitad que toca a la anterior`).toBe(line[i + 1].left);
    }
  }
  // Cada ficha dibujada es la ficha de verdad (los dos números de la ficha, ni uno más).
  tiles.forEach((t, i) => {
    const spec = tileDrawSpec(t);
    const tile = tileOf(line[i].tile);
    expect([spec.first, spec.second].sort()).toEqual([tile.a, tile.b].sort());
  });
}

describe('la cadena de la mesa', () => {
  it('2.000 manos completas: tras cada jugada todas las fichas vecinas comparten número', () => {
    let hands = 0;
    let plays = 0;
    const modes: GameMode[] = ['partners', 'partners', 'single'];
    for (let seed = 1; hands < 2000; seed++) {
      let m = createMatch(seed * 7349, undefined, { mode: modes[seed % modes.length] });
      while (m.winnerTeam === null && hands < 2000) {
        while (!m.hand.result) {
          const before = m.hand.line.length;
          m = step(m);
          if (m.hand.line.length !== before) {
            plays++;
            expect(isChainValid(m.hand.line)).toBe(true);
            for (let i = 0; i + 1 < m.hand.line.length; i++) expect(m.hand.line[i].right).toBe(m.hand.line[i + 1].left);
          }
        }
        hands++;
        if (m.winnerTeam === null) m = startNextHand(m);
      }
    }
    expect(plays).toBeGreaterThan(30000);
  });

  it('dibujo: las mitades que se tocan en pantalla tienen el mismo número (izquierda, curvas, tramos verticales y dobles)', () => {
    let checked = 0;
    for (let seed = 1; seed <= 300; seed++) {
      let m = createMatch(seed * 104729);
      while (!m.hand.result) {
        const before = m.hand.line.length;
        m = step(m);
        if (m.hand.line.length !== before) {
          checkDrawnChain(m.hand.line, m.hand.origin);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(5000);
  });

  it('una cadena larga hecha a mano, crecida sobre todo por la izquierda, se dibuja bien', () => {
    // 0|0 de salida y luego por la izquierda 0-1, 1-1, 1-2, 2-3... y por la derecha 0-4, 4-4, 4-5...
    let line: LinePiece[] = [{ tile: 0, left: 0, right: 0, player: 0 }];
    let origin = 0;
    const leftChain: [number, number][] = [
      [0, 1], [1, 1], [1, 2], [2, 2], [2, 3], [3, 3], [3, 5], [5, 5], [5, 6], [6, 6], [6, 1], [1, 3], [3, 4], [4, 2],
    ];
    for (const [inner, outer] of leftChain) {
      const id = findTile(inner, outer);
      line = [{ tile: id, left: outer, right: inner, player: 1 }, ...line];
      origin++;
      expect(isChainValid(line)).toBe(true);
      checkDrawnChain(line, origin);
    }
  });
});

function findTile(x: number, y: number): number {
  for (let id = 0; id < 28; id++) {
    const t = tileOf(id);
    if ((t.a === x && t.b === y) || (t.a === y && t.b === x)) return id;
  }
  throw new Error('no existe');
}
