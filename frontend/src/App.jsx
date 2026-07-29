import { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { api, getUser, clearToken } from './lib/api';
import Register from './pages/Register';
import Login from './pages/Login';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import TutorSearch from './pages/TutorSearch';
import TutorProfile from './pages/TutorProfile';
import Sessions from './pages/Sessions';
import Resources from './pages/Resources';
import Groups from './pages/Groups';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';

function RequireAuth({ children }) {
  const user = getUser();
  if (!user) return <Login />;
  return children;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    api('/notifications/mine')
      .then((list) => setUnread(list.filter((n) => !n.isRead).length))
      .catch(() => {});
  }, [location.pathname]);

  function logout() {
    clearToken();
    navigate('/login');
  }

  return (
    <div>
      <nav className="nav">
        <Link to="/" className="brand">PeerLink</Link>
        <div className="nav-links">
          {user ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/tutors">Find a tutor</Link>
              <Link to="/sessions">My sessions</Link>
              <Link to="/resources">Resources</Link>
              <Link to="/groups">Study groups</Link>
              <Link to="/messages">Messages</Link>
              <Link to="/notifications">Notifications{unread > 0 ? ` (${unread})` : ''}</Link>
              <button onClick={logout}>Log out ({user.name.split(' ')[0]})</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </div>
      </nav>
      <div className="container">
        <Routes>
          <Route path="/" element={user ? <Dashboard /> : <Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify" element={<VerifyEmail />} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/tutors" element={<RequireAuth><TutorSearch /></RequireAuth>} />
          <Route path="/tutors/:id" element={<RequireAuth><TutorProfile /></RequireAuth>} />
          <Route path="/sessions" element={<RequireAuth><Sessions /></RequireAuth>} />
          <Route path="/resources" element={<RequireAuth><Resources /></RequireAuth>} />
          <Route path="/groups" element={<RequireAuth><Groups /></RequireAuth>} />
          <Route path="/messages" element={<RequireAuth><Messages /></RequireAuth>} />
          <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
        </Routes>
      </div>
    </div>
  );
}
