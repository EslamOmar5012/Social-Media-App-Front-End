import { useState, useEffect, useRef } from 'react';
import { Send, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

const ChatArea = ({ activeRoom }) => {
  const { user } = useAuth();
  const { socketService, getTypingUsersInRoom, isUserOnline } = useSocket();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTypingLocal, setIsTypingLocal] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const roomId = activeRoom?.roomID;
  const chatType = activeRoom?.chatType;
  const isDirect = chatType === 'direct';

  // Find the other participant in direct chat to show status
  const otherParticipantId = isDirect
    ? activeRoom.participants?.find((id) => id !== user?.id)
    : null;
  const isOtherOnline = otherParticipantId ? isUserOnline(otherParticipantId) : false;

  // Load message history
  useEffect(() => {
    if (!roomId) return;

    const fetchHistory = async () => {
      try {
        const response = await api.get(`/chat/room/${roomId}/messages?page=1&limit=50`);
        if (response.data && response.data.data) {
          setMessages(response.data.data.messages || []);
        }
      } catch (err) {
        console.error('Error loading chat history:', err);
      }
    };

    fetchHistory();
    socketService.joinRoom(roomId);

    // Read all incoming messages when entering
    socketService.markMessageRead('', roomId);

    return () => {
      socketService.leaveRoom(roomId);
    };
  }, [roomId, socketService]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time socket event handlers for this specific room
  useEffect(() => {
    if (!roomId) return;

    const handleReceiveMessage = (msg) => {
      if (msg.roomId === roomId) {
        // Double check to avoid duplication
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg.messageId || m._id === msg._id)) {
            return prev;
          }
          return [
            ...prev,
            {
              _id: msg.messageId || Date.now().toString(),
              sender: { _id: msg.sender },
              content: msg.content,
              createdAt: msg.timestamp || Date.now(),
              readBy: [msg.sender],
            },
          ];
        });

        // Send read receipt if we are not the sender
        if (msg.sender !== user?.id) {
          socketService.markMessageRead(msg.messageId, roomId);
        }
      }
    };

    const handleMessageReadUpdate = ({ messageId, readBy }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id === messageId || !messageId) {
            const currentReadBy = msg.readBy || [];
            if (!currentReadBy.includes(readBy)) {
              return { ...msg, readBy: [...currentReadBy, readBy] };
            }
          }
          return msg;
        })
      );
    };

    socketService.on('receive_message', handleReceiveMessage);
    socketService.on('message_read_update', handleMessageReadUpdate);

    return () => {
      socketService.off('receive_message', handleReceiveMessage);
      socketService.off('message_read_update', handleMessageReadUpdate);
    };
  }, [roomId, user, socketService]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    // Emit message to backend via socket
    socketService.sendMessage(roomId, inputMessage.trim());

    // Optimistic local update
    const optimisticMessage = {
      _id: `temp-${Date.now()}`,
      sender: { _id: user?.id, username: user?.username },
      content: inputMessage.trim(),
      createdAt: new Date().toISOString(),
      readBy: [user?.id],
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputMessage('');

    // Clear typing indicator
    if (isTypingLocal) {
      setIsTypingLocal(false);
      socketService.sendTyping(roomId, false);
    }
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);

    // Handle typing emission
    if (!isTypingLocal) {
      setIsTypingLocal(true);
      socketService.sendTyping(roomId, true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTypingLocal(false);
      socketService.sendTyping(roomId, false);
    }, 2000);
  };

  const activeTypers = getTypingUsersInRoom(roomId);

  return (
    <div className="chat-area-container glass-panel animate-fade-in">
      {/* Chat Header */}
      <div className="chat-area-header">
        <div className="room-info">
          <div className="room-avatar">
            {activeRoom.groupImage ? (
              <img src={activeRoom.groupImage} alt={activeRoom.groupName || 'Chat'} />
            ) : (
              (activeRoom.groupName || 'Chat').slice(0, 2).toUpperCase()
            )}
            {isDirect && (
              <span className={`status-dot-indicator ${isOtherOnline ? 'online' : 'offline'}`}></span>
            )}
          </div>
          <div className="room-meta">
            <span className="room-title">
              {isDirect ? `Direct Chat with ${activeRoom.otherUser?.username || 'User'}` : activeRoom.groupName}
            </span>
            <span className="room-status-text">
              {isDirect
                ? isOtherOnline
                  ? 'Online'
                  : 'Offline'
                : `${activeRoom.participants?.length || 0} Members`}
            </span>
          </div>
        </div>
      </div>

      {/* Message Feed */}
      <div className="chat-messages-feed">
        {messages.map((msg) => {
          const isMe = (msg.sender?._id || msg.sender) === user?.id;
          const showReadStatus = isMe && !msg.isOptimistic;
          const readCount = msg.readBy ? msg.readBy.filter((id) => id !== user?.id).length : 0;

          return (
            <div key={msg._id} className={`message-row ${isMe ? 'message-right' : 'message-left'}`}>
              <div className="message-bubble glass-panel">
                {!isMe && !isDirect && (
                  <span className="message-sender-name">
                    {msg.sender?.username || `User (${msg.sender?._id?.slice(-4)})`}
                  </span>
                )}
                <p className="message-text">{msg.content}</p>
                <div className="message-meta-info">
                  <span className="message-timestamp">
                    {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {showReadStatus && (
                    <span className={`read-receipt-tick ${readCount > 0 ? 'read' : 'sent'}`}>
                      <Eye size={12} />
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicators */}
      {activeTypers.length > 0 && (
        <div className="typing-indicator-row animate-fade-in">
          <div className="typing-bubble">
            <span className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span className="typing-text">someone is typing...</span>
          </div>
        </div>
      )}

      {/* Input controls */}
      <form onSubmit={handleSendMessage} className="chat-input-controls">
        <input
          type="text"
          placeholder="Type your message..."
          value={inputMessage}
          onChange={handleInputChange}
        />
        <button type="submit" className="btn-primary btn-send-message">
          <Send size={18} />
        </button>
      </form>

      <style>{`
        .chat-area-container {
          display: flex;
          flex-direction: column;
          height: 600px;
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .chat-area-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
          background: hsla(var(--hue), 15%, 10%, 0.4);
        }
        .room-info {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .room-avatar {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-full);
          background: var(--accent);
          color: white;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          position: relative;
          overflow: hidden;
        }
        .room-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .status-dot-indicator {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid var(--bg-secondary);
        }
        .status-dot-indicator.online {
          background: var(--success);
        }
        .status-dot-indicator.offline {
          background: var(--text-muted);
        }
        .room-meta {
          display: flex;
          flex-direction: column;
          text-align: left;
        }
        .room-title {
          font-weight: 700;
          font-size: 15px;
          color: var(--text-primary);
        }
        .room-status-text {
          font-size: 11px;
          color: var(--text-muted);
        }
        .chat-messages-feed {
          flex-grow: 1;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: hsla(var(--hue), 20%, 6%, 0.2);
        }
        .message-row {
          display: flex;
          width: 100%;
        }
        .message-left {
          justify-content: flex-start;
        }
        .message-right {
          justify-content: flex-end;
        }
        .message-bubble {
          max-width: 70%;
          padding: 10px 16px;
          border-radius: var(--radius-md);
          text-align: left;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .message-left .message-bubble {
          border-bottom-left-radius: 2px;
          background: var(--bg-tertiary);
        }
        .message-right .message-bubble {
          border-bottom-right-radius: 2px;
          background: var(--accent-glow);
          border-color: hsla(270, 85%, 65%, 0.3);
        }
        .message-sender-name {
          font-size: 10px;
          font-weight: 700;
          color: var(--accent);
          margin-bottom: 2px;
        }
        .message-text {
          font-size: 14px;
          color: var(--text-primary);
          line-height: 1.4;
          word-break: break-word;
        }
        .message-meta-info {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          margin-top: 2px;
        }
        .message-timestamp {
          font-size: 9px;
          color: var(--text-muted);
        }
        .read-receipt-tick {
          display: inline-flex;
        }
        .read-receipt-tick.sent {
          color: var(--text-muted);
        }
        .read-receipt-tick.read {
          color: var(--accent);
        }
        .typing-indicator-row {
          display: flex;
          padding: 0 20px 10px;
        }
        .typing-bubble {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-secondary);
          padding: 8px 14px;
          border-radius: var(--radius-md);
          border-bottom-left-radius: 2px;
        }
        .typing-dots {
          display: flex;
          align-items: center;
          gap: 3px;
        }
        .typing-dots span {
          width: 6px;
          height: 6px;
          background: var(--text-muted);
          border-radius: 50%;
          animation: typingDot 1.4s infinite ease-in-out both;
        }
        .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
        .typing-dots span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes typingDot {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        .typing-text {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 500;
        }
        .chat-input-controls {
          display: flex;
          padding: 16px 20px;
          background: hsla(var(--hue), 15%, 10%, 0.4);
          border-top: 1px solid var(--border-color);
          gap: 12px;
        }
        .chat-input-controls input {
          flex-grow: 1;
          border-radius: var(--radius-full);
        }
        .btn-send-message {
          width: 46px;
          height: 46px;
          border-radius: var(--radius-full);
          padding: 0;
        }
      `}</style>
    </div>
  );
};

export default ChatArea;
