// Convierte cualquier cosa lanzada (Error, texto, objeto raro) en un informe que se puede guardar y enseñar.
// Lógica pura: lib/crashReport.ts la guarda en AsyncStorage y components/ui/ErrorScreen.tsx la muestra.

export type CrashSource = 'render' | 'global' | 'promise';

export interface CrashInfo {
  message: string;
  stack: string;
  fatal: boolean;
  source: CrashSource;
  /** Fecha ISO. */
  at: string;
}

const MAX_STACK = 4000;
const SOURCES: CrashSource[] = ['render', 'global', 'promise'];

function safeString(read: () => unknown): string {
  try {
    const value = read();
    return typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value);
  } catch {
    return '';
  }
}

export function toCrashInfo(error: unknown, source: CrashSource, fatal: boolean, now = new Date()): CrashInfo {
  let message = '';
  let stack = '';
  if (error instanceof Error) {
    message = safeString(() => `${error.name}: ${error.message}`);
    stack = safeString(() => error.stack);
  } else if (error && typeof error === 'object') {
    const obj = error as { message?: unknown; stack?: unknown };
    message = safeString(() => obj.message) || safeString(() => JSON.stringify(error));
    stack = safeString(() => obj.stack);
  } else {
    message = safeString(() => error);
  }
  return {
    message: message || 'Unknown error',
    stack: stack.slice(0, MAX_STACK),
    fatal,
    source,
    at: now.toISOString(),
  };
}

/** Añade la pila de componentes de React al informe. */
export function withComponentStack(info: CrashInfo, componentStack: string | null | undefined): CrashInfo {
  if (!componentStack) return info;
  return { ...info, stack: `${info.stack}\n\nComponents:${componentStack}`.slice(0, MAX_STACK * 2) };
}

/** Valida un informe leído del almacenamiento (puede venir roto o de otra versión). */
export function normalizeCrashInfo(raw: unknown): CrashInfo | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<Record<keyof CrashInfo, unknown>>;
  if (typeof data.message !== 'string' || data.message.length === 0) return null;
  return {
    message: data.message,
    stack: typeof data.stack === 'string' ? data.stack : '',
    fatal: data.fatal === true,
    source: SOURCES.includes(data.source as CrashSource) ? (data.source as CrashSource) : 'global',
    at: typeof data.at === 'string' ? data.at : '',
  };
}
