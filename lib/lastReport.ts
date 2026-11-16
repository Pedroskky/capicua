// Lo que se ganó en la última partida terminada (para la pantalla de resultado). Solo en memoria.
import type { ActivityReport } from '@/game/activity';

let last: ActivityReport | null = null;

export function setLastMatchReport(report: ActivityReport | null): void {
  last = report;
}

export function getLastMatchReport(): ActivityReport | null {
  return last;
}
