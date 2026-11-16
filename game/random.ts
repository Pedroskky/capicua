// Azar con semilla (mulberry32): las partidas de los tests son siempre iguales.
export function nextRandom(seed: number): { value: number; seed: number } {
  let t = (seed + 0x6d2b79f5) | 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: next };
}

/** Generador con semilla que devuelve números en [0, 1) (para los retos del día). */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    const r = nextRandom(s);
    s = r.seed;
    return r.value;
  };
}
