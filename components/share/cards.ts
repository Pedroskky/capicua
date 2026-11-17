// Qué se comparte en cada caso (sin Skia: lo usan el resumen de la mano, el resultado y el torneo).
import type { MatchState } from '@/game/engine';
import { rival } from '@/game/tournament';
import { progressStore } from '@/lib/progress';
import { t, teamName } from '@/lib/i18n';
import type { ShareCard } from './shareCard';

function equipped() {
  const e = progressStore.current()?.equipped;
  return { tiles: e?.tiles ?? 'ivory', table: e?.table ?? 'felt' } as const;
}

function scoreLine(match: MatchState): string {
  const rivalId = match.tournament !== null ? rival(match.tournament).id : null;
  return `${teamName(0, match.mode, rivalId)} ${match.scores[0]} · ${teamName(1, match.mode, rivalId)} ${match.scores[1]}`;
}

/** Capicúa o zapatero: las fichas finales de la mesa, el marcador y el nombre del juego. */
export function matchShareCard(kind: 'capicua' | 'zapatero', match: MatchState): ShareCard {
  return {
    title: t(kind === 'capicua' ? 'share.capicua' : 'share.zapatero'),
    lines: [scoreLine(match)],
    footer: t('app.title'),
    line: match.hand.line,
    origin: match.hand.origin,
    ...equipped(),
  };
}

/** Campeones del torneo: una fila de dobles de adorno. */
export function championShareCard(): ShareCard {
  const line = [
    { tile: 27, left: 6, right: 6, player: 0 },
    { tile: 21, left: 6, right: 3, player: 2 },
    { tile: 18, left: 3, right: 3, player: 0 },
    { tile: 9, left: 3, right: 1, player: 2 },
    { tile: 7, left: 1, right: 1, player: 0 },
  ];
  return { title: t('share.champion'), lines: [t('tour.title')], footer: t('app.title'), line, origin: 0, ...equipped() };
}
