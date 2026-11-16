import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/game/config';
import { t } from '@/lib/i18n';

interface SettingRowProps {
  label: string;
  value: boolean;
  onToggle: () => void;
}

export function SettingRow({ label, value, onToggle }: SettingRowProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={onToggle}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={[styles.pill, value && styles.pillOn]}>
        <Text style={[styles.pillText, value && styles.pillTextOn]}>{value ? t('settings.on') : t('settings.off')}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  pill: {
    minWidth: 56,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceBorder,
    alignItems: 'center',
  },
  pillOn: {
    backgroundColor: COLORS.accent,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  pillTextOn: {
    color: COLORS.accentText,
  },
});
