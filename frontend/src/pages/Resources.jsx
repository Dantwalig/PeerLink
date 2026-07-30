import { useEffect, useState } from 'react';
import { api, getToken } from '../lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ title: '', course: '', subject: '', file: null });
  const [filterCourse, setFilterCourse] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  function load(course) {
    const params = course ? `?course=${encodeURIComponent(course)}` : '';
    api(`/resources${params}`).then(setResources).catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
    api('/resources/courses').then(setCourses).catch(() => {});
  }, []);

  async function upload(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!form.file) { setError('Choose a file (PDF, DOCX, PNG, or JPEG, max 50MB)'); return; }

    const body = new FormData();
    body.append('title', form.title);
    body.append('course', form.course);
    body.append('subject', form.subject);
    body.append('file', form.file);

    try {
      await api('/resources', { method: 'POST', body });
      setMessage('Resource uploaded!');
      setForm({ title: '', course: '', subject: '', file: null });
      load(filterCourse);
      api('/resources/courses').then(setCourses).catch(() => {});
    } catch (err) {
      setError(err.message);
    }
  }

  function onFilterChange(value) {
    setFilterCourse(value);
    load(value);
  }

  // Download requires the auth token, which a plain <a href> can't send -
  // fetch the bytes as a blob and trigger the save via a temporary link.
  async function download(resource) {
    setError('');
    setDownloadingId(resource.id);
    try {
      const res = await fetch(`${API_URL}/resources/${resource.id}/download`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resource.title;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div>
      <h1>Shared resources</h1>
      <p className="subtitle">Lecture notes, past papers, and study guides. PDF, DOCX, PNG, or JPEG - max 50MB.</p>

      <div className="card">
        <strong>Upload a resource</strong>
        <form onSubmit={upload} style={{ marginTop: 8 }}>
          <label>Title</label>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <label>Course</label>
          <input required list="course-options" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} placeholder="e.g. CS1102" />
          <label>Subject</label>
          <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Algorithms" />
          <label>File</label>
          <input required type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" onChange={(e) => setForm({ ...form, file: e.target.files[0] })} />
          <button type="submit">Upload</button>
        </form>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </div>

      {courses.length > 0 && (
        <div className="card">
          <label>Filter by course</label>
          <input
            list="course-options"
            value={filterCourse}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder="Start typing a course code..."
          />
          {filterCourse && <button className="secondary" style={{ marginTop: 8 }} onClick={() => onFilterChange('')}>Clear filter</button>}
        </div>
      )}

      <datalist id="course-options">
        {courses.map((c) => <option key={c} value={c} />)}
      </datalist>

      {resources.length === 0 && <p className="muted">No resources match yet.</p>}
      {resources.map((r) => (
        <div className="card" key={r.id}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>{r.title}</strong>
            <span className="badge">{r.docType}</span>
          </div>
          <p className="muted">{r.course} · {r.subject} · {formatSize(r.sizeBytes)} · uploaded by {r.uploader.name}</p>
          <button className="secondary" disabled={downloadingId === r.id} onClick={() => download(r)}>
            {downloadingId === r.id ? 'Downloading...' : 'Download'}
          </button>
        </div>
      ))}
    </div>
  );
}
