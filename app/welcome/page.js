'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '../../lib/supabase';

export default function WelcomePage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Opening your invitation…');

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session));
      setMessage(data.session ? '' : 'This invitation link is invalid or has expired. Ask your Administrator for a new invitation.');
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) { setReady(true); setMessage(''); }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function finish(event) {
    event.preventDefault();
    if (password !== confirmPassword) { setMessage('Passwords do not match.'); return; }
    setBusy(true);
    setMessage('');
    const supabase = getSupabase();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setBusy(false); setMessage(error.message); return; }
    await supabase.rpc('activate_current_member');
    router.replace('/dashboard');
  }

  return <div className="loginPage"><form className="loginCard" onSubmit={finish}>
    <div className="brand large"><span className="logo">F</span><div><strong>Welcome to Firefly OS</strong><small>Activate your secure team account</small></div></div>
    <h1>Choose your password</h1>
    <label>Password<input type="password" minLength="8" required disabled={!ready} value={password} onChange={event => setPassword(event.target.value)}/></label>
    <label>Confirm password<input type="password" minLength="8" required disabled={!ready} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)}/></label>
    <button disabled={!ready || busy}>{busy ? 'Activating…' : 'Activate account'}</button>
    {message && <div className="alert error">{message}</div>}
  </form></div>;
}
