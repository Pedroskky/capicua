import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StoredValue<T> {
  load: () => Promise<T>;
  save: (value: T) => Promise<void>;
  current: () => T | null;
  subscribe: (listener: (value: T) => void) => () => void;
}

export function createStoredValue<T>(key: string, fallback: T, normalize: (raw: unknown) => T): StoredValue<T> {
  const listeners = new Set<(value: T) => void>();
  let cache: T | null = null;

  return {
    async load() {
      if (cache !== null) return cache;
      try {
        const raw = await AsyncStorage.getItem(key);
        cache = normalize(raw ? JSON.parse(raw) : undefined);
      } catch {
        cache = fallback;
      }
      return cache;
    },
    async save(value) {
      cache = value;
      listeners.forEach((listener) => {
        try {
          listener(value);
        } catch {
          // Un oyente roto no impide guardar.
        }
      });
      try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Sin almacenamiento el juego sigue; solo no se guarda.
      }
    },
    current() {
      return cache;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
