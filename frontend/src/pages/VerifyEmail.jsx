import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api, setToken, setUser } from '../lib/api';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); return; }

    api(`/auth/verify?token=${token}`)
      .then((res) => {
        setToken(res.accessToken);
        setUser(res.user);
        setStatus('done');
        setTimeout(() => navigate('/dashboard'), 1200);
      })
      .catch(() => setStatus('error'));
  }, [params, navigate]);

  return (
    <div>
      <h1>Email verification</h1>
      {status === 'verifying' && <p className="muted">Verifying your account...</p>}
      {status === 'done' && <p className="success">Verified! Taking you to your dashboard...</p>}
      {status === 'error' && <p className="error">This verification link is invalid or expired.</p>}
    </div>
  );
}
