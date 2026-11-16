// Reglas de la casa: validación de un objeto de reglas leído del almacenamiento (ajustes o partida guardada).
import { DEFAULT_RULES, type DominoRules } from '@/game/config';

const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

export function normalizeRules(raw: unknown): DominoRules {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...DEFAULT_RULES };
  for (const key of Object.keys(DEFAULT_RULES) as (keyof DominoRules)[]) {
    if (typeof data[key] === typeof DEFAULT_RULES[key]) out[key] = data[key];
  }
  const rules = out as unknown as DominoRules;
  if (!isInt(rules.handSize, 1, 7)) rules.handSize = DEFAULT_RULES.handSize;
  if (!isInt(rules.targetScore, 1, 10000)) rules.targetScore = DEFAULT_RULES.targetScore;
  if (!isInt(rules.capicuaBonus, 0, 1000)) rules.capicuaBonus = DEFAULT_RULES.capicuaBonus;
  if (!['nextPlayer', 'handWinner'].includes(rules.nextStarter)) rules.nextStarter = DEFAULT_RULES.nextStarter;
  if (!['all', 'opponents'].includes(rules.dominoCounts)) rules.dominoCounts = DEFAULT_RULES.dominoCounts;
  if (!['team', 'player'].includes(rules.tranqueCompare)) rules.tranqueCompare = DEFAULT_RULES.tranqueCompare;
  if (!['all', 'opponents'].includes(rules.tranqueCounts)) rules.tranqueCounts = DEFAULT_RULES.tranqueCounts;
  if (!['none', 'blocker'].includes(rules.tranqueTie)) rules.tranqueTie = DEFAULT_RULES.tranqueTie;
  return rules;
}

