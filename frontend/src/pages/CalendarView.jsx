import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView() {
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(new Date());

  useEffect(() => {
    api('/sessions/mine').then(setSessions).catch((err) => setError(err.message));
  }, []);

  const sessionsByDay = useMemo(() => {
    const map = new Map();
    for (const s of sessions) {
      if (s.status === 'CANCELLED') continue;
      const key = new Date(s.startTime).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    return map;
  }, [sessions]);

  const leadingBlanks = startOfMonth(cursor).getDay();
  const totalDays = daysInMonth(cursor);
  const cells = [...Array(leadingBlanks).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];

  const selectedSessions = sessionsByDay.get(selectedDay.toDateString()) || [];

  function changeMonth(delta) {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
  }

  return (
    <div>
      <h1>Calendar</h1>
      <p className="subtitle">All your upcoming and past sessions, at a glance.</p>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <button className="secondary" onClick={() => changeMonth(-1)}>← Prev</button>
          <strong>{cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</strong>
          <button className="secondary" onClick={() => changeMonth(1)}>Next →</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
          {WEEKDAYS.map((d) => <div key={d} className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{d}</div>)}
          {cells.map((day, i) => {
            if (!day) return <div key={`blank-${i}`} />;
            const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
            const daySessions = sessionsByDay.get(date.toDateString()) || [];
            const isSelected = sameDay(date, selectedDay);
            const isToday = sameDay(date, new Date());
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(date)}
                style={{
                  padding: '8px 4px',
                  borderRadius: 8,
                  border: isToday ? '1px solid var(--primary)' : '1px solid transparent',
                  background: isSelected ? 'var(--primary)' : daySessions.length ? '#e7edfa' : 'transparent',
                  color: isSelected ? 'white' : 'var(--text)',
                  fontWeight: daySessions.length ? 700 : 400,
                  cursor: 'pointer',
                }}
              >
                {day}
                {daySessions.length > 0 && <div style={{ fontSize: 10 }}>{daySessions.length} session{daySessions.length > 1 ? 's' : ''}</div>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <strong>{selectedDay.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</strong>
        {selectedSessions.length === 0 && <p className="muted" style={{ marginTop: 8 }}>No sessions this day.</p>}
        {selectedSessions.map((s) => (
          <div key={s.id} style={{ marginTop: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span>{s.subject}</span>
              <span className="badge">{s.status}</span>
            </div>
            <p className="muted">
              {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
              {new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {s.location ? ` · ${s.location}` : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
