const firebaseConfig = {
  apiKey: "AIzaSyB-MpIinkXayArSLCnAN47qnkhVK_lxFuw",
  authDomain: "social-media-app-41d4a.firebaseapp.com",
  projectId: "social-media-app-41d4a",
  storageBucket: "social-media-app-41d4a.firebasestorage.app",
  messagingSenderId: "550159446576",
  appId: "1:550159446576:web:4f9d8acb8fa84ee87433f5",
  measurementId: "G-8G64J06PGW",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

export { messaging };
