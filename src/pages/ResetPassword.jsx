import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ResetPassword = () => {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, otp, newPassword, confirmPassword);
      setSuccess('Password updated successfully! Redirecting to sign in...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Password reset failed. Verify details and code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card glass-card">
        <h2 className="auth-title">🔒 Reset Password</h2>
        <p className="auth-subtitle">Verify OTP and supply a secure new password for your profile</p>

        {error && <div className="auth-error-alert">{error}</div>}
        {success && <div className="auth-success-alert">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Recovery Code (OTP)</label>
            <input
              type="text"
              placeholder="e.g. 123456"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              className="otp-input"
            />
          </div>

          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
            {loading ? 'Updating...' : 'Save New Password'}
          </button>
        </form>

        <p className="auth-footer">
          Recall your password? <Link to="/login">Sign In</Link>
        </p>
      </div>

      <style>{`
        .auth-page-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 24px 12px;
          background: radial-gradient(circle at 10% 20%, var(--bg-secondary) 0%, var(--bg-primary) 90%);
        }
        .auth-card {
          max-width: 420px;
          width: 100%;
          text-align: left;
        }
        .auth-title {
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 8px;
          text-align: center;
          background: linear-gradient(135deg, var(--text-primary), var(--accent));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .auth-subtitle {
          font-size: 13px;
          color: var(--text-secondary);
          text-align: center;
          margin-bottom: 24px;
        }
        .auth-error-alert {
          background: hsla(0, 80%, 60%, 0.1);
          border: 1px solid hsla(0, 80%, 60%, 0.3);
          color: var(--error);
          padding: 12px;
          border-radius: var(--radius-md);
          margin-bottom: 20px;
          font-size: 13px;
          font-weight: 500;
        }
        .auth-success-alert {
          background: hsla(140, 75%, 50%, 0.1);
          border: 1px solid hsla(140, 75%, 50%, 0.3);
          color: var(--success);
          padding: 12px;
          border-radius: var(--radius-md);
          margin-bottom: 20px;
          font-size: 13px;
          font-weight: 500;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .otp-input {
          text-align: center;
          font-size: 20px;
          letter-spacing: 6px;
          font-weight: bold;
        }
        .auth-submit-btn {
          margin-top: 12px;
          padding: 14px;
        }
        .auth-footer {
          text-align: center;
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 20px;
        }
        .auth-footer a {
          color: var(--accent);
          text-decoration: none;
          font-weight: 600;
        }
        .auth-footer a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default ResetPassword;
