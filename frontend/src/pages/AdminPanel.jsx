import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [pendingTutors, setPendingTutors] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function load() {
    api('/admin/stats').then(setStats).catch((err) => setError(err.message));
    api('/admin/users?pendingOnly=true').then(setPendingTutors).catch((err) => setError(err.message));
  }
  useEffect(load, []);

  function loadAllUsers() {
    api('/admin/users').then(setAllUsers).catch((err) => setError(err.message));
    setShowAllUsers(true);
  }

  async function approveTutor(id, name) {
    setError('');
    setMessage('');
    try {
      await api(`/admin/users/${id}/verify-tutor`, { method: 'PATCH' });
      setMessage(`${name} is now a verified tutor and visible in search.`);
      load();
      if (showAllUsers) loadAllUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function revokeTutor(id, name) {
    setError('');
    setMessage('');
    try {
      await api(`/admin/users/${id}/revoke-tutor-verification`, { method: 'PATCH' });
      setMessage(`${name}'s tutor verification was revoked.`);
      load();
      if (showAllUsers) loadAllUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!stats) return <p className="muted">Loading admin panel...</p>;

  return (
    <div>
      <h1>Admin panel</h1>
      <p className="subtitle">Platform overview and tutor verification.</p>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      <div className="card">
        <strong>Platform stats</strong>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginTop: 10 }}>
          <div><div style={{ fontSize: 22, fontWeight: 700 }}>{stats.totalUsers}</div><div className="muted">Total users</div></div>
          <div><div style={{ fontSize: 22, fontWeight: 700 }}>{stats.totalTutors}</div><div className="muted">Tutors</div></div>
          <div><div style={{ fontSize: 22, fontWeight: 700 }}>{stats.pendingTutors}</div><div className="muted">Pending approval</div></div>
          <div><div style={{ fontSize: 22, fontWeight: 700 }}>{stats.totalStudents}</div><div className="muted">Students</div></div>
          <div><div style={{ fontSize: 22, fontWeight: 700 }}>{stats.totalSessions}</div><div className="muted">Sessions</div></div>
          <div><div style={{ fontSize: 22, fontWeight: 700 }}>{stats.confirmedSessions}</div><div className="muted">Confirmed</div></div>
          <div><div style={{ fontSize: 22, fontWeight: 700 }}>{stats.completedSessions}</div><div className="muted">Completed</div></div>
          <div><div style={{ fontSize: 22, fontWeight: 700 }}>{stats.totalResources}</div><div className="muted">Resources</div></div>
          <div><div style={{ fontSize: 22, fontWeight: 700 }}>{stats.totalGroups}</div><div className="muted">Study groups</div></div>
          <div><div style={{ fontSize: 22, fontWeight: 700 }}>{stats.averageRating.toFixed(1)} ★</div><div className="muted">Avg rating ({stats.totalRatings})</div></div>
        </div>
      </div>

      <div className="card">
        <strong>Tutors awaiting verification ({pendingTutors.length})</strong>
        {pendingTutors.length === 0 && <p className="muted" style={{ marginTop: 8 }}>Nothing pending — all caught up.</p>}
        {pendingTutors.map((u) => (
          <div key={u.id} style={{ marginTop: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span><strong>{u.name}</strong> — {u.email}</span>
              <button onClick={() => approveTutor(u.id, u.name)}>Approve</button>
            </div>
            <p className="muted">{u.faculty} · {u.subjects}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <strong>All users</strong>
          {!showAllUsers && <button className="secondary" onClick={loadAllUsers}>Load all users</button>}
        </div>
        {showAllUsers && allUsers.map((u) => (
          <div key={u.id} className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <span>
              {u.name} — {u.email}{' '}
              <span className="badge">{u.role}</span>{' '}
              {u.isTutor && <span className="badge">{u.tutorVerified ? 'Verified tutor' : 'Unverified tutor'}</span>}
            </span>
            {u.isTutor && u.tutorVerified && (
              <button className="secondary" onClick={() => revokeTutor(u.id, u.name)}>Revoke</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
