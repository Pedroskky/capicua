import { StyleSheet, View } from 'react-native';
import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import type { ComponentType, ReactNode } from 'react';

interface SkiaGateProps {
  getComponent: () => Promise<{ default: ComponentType }>;
}

export function SkiaGate({ getComponent }: SkiaGateProps): ReactNode {
  return (
    <WithSkiaWeb
      getComponent={getComponent}
      opts={{ locateFile: (file: string) => `/${file}` }}
      fallback={<View style={styles.loading} />}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#0E0C12',
  },
});
