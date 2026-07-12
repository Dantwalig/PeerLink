import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function TutorSearch() {
  const [subject, setSubject] = useState('');
  const [faculty, setFaculty] = useState('');
  const [minRating, setMinRating] = useState('');
  const [tutors, setTutors] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function search(e) {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (subject) params.set('subject', subject);
      if (faculty) params.set('faculty', faculty);
      if (minRating) params.set('minRating', minRating);
      setTutors(await api(`/tutors/search?${params.toString()}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Find a peer tutor</h1>
      <p className="subtitle">Search by subject, faculty, and minimum rating.</p>
      <form onSubmit={search}>
        <label>Subject</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Algorithms" />
        <label>Faculty</label>
        <input value={faculty} onChange={(e) => setFaculty(e.target.value)} placeholder="e.g. Computer Science" />
        <label>Minimum rating</label>
        <input type="number" min={0} max={5} step={0.5} value={minRating} onChange={(e) => setMinRating(e.target.value)} />
        <button type="submit">{loading ? 'Searching...' : 'Search'}</button>
      </form>

      {error && <p className="error">{error}</p>}

      <div style={{ marginTop: 20 }}>
        {tutors.length === 0 && !loading && <p className="muted">No results yet — try a search above.</p>}
        {tutors.map((t) => (
          <div className="card" key={t.id}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>{t.name}</strong>
              <span className="stars">★ {t.rating.toFixed(1)}</span>
            </div>
            <p className="muted">{t.faculty} · Year {t.yearOfStudy} · {t.subjects}</p>
            <Link to={`/tutors/${t.id}`}><button className="secondary">View profile</button></Link>
          </div>
        ))}
      </div>
    </div>
  );
}
