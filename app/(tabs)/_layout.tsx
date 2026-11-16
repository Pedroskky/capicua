// Pestañas de abajo: Jugar, Torneo, Tienda y Perfil. La barra respeta la de navegación de Android (zona segura).
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dices, ShoppingBag, Trophy, User } from 'lucide-react-native';
import { COLORS } from '@/game/config';
import { t } from '@/lib/i18n';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.surfaceBorder,
          height: 58 + insets.bottom,
          paddingBottom: Math.max(6, insets.bottom),
        },
        tabBarLabelStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.play'), tabBarIcon: ({ color, size }) => <Dices color={color} size={size} /> }} />
      <Tabs.Screen name="tournament" options={{ title: t('tabs.tournament'), tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} /> }} />
      <Tabs.Screen name="shop" options={{ title: t('tabs.shop'), tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
    </Tabs>
  );
}
