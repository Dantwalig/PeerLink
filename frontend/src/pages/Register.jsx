import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', isTutor: false, faculty: '', yearOfStudy: '', subjects: '', bio: '',
  });
  const [error, setError] = useState('');
  const [devLink, setDevLink] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api('/auth/register', { method: 'POST', body: JSON.stringify(form) });
      setDevLink(res.devVerificationUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (devLink) {
    return (
      <div>
        <h1>Almost there</h1>
        <p className="subtitle">A verification email was sent (stubbed - SendGrid isn't wired up yet).</p>
        <div className="card">
          <p>For this demo, click below to verify instantly instead of checking a real inbox:</p>
          <a href={devLink}><button>Verify my email</button></a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>Create your PeerLink account</h1>
      <p className="subtitle">Institutional email required (e.g. name@alueducation.com).</p>
      <form onSubmit={onSubmit}>
        <label>Full name</label>
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

        <label>Institutional email</label>
        <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@alueducation.com" />

        <label>Password</label>
        <input required type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

        <label>Faculty</label>
        <input value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} />

        <label>Year of study</label>
        <input type="number" min={1} value={form.yearOfStudy} onChange={(e) => setForm({ ...form, yearOfStudy: e.target.value })} />

        <label>Subjects (comma-separated)</label>
        <input value={form.subjects} onChange={(e) => setForm({ ...form, subjects: e.target.value })} placeholder="Algorithms, Web Development" />

        <label className="row">
          <input type="checkbox" style={{ width: 'auto' }} checked={form.isTutor} onChange={(e) => setForm({ ...form, isTutor: e.target.checked })} />
          Register as a peer tutor too
        </label>

        {form.isTutor && (
          <>
            <label>Short bio</label>
            <textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </>
        )}

        {error && <p className="error">{error}</p>}
        <button disabled={loading} type="submit">{loading ? 'Creating account...' : 'Register'}</button>
      </form>
      <p className="muted" style={{ marginTop: 12 }}>Already have an account? <Link to="/login">Log in</Link></p>
    </div>
  );
}
