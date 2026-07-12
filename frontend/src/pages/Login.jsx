import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, setToken, setUser } from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api('/auth/login', { method: 'POST', body: JSON.stringify(form) });
      setToken(res.accessToken);
      setUser(res.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Log in to PeerLink</h1>
      <form onSubmit={onSubmit}>
        <label>Email</label>
        <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <label>Password</label>
        <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="error">{error}</p>}
        <button disabled={loading} type="submit">{loading ? 'Logging in...' : 'Log in'}</button>
      </form>
      <p className="muted" style={{ marginTop: 12 }}>No account yet? <Link to="/register">Register</Link></p>
      <p className="muted">Demo logins (after seeding): grace.uwase@alueducation.com / Password123! (tutor), jean.mugisha@alueducation.com / Password123! (student)</p>
    </div>
  );
}
