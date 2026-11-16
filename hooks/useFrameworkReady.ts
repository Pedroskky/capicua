import { useEffect } from 'react';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export function useFrameworkReady() {
  useEffect(() => {
    // Solo existe en la web; en Android/iOS no se toca `window`.
    if (typeof window !== 'undefined') window.frameworkReady?.();
  });
}
