import firebase from 'firebase/compat/app';
import 'firebase/compat/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyB-MpIinkXayArSLCnAN47qnkhVK_lxFuw",
  authDomain: "social-media-app-41d4a.firebaseapp.com",
  projectId: "social-media-app-41d4a",
  storageBucket: "social-media-app-41d4a.firebasestorage.app",
  messagingSenderId: "550159446576",
  appId: "1:550159446576:web:4f9d8acb8fa84ee87433f5",
  measurementId: "G-8G64J06PGW",
};

const VAPID_KEY = "BA93vVr8dvODRjc3knK0Pzfh6n7aOWqfd-OgcFWjwBW-tIbe0k89l6s7lAP6f1_NudRch-FXwvWme6Uv1jDOO5U";

let messaging = null;

// Initialize Firebase only in browser environment
if (typeof window !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  messaging = firebase.messaging();
}

/**
 * Requests notification permissions and registers the service worker
 * returns the FCM token if successful
 */
export const requestFcmToken = async () => {
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[FCM] Notification permission denied');
      return null;
    }

    // Register FCM Service Worker
    let serviceWorkerRegistration = null;
    if ('serviceWorker' in navigator) {
      serviceWorkerRegistration = await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js'
      );
      console.log('[FCM] Service Worker registered successfully');
    }

    const token = await messaging.getToken({
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration,
    });

    console.log('[FCM] Token generated:', token);
    return token;
  } catch (error) {
    console.error('[FCM] Error getting FCM Token:', error);
    return null;
  }
};

/**
 * Registers a callback for when messages are received in the foreground
 */
export const onFcmMessage = (callback) => {
  if (!messaging) return;
  messaging.onMessage((payload) => {
    console.log('[FCM] Foreground message received:', payload);
    callback(payload);
  });
};

export { messaging };
