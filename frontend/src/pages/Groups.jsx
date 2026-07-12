import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', subjectTag: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function load() {
    api('/groups').then(setGroups).catch((err) => setError(err.message));
  }
  useEffect(load, []);

  async function create(e) {
    e.preventDefault();
    setError('');
    try {
      await api('/groups', { method: 'POST', body: JSON.stringify(form) });
      setForm({ name: '', description: '', subjectTag: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function join(id) {
    setError('');
    setMessage('');
    try {
      await api(`/groups/${id}/join`, { method: 'POST' });
      setMessage('Join request sent!');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Study groups</h1>

      <div className="card">
        <strong>Create a group</strong>
        <form onSubmit={create} style={{ marginTop: 8 }}>
          <label>Name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <label>Description</label>
          <textarea required rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <label>Subject tag</label>
          <input required value={form.subjectTag} onChange={(e) => setForm({ ...form, subjectTag: e.target.value })} />
          <button type="submit">Create group</button>
        </form>
      </div>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      {groups.map((g) => (
        <div className="card" key={g.id}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>{g.name}</strong>
            <span className="badge">{g._count.memberships} members</span>
          </div>
          <p className="muted">{g.description}</p>
          <p className="muted">Tag: {g.subjectTag} · Created by {g.creator.name}</p>
          <button className="secondary" onClick={() => join(g.id)}>Request to join</button>
        </div>
      ))}
    </div>
  );
}
