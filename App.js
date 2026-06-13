import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { FinanceProvider } from './src/context/FinanceContext';
import HomeScreen from './src/screens/HomeScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import ChartsScreen from './src/screens/ChartsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AddTransactionScreen from './src/screens/AddTransactionScreen';
import RecurringScreen from './src/screens/RecurringScreen';
import InstallmentsScreen from './src/screens/InstallmentsScreen';

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
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Painel' }} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} options={{ tabBarLabel: 'Lançamentos' }} />
      <Tab.Screen name="Charts" component={ChartsScreen} options={{ tabBarLabel: 'Gráficos' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Config' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={Tabs} />
          <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
          <Stack.Screen name="Recurring" component={RecurringScreen} />
          <Stack.Screen name="Installments" component={InstallmentsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </FinanceProvider>
  );
}
