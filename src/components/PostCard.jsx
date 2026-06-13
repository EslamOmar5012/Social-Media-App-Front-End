import { useState, useEffect } from 'react';
import { Heart, MessageCircle, MoreVertical, Edit2, Trash2, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const PostCard = ({ post, onPostDeleted }) => {
  const { user } = useAuth();
  const [likes, setLikes] = useState(post.likes || []);
  const [isLiked, setIsLiked] = useState((post.likes || []).includes(user?.id));
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [postContent, setPostContent] = useState(post.content);
  const [editContent, setEditContent] = useState(post.content);
  const [loading, setLoading] = useState(false);

  // Maintain liked status locally for immediate feedback
  useEffect(() => {
    setLikes(post.likes || []);
    setIsLiked((post.likes || []).includes(user?.id));
  }, [post, user]);

  const handleLike = async () => {
    // Optimistic toggle
    const previouslyLiked = isLiked;
    setIsLiked(!previouslyLiked);
    setLikes((prev) =>
      previouslyLiked ? prev.filter((id) => id !== user?.id) : [...prev, user?.id]
    );

    try {
      const response = await api.patch(`/post/${post._id}/like`);
      if (response.data && response.data.data) {
        setLikes(response.data.data.likes || []);
        setIsLiked((response.data.data.likes || []).includes(user?.id));
      }
    } catch (err) {
      console.error(err);
      // Rollback
      setIsLiked(previouslyLiked);
      setLikes((prev) =>
        previouslyLiked ? [...prev, user?.id] : prev.filter((id) => id !== user?.id)
      );
    }
  };

  const handleFetchComments = async () => {
    try {
      const response = await api.get(`/comment/post/${post._id}?page=1&limit=25`);
      if (response.data && response.data.data) {
        setComments(response.data.data.comments || []);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const toggleComments = () => {
    setShowComments(!showComments);
    if (!showComments) {
      handleFetchComments();
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentContent.trim()) return;

    try {
      // Backend expects: content, postId in multipart/formdata or JSON
      const response = await api.post('/comment', {
        content: newCommentContent,
        postId: post._id,
      });

      if (response.data && response.data.data) {
        // Prepend or append new comment
        setComments((prev) => [...prev, response.data.data]);
        setNewCommentContent('');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to add comment');
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      await api.delete(`/post/${post._id}`);
      if (onPostDeleted) {
        onPostDeleted(post._id);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete post');
    }
  };

  const handleUpdatePost = async (e) => {
    e.preventDefault();
    if (!editContent.trim()) return;

    setLoading(true);
    try {
      const response = await api.patch(`/post/${post._id}`, { content: editContent });
      if (response.data && response.data.data) {
        setPostContent(response.data.data.content);
        setIsEditing(false);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to edit post');
    } finally {
      setLoading(false);
    }
  };

  const handleLikeComment = async (commentId) => {
    try {
      const response = await api.patch(`/comment/${commentId}/like`);
      if (response.data && response.data.data) {
        setComments((prev) =>
          prev.map((c) => (c._id === commentId ? response.data.data : c))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="post-card glass-card animate-fade-in">
      <div className="post-header">
        <div className="post-author-info">
          <div className="author-avatar">
            {post.userId === user?.id
              ? user.username.slice(0, 2).toUpperCase()
              : 'FR'}
          </div>
          <div className="author-meta">
            <span className="author-name">{post.userId === user?.id ? 'You' : `User (${post.userId?.slice(-6)})`}</span>
            <span className="post-time">
              {new Date(post.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {post.userId === user?.id && (
          <div className="post-options-container">
            <button className="btn-icon" onClick={() => setShowOptions(!showOptions)}>
              <MoreVertical size={18} />
            </button>
            {showOptions && (
              <div className="options-dropdown glass-panel">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowOptions(false);
                  }}
                >
                  <Edit2 size={14} /> Edit Post
                </button>
                <button
                  className="delete-opt"
                  onClick={() => {
                    handleDeletePost();
                    setShowOptions(false);
                  }}
                >
                  <Trash2 size={14} /> Delete Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="post-content">
        {isEditing ? (
          <form onSubmit={handleUpdatePost} className="post-edit-form">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
            />
            <div className="edit-actions">
              <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                Save
              </button>
            </div>
          </form>
        ) : (
          <p>{postContent}</p>
        )}
      </div>

      {post.attachments && post.attachments.length > 0 && (
        <div className="post-attachments">
          {post.attachments.map((url, i) => (
            <div key={i} className="attachment-item">
              <img src={url} alt="Attachment" />
            </div>
          ))}
        </div>
      )}

      <div className="post-actions-bar">
        <button
          className={`action-btn like-btn ${isLiked ? 'liked' : ''}`}
          onClick={handleLike}
        >
          <Heart size={20} className={isLiked ? 'heart-pulse' : ''} />
          <span>{likes.length} Likes</span>
        </button>

        <button className="action-btn comment-btn" onClick={toggleComments}>
          <MessageCircle size={20} />
          <span>Comments</span>
        </button>
      </div>

      {showComments && (
        <div className="comments-section animate-fade-in">
          <form onSubmit={handleAddComment} className="comment-input-form">
            <input
              type="text"
              placeholder="Write a comment..."
              value={newCommentContent}
              onChange={(e) => setNewCommentContent(e.target.value)}
            />
            <button type="submit" className="btn-icon btn-send-comment">
              <Send size={16} />
            </button>
          </form>

          <div className="comments-list">
            {comments.length === 0 ? (
              <p className="no-comments-msg">No comments yet. Be the first to share your thoughts!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment._id} className="comment-item">
                  <div className="comment-header">
                    <div className="comment-author-avatar">
                      {comment.createdBy === user?.id
                        ? user.username.slice(0, 2).toUpperCase()
                        : 'FR'}
                    </div>
                    <div className="comment-body-content">
                      <div className="comment-author-name">
                        {comment.createdBy === user?.id ? 'You' : `User (${comment.createdBy?.slice(-6)})`}
                      </div>
                      <p className="comment-text">{comment.content}</p>
                    </div>
                  </div>
                  <div className="comment-actions">
                    <button
                      className={`c-action-btn ${comment.likes?.includes(user?.id) ? 'c-liked' : ''}`}
                      onClick={() => handleLikeComment(comment._id)}
                    >
                      Like ({comment.likes?.length || 0})
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        .post-card {
          margin-bottom: 24px;
          text-align: left;
        }
        .post-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .post-author-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .author-avatar {
          width: 42px;
          height: 42px;
          border-radius: var(--radius-full);
          background: linear-gradient(135deg, var(--accent), #aa3bff);
          color: white;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }
        .author-meta {
          display: flex;
          flex-direction: column;
        }
        .author-name {
          font-weight: 700;
          color: var(--text-primary);
          font-size: 14px;
        }
        .post-time {
          font-size: 11px;
          color: var(--text-muted);
        }
        .post-options-container {
          position: relative;
        }
        .options-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          padding: 6px;
          border-radius: var(--radius-sm);
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 130px;
          box-shadow: var(--shadow-md);
          z-index: 10;
        }
        .options-dropdown button {
          background: transparent;
          color: var(--text-secondary);
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          width: 100%;
          justify-content: flex-start;
        }
        .options-dropdown button:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
        .options-dropdown button.delete-opt:hover {
          background: hsla(0, 80%, 60%, 0.15);
          color: var(--error);
        }
        .post-content {
          margin-bottom: 16px;
          font-size: 15px;
          line-height: 1.6;
          color: var(--text-primary);
        }
        .post-edit-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }
        .post-edit-form textarea {
          width: 100%;
          resize: vertical;
        }
        .edit-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        .post-attachments {
          margin-bottom: 16px;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: black;
          max-height: 400px;
          display: flex;
          justify-content: center;
        }
        .attachment-item img {
          width: 100%;
          max-height: 400px;
          object-fit: contain;
        }
        .post-actions-bar {
          display: flex;
          align-items: center;
          gap: 24px;
          border-top: 1px solid var(--border-color);
          padding-top: 12px;
        }
        .action-btn {
          background: transparent;
          color: var(--text-secondary);
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .action-btn:hover {
          color: var(--accent);
        }
        .like-btn.liked {
          color: var(--accent);
        }
        .heart-pulse {
          animation: heartPulse 0.4s ease-out;
        }
        @keyframes heartPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        .comments-section {
          border-top: 1px solid var(--border-color);
          margin-top: 16px;
          padding-top: 16px;
        }
        .comment-input-form {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .comment-input-form input {
          flex-grow: 1;
          border-radius: var(--radius-full);
          padding: 8px 16px;
        }
        .btn-send-comment {
          background: var(--accent);
          color: white;
          width: 36px;
          height: 36px;
        }
        .btn-send-comment:hover {
          filter: brightness(1.1);
        }
        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .no-comments-msg {
          font-size: 13px;
          color: var(--text-muted);
          text-align: center;
          padding: 8px 0;
        }
        .comment-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-bottom: 12px;
          border-bottom: 1px solid hsla(var(--hue), 10%, 20%, 0.5);
        }
        .comment-header {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .comment-author-avatar {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-full);
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          font-weight: bold;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .comment-body-content {
          background: var(--bg-secondary);
          padding: 8px 12px;
          border-radius: var(--radius-md);
          flex-grow: 1;
        }
        .comment-author-name {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 2px;
        }
        .comment-text {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        .comment-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-left: 42px;
        }
        .c-action-btn {
          background: transparent;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 600;
        }
        .c-action-btn:hover, .c-action-btn.c-liked {
          color: var(--accent);
        }
      `}</style>
    </div>
  );
};

export default PostCard;
