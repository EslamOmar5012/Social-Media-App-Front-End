import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ConfirmEmail = () => {
  const { confirmEmail, resendConfirmEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await confirmEmail(email, otp);
      setSuccess('Email confirmed successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Please provide an email address first.');
      return;
    }
    setError('');
    setSuccess('');
    setResending(true);

    try {
      await resendConfirmEmail(email);
      setSuccess('A new verification code has been sent to your email.');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to resend confirmation email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card glass-card">
        <h2 className="auth-title">✉️ Verify Email</h2>
        <p className="auth-subtitle">We have sent a 6-digit confirmation code to your email inbox</p>

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
            <label>6-Digit Code (OTP)</label>
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

          <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
            {loading ? 'Confirming...' : 'Verify Code'}
          </button>
        </form>

        <div className="auth-actions-row">
          <button type="button" className="btn-resend-otp" onClick={handleResend} disabled={resending}>
            {resending ? 'Sending...' : 'Resend Code'}
          </button>
          <span className="divider">|</span>
          <Link to="/login" className="back-login-link">Back to Sign In</Link>
        </div>
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
        .auth-actions-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 24px;
          font-size: 13px;
        }
        .btn-resend-otp {
          background: transparent;
          color: var(--accent);
          font-weight: 600;
        }
        .btn-resend-otp:hover {
          text-decoration: underline;
        }
        .divider {
          color: var(--border-color);
        }
        .back-login-link {
          color: var(--text-secondary);
          text-decoration: none;
          font-weight: 500;
        }
        .back-login-link:hover {
          color: var(--text-primary);
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default ConfirmEmail;
