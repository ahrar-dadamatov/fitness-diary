import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useWorkoutStore } from '@/store';
import AuthScreen from '@/components/AuthScreen';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const session = useWorkoutStore((state) => state.session);

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#38BDF8',
        tabBarInactiveTintColor: '#64748B',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 30 : 20,
          left: 20,
          right: 20,
          elevation: 5,
          backgroundColor: '#1E293B',
          borderRadius: 20,
          height: 65,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          paddingBottom: Platform.OS === 'ios' ? 0 : 0,
        },
        tabBarItemStyle: {
          paddingVertical: 10,
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Тренировка',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="dumbbell.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'История',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="history" color={color} />,
        }}
      />
      <Tabs.Screen
        name="measurements"
        options={{
          title: 'Замеры',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'ИИ Тренер',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="brain" color={color} />,
        }}
      />
      <Tabs.Screen
        name="programs"
        options={{
          title: 'Программы',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="list.bullet" color={color} />,
        }}
      />
    </Tabs>
  );
}
