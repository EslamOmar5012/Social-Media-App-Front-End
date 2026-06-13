import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { requestFcmToken, onFcmMessage } from '../services/fcm';
import api from '../services/api';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { token } = useAuth();
  const [fcmToken, setFcmToken] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(
    typeof window !== 'undefined' ? Notification.permission : 'default'
  );
  const [toasts, setToasts] = useState([]);

  // Toast notification manager helper
  const addToast = (title, body) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, title, body }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  // Sync token to backend when user is logged in
  const syncTokenToBackend = async (deviceToken) => {
    try {
      await api.patch('/notification/token', { fcmToken: deviceToken });
      console.log('[NotificationContext] FCM Token updated on server');
    } catch (error) {
      console.error('[NotificationContext] Failed to send FCM token to backend:', error);
    }
  };

  const setupNotifications = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);

      if (permission === 'granted') {
        const deviceToken = await requestFcmToken();
        if (deviceToken) {
          setFcmToken(deviceToken);
          if (token) {
            await syncTokenToBackend(deviceToken);
          }
        }
      } else {
        console.warn('[NotificationContext] Notifications not allowed by user');
      }
    } catch (error) {
      console.error('[NotificationContext] Notification setup error:', error);
    }
  }, [token]);

  // Request token on boot/login automatically if permission was already granted
  useEffect(() => {
    if (token) {
      if (typeof window !== 'undefined' && Notification.permission === 'granted') {
        setupNotifications();
      }
    }
  }, [token, setupNotifications]);

  // Listen to foreground FCM messages
  useEffect(() => {
    if (token) {
      onFcmMessage((payload) => {
        const title = payload.data?.title || payload.notification?.title || 'New Notification';
        const body = payload.data?.body || payload.notification?.body || 'You have a message';
        
        // Show in-app Toast
        addToast(title, body);

        // Show HTML5 Notification if supported and visible
        if (Notification.permission === 'granted' && document.hidden) {
          new Notification(title, {
            body: body,
            icon: '/firebase-logo.png',
          });
        }
      });
    }
  }, [token]);

  // Trigger test push notification to user's device
  const triggerTestPush = async () => {
    if (!fcmToken) {
      alert('FCM Token is empty or not authorized! Please enable notifications.');
      return;
    }

    try {
      await api.post('/notification/send-notification', {
        token: fcmToken,
        title: 'Test Notification',
        body: 'Push messaging works perfectly!',
        data: {
          click_action: 'Web-notification',
        },
      });
      console.log('[NotificationContext] Test notification requested');
    } catch (error) {
      console.error('[NotificationContext] Test push failed:', error);
      alert('Failed to send test notification. Check console for details.');
    }
  };

  const value = {
    fcmToken,
    permissionStatus,
    toasts,
    setupNotifications,
    triggerTestPush,
    removeToast: (id) => setToasts((prev) => prev.filter((t) => t.id !== id)),
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Dynamic Floating Notification Toasts */}
      <div className="notification-toasts-container">
        {toasts.map((toast) => (
          <div key={toast.id} className="notification-toast glass-panel animate-slide-in">
            <div className="toast-header">
              <span className="toast-icon">🔔</span>
              <strong className="toast-title">{toast.title}</strong>
              <button className="toast-close" onClick={() => value.removeToast(toast.id)}>
                &times;
              </button>
            </div>
            <div className="toast-body">{toast.body}</div>
          </div>
        ))}
      </div>

      <style>{`
        .notification-toasts-container {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 360px;
          width: 100%;
        }
        .notification-toast {
          padding: 16px;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          border-left: 4px solid var(--accent);
          color: var(--text-primary);
          animation: slideInRight var(--transition-normal) forwards;
        }
        .toast-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .toast-title {
          flex-grow: 1;
          font-size: 14px;
          font-weight: 700;
        }
        .toast-close {
          background: transparent;
          color: var(--text-muted);
          font-size: 18px;
          padding: 0 4px;
        }
        .toast-close:hover {
          color: var(--text-primary);
        }
        .toast-body {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
export default NotificationContext;
