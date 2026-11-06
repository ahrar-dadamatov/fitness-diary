import 'react-native-url-polyfill/auto';
import '@/utils/web-alert';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { supabase } from '@/supabase';
import { useWorkoutStore } from '@/store';
import { syncPushSubscription } from '@/utils/web-push';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const setSession = useWorkoutStore((state) => state.setSession);
  const clearUserData = useWorkoutStore((state) => state.clearUserData);
  // Пока сессия не проверена, не показываем экран входа тем, кто уже вошёл
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
      })
      .finally(() => setAuthReady(true));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        clearUserData();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const userId = useWorkoutStore((state) => state.session?.user?.id);
  useEffect(() => {
    if (userId) {
      syncPushSubscription().catch((e) => console.warn('Не удалось обновить подписку на уведомления:', e));
    }
  }, [userId]);

  if (!authReady) {
    return <View style={{ flex: 1, backgroundColor: '#0F172A' }} />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <Stack screenOptions={{ contentStyle: { backgroundColor: '#0F172A' } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
