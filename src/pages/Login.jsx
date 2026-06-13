import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const Login = () => {
  const { login } = useAuth();
  const { fcmToken } = useNotifications();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Pass the fcmToken obtained from Firebase Messaging context
      await login(email, password, fcmToken);
      navigate('/');
    } catch (err) {
      console.error(err);
      const code = err.response?.data?.code;
      const msg = err.response?.data?.message;

      // Handle unconfirmed email redirection
      if (msg === 'Email not confirmed' || code === 403 || msg?.includes('confirm')) {
        setError('Your email is not confirmed yet. Redirecting to confirmation page...');
        setTimeout(() => {
          navigate('/confirm-email', { state: { email } });
        }, 1500);
      } else {
        setError(msg || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card glass-card">
        <h2 className="auth-title">👋 Welcome Back</h2>
        <p className="auth-subtitle">Sign in to your account to resume discussions</p>

        {error && <div className="auth-error-alert">{error}</div>}

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
            <div className="form-label-with-action">
              <label>Password</label>
              <Link to="/forgot-password" className="form-action-link">Forgot?</Link>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/signup">Register</Link>
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
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-label-with-action {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .form-action-link {
          font-size: 12px;
          color: var(--accent);
          text-decoration: none;
          font-weight: 500;
        }
        .form-action-link:hover {
          text-decoration: underline;
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

export default Login;
