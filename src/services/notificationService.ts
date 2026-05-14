import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Platform } from 'react-native';
import { getAuthHeaders, ApiError } from './api';

const BASE_URL = 'https://campus-connect-backend-hlty.onrender.com/api/v1';

/**
 * Sends the FCM token to the backend.
 * Defined locally to avoid TS language-server resolution issues with large api.ts.
 */
const sendFcmTokenToBackend = async (token: string): Promise<void> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/users/me/fcm-token`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(response.status, data?.message || 'Failed to register FCM token');
  }
};

class NotificationService {
  /**
   * Request permission and get token
   */
  async requestUserPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
      await this.getFcmToken();
    }
  }

  /**
   * Retrieves the FCM token and sends it to the backend
   */
  async getFcmToken() {
    try {
      if (!messaging().isDeviceRegisteredForRemoteMessages) {
        await messaging().registerDeviceForRemoteMessages();
      }

      const token = await messaging().getToken();
      console.log('FCM Token:', token);

      // Send token to backend
      await sendFcmTokenToBackend(token);
    } catch (error) {
      console.error('Failed to get FCM token', error);
    }
  }

  /**
   * Sets up the Android notification channel using Notifee
   */
  async setupAndroidChannel() {
    if (Platform.OS === 'android') {
      const channelId = await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
      });
      return channelId;
    }
    return 'default';
  }

  /**
   * Initialize notification listeners
   */
  async initialize() {
    await this.requestUserPermission();
    await this.setupAndroidChannel();

    // Foreground message handler
    messaging().onMessage(async remoteMessage => {
      console.log('A new FCM message arrived in the foreground!', remoteMessage);
      this.displayNotification(remoteMessage);
    });

    // Handle token refresh
    messaging().onTokenRefresh(async token => {
      console.log('FCM Token refreshed:', token);
      try {
        await sendFcmTokenToBackend(token);
      } catch (error) {
        console.error('Failed to update refreshed token', error);
      }
    });

    // Handle background / quit state notification interaction (Notifee)
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      const { notification } = detail;
      if (type === EventType.PRESS) {
        console.log('User pressed notification in background', notification);
        // Handle navigation or action here
      }
    });

    // Handle foreground interaction (Notifee)
    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log('User pressed notification in foreground', detail.notification);
        // Handle navigation or action here
      }
    });
  }

  /**
   * Display local notification using Notifee
   */
  async displayNotification(remoteMessage: any) {
    const channelId = await this.setupAndroidChannel();

    await notifee.displayNotification({
      title: remoteMessage.notification?.title || 'New Notification',
      body: remoteMessage.notification?.body || '',
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        foregroundPresentationOptions: {
          badge: true,
          sound: true,
          banner: true,
          list: true,
        },
      },
    });
  }
}

export default new NotificationService();
