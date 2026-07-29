import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function TutorProfile() {
  const { id } = useParams();
  const [tutor, setTutor] = useState(null);
  const [subject, setSubject] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function load() {
    api(`/tutors/${id}`).then(setTutor).catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  async function book(availabilityId) {
    setError('');
    setMessage('');
    if (!subject) { setError('Enter a subject for the session first'); return; }
    try {
      await api('/sessions', { method: 'POST', body: JSON.stringify({ tutorId: id, availabilityId, subject, location }) });
      setMessage('Session booked and confirmed!');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!tutor) return <p className="muted">Loading...</p>;

  return (
    <div>
      <h1>{tutor.name}</h1>
      <p className="subtitle">{tutor.faculty} · Year {tutor.yearOfStudy} · ★ {tutor.rating.toFixed(1)}</p>
      <div className="card">
        <strong>About</strong>
        <p className="muted">{tutor.bio || 'No bio yet.'}</p>
        <strong>Subjects</strong>
        <p className="muted">{tutor.subjects}</p>
      </div>

      <div className="card">
        <label>Session subject</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Algorithms - Recursion" />
        <label>Where (optional)</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Zoom link, or e.g. Library, 2nd floor" />
      </div>

      <strong>Available time slots</strong>
      {tutor.availability.length === 0 && <p className="muted">No open slots right now.</p>}
      {tutor.availability.map((slot) => (
        <div className="card" key={slot.id}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span>{new Date(slot.startTime).toLocaleString()} - {new Date(slot.endTime).toLocaleTimeString()}</span>
            <button onClick={() => book(slot.id)}>Book</button>
          </div>
        </div>
      ))}

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <strong>Reviews</strong>
      {tutor.ratingsReceived.length === 0 && <p className="muted">No reviews yet.</p>}
      {tutor.ratingsReceived.map((r, i) => (
        <div className="card" key={i}>
          <span className="stars">{'★'.repeat(r.score)}{'☆'.repeat(5 - r.score)}</span>
          <p className="muted">{r.comment} — {r.fromUser.name}</p>
        </div>
      ))}
    </div>
  );
}
