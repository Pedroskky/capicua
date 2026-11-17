import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

type EventSubscription = { remove: () => void };

type AdEvent = { key: string };
type FailedEvent = { key: string; message?: string };
type ClosedEvent = { key: string; displayed: boolean };

type StartioAdsEvents = {
  onAdLoaded: (event: AdEvent) => void;
  onAdFailed: (event: FailedEvent) => void;
  onAdClosed: (event: ClosedEvent) => void;
  onRewardEarned: (event: AdEvent) => void;
};

interface StartioAdsNative {
  setConsent(personalized: boolean): void;
  init(appId: string, testMode: boolean): Promise<boolean>;
  load(key: string, rewarded: boolean): Promise<void>;
  isReady(key: string): boolean;
  show(key: string): Promise<boolean>;
  getDiagnostics?(): Partial<StartioDiagnostics>;
  addListener<E extends keyof StartioAdsEvents>(event: E, listener: StartioAdsEvents[E]): EventSubscription;
}

/**
 * El módulo nativo solo existe en las builds de Android hechas con EAS (no en Expo Go ni en web).
 * Si no está, todas las funciones dicen «no disponible» y el juego sigue sin anuncios.
 */
const native: StartioAdsNative | null =
  Platform.OS === 'android' ? requireOptionalNativeModule<StartioAdsNative>('StartioAds') : null;

/** Lo que sabe el módulo nativo del SDK (Ajustes → Desarrollo → «Diagnóstico de anuncios»). */
export type StartioDiagnostics = {
  /** App ID escrito en el AndroidManifest por app.plugin.js (el que lee el SDK al arrancar). */
  manifestAppId: string | null;
  /** App ID que recibió init desde JS. */
  initAppId: string | null;
  initialized: boolean;
  testMode: boolean | null;
  initError: string | null;
  lastAdKey: string | null;
  lastAdResult: 'loaded' | 'failed' | null;
  lastAdMessage: string | null;
};

const EMPTY_DIAGNOSTICS: StartioDiagnostics = {
  manifestAppId: null,
  initAppId: null,
  initialized: false,
  testMode: null,
  initError: null,
  lastAdKey: null,
  lastAdResult: null,
  lastAdMessage: null,
};

const INIT_TIMEOUT_MS = 8000;
const REWARD_GRACE_MS = 300;

export function isStartioAvailable(): boolean {
  return native !== null;
}

/** GDPR: anuncios personalizados sí/no. Llamar antes de initStartio y cada vez que cambie. */
export function setConsent(personalized: boolean): void {
  try {
    native?.setConsent(personalized);
  } catch {
    // Sin anuncios.
  }
}

/** Inicia el SDK. Sin respuesta en INIT_TIMEOUT_MS se sigue igualmente (los anuncios fallarán al cargar). */
export async function initStartio(appId: string, testMode: boolean): Promise<boolean> {
  if (!native) return false;
  try {
    const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(true), INIT_TIMEOUT_MS));
    return await Promise.race([native.init(appId, testMode), timeout]);
  } catch {
    return false;
  }
}

/** Diagnóstico del SDK. Sin módulo nativo (web, Expo Go) todo sale vacío. */
export function getStartioDiagnostics(): StartioDiagnostics {
  try {
    return { ...EMPTY_DIAGNOSTICS, ...(native?.getDiagnostics?.() ?? {}) };
  } catch {
    return EMPTY_DIAGNOSTICS;
  }
}

function load(key: string, rewarded: boolean): void {
  native?.load(key, rewarded).catch(() => undefined);
}

export function loadInterstitial(key = 'interstitial'): void {
  load(key, false);
}

export function loadRewarded(key = 'rewarded'): void {
  load(key, true);
}

export function isAdReady(key: string): boolean {
  try {
    return native?.isReady(key) ?? false;
  } catch {
    return false;
  }
}

/** Avisa cuando un anuncio de ese hueco termina de cargar o falla (para enseñar u ocultar botones). */
export function onAdStateChange(listener: (key: string) => void): () => void {
  if (!native) return () => undefined;
  const subs = [native.addListener('onAdLoaded', (e) => listener(e.key)), native.addListener('onAdFailed', (e) => listener(e.key))];
  return () => subs.forEach((sub) => sub.remove());
}

/** Espera al cierre del anuncio del hueco `key`. `cancel` quita los avisos si al final no se enseñó. */
function waitClosed(key: string): { done: Promise<boolean>; cancel: () => void } {
  if (!native) return { done: Promise.resolve(false), cancel: () => undefined };
  let earned = false;
  let subs: EventSubscription[] = [];
  const cancel = () => {
    subs.forEach((sub) => sub.remove());
    subs = [];
  };
  const done = new Promise<boolean>((resolve) => {
    subs = [
      native.addListener('onRewardEarned', (e) => {
        if (e.key === key) earned = true;
      }),
      native.addListener('onAdClosed', (e) => {
        if (e.key !== key) return;
        // El aviso de vídeo completado puede llegar justo después del cierre: se espera un instante.
        setTimeout(() => {
          cancel();
          resolve(earned);
        }, REWARD_GRACE_MS);
      }),
    ];
  });
  return { done, cancel };
}

/** Enseña el intersticial. Termina cuando se cierra; false si no había anuncio listo. */
export async function showInterstitial(key = 'interstitial'): Promise<boolean> {
  if (!native || !isAdReady(key)) return false;
  const closed = waitClosed(key);
  const shown = await native.show(key).catch(() => false);
  if (!shown) {
    closed.cancel();
    return false;
  }
  await closed.done;
  return true;
}

/**
 * Enseña el vídeo con recompensa. Devuelve true solo si se vio entero (onVideoCompleted de Start.io).
 * Si no había anuncio o falla, devuelve false.
 */
export async function showRewarded(key = 'rewarded'): Promise<boolean> {
  if (!native || !isAdReady(key)) return false;
  const closed = waitClosed(key);
  const shown = await native.show(key).catch(() => false);
  if (!shown) {
    closed.cancel();
    return false;
  }
  return closed.done;
}
