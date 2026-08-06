'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '../../lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard');
    });
  }, [router]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setMessage(error.message);
    else router.replace('/dashboard');
  }

  return <div className="loginPage"><form className="loginCard" onSubmit={submit}>
    <div className="brand large"><span className="logo">F</span><div><strong>Firefly OS</strong><small>One operating system. Every business.</small></div></div>
    <h1>Welcome back</h1>
    <label>Email<input type="email" required value={email} onChange={event => setEmail(event.target.value)}/></label>
    <label>Password<input type="password" minLength="8" required value={password} onChange={event => setPassword(event.target.value)}/></label>
    <button disabled={busy}>{busy ? 'Please wait…' : 'Sign in'}</button>
    <p className="hint loginHint">Firefly OS accounts are created by an Administrator. New teammates should use the secure link in their invitation email.</p>
    {message && <div className="alert error">{message}</div>}
  </form></div>;
}
