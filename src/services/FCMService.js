/* eslint-disable no-unused-vars */
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import axios from 'axios';
import { APIURL } from '../constants/api';
import { COLORS } from '../styles/theme';
import { Platform, PermissionsAndroid } from 'react-native';

class FCMService {
    async requestUserPermission() {
        if (Platform.OS === 'ios') {
            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;
            if (enabled) {
                console.log('Authorization status:', authStatus);
            }
        } else if (Platform.OS === 'android' && Platform.Version >= 33) {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
                );
                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    console.log('Android Notification Permission Granted');
                } else {
                    console.log('Android Notification Permission Denied');
                }
            } catch (err) {
                console.warn(err);
            }
        }
    }

    async getFCMToken() {
        try {
            if (Platform.OS === 'ios') {
                await messaging().registerDeviceForRemoteMessages();
            }

            const token = await messaging().getToken();
            console.log('FCM Token:', token);
            return token;
        } catch (error) {
            console.error('Failed to get FCM token:', error);
            return null;
        }
    }

    async registerToken(userId, role, authToken) {
        try {
            const fcmToken = await this.getFCMToken();
            if (fcmToken) {
                await axios.post(`${APIURL}/notifications/register-token`, {
                    fcmToken,
                    role
                }, {
                    headers: { Authorization: `Bearer ${authToken}` }
                });
                console.log('FCM Token registered with backend');
            }
        } catch (error) {
            console.error('Failed to register FCM token with backend:', error);
        }
    }

    async checkInitialNotification() {
        // App opened from background state
        messaging().onNotificationOpenedApp(remoteMessage => {
            console.log('Notification caused app to open from background state:', remoteMessage.notification);
        });

        // App opened from quit state
        messaging()
            .getInitialNotification()
            .then(remoteMessage => {
                if (remoteMessage) {
                    console.log('Notification caused app to open from quit state:', remoteMessage.notification);
                }
            });
    }

    async createDefaultChannel() {
        await notifee.createChannel({
            id: 'default',
            name: 'Default Channel',
            importance: AndroidImportance.HIGH,
            sound: 'default',
        });
    }

    async onMessageReceived(remoteMessage) {
        // Display a notification
        await this.displayLocalNotification(
            remoteMessage.notification?.title || 'New Notification',
            remoteMessage.notification?.body || 'You have a new message'
        );
    }

    async displayLocalNotification(title, body) {
        await notifee.displayNotification({
            title: title,
            body: body,
            android: {
                channelId: 'default',
                color: COLORS?.primary || '#915200',
                smallIcon: 'ic_notification',
                pressAction: {
                    id: 'default',
                },
            },
        });
    }

    // Register foreground handler
    registerForegroundHandler() {
        return messaging().onMessage(async remoteMessage => {
            if (Platform.OS === 'android') {
                await this.onMessageReceived(remoteMessage);
            }
            // iOS: do nothing, let the OS handle it
        });
    }

    // Background handler for Notifee events (optional, mostly for interactions)
    registerNotifeeBackgroundHandler() {
        notifee.onBackgroundEvent(async ({ type, detail }) => {
            const { notification, pressAction } = detail;
            // Handle events
        });
    }
}

export default new FCMService();
