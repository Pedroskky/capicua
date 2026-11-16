import type { ComponentType } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { LucideProps } from 'lucide-react-native';
import { COLORS } from '@/game/config';

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  icon?: ComponentType<LucideProps>;
  variant?: 'primary' | 'secondary' | 'danger';
  compact?: boolean;
  disabled?: boolean;
}

export function ActionButton({ label, onPress, icon: Icon, variant = 'primary', compact, disabled }: ActionButtonProps) {
  const contentColor = variant === 'primary' ? COLORS.accentText : COLORS.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {Icon && <Icon size={compact ? 18 : 20} color={contentColor} strokeWidth={2.25} />}
      <Text style={[styles.label, compact && styles.labelCompact, { color: contentColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    paddingHorizontal: 22,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 340,
  },
  compact: {
    minHeight: 46,
    paddingHorizontal: 14,
    flex: 1,
  },
  primary: {
    backgroundColor: COLORS.accent,
  },
  secondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  danger: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  label: {
    fontSize: 17,
    fontWeight: '800',
  },
  labelCompact: {
    fontSize: 15,
  },
});
