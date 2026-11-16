import { describe, expect, it } from 'vitest';
import { aiView, chooseMove } from './ai';
import { createMatch, passTurn, playMove, startNextHand, type MatchState } from './engine';
import { fanLayout, fitTable, hitFan, layoutLine, overlaps, ROW_HALF_WIDTH } from './layout';

function allLines(): MatchState['hand'][] {
  const out: MatchState['hand'][] = [];
  for (let seed = 1; seed <= 40; seed++) {
    let m = createMatch(seed * 31);
    for (let h = 0; h < 3 && m.winnerTeam === null; h++) {
      while (!m.hand.result) {
        const mv = chooseMove(aiView(m, m.hand.turn));
        m = mv ? playMove(m, mv) : passTurn(m);
        out.push(m.hand);
      }
      if (m.winnerTeam === null) m = startNextHand(m);
    }
  }
  return out;
}

describe('fila de la mesa', () => {
  const hands = allLines();

  it('cada ficha va pegada a la anterior con el número que coincide', () => {
    for (const hand of hands) {
      const { tiles } = layoutLine(hand.line, hand.origin);
      expect(tiles).toHaveLength(hand.line.length);
      tiles.forEach((t, i) => {
        const piece = hand.line[i];
        expect(t.tile).toBe(piece.tile);
        expect(t.halves.map((h) => h.value).sort()).toEqual([piece.left, piece.right].sort());
      });
    }
  });

  it('nunca se monta una ficha sobre otra y se curva antes de salirse', () => {
    for (const hand of hands) {
      const { tiles, bounds } = layoutLine(hand.line, hand.origin);
      for (let i = 0; i < tiles.length; i++) for (let j = i + 1; j < tiles.length; j++) expect(overlaps(tiles[i], tiles[j])).toBe(false);
      expect(bounds.maxX).toBeLessThanOrEqual(ROW_HALF_WIDTH + 2);
      expect(bounds.minX).toBeGreaterThanOrEqual(-ROW_HALF_WIDTH - 2);
    }
  });

  it('las mitades que se tocan tienen el mismo número', () => {
    for (const hand of hands.filter((h) => h.line.length > 6)) {
      const { tiles } = layoutLine(hand.line, hand.origin);
      for (let i = 0; i + 1 < tiles.length; i++) {
        const a = tiles[i];
        const b = tiles[i + 1];
        // Distancia mínima entre una mitad de a y una de b: deben tocarse (distancia 1 entre centros de mitades).
        let best = Infinity;
        let match = false;
        for (const ha of a.halves)
          for (const hb of b.halves) {
            const d = Math.hypot(ha.x - hb.x, ha.y - hb.y);
            if (d < best - 1e-6) {
              best = d;
              match = ha.value === hb.value;
            } else if (Math.abs(d - best) < 1e-6) match = match || ha.value === hb.value;
          }
        expect(best).toBeLessThanOrEqual(1.5);
        expect(match).toBe(true);
      }
    }
  });

  it('cabe en la mesa con una escala razonable', () => {
    for (const hand of hands) {
      const { bounds } = layoutLine(hand.line, hand.origin);
      const fit = fitTable(bounds, 380, 420, 30);
      expect(fit.unit).toBeGreaterThan(14);
      expect(bounds.minX * fit.unit + fit.offsetX).toBeGreaterThanOrEqual(-0.01);
      expect(bounds.maxX * fit.unit + fit.offsetX).toBeLessThanOrEqual(380.01);
      expect(bounds.minY * fit.unit + fit.offsetY).toBeGreaterThanOrEqual(-0.01);
      expect(bounds.maxY * fit.unit + fit.offsetY).toBeLessThanOrEqual(420.01);
    }
  });
});

describe('abanico de tu mano', () => {
  it('cabe en la pantalla y cada ficha se puede tocar', () => {
    for (const n of [1, 3, 7]) {
      const fan = fanLayout(n, 360, 700);
      expect(fan).toHaveLength(n);
      for (const t of fan) {
        expect(t.x - t.w / 2).toBeGreaterThan(0);
        expect(t.x + t.w / 2).toBeLessThan(360);
      }
      fan.forEach((t, i) => expect(hitFan(fan, t.x, t.y + t.h * 0.3)).toBe(i));
      expect(hitFan(fan, 5, 100)).toBe(-1);
    }
  });
});
