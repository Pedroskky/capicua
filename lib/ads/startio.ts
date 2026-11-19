import { createAdInitialization } from '@/game/adInitialization';
import {
  getStartioDiagnostics,
  initStartio,
  isAdReady,
  isStartioAvailable,
  loadInterstitial,
  loadRewarded,
  onAdStateChange,
  setConsent,
  showInterstitial,
  showRewarded,
} from '@/modules/startio-ads';
import { ADS_RETRY_SECONDS, STARTIO_APP_ID } from '@/game/config';
import type { AdsBackend, RewardedKind } from './types';

const INTERSTITIAL = 'interstitial';
/** Un solo vídeo con recompensa precargado para todos los usos (pista, deshacer, solución…). */
const REWARDED = 'rewarded';

let started = false;
const listeners = new Set<() => void>();
const retryTimers = new Map<string, ReturnType<typeof setTimeout>>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function load(key: string): void {
  if (!started) return;
  if (key === INTERSTITIAL) loadInterstitial(key);
  else loadRewarded(key);
}

/** Sin conexión o sin anuncio disponible: se reintenta más tarde, sin molestar al juego. */
function scheduleRetry(key: string): void {
  if (retryTimers.has(key)) return;
  retryTimers.set(
    key,
    setTimeout(() => {
      retryTimers.delete(key);
      load(key);
    }, ADS_RETRY_SECONDS * 1000),
  );
}

const initialize = createAdInitialization(
  (testMode) => initStartio(STARTIO_APP_ID, testMode),
  () => {
    started = true;
    onAdStateChange((key) => {
      if (!isAdReady(key)) scheduleRetry(key);
      notify();
    });
    load(INTERSTITIAL);
    load(REWARDED);
  },
);

export const startioBackend: AdsBackend = {
  available: isStartioAvailable,

  async init(personalized, testMode) {
    if (!isStartioAvailable()) return false;
    // Se recoge antes del inicio y se reporta tras el callback nativo.
    await setConsent(personalized);
    return initialize(testMode);
  },

  setConsent,

  isRewardedReady: (_kind: RewardedKind) => isAdReady(REWARDED),
  isInterstitialReady: () => isAdReady(INTERSTITIAL),

  async showRewarded(_kind) {
    const earned = await showRewarded(REWARDED);
    load(REWARDED);
    notify();
    return earned;
  },

  async showInterstitial() {
    const shown = await showInterstitial(INTERSTITIAL);
    load(INTERSTITIAL);
    return shown;
  },

  diagnostics: getStartioDiagnostics,

  load: (slot) => load(slot === 'interstitial' ? INTERSTITIAL : REWARDED),

  subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
