'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '../../lib/supabase';

export default function Welcome() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('Opening your invitation…');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) { setReady(true); setFullName(data.session.user.user_metadata?.full_name || ''); setMessage(''); }
      else setMessage('This invitation link is invalid or expired. Ask your Firefly OS developer for a new invitation.');
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) { setReady(true); setFullName(session.user.user_metadata?.full_name || ''); setMessage(''); }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function finish(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    const supabase = getSupabase();
    const { error } = await supabase.auth.updateUser({ password, data: { full_name: fullName } });
    if (error) { setMessage(error.message); setBusy(false); return; }
    const { data } = await supabase.auth.getSession();
    const response = await fetch('/api/auth/accept-invite', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ fullName }) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || 'Could not finish setup.'); setBusy(false); return; }
    router.replace('/dashboard');
  }

  return <div className="loginPage"><form className="loginCard welcomeCard" onSubmit={finish}><div className="brand large"><span className="logo">F</span><div><strong>Firefly OS</strong><small>Team invitation</small></div></div><h1>Welcome to Firefly OS</h1><p>Confirm your name and create a password to finish setting up your account.</p><label>Full name<input required disabled={!ready} value={fullName} onChange={event => setFullName(event.target.value)}/></label><label>Create password<input type="password" minLength="8" required disabled={!ready} value={password} onChange={event => setPassword(event.target.value)}/></label><button disabled={!ready || busy}>{busy ? 'Finishing setup…' : 'Finish setup'}</button>{message && <div className="alert">{message}</div>}</form></div>;
}
