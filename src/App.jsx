
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';

// Pages
import HomeFeed from './pages/HomeFeed';
import ChatHub from './pages/ChatHub';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ConfirmEmail from './pages/ConfirmEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Guard for protected pages
const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-boot-loading">
        <div className="pulse-loader"></div>
        <span>Initializing SocialPulse...</span>
        <style>{`
          .app-boot-loading {
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: hsl(250, 20%, 8%);
            color: white;
            gap: 16px;
          }
          .pulse-loader {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: hsl(270, 85%, 65%);
            animation: pulseGlow 1.2s infinite ease-in-out;
          }
          @keyframes pulseGlow {
            0%, 100% { transform: scale(0.6); opacity: 0.4; }
            50% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 20px hsla(270, 85%, 65%, 0.6); }
          }
        `}</style>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Guard for public pages (hides login/signup when logged in)
const PublicRoute = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) return null;

  if (token) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <SocketProvider>
            <Routes>
              {/* Public Routes */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicRoute>
                    <Signup />
                  </PublicRoute>
                }
              />
              <Route
                path="/confirm-email"
                element={
                  <PublicRoute>
                    <ConfirmEmail />
                  </PublicRoute>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <PublicRoute>
                    <ForgotPassword />
                  </PublicRoute>
                }
              />
              <Route
                path="/reset-password"
                element={
                  <PublicRoute>
                    <ResetPassword />
                  </PublicRoute>
                }
              />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <HomeFeed />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <ChatHub />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Wildcard Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SocketProvider>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
