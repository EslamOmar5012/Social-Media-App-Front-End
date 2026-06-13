import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import StoriesBar from '../components/StoriesBar';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Image, Globe, Lock, AlertCircle, Compass, Award, Bookmark } from 'lucide-react';
import api from '../services/api';

const HomeFeed = () => {
  const { user } = useAuth();
  const { onlineUsers } = useSocket();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = async (pageNumber = 1, append = false) => {
    setLoading(true);
    try {
      const response = await api.get(`/post?page=${pageNumber}&limit=5`);
      if (response.data && response.data.data !== undefined) {
        const raw = response.data.data;

        // Normalize response shape: API may return array, {posts:[]}, {data:[]}, etc.
        let fetchedPosts = [];
        if (Array.isArray(raw)) {
          fetchedPosts = raw;
        } else if (raw && Array.isArray(raw.posts)) {
          fetchedPosts = raw.posts;
        } else if (raw && Array.isArray(raw.data)) {
          fetchedPosts = raw.data;
        } else {
          // Unknown shape — log for debugging and keep empty array
          console.warn('[HomeFeed] Unexpected posts response shape:', raw);
          fetchedPosts = [];
        }

        if (fetchedPosts.length < 5) {
          setHasMore(false);
        }
        if (append) {
          setPosts((prev) => [...prev, ...fetchedPosts]);
        } else {
          setPosts(fetchedPosts);
        }
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchPosts(1, false);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachment(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postContent.trim() && !attachment) return;

    setSubmitting(true);
    const formData = new FormData();
    formData.append('content', postContent);
    formData.append('privacy', privacy);
    if (attachment) {
      formData.append('attachments', attachment); // Matches Postman collection formdata key 'attachments'
    }

    try {
      const response = await api.post('/post', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.data) {
        // Prepend new post
        setPosts((prev) => [response.data.data, ...prev]);
        setPostContent('');
        setAttachment(null);
        setAttachmentPreview(null);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostDeleted = (deletedPostId) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedPostId));
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  };

  return (
    <div className="home-layout-container">
      <Navbar />

      <div className="app-container">
        {/* Left Sidebar */}
        <aside className="sidebar-left glass-panel animate-fade-in">
          <div className="sidebar-profile-card">
            <div className="sidebar-avatar">
              {user?.username?.slice(0, 2).toUpperCase()}
            </div>
            <h3 className="sidebar-profile-name">{user?.username}</h3>
            <span className="sidebar-profile-email">{user?.email}</span>
          </div>

          <div className="sidebar-links-list">
            <a href="/" className="sidebar-link active">
              <Compass size={20} />
              <span>Explore Feed</span>
            </a>
            <a href="/chat" className="sidebar-link">
              <Award size={20} />
              <span>Messages Hub</span>
            </a>
            <a href="/profile" className="sidebar-link">
              <Bookmark size={20} />
              <span>My Profile</span>
            </a>
          </div>
        </aside>

        {/* Central Feed Area */}
        <main className="feed-main-content">
          <StoriesBar />

          {/* Create Post Widget */}
          <div className="create-post-widget glass-card animate-fade-in">
            <form onSubmit={handleCreatePost}>
              <div className="create-post-input-row">
                <div className="creator-avatar">
                  {user?.username?.slice(0, 2).toUpperCase()}
                </div>
                <textarea
                  placeholder={`What's on your mind, ${user?.username}?`}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  rows={2}
                />
              </div>

              {attachmentPreview && (
                <div className="create-post-preview">
                  <img src={attachmentPreview} alt="Preview" />
                  <button
                    type="button"
                    className="btn-remove-preview"
                    onClick={() => {
                      setAttachment(null);
                      setAttachmentPreview(null);
                    }}
                  >
                    &times;
                  </button>
                </div>
              )}

              <div className="create-post-actions-row">
                <div className="attachment-selectors">
                  <label className="attachment-label-btn" title="Add Image">
                    <Image size={18} />
                    <span>Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>

                  <div className="privacy-selector-wrapper">
                    {privacy === 'public' ? <Globe size={16} /> : <Lock size={16} />}
                    <select value={privacy} onChange={(e) => setPrivacy(e.target.value)}>
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn-primary btn-publish-post" disabled={submitting}>
                  {submitting ? 'Publishing...' : 'Publish'}
                </button>
              </div>
            </form>
          </div>

          {/* Posts Feed list */}
          <div className="posts-feed-list">
            {posts.length === 0 && !loading ? (
              <div className="empty-feed-card glass-panel">
                <AlertCircle size={32} />
                <h3>No posts available</h3>
                <p>Follow friends or create your own posts to get started!</p>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onPostDeleted={handlePostDeleted}
                />
              ))
            )}

            {loading && <div className="feed-spinner">Loading posts...</div>}

            {hasMore && posts.length > 0 && !loading && (
              <button className="btn-secondary btn-load-more" onClick={handleLoadMore}>
                Load More Posts
              </button>
            )}
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="sidebar-right glass-panel animate-fade-in">
          <div className="right-panel-header">
            <h4>Live Indicators</h4>
          </div>
          <div className="indicator-widget">
            <div className="indicator-row">
              <span className="indicator-label">Sockets Connection:</span>
              <span className="indicator-value status-online">Connected</span>
            </div>
            <div className="indicator-row">
              <span className="indicator-label">Active Users:</span>
              <span className="indicator-value">{onlineUsers.size} Online</span>
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        .home-layout-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }
        .sidebar-left {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          height: fit-content;
        }
        .sidebar-profile-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border-color);
        }
        .sidebar-avatar {
          width: 64px;
          height: 64px;
          border-radius: var(--radius-full);
          background: linear-gradient(135deg, var(--accent), #aa3bff);
          color: white;
          font-weight: 800;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          box-shadow: 0 4px 12px var(--accent-glow);
        }
        .sidebar-profile-name {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .sidebar-profile-email {
          font-size: 12px;
          color: var(--text-muted);
          word-break: break-all;
        }
        .sidebar-links-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--text-secondary);
          text-decoration: none;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 600;
          transition: all var(--transition-fast);
        }
        .sidebar-link:hover {
          background: var(--bg-secondary);
          color: var(--accent);
        }
        .sidebar-link.active {
          background: var(--accent-glow);
          color: var(--accent);
          border-left: 3px solid var(--accent);
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
        }
        .feed-main-content {
          display: flex;
          flex-direction: column;
        }
        .create-post-widget {
          margin-bottom: 24px;
          text-align: left;
        }
        .create-post-input-row {
          display: flex;
          gap: 14px;
          margin-bottom: 16px;
        }
        .creator-avatar {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-full);
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          font-weight: bold;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .create-post-input-row textarea {
          flex-grow: 1;
          border: none;
          background: transparent;
          padding: 8px 0;
          font-size: 15px;
          color: var(--text-primary);
          resize: none;
          outline: none;
        }
        .create-post-preview {
          position: relative;
          margin-bottom: 16px;
          border-radius: var(--radius-md);
          overflow: hidden;
          max-height: 250px;
          background: black;
          display: flex;
          justify-content: center;
        }
        .create-post-preview img {
          max-height: 250px;
          object-fit: contain;
          width: 100%;
        }
        .btn-remove-preview {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          font-size: 18px;
        }
        .create-post-actions-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid var(--border-color);
          padding-top: 12px;
        }
        .attachment-selectors {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .attachment-label-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          transition: background var(--transition-fast);
        }
        .attachment-label-btn:hover {
          background: var(--bg-secondary);
          color: var(--accent);
        }
        .privacy-selector-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-muted);
          background: var(--bg-secondary);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }
        .privacy-selector-wrapper select {
          border: none;
          background: transparent;
          padding: 0;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .btn-publish-post {
          padding: 8px 20px;
          font-size: 13px;
        }
        .empty-feed-card {
          padding: 48px;
          text-align: center;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          border-radius: var(--radius-lg);
        }
        .empty-feed-card h3 {
          color: var(--text-primary);
          font-size: 18px;
        }
        .feed-spinner {
          text-align: center;
          padding: 24px;
          color: var(--text-muted);
          font-size: 14px;
        }
        .btn-load-more {
          width: 100%;
          padding: 14px;
          margin-top: 12px;
          margin-bottom: 32px;
        }
        .sidebar-right {
          padding: 24px;
          height: fit-content;
        }
        .right-panel-header {
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 16px;
          text-align: left;
        }
        .right-panel-header h4 {
          font-size: 14px;
          font-weight: 800;
          color: var(--text-primary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .indicator-widget {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .indicator-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
        }
        .indicator-label {
          color: var(--text-secondary);
        }
        .indicator-value {
          font-weight: 700;
        }
        .status-online {
          color: var(--success);
        }
      `}</style>
    </div>
  );
};

export default HomeFeed;
