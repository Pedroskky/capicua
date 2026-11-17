/**
 * Vídeos con recompensa: duplicar las monedas al ganar, una pista gratis cuando no te quedan y reintentar un
 * rival del torneo sin perder la racha.
 */
export type RewardedKind = 'hint' | 'doubleCoins' | 'tournamentRetry';

import type { AdDiagnostics, AdTestSlot } from '@/game/adDiagnostics';

/**
 * Lo que necesita el juego de un proveedor de anuncios. La lógica de cuándo se enseña cada anuncio
 * (game/ads.ts) está fuera: el proveedor solo carga y enseña.
 */
export interface AdsBackend {
  /** false si el SDK no está en esta build (Expo Go, web). */
  available(): boolean;
  /** Inicia el SDK con la elección de anuncios personalizados y precarga los anuncios. */
  init(personalized: boolean, testMode: boolean): Promise<boolean>;
  /** Cambia la elección de anuncios personalizados (desde Ajustes). */
  setConsent(personalized: boolean): void;
  isRewardedReady(kind: RewardedKind): boolean;
  isInterstitialReady(): boolean;
  /** true solo si se ganó la recompensa (vídeo visto entero). */
  showRewarded(kind: RewardedKind): Promise<boolean>;
  /** Termina cuando el anuncio se cierra; false si no se enseñó. */
  showInterstitial(): Promise<boolean>;
  /** Aviso cuando un anuncio termina de cargar o falla (para enseñar u ocultar botones). */
  subscribe(listener: () => void): () => void;
  /** Diagnóstico del SDK (sin `supported` ni `expectedAppId`, que pone lib/ads). */
  diagnostics(): Omit<AdDiagnostics, 'supported' | 'expectedAppId'>;
  /** Solo pruebas: carga un anuncio en ese hueco. */
  load(slot: AdTestSlot): void;
}
