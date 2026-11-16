import { useEffect, useState } from 'react';
import type { StoredValue } from '@/lib/storedValue';

export function useStoredValue<T>(store: StoredValue<T>, fallback: T): [T, (value: T) => Promise<void>] {
  const [value, setValue] = useState<T>(() => store.current() ?? fallback);

  useEffect(() => {
    let active = true;
    const unsubscribe = store.subscribe((next) => {
      if (active) setValue(next);
    });
    store
      .load()
      .then((loaded) => {
        if (active) setValue(loaded);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [store]);

  return [value, store.save];
}
