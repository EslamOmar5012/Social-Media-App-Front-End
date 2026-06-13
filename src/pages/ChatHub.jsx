import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import ChatArea from '../components/ChatArea';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Users, X, Compass } from 'lucide-react';

const ChatHub = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateDirect, setShowCreateDirect] = useState(false);
  
  // Group chat creation states
  const [groupName, setGroupName] = useState('');
  const [participantEmails, setParticipantEmails] = useState('');
  const [groupLoading, setGroupLoading] = useState(false);

  // Direct chat creation states
  const [recipientId, setRecipientId] = useState('');
  const [friendsList, setFriendsList] = useState([]);
  const [directLoading, setDirectLoading] = useState(false);

  // Fetch groups and active rooms
  const fetchRooms = async () => {
    try {
      // 1. Fetch group chats
      const groupRes = await api.get('/chat/my-groups');
      const fetchedGroups = groupRes.data?.data || [];

      // Combine direct chats and group chats
      // Since direct chats are initialized dynamically, we can also query any past direct chats or display them.
      // Let's populate the rooms list.
      setRooms(fetchedGroups);
    } catch (err) {
      console.error('Error fetching chats:', err);
    }
  };

  const fetchFriends = useCallback(async () => {
    try {
      // Find friends list by searching with empty query or standard query
      const response = await api.get('/user/search?q=');
      if (response.data && response.data.data) {
        // Filter to only actual friends
        const allUsers = response.data.data.data || [];
        setFriendsList(allUsers.filter((u) => u.isFriend && u.id !== user?.id));
      }
    } catch (err) {
      console.error('Error loading friends for direct chat:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRooms();
    fetchFriends();
  }, [fetchFriends]);

  const handleCreateGroupChat = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || !participantEmails.trim()) return;

    setGroupLoading(true);
    const emailsArray = participantEmails
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    try {
      const response = await api.post('/chat/create-group-by-emails', {
        groupName: groupName.trim(),
        emails: emailsArray,
      });

      if (response.data && response.data.data) {
        const newRoom = response.data.data;
        setRooms((prev) => [newRoom, ...prev]);
        setActiveRoom(newRoom);
        setGroupName('');
        setParticipantEmails('');
        setShowCreateGroup(false);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to create group chat');
    } finally {
      setGroupLoading(false);
    }
  };

  const handleCreateDirectChat = async (e) => {
    e.preventDefault();
    if (!recipientId) return;

    setDirectLoading(true);
    try {
      const response = await api.post('/chat/direct', { recipientId });
      if (response.data && response.data.data) {
        const directRoom = response.data.data;
        
        // Find recipient user profile info to attach as otherUser details
        const selectedFriend = friendsList.find((f) => f.id === recipientId);
        directRoom.otherUser = selectedFriend || { username: `User (${recipientId.slice(-4)})` };
        
        // Check if room is already in list
        setRooms((prev) => {
          if (prev.some((r) => r.roomID === directRoom.roomID)) {
            return prev;
          }
          return [directRoom, ...prev];
        });
        
        setActiveRoom(directRoom);
        setRecipientId('');
        setShowCreateDirect(false);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to initialize direct chat');
    } finally {
      setDirectLoading(false);
    }
  };

  return (
    <div className="chathub-layout-container">
      <Navbar />

      <div className="chathub-grid">
        {/* Sidenav Rooms List */}
        <aside className="chathub-sidebar glass-panel">
          <div className="chathub-sidebar-header">
            <h3>Discussions</h3>
            <div className="creation-action-btns">
              <button
                className="btn-create-action"
                onClick={() => setShowCreateDirect(true)}
                title="New Direct Chat"
              >
                <MessageSquare size={16} />
              </button>
              <button
                className="btn-create-action"
                onClick={() => setShowCreateGroup(true)}
                title="New Group Chat"
              >
                <Users size={16} />
              </button>
            </div>
          </div>

          <div className="rooms-feed-scroller">
            {rooms.length === 0 ? (
              <div className="no-chats-placeholder">
                <Compass size={24} />
                <p>No active chats. Start one below!</p>
              </div>
            ) : (
              rooms.map((room) => {
                const isSelected = activeRoom?.roomID === room.roomID;
                const isDirect = room.chatType === 'direct';
                const roomTitle = isDirect
                  ? room.otherUser?.username || `Direct Chat (${room.participants?.find(id => id !== user?.id)?.slice(-4)})`
                  : room.groupName;

                return (
                  <div
                    key={room.roomID}
                    className={`room-item-row ${isSelected ? 'active' : ''}`}
                    onClick={() => setActiveRoom(room)}
                  >
                    <div className="room-avatar-small">
                      {room.groupImage ? (
                        <img src={room.groupImage} alt={roomTitle} />
                      ) : (
                        roomTitle.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="room-item-meta">
                      <span className="room-item-title">{roomTitle}</span>
                      <span className="room-item-type">{isDirect ? 'Direct' : 'Group'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Main Chat Feed */}
        <main className="chathub-content">
          {activeRoom ? (
            <ChatArea activeRoom={activeRoom} />
          ) : (
            <div className="empty-chat-panel glass-panel animate-fade-in">
              <MessageSquare size={48} className="placeholder-icon" />
              <h3>Select a chat room</h3>
              <p>Pick a chat from the sidebar or initiate a direct chat with your friends to begin talking.</p>
              <div className="quick-actions">
                <button className="btn-primary" onClick={() => setShowCreateDirect(true)}>
                  Start Direct Chat
                </button>
                <button className="btn-secondary" onClick={() => setShowCreateGroup(true)}>
                  Create Group Chat
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal - Create Group Chat */}
      {showCreateGroup && (
        <div className="modal-overlay">
          <div className="modal-content glass-card animate-fade-in">
            <div className="modal-header">
              <h3>Create Group Chat</h3>
              <button className="btn-icon" onClick={() => setShowCreateGroup(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateGroupChat} className="modal-form">
              <div className="form-group">
                <label>Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. Developers"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Participant Emails (Comma-separated)</label>
                <textarea
                  placeholder="e.g. friend1@gmail.com, friend2@gmail.com"
                  value={participantEmails}
                  onChange={(e) => setParticipantEmails(e.target.value)}
                  required
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateGroup(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={groupLoading}>
                  {groupLoading ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Create Direct Chat */}
      {showCreateDirect && (
        <div className="modal-overlay">
          <div className="modal-content glass-card animate-fade-in">
            <div className="modal-header">
              <h3>Start Direct Chat</h3>
              <button className="btn-icon" onClick={() => setShowCreateDirect(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateDirectChat} className="modal-form">
              <div className="form-group">
                <label>Select Friend</label>
                {friendsList.length === 0 ? (
                  <p className="no-friends-warning">
                    No friends available. Search and add friends from the top navigation search bar first!
                  </p>
                ) : (
                  <select
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Friend --</option>
                    {friendsList.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.username} ({f.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateDirect(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={directLoading || friendsList.length === 0}
                >
                  {directLoading ? 'Initializing...' : 'Open Chat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .chathub-layout-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
        }
        .chathub-grid {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 20px;
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
          width: 100%;
          flex-grow: 1;
          height: calc(100vh - 100px);
          overflow: hidden;
        }
        @media (max-width: 768px) {
          .chathub-grid {
            grid-template-columns: 1fr;
            padding: 12px;
          }
          .chathub-sidebar {
            display: ${activeRoom ? 'none' : 'flex'};
          }
          .chathub-content {
            display: ${activeRoom ? 'flex' : 'none'};
          }
        }
        .chathub-sidebar {
          display: flex;
          flex-direction: column;
          border-radius: var(--radius-lg);
          overflow: hidden;
          height: 100%;
          background: var(--bg-secondary);
        }
        .chathub-sidebar-header {
          padding: 20px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .chathub-sidebar-header h3 {
          font-size: 16px;
          font-weight: 800;
        }
        .creation-action-btns {
          display: flex;
          gap: 8px;
        }
        .btn-create-action {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-create-action:hover {
          background: var(--accent);
          color: white;
        }
        .rooms-feed-scroller {
          flex-grow: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .no-chats-placeholder {
          text-align: center;
          color: var(--text-muted);
          padding: 36px 16px;
          font-size: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .room-item-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: left;
        }
        .room-item-row:hover {
          background: var(--bg-tertiary);
        }
        .room-item-row.active {
          background: var(--accent-glow);
          border-left: 3px solid var(--accent);
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
        }
        .room-avatar-small {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-full);
          background: var(--accent);
          color: white;
          font-weight: bold;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .room-avatar-small img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .room-item-meta {
          display: flex;
          flex-direction: column;
        }
        .room-item-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .room-item-type {
          font-size: 10px;
          color: var(--text-muted);
        }
        .chathub-content {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .empty-chat-panel {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          text-align: center;
          color: var(--text-secondary);
        }
        .placeholder-icon {
          color: var(--text-muted);
          margin-bottom: 16px;
        }
        .empty-chat-panel h3 {
          font-size: 18px;
          color: var(--text-primary);
          margin-bottom: 8px;
        }
        .empty-chat-panel p {
          font-size: 13px;
          color: var(--text-muted);
          max-width: 400px;
          margin-bottom: 24px;
        }
        .quick-actions {
          display: flex;
          gap: 12px;
        }
        .no-friends-warning {
          color: var(--warning);
          font-size: 12px;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
};

export default ChatHub;
