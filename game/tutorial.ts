// Cuándo sale el tutorial (puro, con test): al abrir por primera vez, nunca a quien ya jugaba.
export const TUTORIAL_STEPS = 5;

/** Sale solo si no se ha visto (ni saltado), no hay ninguna partida jugada y no hay una a medias. */
export function shouldShowTutorial(seen: boolean, matchesPlayed: number, hasSavedMatch: boolean): boolean {
  return !seen && matchesPlayed === 0 && !hasSavedMatch;
}
