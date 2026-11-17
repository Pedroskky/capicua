import { describe, expect, it } from 'vitest';
import { shouldShowTutorial, TUTORIAL_STEPS } from './tutorial';

describe('tutorial', () => {
  it('sale al abrir por primera vez, y nunca a quien ya jugaba o ya lo vio', () => {
    expect(shouldShowTutorial(false, 0, false)).toBe(true);
    expect(shouldShowTutorial(true, 0, false)).toBe(false);
    expect(shouldShowTutorial(false, 3, false)).toBe(false);
    expect(shouldShowTutorial(false, 0, true)).toBe(false);
  });
  it('explica parejas, elegir punta, pasar y tranque, y los puntos', () => {
    expect(TUTORIAL_STEPS).toBe(5);
  });
});
