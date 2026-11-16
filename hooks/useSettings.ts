import { useCallback } from 'react';
import { settingsStore, DEFAULT_SETTINGS, type GameSettings } from '@/lib/settings';
import { useStoredValue } from '@/hooks/useStoredValue';

export function useSettings() {
  const [settings, save] = useStoredValue(settingsStore, DEFAULT_SETTINGS);

  const updateSettings = useCallback(
    (patch: Partial<GameSettings>) => {
      const base = settingsStore.current() ?? DEFAULT_SETTINGS;
      save({ ...base, ...patch }).catch(() => undefined);
    },
    [save],
  );

  return { settings, updateSettings };
}
