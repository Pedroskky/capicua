// Pantalla propia de consentimiento de anuncios (sin AdMob ni UMP), copiada de Office Smash con el
// estilo de Jaque Épico. Sale en el primer arranque en el EEE, Reino Unido y Suiza, y desde Ajustes.
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, PRIVACY_POLICY_URL } from '@/game/config';
import { t } from '@/lib/i18n';
import { ActionButton } from './ActionButton';
import { FONTS } from './theme';

interface AdConsentModalProps {
  visible: boolean;
  /** true = acepta anuncios personalizados; false = los rechaza (siguen saliendo anuncios no personalizados). */
  onChoose: (personalized: boolean) => void;
  /** Si se abre desde Ajustes se puede cerrar sin elegir. En el primer arranque, no. */
  onClose?: () => void;
}

export function AdConsentModal({ visible, onChoose, onClose }: AdConsentModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => onClose?.()} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('consent.title')}</Text>
          <Text style={styles.body}>{t('consent.body')}</Text>
          <Text style={styles.body}>{t('consent.later')}</Text>
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch(() => undefined)} hitSlop={8}>
            <Text style={styles.link}>{t('consent.policy')}</Text>
          </Pressable>
          <View style={styles.actions}>
            <View style={styles.action}>
              <ActionButton label={t('consent.reject')} variant="secondary" compact onPress={() => onChoose(false)} />
            </View>
            <View style={styles.action}>
              <ActionButton label={t('consent.accept')} compact onPress={() => onChoose(true)} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,4,8,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 20,
    gap: 12,
  },
  title: {
    fontFamily: FONTS.title,
    color: COLORS.text,
    fontSize: 22,
  },
  body: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  link: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  action: {
    flex: 1,
  },
});
