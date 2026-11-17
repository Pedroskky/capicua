// En web no hay anuncios: todo son funciones vacías y el juego funciona igual.
export type { RewardedKind } from './types';
export type { AdMoment } from '@/game/ads';
import type { RewardedKind } from './types';
import type { AdMoment } from '@/game/ads';
import { STARTIO_APP_ID } from '@/game/config';
import type { AdDiagnostics, AdTestSlot } from '@/game/adDiagnostics';
export type { AdDiagnostics, AdTestSlot } from '@/game/adDiagnostics';

export const USE_TEST_ADS = true;
export const ADS_SUPPORTED = false;

export function subscribeAds(_listener: () => void): () => void {
  return () => undefined;
}

export async function initAds(_personalized: boolean): Promise<void> {}

export function applyAdConsent(_personalized: boolean): void {}

export function isRewardedReady(_kind: RewardedKind): boolean {
  return false;
}

export async function showRewarded(_kind: RewardedKind): Promise<boolean> {
  return false;
}

export async function maybeShowInterstitial(_moment: AdMoment): Promise<boolean> {
  return false;
}

export function getAdDiagnostics(): AdDiagnostics {
  return {
    supported: false,
    expectedAppId: STARTIO_APP_ID,
    manifestAppId: null,
    initAppId: null,
    initialized: false,
    testMode: null,
    initError: null,
    lastAdKey: null,
    lastAdResult: null,
    lastAdMessage: null,
  };
}

export async function devLoadTestAd(_slot: AdTestSlot): Promise<void> {}

export async function devShowTestAd(_slot: AdTestSlot): Promise<boolean> {
  return false;
}

export function isTestAdReady(_slot: AdTestSlot): boolean {
  return false;
}
