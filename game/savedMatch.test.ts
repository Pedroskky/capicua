import { describe, expect, it } from 'vitest';
import { aiView, chooseMove } from './ai';
import { createMatch, passTurn, playMove } from './engine';
import { normalizeSavedMatch, SAVED_MATCH_VERSION, toSavedMatch } from './savedMatch';

function midGame() {
  let m = createMatch(99);
  for (let i = 0; i < 9 && !m.hand.result; i++) {
    const mv = chooseMove(aiView(m, m.hand.turn));
    m = mv ? playMove(m, mv) : passTurn(m);
  }
  return m;
}

describe('partida guardada', () => {
  it('se guarda y se recupera igual (también tras pasar por JSON)', () => {
    const m = midGame();
    const saved = JSON.parse(JSON.stringify(toSavedMatch(m)));
    expect(saved.version).toBe(SAVED_MATCH_VERSION);
    expect(normalizeSavedMatch(saved)?.match).toEqual(m);
  });

  it('la partida recuperada se puede seguir jugando', () => {
    let m = normalizeSavedMatch(JSON.parse(JSON.stringify(toSavedMatch(midGame()))))!.match;
    const mv = chooseMove(aiView(m, m.hand.turn));
    m = mv ? playMove(m, mv) : passTurn(m);
    expect(m.hand.log.length).toBeGreaterThan(9);
  });

  it('descarta lo roto o de otra versión sin lanzar', () => {
    const good = JSON.parse(JSON.stringify(toSavedMatch(midGame())));
    expect(normalizeSavedMatch(undefined)).toBeNull();
    expect(normalizeSavedMatch('hola')).toBeNull();
    expect(normalizeSavedMatch({ ...good, version: 99 })).toBeNull();
    const dup = structuredClone(good);
    dup.match.hand.hands[0].push(dup.match.hand.hands[1][0]);
    expect(normalizeSavedMatch(dup)).toBeNull();
    const badLine = structuredClone(good);
    badLine.match.hand.line[0].right = (badLine.match.hand.line[0].right + 1) % 7;
    if (badLine.match.hand.line.length > 1) expect(normalizeSavedMatch(badLine)).toBeNull();
    const badTurn = structuredClone(good);
    badTurn.match.hand.turn = 7;
    expect(normalizeSavedMatch(badTurn)).toBeNull();
  });

  it('completa reglas que falten con las de siempre', () => {
    const good = JSON.parse(JSON.stringify(toSavedMatch(midGame())));
    delete good.match.rules.capicuaBonus;
    good.match.rules.targetScore = 'mucho';
    const rules = normalizeSavedMatch(good)!.match.rules;
    expect(rules.capicuaBonus).toBe(25);
    expect(rules.targetScore).toBe(100);
  });
});
