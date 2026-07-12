import { useEffect, useState } from 'react';
import { api, getUser } from '../lib/api';

export default function Sessions() {
  const user = getUser();
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState('');
  const [ratingDraft, setRatingDraft] = useState({});

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

            {s.status === 'CONFIRMED' && (
              <div className="row">
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
