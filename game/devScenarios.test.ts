import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES } from './config';
import { findScenario, scenarioMove } from './devScenarios';
import { isChainValid, playMove } from './engine';

describe('escenarios de desarrollo', () => {
  for (const kind of ['tranque', 'capicua'] as const) {
    it(`encuentra una mano para forzar ${kind} y la jugada lo provoca`, () => {
      const m = findScenario(kind, DEFAULT_RULES);
      expect(m).not.toBeNull();
      expect(m!.hand.turn).toBe(0);
      expect(isChainValid(m!.hand.line)).toBe(true);
      const move = scenarioMove(m!, kind)!;
      const r = playMove(m!, move).hand.result!;
      if (kind === 'tranque') expect(r.kind).toBe('tranque');
      else expect(r).toMatchObject({ kind: 'domino', capicua: true });
    });
  }
});
