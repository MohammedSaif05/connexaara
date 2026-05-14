import {
  getMessaging,
  getToken,
  requestPermission,
  onMessage,
  onTokenRefresh,
  isDeviceRegisteredForRemoteMessages,
  registerDeviceForRemoteMessages,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidStyle, EventType } from '@notifee/react-native';
import { Platform, PermissionsAndroid } from 'react-native';
import { getAuthHeaders, ApiError } from './api';
import { getAuthData } from './storage';

const BASE_URL = 'https://campus-connect-backend-hlty.onrender.com/api/v1';

/**
 * Sends the FCM token to the backend.
 * Only sends if the user is authenticated (has a stored token).
 */
const sendFcmTokenToBackend = async (token: string): Promise<void> => {
  // Don't attempt to send if user isn't logged in
  const authData = await getAuthData();
  if (!authData?.token) {
    console.log('Skipping FCM token registration — user not authenticated yet');
    return;
  }

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
  private fcmToken: string | null = null;

  /**
   * Request notification permission and get token.
   * On Android 13+ (API 33), explicitly requests the POST_NOTIFICATIONS runtime permission.
   * On iOS, uses Firebase's requestPermission.
   */
  async requestUserPermission() {
    // Android 13+ requires explicit runtime permission request
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Notification permission denied by user');
        return;
      }
      console.log('Notification permission granted');
    }

    // iOS permission + general Firebase permission check
    const messaging = getMessaging();
    const authStatus = await requestPermission(messaging);
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

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
      const messaging = getMessaging();

      if (!isDeviceRegisteredForRemoteMessages(messaging)) {
        await registerDeviceForRemoteMessages(messaging);
      }

      const token = await getToken(messaging);
      this.fcmToken = token;
      console.log('FCM Token:', token);

      // Send token to backend (will skip if not authenticated)
      await sendFcmTokenToBackend(token);
    } catch (error) {
      console.error('Failed to get FCM token', error);
    }
  }

  /**
   * Called after successful login to register the stored FCM token with the backend.
   * This ensures the token is sent only when the user has valid auth credentials.
   */
  async registerTokenAfterLogin() {
    if (this.fcmToken) {
      try {
        await sendFcmTokenToBackend(this.fcmToken);
        console.log('FCM token registered with backend after login');
      } catch (error) {
        console.error('Failed to register FCM token after login', error);
      }
    } else {
      // Token not yet available, try fetching it
      await this.getFcmToken();
    }
  }

  /**
   * Sets up all Android notification channels using Notifee.
   * Separate channels for different notification types.
   */
  async setupAndroidChannels() {
    if (Platform.OS === 'android') {
      // Main channel for approvals & general
      await notifee.createChannel({
        id: 'od-approved',
        name: 'OD Approvals',
        description: 'Notifications for approved OD requests',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
        vibrationPattern: [300, 500],
      });

      // Rejection channel
      await notifee.createChannel({
        id: 'od-rejected',
        name: 'OD Rejections',
        description: 'Notifications for rejected OD requests',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
        vibrationPattern: [300, 200, 300],
      });

      // General / new request channel
      await notifee.createChannel({
        id: 'od-general',
        name: 'OD Updates',
        description: 'General OD request notifications',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      });
    }
  }

  /**
   * Determines the channel and color based on the notification title.
   */
  private getNotificationStyle(title: string) {
    if (title.includes('✅') || title.includes('🎉') || title.includes('Approved')) {
      return { channelId: 'od-approved', color: '#16A34A' }; // green
    }
    if (title.includes('❌') || title.includes('Rejected')) {
      return { channelId: 'od-rejected', color: '#DC2626' }; // red
    }
    return { channelId: 'od-general', color: '#1B2A4A' }; // brand navy
  }

  /**
   * Initialize notification listeners
   */
  async initialize() {
    await this.requestUserPermission();
    await this.setupAndroidChannels();

    const messaging = getMessaging();

    // Foreground message handler
    onMessage(messaging, async remoteMessage => {
      console.log('A new FCM message arrived in the foreground!', remoteMessage);
      try {
        await this.displayNotification(remoteMessage);
      } catch (error) {
        console.error('Failed to display notification:', error);
      }
    });

    // Handle token refresh
    onTokenRefresh(messaging, async token => {
      console.log('FCM Token refreshed:', token);
      this.fcmToken = token;
      try {
        await sendFcmTokenToBackend(token);
      } catch (error) {
        console.error('Failed to update refreshed token', error);
      }
    });

    // Handle foreground interaction (Notifee)
    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log('User pressed notification', detail.notification);
        // Future: navigate to the OD detail screen using detail.notification?.data
      }
    });
  }

  /**
   * Display a rich local notification using Notifee.
   * Automatically styles based on notification content (approved/rejected/general).
   */
  async displayNotification(remoteMessage: any) {
    const title = remoteMessage.notification?.title || 'Campus Connect';
    const body = remoteMessage.notification?.body || '';
    const { channelId, color } = this.getNotificationStyle(title);

    await notifee.displayNotification({
      title: `<p style="color: ${color};"><b>${title}</b></p>`,
      body,
      data: remoteMessage.data || {},
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        smallIcon: 'ic_launcher',
        color,
        sound: 'default',
        showTimestamp: true,
        timestamp: Date.now(),
        style: {
          type: AndroidStyle.BIGTEXT,
          text: body,
        },
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
