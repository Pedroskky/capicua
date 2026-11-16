import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '@/game/config';
import { ActionButton } from '@/components/ui/ActionButton';
import { FONTS } from '@/components/ui/theme';
import { t } from '@/lib/i18n';

export default function NotFound() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>{t('notFound.title')}</Text>
      <ActionButton label={t('notFound.back')} onPress={() => router.replace('/')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    padding: 24,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    color: COLORS.text,
    textAlign: 'center',
  },
});
