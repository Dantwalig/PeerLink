import { useEffect, useRef, useState } from 'react';
import { api, getUser } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

export default function Messages() {
  const user = getUser();
  const [otherUserId, setOtherUserId] = useState('');
  const [thread, setThread] = useState([]);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    const socket = connectSocket();
    socket.on('message:new', (msg) => {
      if (msg.senderId === otherUserId || msg.receiverId === otherUserId) {
        setThread((prev) => [...prev, msg]);
      }
    });
    return () => disconnectSocket();
  }, [otherUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  async function loadThread(e) {
    e?.preventDefault();
    if (!otherUserId) return;
    try {
      setThread(await api(`/messages/thread/${otherUserId}`));
    } catch (err) {
      setError(err.message);
    }
  }

  async function send(e) {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      const msg = await api('/messages', { method: 'POST', body: JSON.stringify({ receiverId: otherUserId, content }) });
      setThread((prev) => [...prev, msg]);
      setContent('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Messages</h1>
      <p className="subtitle">Real-time direct messaging over WebSocket (Socket.io).</p>

      <form onSubmit={loadThread} className="row" style={{ maxWidth: 440 }}>
        <input
          placeholder="Other user's ID (copy from a tutor profile URL)"
          value={otherUserId}
          onChange={(e) => setOtherUserId(e.target.value)}
        />
        <button type="submit">Open</button>
      </form>

      {error && <p className="error">{error}</p>}

      {otherUserId && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 10 }}>
            {thread.map((m) => (
              <p key={m.id} className={m.senderId === user.id ? '' : 'muted'} style={{ textAlign: m.senderId === user.id ? 'right' : 'left' }}>
                {m.content}
              </p>
            ))}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={send} className="row">
            <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="Type a message..." style={{ flex: 1 }} />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
    </div>
  );
}
