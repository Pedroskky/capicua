import { describe, expect, it } from 'vitest';
import { FREE_HINTS_PER_MATCH, INTERSTITIAL_MIN_SECONDS } from './config';
import { canHintByAd, canRetryKeepingStreak, doubleCoinsBonus, gamesFinishedToday, hintsLeft, shouldShowInterstitial } from './ads';
import { applyActivity, grantDoubleCoins, restoreWinStreak, type ActivityState } from './activity';
import { EMPTY_DAILY } from './challenges';
import { INITIAL_PROGRESS } from './economy';
import { INITIAL_STATS } from './stats';
import { EMPTY_STREAK } from './streak';
import type { MatchEvent } from './events';
import { readFileSync } from 'node:fs';

const NOW = 10_000_000;
const fresh = (): ActivityState => ({ progress: INITIAL_PROGRESS, daily: EMPTY_DAILY, streak: EMPTY_STREAK, stats: INITIAL_STATS, achievements: [] });
const match = (won: boolean, tournament: number | null = null): MatchEvent => ({
  type: 'match',
  mode: 'partners',
  level: 'plaza',
  won,
  zapatero: false,
  scores: won ? [100, 50] : [50, 100],
  tournament,
});

describe('intersticial', () => {
  it('solo al salir del resultado de una partida a 100, nunca en mitad de una mano ni en el resumen', () => {
    const ok = { gamesToday: 3, lastAdAt: 0 };
    expect(shouldShowInterstitial('matchOver', ok, NOW)).toBe(true);
    expect(shouldShowInterstitial('inHand', ok, NOW)).toBe(false);
    expect(shouldShowInterstitial('handSummary', ok, NOW)).toBe(false);
    expect(shouldShowInterstitial('tutorial', ok, NOW)).toBe(false);
  });

  it('nunca en la primera partida del día', () => {
    expect(shouldShowInterstitial('matchOver', { gamesToday: 1, lastAdAt: 0 }, NOW)).toBe(false);
    expect(shouldShowInterstitial('matchOver', { gamesToday: 2, lastAdAt: 0 }, NOW)).toBe(true);
  });

  it('como máximo uno cada 3 minutos', () => {
    expect(INTERSTITIAL_MIN_SECONDS).toBe(180);
    expect(shouldShowInterstitial('matchOver', { gamesToday: 5, lastAdAt: NOW - 179_000 }, NOW)).toBe(false);
    expect(shouldShowInterstitial('matchOver', { gamesToday: 5, lastAdAt: NOW - 181_000 }, NOW)).toBe(true);
  });

  it('las partidas de hoy se cuentan al terminar cada partida y vuelven a 0 al día siguiente', () => {
    let s = fresh();
    s = applyActivity(s, match(true), '20261116').state;
    expect(gamesFinishedToday(s.stats, '20261116')).toBe(1);
    s = applyActivity(s, { type: 'hotseat' }, '20261116').state;
    expect(gamesFinishedToday(s.stats, '20261116')).toBe(2);
    expect(gamesFinishedToday(s.stats, '20261117')).toBe(0);
    s = applyActivity(s, match(false), '20261117').state;
    expect(gamesFinishedToday(s.stats, '20261117')).toBe(1);
  });
});

describe('vídeos con recompensa', () => {
  it('duplicar monedas: solo al ganar, suma otra vez lo ganado', () => {
    expect(doubleCoinsBonus(true, 70)).toBe(70);
    expect(doubleCoinsBonus(false, 70)).toBe(0);
    expect(doubleCoinsBonus(true, 0)).toBe(0);
    const s = grantDoubleCoins({ ...fresh(), progress: { ...INITIAL_PROGRESS, coins: 100, earned: 100 } }, 70);
    expect(s.progress.coins).toBe(170);
  });

  it('pista con vídeo solo cuando no te quedan pistas gratis', () => {
    expect(hintsLeft(0, 0)).toBe(FREE_HINTS_PER_MATCH);
    expect(canHintByAd(FREE_HINTS_PER_MATCH - 1, 0)).toBe(false);
    expect(canHintByAd(FREE_HINTS_PER_MATCH, 0)).toBe(true);
    // Tras ganar una con vídeo y usarla, se vuelve a ofrecer.
    expect(hintsLeft(FREE_HINTS_PER_MATCH + 1, 1)).toBe(0);
  });

  it('reintentar un rival del torneo sin perder la racha: devuelve la racha de victorias', () => {
    let s = fresh();
    s = applyActivity(s, match(true), '20261116').state;
    s = applyActivity(s, match(true), '20261116').state;
    const lost = applyActivity(s, match(false, 4), '20261116');
    expect(lost.state.stats.winStreak).toBe(0);
    expect(lost.report.winStreakBefore).toBe(2);
    expect(canRetryKeepingStreak(4, false, lost.report.winStreakBefore)).toBe(true);
    expect(canRetryKeepingStreak(null, false, 2)).toBe(false);
    expect(canRetryKeepingStreak(4, true, 2)).toBe(false);
    expect(canRetryKeepingStreak(4, false, 0)).toBe(false);
    expect(restoreWinStreak(lost.state, 2).stats.winStreak).toBe(2);
  });

  it('el consentimiento de anuncios se guarda en una clave de Capicúa', () => {
    const consent = readFileSync(new URL('../lib/ads/consent.ts', import.meta.url), 'utf8');
    expect(consent).toContain("'capicua.adConsent'");
  });
});
