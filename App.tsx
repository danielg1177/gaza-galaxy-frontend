import 'react-native-gesture-handler';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FriendsScreen from './src/screens/FriendsScreen';
import GameScreen from './src/screens/GameScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import { setOnUnauthorized } from './src/services/apiClient';
import { getGame } from './src/services/gamesService';
import {
  registerNotificationHandler,
  setupPushNotifications,
} from './src/services/pushNotificationService';
import { useAuthStore } from './src/store/authStore';
import { useGameStore } from './src/store/gameStore';

registerNotificationHandler();

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Friends: undefined;
  Game: { isReadOnly?: boolean };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: '#f5f0eb' },
} as const;

function parseNotificationGameId(data: Record<string, unknown> | undefined): number | undefined {
  const rawGameId = data?.game_id;
  if (typeof rawGameId === 'number') {
    return rawGameId;
  }
  if (typeof rawGameId === 'string') {
    const parsed = Number(rawGameId);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

export default function App() {
  const isLoadingAuth = useAuthStore((s) => s.isLoadingAuth);
  const currentUser = useAuthStore((s) => s.currentUser);
  const pendingGameId = useRef<number | null>(null);
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  const consumePendingGameId = useCallback(async (): Promise<void> => {
    const { currentUser: user, isLoadingAuth: loadingAuth } = useAuthStore.getState();
    if (user === null || loadingAuth) {
      return;
    }

    const gameId = pendingGameId.current;
    if (gameId === null) {
      return;
    }
    pendingGameId.current = null;

    try {
      const detail = await getGame(gameId);
      useGameStore.getState().loadAsyncGame(detail);
      navigationRef.current?.navigate('Home');
      navigationRef.current?.navigate('Game', {
        isReadOnly: detail.alertState === 'waiting',
      });
    } catch {
      // Silently ignore deep-link failures.
    }
  }, [navigationRef]);

  const consumePendingGameIdRef = useRef(consumePendingGameId);
  consumePendingGameIdRef.current = consumePendingGameId;

  useEffect(() => {
    void (async () => {
      try {
        await useAuthStore.getState().loadStoredAuth();
      } catch {
        await useAuthStore.getState().logout();
        useAuthStore.setState({ isLoadingAuth: false });
      }
    })();
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      void useAuthStore.getState().logout();
    });
  }, []);

  useEffect(() => {
    if (currentUser !== null) {
      void setupPushNotifications();
    }
  }, [currentUser]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const gameId = parseNotificationGameId(
          response.notification.request.content.data as Record<string, unknown> | undefined,
        );
        if (gameId === undefined) {
          return;
        }

        pendingGameId.current = gameId;
        if (useAuthStore.getState().currentUser !== null) {
          void consumePendingGameIdRef.current();
        }
      },
    );

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    void consumePendingGameId();
  }, [currentUser]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        {isLoadingAuth ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#4060c8" size="large" />
          </View>
        ) : (
          <NavigationContainer ref={navigationRef}>
            <StatusBar style="dark" />
            {currentUser !== null ? (
              <Stack.Navigator initialRouteName="Home" screenOptions={screenOptions}>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Friends" component={FriendsScreen} />
                <Stack.Screen name="Game" component={GameScreen} />
              </Stack.Navigator>
            ) : (
              <Stack.Navigator initialRouteName="Login" screenOptions={screenOptions}>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
              </Stack.Navigator>
            )}
          </NavigationContainer>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f5f0eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
