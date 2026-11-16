// Protección contra cierres: manejador global de errores de JavaScript y de promesas no capturadas.
// - Un error fatal ya no cierra la app: se avisa a la raíz (ErrorBoundary), que enseña «Algo salió mal» con «Reintentar».
// - Solo con DEV_MENU (APK preview): el último error se guarda en AsyncStorage con mensaje y pila y se enseña al
//   volver a abrir la app. En production solo sale la pantalla amable, sin detalles técnicos.
// - Lo instala el primer import de app/_layout.tsx (lib/installCrashHandlers.ts), antes que cualquier pantalla.
// OJO: un fallo de código nativo (p. ej. Skia con un puntero nulo) mata el proceso sin pasar por aquí.
// Por eso existen tests/startupSafety.test.ts y `npm run check:android`.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeCrashInfo, toCrashInfo, type CrashInfo } from '@/game/crashInfo';
import { DEV_MENU } from '@/lib/devMenu';

const KEY = 'capicua.lastError';

type FatalListener = (info: CrashInfo) => void;
const listeners = new Set<FatalListener>();
/** Error fatal ocurrido antes de que la raíz escuche (se entrega en cuanto se suscribe). */
let pendingFatal: CrashInfo | null = null;
let installed = false;

const IS_WEB = Platform.OS === 'web';

/**
 * Avisos normales de la web que no son fallos: el navegador bloquea el sonido hasta el primer toque, y el `import()`
 * de Expo prueba a cargar una pantalla antes de descargar su trozo («Requiring unknown module», que luego reintenta).
 */
function isExpectedWebNoise(info: CrashInfo): boolean {
  return IS_WEB && /NotAllowedError|play\(\) failed because the user didn't interact|no supported source|Requiring unknown module/i.test(info.message);
}

export function saveCrash(info: CrashInfo): void {
  if (!DEV_MENU || isExpectedWebNoise(info)) return;
  try {
    AsyncStorage.setItem(KEY, JSON.stringify(info)).catch(() => undefined);
  } catch {
    // Si ni siquiera se puede guardar, al menos no rompemos nada más.
  }
}

/** Lee y borra el último error guardado (solo en preview). */
export async function takeLastCrash(): Promise<CrashInfo | null> {
  if (!DEV_MENU) return null;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    await AsyncStorage.removeItem(KEY);
    return normalizeCrashInfo(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** La raíz se suscribe para enseñar la pantalla de error en vez de que la app se cierre. */
export function onFatalError(listener: FatalListener): () => void {
  listeners.add(listener);
  if (pendingFatal) {
    const info = pendingFatal;
    pendingFatal = null;
    listener(info);
  }
  return () => {
    listeners.delete(listener);
  };
}

function reportFatal(info: CrashInfo): void {
  if (listeners.size === 0) pendingFatal = info;
  listeners.forEach((listener) => {
    try {
      listener(info);
    } catch {
      // Un oyente roto no puede impedir avisar a los demás.
    }
  });
}

interface ErrorUtilsLike {
  setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void;
  getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
}

interface HermesLike {
  enablePromiseRejectionTracker?: (options: {
    allRejections: boolean;
    onUnhandled: (id: number, rejection: unknown) => void;
    onHandled: (id: number) => void;
  }) => void;
}

export function installGlobalErrorHandlers(): void {
  if (installed) return;
  installed = true;
  const g = globalThis as { ErrorUtils?: ErrorUtilsLike; HermesInternal?: HermesLike };

  try {
    const errorUtils = g.ErrorUtils;
    if (errorUtils?.setGlobalHandler) {
      const previous = errorUtils.getGlobalHandler?.();
      errorUtils.setGlobalHandler((error, isFatal) => {
        const info = toCrashInfo(error, 'global', Boolean(isFatal));
        saveCrash(info);
        // Solo en Android/iOS, donde un error fatal cierra la app. En la web hay que dejar el manejador de siempre:
        // el runtime de Metro cuenta con que vuelva a lanzar el error para descargar las pantallas por partes.
        if (isFatal && !IS_WEB) {
          reportFatal(info);
          // En desarrollo se deja también la pantalla roja de React Native.
          if (__DEV__) previous?.(error, isFatal);
          return;
        }
        previous?.(error, isFatal);
      });
    }
  } catch {
    // Sin manejador global seguimos funcionando igual.
  }

  try {
    g.HermesInternal?.enablePromiseRejectionTracker?.({
      allRejections: true,
      onUnhandled: (_id, rejection) => {
        saveCrash(toCrashInfo(rejection, 'promise', false));
        if (__DEV__) console.warn('Promesa rechazada sin catch:', rejection);
      },
      onHandled: () => undefined,
    });
  } catch {
    // Opcional.
  }

  // Web: los mismos avisos con los eventos del navegador.
  try {
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('unhandledrejection', (event: { reason?: unknown }) => saveCrash(toCrashInfo(event.reason, 'promise', false)));
      window.addEventListener('error', (event: { error?: unknown; message?: unknown }) => saveCrash(toCrashInfo(event.error ?? event.message, 'global', false)));
    }
  } catch {
    // Opcional.
  }
}
