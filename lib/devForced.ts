// Solo con DEV_MENU: la partida forzada desde Ajustes → Desarrollo (tranque o capicúa) marca con la pista la jugada
// que lo provoca. Se guarda aquí, en memoria, hasta que la pantalla de juego la recoge.
import type { DevScenario } from '@/game/devScenarios';

let pending: DevScenario | null = null;

export function setForcedScenario(kind: DevScenario | null): void {
  pending = kind;
}

export function takeForcedScenario(): DevScenario | null {
  const kind = pending;
  pending = null;
  return kind;
}
