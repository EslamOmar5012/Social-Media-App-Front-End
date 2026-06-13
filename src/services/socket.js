import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  /**
   * Connects to the socket server using the provided access token
   */
  connect(token) {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(API_BASE_URL, {
      auth: {
        token: `Bearer ${token}`,
      },
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected with socket ID:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    // Re-register all listeners in case we reconnected
    for (const [event, callbacks] of this.listeners.entries()) {
      for (const callback of callbacks) {
        this.socket.on(event, callback);
      }
    }
  }

  /**
   * Disconnects the current socket connection
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Emits an event to the socket server
   */
  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    } else {
      console.warn('[Socket] Attempted to emit event but socket is not connected:', event);
    }
  }

  /**
   * Registers a listener for an event
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Unregisters a listener for an event
   */
  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // ── Emits Helper Methods ─────────────────────────────────────────

  joinRoom(roomId) {
    this.emit('join_room', roomId);
  }

  leaveRoom(roomId) {
    this.emit('leave_room', roomId);
  }

  sendMessage(roomId, content, type = 'text', replyTo = null) {
    this.emit('send_message', {
      roomId,
      content,
      type,
      replyTo,
      timestamp: Date.now(),
    });
  }

  sendTyping(roomId, isTyping) {
    this.emit('typing', { roomId, isTyping });
  }

  markMessageRead(messageId, roomId) {
    this.emit('message_read', { messageId, roomId });
  }
}

export const socketService = new SocketService();
