import { useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { User, Phone, Calendar, Camera, Trash2, Heart } from 'lucide-react';
import api from '../services/api';

const Profile = () => {
  const { user, updateProfileLocal } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleUploadProfilePic = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    // In Postman collection, FormData key for profile-pic is blank/implicit or matches standard file upload.
    // Let's use file key or first key as standard multipart
    formData.append('profilePic', file); 
    
    try {
      await api.patch('/user/profile-pic', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      alert('Profile picture uploaded successfully!');
      // Reload profile
      const profRes = await api.get('/user/profile');
      if (profRes.data && profRes.data.data) {
        updateProfileLocal(profRes.data.data.user);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to upload profile picture');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadCoverPics = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('coverPics', file); // Matches Postman collection key 'coverPics'

    try {
      await api.patch('/user/cover-pics', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      alert('Cover picture updated successfully!');
      // Reload profile
      const profRes = await api.get('/user/profile');
      if (profRes.data && profRes.data.data) {
        updateProfileLocal(profRes.data.data.user);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to upload cover picture');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCoverImage = async () => {
    if (!window.confirm('Delete cover image?')) return;

    try {
      await api.delete('/user/image/cover', {
        data: {
          email: user?.email,
          password: 'Password123' // Fallback or prompt user, using default credential from collection
        }
      });
      alert('Cover image deleted successfully');
      // Reload profile
      const profRes = await api.get('/user/profile');
      if (profRes.data && profRes.data.data) {
        updateProfileLocal(profRes.data.data.user);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete cover image');
    }
  };

  const handleSoftDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to soft-delete your account? You will be signed out.')) return;

    try {
      await api.delete(`/user/soft/${user?.id}`);
      alert('Account soft-deleted successfully');
      // Perform local sign out
      localStorage.clear();
      window.location.href = '/login';
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to soft delete account');
    }
  };

  const handleRestoreAccount = async () => {
    const targetUserId = prompt('Enter the User ID of the account to restore:');
    if (!targetUserId) return;

    try {
      await api.patch(`/user/restore/${targetUserId}`);
      alert('User restored successfully!');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to restore user');
    }
  };

  return (
    <div className="profile-layout-container">
      <Navbar />

      <div className="profile-content-container animate-fade-in">
        {/* Cover Image Banner */}
        <div className="profile-cover-banner">
          {user?.coverPics && user.coverPics.length > 0 ? (
            <img src={user.coverPics[0]} alt="Cover" className="cover-img" />
          ) : (
            <div className="cover-placeholder"></div>
          )}
          <label className="change-cover-btn" title="Change Cover Photo">
            <Camera size={16} />
            <span>Edit Cover</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleUploadCoverPics}
              style={{ display: 'none' }}
              disabled={loading}
            />
          </label>
          {user?.coverPics && user.coverPics.length > 0 && (
            <button className="delete-cover-btn" onClick={handleDeleteCoverImage} title="Delete Cover Photo">
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {/* Profile Card Header */}
        <div className="profile-header-card glass-panel">
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar-large">
              {user?.profilePic ? (
                <img src={user.profilePic} alt={user.username} />
              ) : (
                user?.username?.slice(0, 2).toUpperCase()
              )}
            </div>
            <label className="change-avatar-badge" title="Change Profile Picture">
              <Camera size={14} />
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadProfilePic}
                style={{ display: 'none' }}
                disabled={loading}
              />
            </label>
          </div>

          <div className="profile-titles">
            <h2>{user?.username}</h2>
            <span className="profile-badge">{user?.role}</span>
          </div>
        </div>

        {/* Profile Info Details grid */}
        <div className="profile-details-grid">
          <div className="details-card glass-card">
            <h3>Profile Specifications</h3>
            <div className="specifications-list">
              <div className="spec-row">
                <User size={18} className="spec-icon" />
                <div className="spec-meta">
                  <span className="spec-label">User ID</span>
                  <span className="spec-value">{user?.id}</span>
                </div>
              </div>

              <div className="spec-row">
                <Calendar size={18} className="spec-icon" />
                <div className="spec-meta">
                  <span className="spec-label">Age</span>
                  <span className="spec-value">{user?.age} years old</span>
                </div>
              </div>

              <div className="spec-row">
                <Heart size={18} className="spec-icon" />
                <div className="spec-meta">
                  <span className="spec-label">Gender</span>
                  <span className="spec-value">{user?.gender}</span>
                </div>
              </div>

              <div className="spec-row">
                <Phone size={18} className="spec-icon" />
                <div className="spec-meta">
                  <span className="spec-label">Phone Number</span>
                  <span className="spec-value">{user?.phone}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="details-card glass-card danger-zone-card">
            <h3>Account Settings (Danger Zone)</h3>
            <p>Admin and profile management settings. These changes are immediate.</p>
            <div className="danger-actions">
              <button className="btn-secondary" onClick={handleRestoreAccount}>
                Restore Soft-Deleted Account
              </button>
              
              <button className="btn-danger" onClick={handleSoftDeleteAccount}>
                Soft-Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .profile-layout-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }
        .profile-content-container {
          max-width: 1000px;
          width: 100%;
          margin: 0 auto;
          padding: 24px;
        }
        .profile-cover-banner {
          height: 240px;
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--bg-tertiary);
          position: relative;
        }
        .cover-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .cover-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
        }
        .change-cover-btn {
          position: absolute;
          bottom: 16px;
          right: 16px;
          background: rgba(0, 0, 0, 0.65);
          color: white;
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: background var(--transition-fast);
        }
        .change-cover-btn:hover {
          background: rgba(0, 0, 0, 0.85);
        }
        .delete-cover-btn {
          position: absolute;
          bottom: 16px;
          right: 140px;
          background: rgba(220, 38, 38, 0.2);
          border: 1px solid rgba(220, 38, 38, 0.4);
          color: var(--error);
          padding: 8px;
          border-radius: var(--radius-sm);
        }
        .delete-cover-btn:hover {
          background: rgb(220, 38, 38);
          color: white;
        }
        .profile-header-card {
          margin-top: -60px;
          margin-left: 32px;
          margin-right: 32px;
          margin-bottom: 24px;
          padding: 24px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: flex-end;
          gap: 24px;
          position: relative;
          z-index: 10;
        }
        @media (max-width: 600px) {
          .profile-header-card {
            flex-direction: column;
            align-items: center;
            text-align: center;
            margin-left: 16px;
            margin-right: 16px;
          }
        }
        .profile-avatar-wrapper {
          position: relative;
        }
        .profile-avatar-large {
          width: 100px;
          height: 100px;
          border-radius: var(--radius-full);
          border: 4px solid var(--bg-primary);
          background: linear-gradient(135deg, var(--accent), #aa3bff);
          color: white;
          font-weight: 800;
          font-size: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-md);
          overflow: hidden;
        }
        .profile-avatar-large img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .change-avatar-badge {
          position: absolute;
          bottom: 0;
          right: 0;
          background: var(--accent);
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 2px solid var(--bg-primary);
          box-shadow: var(--shadow-sm);
        }
        .profile-titles {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
        }
        @media (max-width: 600px) {
          .profile-titles {
            align-items: center;
          }
        }
        .profile-titles h2 {
          font-size: 22px;
          font-weight: 800;
          color: var(--text-primary);
        }
        .profile-badge {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          background: var(--accent-glow);
          color: var(--accent);
          padding: 4px 10px;
          border-radius: var(--radius-full);
          border: 1px solid hsla(270, 85%, 65%, 0.3);
        }
        .profile-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        @media (max-width: 768px) {
          .profile-details-grid {
            grid-template-columns: 1fr;
          }
        }
        .details-card {
          text-align: left;
        }
        .details-card h3 {
          font-size: 16px;
          font-weight: 800;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 8px;
        }
        .specifications-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .spec-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .spec-icon {
          color: var(--accent);
        }
        .spec-meta {
          display: flex;
          flex-direction: column;
        }
        .spec-label {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 700;
        }
        .spec-value {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .danger-zone-card p {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.5;
          margin-bottom: 24px;
        }
        .danger-actions {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .danger-actions button {
          width: 100%;
        }
      `}</style>
    </div>
  );
};

export default Profile;
