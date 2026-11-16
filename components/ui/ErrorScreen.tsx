// Pantalla «Algo salió mal». Sin Skia, sin fuentes propias ni nada que pueda volver a fallar.
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CrashInfo } from '@/game/crashInfo';
import type { TranslationKey } from '@/lib/i18n/es';
import { t } from '@/lib/i18n';

const FALLBACK: Partial<Record<TranslationKey, string>> = {
  'error.title': 'Algo salió mal',
  'error.friendly': 'Pulsa «Reintentar» para seguir jugando.',
  'error.retry': 'Reintentar',
  'error.details': 'Detalles',
  'error.close': 'Cerrar',
};

/** Traduce sin riesgo: si hasta los textos fallan, usa el español fijo de arriba. */
export function safeT(key: TranslationKey): string {
  try {
    return t(key);
  } catch {
    return FALLBACK[key] ?? key;
  }
}

// Colores fijos aquí a propósito: esta pantalla no debe depender de ningún otro módulo del juego.
const C = { bg: '#0B2418', surface: '#123524', border: '#1F4A35', text: '#F2EEDC', muted: '#A9BFAF', accent: '#E9C46A', accentText: '#1E1606' };

interface ErrorScreenProps {
  crash: CrashInfo;
  showDetails: boolean;
  onRetry?: () => void;
  title?: string;
  text?: string;
  buttonLabel?: string;
}

export function ErrorDetails({ crash }: { crash: CrashInfo }) {
  return (
    <View style={styles.details}>
      <Text style={styles.detailsTitle}>{safeT('error.details')}</Text>
      <Text selectable style={styles.message}>
        {crash.message}
      </Text>
      <Text selectable style={styles.meta}>
        {crash.source} · {crash.fatal ? 'fatal' : 'no fatal'} · {crash.at}
      </Text>
      {crash.stack ? (
        <Text selectable style={styles.stack}>
          {crash.stack}
        </Text>
      ) : null}
    </View>
  );
}

export function ErrorScreen({ crash, showDetails, onRetry, title, text, buttonLabel }: ErrorScreenProps) {
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{title ?? safeT('error.title')}</Text>
        <Text style={styles.text}>{text ?? safeT('error.friendly')}</Text>
        {onRetry && (
          <Pressable accessibilityRole="button" onPress={onRetry} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>{buttonLabel ?? safeT('error.retry')}</Text>
          </Pressable>
        )}
        {showDetails && <ErrorDetails crash={crash} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 64,
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: C.accent,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    color: C.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    alignSelf: 'center',
    minHeight: 52,
    minWidth: 200,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '800',
    color: C.accentText,
  },
  details: {
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: C.muted,
  },
  message: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  meta: {
    fontSize: 12,
    color: C.muted,
  },
  stack: {
    fontSize: 11,
    color: C.muted,
    fontFamily: 'monospace',
  },
});
