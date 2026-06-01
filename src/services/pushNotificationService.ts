import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { apiClient } from './apiClient';

const PUSH_TOKEN_STORAGE_KEY = 'push_token';

export function registerNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function setupPushNotifications(): Promise<void> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[Push] Notification permission denied');
      return;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    const storedToken = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
    if (token === storedToken) {
      return;
    }

    await apiClient.post('/push-token', { token });
    await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
    console.log('[Push] Expo push token registered');
  } catch (err) {
    console.error('[Push] Failed to register Expo push token:', err);
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}
export async function setupWebPushNotifications(): Promise<void> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    console.warn('[Push] Web Push not supported in this environment');
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('[Push] Notification permission denied');
    return;
  }
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const vapidKey = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.error('[Push] EXPO_PUBLIC_VAPID_PUBLIC_KEY is not set — push notifications will not work');
    return;
  }
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    });
  }
  const subscriptionJson = JSON.stringify(subscription.toJSON());
  const stored = await AsyncStorage.getItem('web_push_subscription');
  if (stored === subscriptionJson) {
    console.log('[Push] Web push subscription already registered');
    return;
  }
  try {
    await apiClient.post('/push-subscription', { subscription: subscription.toJSON() });
    await AsyncStorage.setItem('web_push_subscription', subscriptionJson);
    console.log('[Push] Web push subscription saved to backend');
  } catch (err) {
    console.error('[Push] Failed to save web push subscription to backend:', err);
    throw err;
  }
}
