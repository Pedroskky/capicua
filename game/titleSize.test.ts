import { describe, expect, it } from 'vitest';
import { titleArtSize } from '../components/home/titleSize';

describe('título del inicio', () => {
  it('en pantallas bajas se hace más pequeño (y sin el lema)', () => {
    const tall = titleArtSize(900);
    const low = titleArtSize(640);
    const tiny = titleArtSize(560);
    expect(low.height).toBeLessThan(tall.height);
    expect(tiny.height).toBeLessThan(low.height);
    expect(low.titleFont).toBeLessThan(tall.titleFont);
    expect(low.compact).toBe(true);
    expect(tall.compact).toBe(false);
  });
});
