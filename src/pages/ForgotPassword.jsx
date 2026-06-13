import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ForgotPassword = () => {
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await forgotPassword(email);
      setSuccess('Password reset OTP sent successfully! Redirecting...');
      setTimeout(() => {
        navigate('/reset-password', { state: { email } });
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to send reset code. Verify your email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card glass-card">
        <h2 className="auth-title">🔑 Forgot Password</h2>
        <p className="auth-subtitle">Provide your email address to obtain a password recovery OTP code</p>

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

          <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
            {loading ? 'Sending code...' : 'Request OTP'}
          </button>
        </form>

        <p className="auth-footer">
          Remember your password? <Link to="/login">Sign In</Link>
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

export default ForgotPassword;
