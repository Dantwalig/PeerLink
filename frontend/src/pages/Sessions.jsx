import { useEffect, useState } from 'react';
import { api, getUser, getToken } from '../lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default function Sessions() {
  const user = getUser();
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState('');
  const [ratingDraft, setRatingDraft] = useState({});
  const [locationDraft, setLocationDraft] = useState({});
  const [editingLocation, setEditingLocation] = useState(null);

  function load() {
    api('/sessions/mine').then(setSessions).catch((err) => setError(err.message));
  }
  useEffect(load, []);

  async function cancel(id) {
    try { await api(`/sessions/${id}/cancel`, { method: 'PATCH' }); load(); }
    catch (err) { setError(err.message); }
  }

  async function complete(id) {
    try { await api(`/sessions/${id}/complete`, { method: 'PATCH' }); load(); }
    catch (err) { setError(err.message); }
  }

  async function rate(sessionId) {
    const draft = ratingDraft[sessionId] || { score: 5, comment: '' };
    try {
      await api(`/ratings/sessions/${sessionId}`, { method: 'POST', body: JSON.stringify(draft) });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveLocation(sessionId) {
    try {
      await api(`/sessions/${sessionId}/location`, {
        method: 'PATCH',
        body: JSON.stringify({ location: locationDraft[sessionId] || '' }),
      });
      setEditingLocation(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Downloads a real .ics file (see backend lib/calendar.js) - works with
  // Google Calendar, Outlook, Apple Calendar, or anything else, no OAuth.
  async function addToCalendar(sessionId) {
    setError('');
    try {
      const res = await fetch(`${API_URL}/sessions/${sessionId}/calendar.ics`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Could not generate calendar file');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `peerlink-session-${sessionId}.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>My sessions</h1>
      {error && <p className="error">{error}</p>}
      {sessions.length === 0 && <p className="muted">No sessions yet.</p>}
      {sessions.map((s) => {
        const isTutor = user.id === s.tutor.id;
        return (
          <div className="card" key={s.id}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>{s.subject}</strong>
              <span className="badge">{s.status}</span>
            </div>
            <p className="muted">
              {s.student.name} ↔ {s.tutor.name} · {new Date(s.startTime).toLocaleString()}
            </p>

            {s.status === 'CONFIRMED' && editingLocation !== s.id && (
              <p className="muted">
                📍 {s.location || 'No location set yet'}{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setLocationDraft({ ...locationDraft, [s.id]: s.location || '' }); setEditingLocation(s.id); }}>
                  (edit)
                </a>
              </p>
            )}
            {editingLocation === s.id && (
              <div className="row" style={{ marginBottom: 6 }}>
                <input
                  placeholder="Zoom link, or e.g. Library, 2nd floor"
                  value={locationDraft[s.id] || ''}
                  onChange={(e) => setLocationDraft({ ...locationDraft, [s.id]: e.target.value })}
                />
                <button onClick={() => saveLocation(s.id)}>Save</button>
              </div>
            )}

            {s.status === 'CONFIRMED' && (
              <div className="row">
                <button className="secondary" onClick={() => addToCalendar(s.id)}>Add to calendar</button>
                <button className="secondary" onClick={() => cancel(s.id)}>Cancel</button>
                {isTutor && <button onClick={() => complete(s.id)}>Mark completed</button>}
              </div>
            )}

            {s.status === 'COMPLETED' && !isTutor && !s.rating && (
              <div className="row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                <select
                  value={ratingDraft[s.id]?.score || 5}
                  onChange={(e) => setRatingDraft({ ...ratingDraft, [s.id]: { ...ratingDraft[s.id], score: Number(e.target.value) } })}
                >
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
                </select>
                <input
                  placeholder="Optional comment"
                  value={ratingDraft[s.id]?.comment || ''}
                  onChange={(e) => setRatingDraft({ ...ratingDraft, [s.id]: { ...ratingDraft[s.id], comment: e.target.value } })}
                />
                <button onClick={() => rate(s.id)}>Submit rating</button>
              </div>
            )}
            {s.rating && <p className="stars">Rated: {'★'.repeat(s.rating.score)}</p>}
          </div>
        );
      })}
    </div>
  );
}
