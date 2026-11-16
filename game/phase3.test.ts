import { describe, expect, it } from 'vitest';
import { ECONOMY, SHOP_ITEMS, TOURNAMENT, type AiLevel } from './config';
import { ACHIEVEMENTS, normalizeAchievements } from './achievements';
import { applyActivity, claimChallenge, purchase, type ActivityState } from './activity';
import { challengesForToday, EMPTY_DAILY, generateDailyChallenges, normalizeDaily } from './challenges';
import { buy, equip, INITIAL_PROGRESS, normalizeProgress, type Progress } from './economy';
import { INITIAL_ELO, applyEloGame } from './elo';
import { canDraw, createMatch, drawTile, passTurn, playMove, startNextHand, type MatchState } from './engine';
import { handEvent, matchEvent, type HandEvent, type MatchEvent } from './events';
import { aiView, chooseMove } from './ai';
import { INITIAL_STATS, normalizeStats } from './stats';
import { EMPTY_STREAK, applyActivityToStreak } from './streak';
import { RIVALS, applyTournamentResult, isUnlocked, starsFor } from './tournament';
import { normalizeSavedMatch, toSavedMatch } from './savedMatch';

const TODAY = '20261116';
const fresh = (): ActivityState => ({ progress: INITIAL_PROGRESS, daily: EMPTY_DAILY, streak: EMPTY_STREAK, stats: INITIAL_STATS, achievements: [] });
const hand = (p: Partial<HandEvent> = {}): HandEvent => ({ type: 'hand', mode: 'partners', level: 'plaza', won: true, kind: 'domino', dominoSelf: false, capicua: false, points: 20, tournament: false, ...p });
const match = (p: Partial<MatchEvent> = {}): MatchEvent => ({ type: 'match', mode: 'partners', level: 'plaza', won: true, zapatero: false, scores: [104, 60], tournament: null, ...p });

describe('tienda', () => {
  it('lo gratis viene comprado y equipado; comprar descuenta monedas y no se compra dos veces', () => {
    expect(INITIAL_PROGRESS.equipped).toEqual({ tiles: 'ivory', table: 'felt', phrases: 'basic' });
    expect(buy(INITIAL_PROGRESS, 'wood')).toEqual({ ok: false, reason: 'coins' });
    const rich: Progress = { ...INITIAL_PROGRESS, coins: 1000 };
    const r = buy(rich, 'wood');
    expect(r.ok && r.progress.coins).toBe(700);
    if (!r.ok) return;
    expect(buy(r.progress, 'wood')).toEqual({ ok: false, reason: 'owned' });
    expect(equip(r.progress, 'wood')?.equipped.tiles).toBe('wood');
    expect(equip(rich, 'neon')).toBeNull();
  });

  it('catálogo: 5 fichas, 3 mesas y paquetes de frases', () => {
    expect(SHOP_ITEMS.filter((i) => i.category === 'tiles').map((i) => i.id).sort()).toEqual(['gold', 'ivory', 'neon', 'temple', 'wood']);
    expect(SHOP_ITEMS.filter((i) => i.category === 'table').map((i) => i.id).sort()).toEqual(['beach', 'felt', 'patio']);
    expect(SHOP_ITEMS.filter((i) => i.category === 'phrases').length).toBeGreaterThanOrEqual(2);
  });

  it('el progreso roto se arregla sin lanzar (y no se puede llevar equipado algo no comprado)', () => {
    expect(normalizeProgress('x')).toEqual(INITIAL_PROGRESS);
    const p = normalizeProgress({ coins: -5, owned: ['neon', 'nada'], equipped: { tiles: 'gold', table: 'beach' }, tournamentStars: [3, 9, 'a'] });
    expect(p.coins).toBe(0);
    expect(p.owned).toContain('neon');
    expect(p.owned).not.toContain('nada');
    expect(p.equipped).toEqual({ tiles: 'ivory', table: 'felt', phrases: 'basic' });
    expect(p.tournamentStars.slice(0, 3)).toEqual([3, 0, 0]);
  });
});

describe('torneo del barrio', () => {
  it('12 parejas cada vez más fuertes: empieza en Principiante y acaba en Maestro', () => {
    expect(RIVALS).toHaveLength(12);
    const order: AiLevel[] = ['beginner', 'plaza', 'veteran', 'master'];
    for (let i = 1; i < RIVALS.length; i++) expect(order.indexOf(RIVALS[i].level)).toBeGreaterThanOrEqual(order.indexOf(RIVALS[i - 1].level));
    expect(RIVALS[0].level).toBe('beginner');
    expect(RIVALS[11].level).toBe('master');
    expect(new Set(RIVALS.map((r) => r.id)).size).toBe(12);
  });

  it('ganarle a una abre la siguiente y da monedas; perder no cambia nada', () => {
    expect(isUnlocked(INITIAL_PROGRESS, 0)).toBe(true);
    expect(isUnlocked(INITIAL_PROGRESS, 1)).toBe(false);
    const lost = applyTournamentResult(INITIAL_PROGRESS, 0, false, -30, false);
    expect(lost).toMatchObject({ coins: 0, stars: 0 });
    const won = applyTournamentResult(INITIAL_PROGRESS, 0, true, 10, false);
    expect(won.coins).toBe(TOURNAMENT.rewardBase);
    expect(won.unlockedNext).toBe(true);
    expect(isUnlocked(won.progress, 1)).toBe(true);
    // Repetir una ya vencida da la mitad y conserva la mejor nota.
    const again = applyTournamentResult(won.progress, 0, true, 80, false);
    expect(again.coins).toBe(Math.floor(TOURNAMENT.rewardBase / 2));
    expect(again.progress.tournamentStars[0]).toBe(3);
  });

  it('estrellas según el margen, y campeón al vencer a las 12', () => {
    expect(starsFor(true, 5, false)).toBe(1);
    expect(starsFor(true, 30, false)).toBe(2);
    expect(starsFor(true, 60, false)).toBe(3);
    expect(starsFor(true, 1, true)).toBe(3);
    expect(starsFor(false, 90, false)).toBe(0);
    let p = INITIAL_PROGRESS;
    let champion = false;
    for (let i = 0; i < 12; i++) {
      const r = applyTournamentResult(p, i, true, 40, false);
      p = r.progress;
      champion = r.champion;
      if (i < 11) expect(r.champion).toBe(false);
    }
    expect(champion).toBe(true);
  });

  it('las partidas del torneo son parejas a 100 con el nivel de la pareja', () => {
    const m = createMatch(1, { ...createMatch(1).rules, targetScore: TOURNAMENT.targetScore }, { mode: 'partners', aiLevel: RIVALS[5].level, tournament: 5 });
    expect(m.tournament).toBe(5);
    expect(m.aiLevel).toBe('plaza');
  });
});

describe('monedas, retos, racha, ELO y logros', () => {
  it('monedas: por mano ganada, por partida (según nivel), extra por capicúa y por zapatero', () => {
    let s = fresh();
    const a = applyActivity(s, hand({ capicua: true }), TODAY);
    expect(a.report.coins).toBe(ECONOMY.handWon + ECONOMY.capicua);
    s = a.state;
    const b = applyActivity(s, match({ level: 'master', zapatero: true }), TODAY);
    // Partida + zapatero + racha del primer día.
    expect(b.report.breakdown.map((x) => x.reason)).toEqual(['match', 'zapatero', 'streak']);
    expect(b.report.coins).toBe(ECONOMY.matchWon.master + ECONOMY.zapatero + 20);
    expect(applyActivity(fresh(), hand({ won: false, points: 0 }), TODAY).report.coins).toBe(0);
  });

  it('la racha da premio solo con la primera partida del día y sube día a día', () => {
    let st = EMPTY_STREAK;
    const d1 = applyActivityToStreak(st, '20261116');
    st = d1.state;
    expect(d1.reward).toBe(20);
    expect(applyActivityToStreak(st, '20261116').reward).toBe(0);
    const d2 = applyActivityToStreak(st, '20261117');
    expect(d2.state.days).toBe(2);
    expect(d2.reward).toBe(30);
    expect(applyActivityToStreak(d2.state, '20261120').state.days).toBe(1);
  });

  it('3 retos al día, iguales todo el día; se cobran una sola vez', () => {
    const a = generateDailyChallenges(TODAY);
    expect(a.challenges).toHaveLength(3);
    expect(generateDailyChallenges(TODAY)).toEqual(a);
    let s: ActivityState = { ...fresh(), daily: { date: TODAY, claimedHistory: [], challenges: [{ id: `${TODAY}-capicua`, kind: 'capicua', target: 1, reward: 80, progress: 0, claimed: false }] } };
    const r = applyActivity(s, hand({ capicua: true }), TODAY);
    expect(r.report.completedChallenges.map((c) => c.kind)).toEqual(['capicua']);
    s = r.state;
    const c = claimChallenge(s, `${TODAY}-capicua`, TODAY)!;
    expect(c.reward).toBe(80);
    expect(c.state.progress.coins).toBe(s.progress.coins + 80);
    expect(claimChallenge(c.state, `${TODAY}-capicua`, TODAY)).toBeNull();
    // Atrasar la hora no da retos nuevos.
    expect(challengesForToday(c.state.daily, '20261110')).toBe(c.state.daily);
    expect(normalizeDaily(JSON.parse(JSON.stringify(c.state.daily)))).toEqual(c.state.daily);
  });

  it('ELO: sube al ganar y baja al perder, con historia para la gráfica', () => {
    const up = applyEloGame(INITIAL_ELO, 'veteran', 1);
    expect(up.rating).toBeGreaterThan(1000);
    expect(applyEloGame(up, 'beginner', 0).rating).toBeLessThan(up.rating);
    const r = applyActivity(fresh(), match({ level: 'veteran' }), TODAY);
    expect(r.report.eloAfter).toBeGreaterThan(r.report.eloBefore);
    expect(r.state.stats.elo.history).toHaveLength(1);
  });

  it('estadísticas: partidas, manos, capicúas, zapateros, tranques y mejor racha de victorias', () => {
    let s = fresh();
    s = applyActivity(s, hand({ kind: 'tranque' }), TODAY).state;
    s = applyActivity(s, hand({ capicua: true, dominoSelf: true }), TODAY).state;
    s = applyActivity(s, match({ zapatero: true }), TODAY).state;
    s = applyActivity(s, match(), TODAY).state;
    s = applyActivity(s, match({ won: false }), TODAY).state;
    expect(s.stats).toMatchObject({ handsWon: 2, tranques: 1, tranquesWon: 1, capicuas: 1, dominoesSelf: 1, matchesPlayed: 3, matchesWon: 2, zapateros: 1, winStreak: 0, bestWinStreak: 2 });
    expect(normalizeStats(JSON.parse(JSON.stringify(s.stats)))).toEqual(s.stats);
  });

  it('más de 20 logros, que se desbloquean una sola vez', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThan(20);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    const r = applyActivity(fresh(), match({ zapatero: true }), TODAY);
    expect(r.report.newAchievements).toEqual(expect.arrayContaining(['firstWin', 'firstZapatero']));
    const again = applyActivity(r.state, match(), TODAY);
    expect(again.report.newAchievements).not.toContain('firstWin');
    expect(normalizeAchievements(['firstWin', 'nada', 'firstWin'])).toEqual(['firstWin']);
  });

  it('comprar cuenta para el logro de la primera compra', () => {
    const s = { ...fresh(), progress: { ...INITIAL_PROGRESS, coins: 400 } };
    const r = purchase(s, 'wood')!;
    expect(r.newAchievements).toContain('firstPurchase');
    expect(purchase(r.state, 'patio')).toBeNull();
  });

  it('torneo dentro de la actividad: monedas de la pareja y estrellas', () => {
    const r = applyActivity(fresh(), match({ tournament: 0, scores: [110, 20] }), TODAY);
    expect(r.report.tournament).toMatchObject({ stars: 3, unlockedNext: true });
    expect(r.report.breakdown.find((b) => b.reason === 'tournament')?.amount).toBe(TOURNAMENT.rewardBase);
  });
});

describe('eventos de una partida de verdad', () => {
  function playHand(m: MatchState): MatchState {
    while (!m.hand.result) {
      const mv = chooseMove(aiView(m, m.hand.turn));
      m = mv ? playMove(m, mv) : canDraw(m) ? drawTile(m) : passTurn(m);
    }
    return m;
  }
  it('mano y partida desde tu punto de vista; Dos en el teléfono no da monedas', () => {
    let m = playHand(createMatch(11));
    const e = handEvent(m)!;
    expect(e.won).toBe(m.hand.result!.winnerTeam === 0);
    while (m.winnerTeam === null) m = playHand(startNextHand(m));
    expect(matchEvent(m)).toMatchObject({ type: 'match', won: m.winnerTeam === 0 });
    const hot = playHand(createMatch(11, undefined, { mode: 'hotseat' }));
    expect(handEvent(hot)).toBeNull();
    const r = applyActivity(fresh(), { type: 'hotseat' }, TODAY);
    expect(r.report.coins).toBe(0);
    expect(r.state.stats.hotseatMatches).toBe(1);
  });

  it('partida guardada v3: torneo y manos ya apuntadas; una v2 cuenta como ya apuntada', () => {
    const m = { ...createMatch(4, undefined, { tournament: 3 }), recordedHands: 2 };
    expect(normalizeSavedMatch(JSON.parse(JSON.stringify(toSavedMatch(m))))!.match).toEqual(m);
    const v2 = JSON.parse(JSON.stringify({ version: 2, match: m }));
    delete v2.match.tournament;
    delete v2.match.recordedHands;
    delete v2.match.recordedMatch;
    const loaded = normalizeSavedMatch(v2)!.match;
    expect(loaded.tournament).toBeNull();
    expect(loaded.recordedHands).toBe(0);
  });
});
