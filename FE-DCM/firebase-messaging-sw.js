importScripts(
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyB-MpIinkXayArSLCnAN47qnkhVK_lxFuw",
  authDomain: "social-media-app-41d4a.firebaseapp.com",
  projectId: "social-media-app-41d4a",
  storageBucket: "social-media-app-41d4a.firebasestorage.app",
  messagingSenderId: "550159446576",
  appId: "1:550159446576:web:4f9d8acb8fa84ee87433f5",
  measurementId: "G-8G64J06PGW",
});

const messaging = firebase.messaging();

// ✅ Background Notifications
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background message:", payload);

  self.registration.showNotification(
    payload.data?.title || "New Notification",
    {
      body: payload.data?.body || "You have a message",
      icon: "/firebase-logo.png",
    },
  );
});
