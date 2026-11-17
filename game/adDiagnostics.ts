import { STARTIO_APP_ID } from './config';

/** Hueco de anuncio que se puede probar desde Ajustes → Desarrollo. */
export type AdTestSlot = 'interstitial' | 'rewarded';

/** Lo que enseña «Diagnóstico de anuncios» (solo en los APK de prueba). */
export type AdDiagnostics = {
  /** El SDK está en esta build (false en web y Expo Go). */
  supported: boolean;
  /** App ID de este juego (game/config.ts). */
  expectedAppId: string;
  /** App ID en el AndroidManifest (lo lee el SDK al arrancar, antes que JavaScript). */
  manifestAppId: string | null;
  /** App ID que recibió la inicialización desde JavaScript. */
  initAppId: string | null;
  initialized: boolean;
  testMode: boolean | null;
  initError: string | null;
  lastAdKey: string | null;
  lastAdResult: 'loaded' | 'failed' | null;
  lastAdMessage: string | null;
};

/** Un App ID de Start.io válido: solo cifras, nunca vacío ni «undefined». */
export function isValidStartioAppId(appId: string | null | undefined): appId is string {
  return typeof appId === 'string' && /^\d{6,12}$/.test(appId);
}

/** El App ID que usa el SDK es el de este juego (en el manifiesto y en la inicialización). */
export function appIdProblems(diag: AdDiagnostics, expected: string = STARTIO_APP_ID): string[] {
  const problems: string[] = [];
  if (!isValidStartioAppId(expected)) problems.push('expected');
  if (!diag.supported) return problems;
  if (diag.manifestAppId !== expected) problems.push('manifest');
  if (diag.initAppId !== null && diag.initAppId !== expected) problems.push('init');
  return problems;
}
