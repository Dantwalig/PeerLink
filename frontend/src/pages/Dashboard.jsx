import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getUser } from '../lib/api';

export default function Dashboard() {
  const user = getUser();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotForm, setSlotForm] = useState({ startTime: '', endTime: '', repeatWeeks: 1 });
  const [slotMessage, setSlotMessage] = useState('');

  useEffect(() => {
    api('/dashboard').then(setData).catch((err) => setError(err.message));
    if (user.isTutor) loadSlots();
  }, []);

  function loadSlots() {
    api('/tutors/me/availability').then(setSlots).catch((err) => setError(err.message));
  }

  async function addSlot(e) {
    e.preventDefault();
    setSlotMessage('');
    setError('');
    if (!slotForm.startTime || !slotForm.endTime) {
      setError('Pick a start and end time for the slot');
      return;
    }
    try {
      await api('/tutors/availability', {
        method: 'POST',
        body: JSON.stringify({
          startTime: new Date(slotForm.startTime).toISOString(),
          endTime: new Date(slotForm.endTime).toISOString(),
          repeatWeeks: Number(slotForm.repeatWeeks) || 1,
        }),
      });
      setSlotMessage(
        slotForm.repeatWeeks > 1
          ? `Added ${slotForm.repeatWeeks} weekly slots — students can now book them.`
          : 'Availability slot added — students can now book it.',
      );
      setSlotForm({ startTime: '', endTime: '', repeatWeeks: 1 });
      loadSlots();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeSlot(slot, wholeSeries) {
    setError('');
    try {
      const suffix = wholeSeries && slot.recurrenceGroupId ? '?seriesId=true' : '';
      await api(`/tutors/availability/${slot.id}${suffix}`, { method: 'DELETE' });
      loadSlots();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading your dashboard...</p>;

  return (
    <div>
      <h1>Your dashboard</h1>
      <p className="subtitle">
        {data.unreadNotifications > 0 ? `${data.unreadNotifications} unread notification(s)` : "You're all caught up"}
      </p>

      {user.isTutor && (
        <div className="card">
          <strong>Your availability</strong>
          <form onSubmit={addSlot} style={{ marginTop: 8 }}>
            <label>Start time</label>
            <input type="datetime-local" value={slotForm.startTime} onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })} />
            <label>End time</label>
            <input type="datetime-local" value={slotForm.endTime} onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })} />
            <label>Repeat weekly</label>
            <select value={slotForm.repeatWeeks} onChange={(e) => setSlotForm({ ...slotForm, repeatWeeks: e.target.value })}>
              <option value={1}>Just this once</option>
              <option value={4}>4 weeks</option>
              <option value={8}>8 weeks</option>
              <option value={12}>12 weeks</option>
            </select>
            <button type="submit">Add slot{slotForm.repeatWeeks > 1 ? 's' : ''}</button>
          </form>
          {slotMessage && <p className="success">{slotMessage}</p>}
          {slots.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {slots.map((s) => (
                <div key={s.id} className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="muted">
                    {new Date(s.startTime).toLocaleString()} → {new Date(s.endTime).toLocaleTimeString()}
                    {s.isBooked ? ' (booked)' : ' (open)'}
                  </span>
                  {!s.isBooked && (
                    <span className="row">
                      <button className="secondary" onClick={() => removeSlot(s, false)}>Remove</button>
                      {s.recurrenceGroupId && (
                        <button className="secondary" onClick={() => removeSlot(s, true)}>Remove series</button>
                      )}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <strong>Upcoming sessions</strong>
        {data.upcomingSessions.length === 0 && <p className="muted">No upcoming sessions. <Link to="/tutors">Find a tutor</Link>.</p>}
        {data.upcomingSessions.map((s) => (
          <p key={s.id} className="muted">
            {s.subject} with {s.student.name} / {s.tutor.name} — {new Date(s.startTime).toLocaleString()}
          </p>
        ))}
      </div>

      <div className="card">
        <strong>Recent messages</strong>
        {data.recentMessages.length === 0 && <p className="muted">No messages yet.</p>}
        {data.recentMessages.map((m) => (
          <p key={m.id} className="muted">{m.sender.name} → {m.receiver.name}: {m.content}</p>
        ))}
      </div>

      <div className="card">
        <strong>Your study groups</strong>
        {data.groups.length === 0 && <p className="muted">No groups joined yet. <Link to="/groups">Browse groups</Link>.</p>}
        {data.groups.map((g) => <span key={g.id} className="badge" style={{ marginRight: 6 }}>{g.name}</span>)}
      </div>
    </div>
  );
}
