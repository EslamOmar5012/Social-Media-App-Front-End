import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { socketService } from '../services/socket';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({}); // { [roomId]: { [userId]: boolean } }

  useEffect(() => {
    if (token) {
      console.log('[SocketContext] Connecting socket...');
      socketService.connect(token);

      // Handle user presence events
      const handlePresence = ({ userId, status }) => {
        console.log(`[SocketContext] User ${userId} is ${status}`);
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          if (status === 'online') {
            next.add(userId);
          } else {
            next.delete(userId);
          }
          return next;
        });
      };

      // Handle typing events
      const handleTyping = ({ roomId, userId, isTyping }) => {
        setTypingUsers((prev) => {
          const roomTyping = prev[roomId] || {};
          return {
            ...prev,
            [roomId]: {
              ...roomTyping,
              [userId]: isTyping,
            },
          };
        });
      };

      socketService.on('user_presence', handlePresence);
      socketService.on('typing_update', handleTyping);

      // Disconnect socket and clean up listeners on cleanup/token change
      return () => {
        console.log('[SocketContext] Cleaning up socket listeners...');
        socketService.off('user_presence', handlePresence);
        socketService.off('typing_update', handleTyping);
        socketService.disconnect();
      };
    } else {
      socketService.disconnect();
    }
  }, [token]);

  const value = {
    socketService,
    onlineUsers,
    typingUsers,
    isUserOnline: (userId) => onlineUsers.has(userId),
    getTypingUsersInRoom: (roomId) => {
      const roomTyping = typingUsers[roomId] || {};
      return Object.keys(roomTyping).filter((uid) => roomTyping[uid] && uid !== user?.id);
    },
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
export default SocketContext;
