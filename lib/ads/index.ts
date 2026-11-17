import { gamesFinishedToday, shouldShowInterstitial, type AdMoment, type InterstitialState } from '@/game/ads';
import { localDateKey } from '@/game/dates';
import { statsStore } from '@/lib/activity';
import { STARTIO_APP_ID } from '@/game/config';
import type { AdDiagnostics, AdTestSlot } from '@/game/adDiagnostics';
import type { AdsBackend, RewardedKind } from './types';
import { startioBackend } from './startio';

export type { AdMoment, RewardedKind, AdDiagnostics, AdTestSlot };

/** Único proveedor: Start.io (ADS_PROVIDER en game/config.ts). */
const backend: AdsBackend = startioBackend;

/**
 * Anuncios de prueba en desarrollo y en los APK de prueba (EXPO_PUBLIC_USE_TEST_ADS=1 en los perfiles
 * development y preview de eas.json). Solo el perfil production enseña anuncios reales.
 */
export const USE_TEST_ADS = __DEV__ || process.env.EXPO_PUBLIC_USE_TEST_ADS === '1';

/** false en Expo Go y en web (no está el SDK): sin anuncios, sin pantalla de consentimiento ni opción en Ajustes. */
export const ADS_SUPPORTED = backend.available();

/** Último anuncio a pantalla completa de esta sesión (ms). */
let lastAdAt = 0;
let initStarted = false;

/** Se avisa cuando cambia qué anuncios están cargados (para enseñar u ocultar botones). */
export function subscribeAds(listener: () => void): () => void {
  return backend.subscribe(listener);
}

/** Inicia los anuncios con la elección de anuncios personalizados. Sin conexión o con error, no hay anuncios. */
export async function initAds(personalized: boolean): Promise<void> {
  if (!ADS_SUPPORTED || initStarted) return;
  initStarted = true;
  try {
    await backend.init(personalized, USE_TEST_ADS);
  } catch {
    // Sin anuncios.
  }
}

/** Nueva elección desde Ajustes: se aplica ya (y se inician los anuncios si aún no lo estaban). */
export function applyAdConsent(personalized: boolean): void {
  if (!ADS_SUPPORTED) return;
  backend.setConsent(personalized);
  if (!initStarted) initAds(personalized).catch(() => undefined);
}

export function isRewardedReady(kind: RewardedKind): boolean {
  return ADS_SUPPORTED && backend.isRewardedReady(kind);
}

/**
 * Enseña un anuncio con recompensa. Devuelve true solo si la persona se ganó la recompensa.
 * Si no hay anuncio cargado o falla, devuelve false sin dar error.
 */
export async function showRewarded(kind: RewardedKind): Promise<boolean> {
  if (!isRewardedReady(kind)) return false;
  try {
    return await backend.showRewarded(kind);
  } catch {
    return false;
  } finally {
    lastAdAt = Date.now();
  }
}

/**
 * Intersticial si toca (reglas en game/ads.ts: solo al salir del resultado de una partida a 100, nunca en la
 * primera del día ni en mitad de una mano, y como mucho uno cada 3 minutos). Siempre termina, con o sin anuncio.
 */
export async function maybeShowInterstitial(moment: AdMoment): Promise<boolean> {
  if (!ADS_SUPPORTED || !backend.isInterstitialReady()) return false;
  const stats = await statsStore.load();
  const state: InterstitialState = { gamesToday: gamesFinishedToday(stats, localDateKey()), lastAdAt };
  if (!shouldShowInterstitial(moment, state, Date.now())) return false;
  let shown = false;
  try {
    shown = await backend.showInterstitial();
  } catch {
    // Sin anuncio: el juego sigue.
  }
  lastAdAt = Date.now();
  return shown;
}

/** Diagnóstico de anuncios (Ajustes → Desarrollo, solo con DEV_MENU). */
export function getAdDiagnostics(): AdDiagnostics {
  return { ...backend.diagnostics(), supported: ADS_SUPPORTED, expectedAppId: STARTIO_APP_ID };
}

/** Solo pruebas: inicia el SDK si hacía falta y carga un anuncio en ese hueco. */
export async function devLoadTestAd(slot: AdTestSlot): Promise<void> {
  if (!ADS_SUPPORTED) return;
  if (!initStarted) await initAds(false);
  backend.load(slot);
}

/** Solo pruebas: enseña el anuncio cargado en ese hueco, sin las reglas de game/ads.ts. */
export async function devShowTestAd(slot: AdTestSlot): Promise<boolean> {
  if (!ADS_SUPPORTED) return false;
  try {
    if (slot === 'interstitial') return await backend.showInterstitial();
    await backend.showRewarded('hint');
    return true;
  } catch {
    return false;
  }
}

/** Solo pruebas: ¿hay un anuncio cargado en ese hueco? */
export function isTestAdReady(slot: AdTestSlot): boolean {
  return ADS_SUPPORTED && (slot === 'interstitial' ? backend.isInterstitialReady() : backend.isRewardedReady('hint'));
}
