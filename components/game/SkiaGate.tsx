import { useState, lazy, Suspense, type ComponentType, type ReactNode } from 'react';

interface SkiaGateProps {
  getComponent: () => Promise<{ default: ComponentType }>;
}

export function SkiaGate({ getComponent }: SkiaGateProps): ReactNode {
  const [Screen] = useState(() => lazy(getComponent));
  return (
    <Suspense fallback={null}>
      <Screen />
    </Suspense>
  );
}
