import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Home, MessageSquare, User, Search, Bell, LogOut, Send, AlertCircle } from 'lucide-react';
import api from '../services/api';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { permissionStatus, setupNotifications, triggerTestPush } = useNotifications();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const response = await api.get(`/user/search?q=${searchQuery}`);
        if (response.data && response.data.data) {
          setSearchResults(response.data.data.data || []);
        }
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleLogout = async () => {
    if (user?.email) {
      await logout(user.email);
      navigate('/login');
    }
  };

  const handleAddFriend = async (friendId) => {
    try {
      const response = await api.post('/user/add-friend', { friendId });
      alert(response.data?.message || 'Friend added successfully!');
      // Refresh results or search query to update state
      setSearchQuery('');
      setShowSearchDropdown(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to add friend');
    }
  };

  return (
    <nav className="navbar-container glass-panel">
      <div className="navbar-left">
        <Link to="/" className="navbar-logo">
          <span className="logo-spark">✨</span> SocialPulse
        </Link>
      </div>

      <div className="navbar-center search-wrapper">
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSearchDropdown(true)}
            onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
          />
        </div>

        {showSearchDropdown && (searchQuery.trim() !== '' || searchResults.length > 0) && (
          <div className="search-results-dropdown glass-panel">
            {searchResults.length === 0 ? (
              <div className="search-no-results">No friends found</div>
            ) : (
              searchResults.map((friend) => (
                <div key={friend.id} className="search-result-item">
                  <div className="user-avatar-small">
                    {friend.profilePic ? (
                      <img src={friend.profilePic} alt={friend.username} />
                    ) : (
                      friend.username.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="user-search-info">
                    <span className="search-username">{friend.username}</span>
                    <span className="search-email">{friend.email}</span>
                  </div>
                  {friend.isFriend ? (
                    <span className="badge-friend">Friends</span>
                  ) : (
                    <button
                      className="btn-add-friend"
                      onClick={() => handleAddFriend(friend.id)}
                    >
                      Add Friend
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="navbar-right">
        {/* Navigation Icons */}
        <Link to="/" className={`nav-link-btn ${location.pathname === '/' ? 'active' : ''}`} title="Home">
          <Home size={22} />
        </Link>

        <Link to="/chat" className={`nav-link-btn ${location.pathname === '/chat' ? 'active' : ''}`} title="Chats">
          <MessageSquare size={22} />
        </Link>

        <Link to="/profile" className={`nav-link-btn ${location.pathname === '/profile' ? 'active' : ''}`} title="Profile">
          <User size={22} />
        </Link>

        {/* Push Notification Controls */}
        <div className="notification-controls">
          {permissionStatus !== 'granted' ? (
            <button className="btn-bell alert-bell" onClick={setupNotifications} title="Enable Push Notifications">
              <AlertCircle size={22} />
              <span className="pulse-dot"></span>
            </button>
          ) : (
            <button className="btn-bell active-bell" onClick={triggerTestPush} title="Push Notifications Enabled. Click to test!">
              <Bell size={22} />
              <Send size={12} className="send-overlay-icon" />
            </button>
          )}
        </div>

        {/* User profile summary & logout */}
        {user && (
          <div className="navbar-profile-summary">
            <span className="navbar-username-display">{user.username}</span>
            <button className="btn-logout" onClick={handleLogout} title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        )}
      </div>

      <style>{`
        .navbar-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          margin-bottom: 24px;
          border-radius: var(--radius-md);
          position: sticky;
          top: 12px;
          z-index: 1000;
        }
        .navbar-logo {
          font-size: 20px;
          font-weight: 800;
          color: var(--text-primary);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .logo-spark {
          font-size: 22px;
          background: linear-gradient(135deg, var(--accent), #e879f9);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .search-wrapper {
          position: relative;
          max-width: 400px;
          width: 100%;
        }
        .search-bar {
          display: flex;
          align-items: center;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-full);
          padding: 6px 16px;
          width: 100%;
        }
        .search-icon {
          color: var(--text-muted);
          margin-right: 8px;
        }
        .search-bar input {
          background: transparent;
          border: none;
          padding: 4px 0;
          font-size: 14px;
          width: 100%;
          color: var(--text-primary);
          outline: none;
        }
        .search-bar input:focus {
          box-shadow: none;
        }
        .search-results-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          padding: 12px;
          border-radius: var(--radius-md);
          max-height: 300px;
          overflow-y: auto;
          box-shadow: var(--shadow-lg);
          z-index: 1001;
        }
        .search-no-results {
          padding: 12px;
          text-align: center;
          color: var(--text-muted);
          font-size: 14px;
        }
        .search-result-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px;
          border-radius: var(--radius-sm);
          transition: background var(--transition-fast);
        }
        .search-result-item:hover {
          background: var(--bg-tertiary);
        }
        .user-avatar-small {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          background: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 13px;
          overflow: hidden;
        }
        .user-avatar-small img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .user-search-info {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }
        .search-username {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .search-email {
          font-size: 11px;
          color: var(--text-muted);
        }
        .badge-friend {
          font-size: 11px;
          background: hsla(140, 75%, 50%, 0.15);
          color: var(--success);
          padding: 4px 8px;
          border-radius: var(--radius-full);
          border: 1px solid hsla(140, 75%, 50%, 0.3);
        }
        .btn-add-friend {
          font-size: 12px;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          background: var(--accent);
          color: white;
        }
        .btn-add-friend:hover {
          filter: brightness(1.1);
        }
        .navbar-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .nav-link-btn {
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border-radius: var(--radius-full);
          transition: all var(--transition-fast);
          text-decoration: none;
        }
        .nav-link-btn:hover {
          background: var(--bg-tertiary);
          color: var(--accent);
        }
        .nav-link-btn.active {
          color: var(--accent);
          background: var(--accent-glow);
        }
        .notification-controls {
          position: relative;
        }
        .btn-bell {
          background: transparent;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-full);
          padding: 8px;
        }
        .alert-bell {
          color: var(--error);
          background: hsla(0, 80%, 60%, 0.1);
          border: 1px dashed hsla(0, 80%, 60%, 0.4);
        }
        .active-bell {
          color: var(--success);
          background: hsla(140, 75%, 50%, 0.1);
        }
        .pulse-dot {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 8px;
          height: 8px;
          background-color: var(--error);
          border-radius: 50%;
          animation: pulseGlow 1.5s infinite;
        }
        .send-overlay-icon {
          position: absolute;
          bottom: 4px;
          right: 4px;
          background: var(--bg-secondary);
          border-radius: 50%;
          padding: 1px;
        }
        .navbar-profile-summary {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-left: 12px;
          border-left: 1px solid var(--border-color);
        }
        .navbar-username-display {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .btn-logout {
          background: transparent;
          color: var(--text-muted);
          padding: 4px;
          border-radius: var(--radius-full);
        }
        .btn-logout:hover {
          color: var(--error);
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
