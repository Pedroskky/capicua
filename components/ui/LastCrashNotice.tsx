// Solo en preview (DEV_MENU): al abrir la app, si la vez anterior hubo un error, lo enseña con mensaje y pila.
import { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import type { CrashInfo } from '@/game/crashInfo';
import { takeLastCrash } from '@/lib/crashReport';
import { DEV_MENU } from '@/lib/devMenu';
import { ErrorScreen, safeT } from '@/components/ui/ErrorScreen';

export function LastCrashNotice() {
  const [crash, setCrash] = useState<CrashInfo | null>(null);
  useEffect(() => {
    if (!DEV_MENU) return;
    let active = true;
    takeLastCrash()
      .then((info) => {
        if (active && info) setCrash(info);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  if (!crash) return null;
  return (
    <Modal visible animationType="fade" onRequestClose={() => setCrash(null)}>
      <ErrorScreen
        crash={crash}
        showDetails
        title={safeT('error.lastCrashTitle')}
        text={safeT('error.lastCrashText')}
        buttonLabel={safeT('error.close')}
        onRetry={() => setCrash(null)}
      />
    </Modal>
  );
}
