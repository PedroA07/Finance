import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';

import { FinanceProvider } from './src/context/FinanceContext';
import HomeScreen from './src/screens/HomeScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import ChartsScreen from './src/screens/ChartsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AddTransactionScreen from './src/screens/AddTransactionScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const COLORS = {
  bg: '#0F172A',
  card: '#1E293B',
  accent: '#6366F1',
  muted: '#64748B',
  border: '#334155',
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            Home: focused ? 'home' : 'home-outline',
            Transactions: focused ? 'list' : 'list-outline',
            Charts: focused ? 'bar-chart' : 'bar-chart-outline',
            Settings: focused ? 'settings' : 'settings-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Início' }} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} options={{ tabBarLabel: 'Transações' }} />
      <Tab.Screen name="Charts" component={ChartsScreen} options={{ tabBarLabel: 'Gráficos' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Config' }} />
    </Tab.Navigator>
  );
}

async function checkForUpdates() {
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch (_) {
    // silent — no updates or no network
  }
}

export default function App() {
  useEffect(() => {
    if (!__DEV__) {
      checkForUpdates();
    }
  }, []);

  return (
    <FinanceProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={Tabs} />
          <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </FinanceProvider>
  );
}
