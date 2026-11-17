// ¿Hay un vídeo con recompensa cargado? Se actualiza cuando Start.io termina de cargar o falla.
import { useEffect, useState } from 'react';
import { isRewardedReady, subscribeAds, type RewardedKind } from '@/lib/ads';

export function useRewardedReady(kind: RewardedKind): boolean {
  const [ready, setReady] = useState(() => isRewardedReady(kind));
  useEffect(() => {
    setReady(isRewardedReady(kind));
    return subscribeAds(() => setReady(isRewardedReady(kind)));
  }, [kind]);
  return ready;
}
