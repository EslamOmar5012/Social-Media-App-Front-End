import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const StoriesBar = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStoryContent, setNewStoryContent] = useState('');
  const [newStoryMedia, setNewStoryMedia] = useState(null);
  const [loading, setLoading] = useState(false);
  const [storyProgress, setStoryProgress] = useState(0);

  const fetchStories = async () => {
    try {
      const response = await api.get('/story');
      if (response.data && response.data.data) {
        setStories(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load stories:', err);
    }
  };

  const handleNextStory = useCallback(() => {
    setActiveStoryIndex((prev) => {
      if (prev === null) return null;
      if (prev < stories.length - 1) {
        return prev + 1;
      }
      return null; // Close at end
    });
  }, [stories.length]);

  const handlePrevStory = () => {
    setActiveStoryIndex((prev) => {
      if (prev === null) return null;
      if (prev > 0) {
        return prev - 1;
      }
      return 0;
    });
  };

  useEffect(() => {
    fetchStories();
  }, []);

  // Story playback timer logic
  useEffect(() => {
    if (activeStoryIndex === null) {
      setStoryProgress(0);
      return;
    }

    setStoryProgress(0);
    const intervalTime = 50; // ms
    const totalTime = 4000;  // 4s per story
    const step = (intervalTime / totalTime) * 100;

    const timer = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          // Go to next story
          handleNextStory();
          return 100;
        }
        return prev + step;
      });
    }, intervalTime);

    // Mark story as viewed in backend
    const currentStory = stories[activeStoryIndex];
    if (currentStory && !currentStory.viewers?.includes(user?.id)) {
      api.patch(`/story/${currentStory._id}/view`, {}).catch((err) => {
        console.error('Error viewing story:', err);
      });
    }

    return () => clearInterval(timer);
  }, [activeStoryIndex, handleNextStory, stories, user?.id]);

  const handleCreateStory = async (e) => {
    e.preventDefault();
    if (!newStoryMedia) return alert('Please attach an image or video!');

    setLoading(true);
    const formData = new FormData();
    formData.append('media', newStoryMedia);
    formData.append('content', newStoryContent);

    try {
      await api.post('/story', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setNewStoryContent('');
      setNewStoryMedia(null);
      setShowCreateModal(false);
      fetchStories();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to publish story');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stories-bar-container glass-panel animate-fade-in">
      <div className="story-circle create-story" onClick={() => setShowCreateModal(true)}>
        <div className="circle-inner">
          <Plus size={20} className="plus-icon" />
        </div>
        <span>New Story</span>
      </div>

      {stories.map((story, idx) => (
        <div
          key={story._id}
          className={`story-circle ${story.viewers?.includes(user?.id) ? 'viewed' : 'unviewed'}`}
          onClick={() => setActiveStoryIndex(idx)}
        >
          <div className="circle-inner image-holder">
            {story.media ? (
              <img src={story.media} alt="Story preview" />
            ) : (
              <span>📖</span>
            )}
          </div>
          <span className="story-author">{story.userId === user?.id ? 'My Story' : 'Friend'}</span>
        </div>
      ))}

      {/* Story Creator Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card animate-fade-in">
            <div className="modal-header">
              <h3>Create a Story</h3>
              <button className="btn-icon" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateStory} className="modal-form">
              <div className="form-group">
                <label>Story Caption</label>
                <input
                  type="text"
                  placeholder="What's on your mind?"
                  value={newStoryContent}
                  onChange={(e) => setNewStoryContent(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Media File</label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setNewStoryMedia(e.target.files[0])}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Publishing...' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Story Viewer Modal */}
      {activeStoryIndex !== null && stories[activeStoryIndex] && (
        <div className="story-viewer-overlay">
          <button className="story-viewer-close" onClick={() => setActiveStoryIndex(null)}>
            <X size={32} />
          </button>

          <button className="nav-btn prev-btn" onClick={handlePrevStory} disabled={activeStoryIndex === 0}>
            <ChevronLeft size={36} />
          </button>

          <div className="story-viewer-card">
            {/* Playback progress bar */}
            <div className="story-progress-container">
              {stories.map((_, i) => (
                <div key={i} className="story-progress-track">
                  <div
                    className="story-progress-bar"
                    style={{
                      width:
                        i === activeStoryIndex
                          ? `${storyProgress}%`
                          : i < activeStoryIndex
                          ? '100%'
                          : '0%',
                    }}
                  ></div>
                </div>
              ))}
            </div>

            <div className="story-viewer-image">
              <img src={stories[activeStoryIndex].media} alt="Story display" />
              {stories[activeStoryIndex].content && (
                <div className="story-viewer-caption">
                  <p>{stories[activeStoryIndex].content}</p>
                </div>
              )}
            </div>
          </div>

          <button className="nav-btn next-btn" onClick={handleNextStory} disabled={activeStoryIndex === stories.length - 1}>
            <ChevronRight size={36} />
          </button>
        </div>
      )}

      <style>{`
        .stories-bar-container {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          border-radius: var(--radius-lg);
          overflow-x: auto;
          margin-bottom: 24px;
        }
        .story-circle {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          min-width: 72px;
          text-align: center;
        }
        .circle-inner {
          width: 58px;
          height: 58px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border: 2px solid transparent;
          transition: transform var(--transition-fast);
        }
        .story-circle:hover .circle-inner {
          transform: scale(1.05);
        }
        .create-story .circle-inner {
          border: 2px dashed var(--accent);
          background: var(--accent-glow);
          color: var(--accent);
        }
        .story-circle.unviewed .circle-inner {
          border-color: var(--accent);
        }
        .story-circle.viewed .circle-inner {
          border-color: var(--border-color);
        }
        .image-holder {
          overflow: hidden;
        }
        .image-holder img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .story-circle span {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-secondary);
          max-width: 70px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        .modal-content {
          max-width: 450px;
          width: 90%;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .form-group label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .modal-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 12px;
        }
        .story-viewer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(10, 10, 15, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3000;
        }
        .story-viewer-close {
          position: absolute;
          top: 24px;
          right: 24px;
          background: transparent;
          color: white;
          cursor: pointer;
        }
        .nav-btn {
          position: absolute;
          background: hsla(0, 0%, 100%, 0.1);
          color: white;
          width: 50px;
          height: 50px;
          border-radius: var(--radius-full);
        }
        .nav-btn:hover {
          background: hsla(0, 0%, 100%, 0.2);
        }
        .nav-btn:disabled {
          opacity: 0.2;
          cursor: not-allowed;
        }
        .prev-btn { left: 40px; }
        .next-btn { right: 40px; }
        .story-viewer-card {
          width: 380px;
          height: 600px;
          max-width: 90%;
          max-height: 90vh;
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: black;
          display: flex;
          flex-direction: column;
          position: relative;
          box-shadow: 0 10px 30px rgba(0,0,0,0.8);
        }
        .story-progress-container {
          position: absolute;
          top: 16px;
          left: 16px;
          right: 16px;
          display: flex;
          gap: 6px;
          z-index: 10;
        }
        .story-progress-track {
          flex: 1;
          height: 4px;
          background: hsla(0, 0%, 100%, 0.25);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        .story-progress-bar {
          height: 100%;
          background: var(--accent);
          transition: width 0.05s linear;
        }
        .story-viewer-image {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .story-viewer-image img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .story-viewer-caption {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 24px 16px;
          background: linear-gradient(transparent, rgba(0,0,0,0.8));
          color: white;
          text-align: center;
        }
        .story-viewer-caption p {
          font-size: 14px;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default StoriesBar;
