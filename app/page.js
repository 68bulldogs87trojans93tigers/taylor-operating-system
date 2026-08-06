'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '../lib/supabase';

const supabase = createClient();

export default function Home() {
  const [session, setSession] = useState(null);
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    loadData();
    const channel = supabase
      .channel('tos-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, loadData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session]);

  async function loadData() {
    const [{ data: taskData, error: taskError }, { data: loanData, error: loanError }] = await Promise.all([
      supabase.from('tasks').select('*').order('due_date', { ascending: true, nullsFirst: false }),
      supabase.from('loans').select('*').order('amount', { ascending: false })
    ]);
    if (taskError || loanError) {
      setMessage(taskError?.message || loanError?.message || 'Could not load data.');
      return;
    }
    setTasks(taskData || []);
    setLoans(loanData || []);
  }

  async function authenticate(event) {
    event.preventDefault();
    setMessage('');
    const result = mode === 'signup'
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
      : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) setMessage(result.error.message);
    else setMessage(mode === 'signup' ? 'Account created. Check your email if confirmation is required.' : 'Signed in.');
  }

  async function updateTask(id, status) {
    const { error } = await supabase.from('tasks').update({ status }).eq('id', id);
    if (error) setMessage(error.message);
    else loadData();
  }

  const pipelineTotal = useMemo(() => loans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0), [loans]);
  const openTasks = tasks.filter((t) => t.status !== 'Complete').length;

  if (loading) return <main className="center"><div className="card">Loading…</div></main>;

  if (!session) {
    return (
      <main className="center">
        <form className="card auth" onSubmit={authenticate}>
          <h1>Taylor Operating System</h1>
          <p>Shared operating dashboard for all businesses.</p>
          <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Password<input type="password" minLength="6" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <button type="submit">{mode === 'signup' ? 'Create Account' : 'Sign In'}</button>
          <button type="button" className="secondary" onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
            {mode === 'signup' ? 'Already have an account? Sign in' : 'Create a new account'}
          </button>
          {message && <p className="message">{message}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="shell">
      <header>
        <div><h1>Taylor Operating System</h1><p>Executive dashboard</p></div>
        <button onClick={() => supabase.auth.signOut()}>Sign Out</button>
      </header>

      <section className="metrics">
        <div className="metric"><span>Mortgage Pipeline</span><strong>${pipelineTotal.toLocaleString()}</strong></div>
        <div className="metric"><span>Open Tasks</span><strong>{openTasks}</strong></div>
        <div className="metric"><span>Businesses</span><strong>6</strong></div>
      </section>

      {message && <p className="message">{message}</p>}

      <section className="grid">
        <div className="panel">
          <h2>Mortgage Pipeline</h2>
          <div className="tableWrap"><table><thead><tr><th>Loan</th><th>Amount</th><th>Owner</th><th>Status</th></tr></thead><tbody>
            {loans.map((loan) => <tr key={loan.id}><td>{loan.name}</td><td>${Number(loan.amount).toLocaleString()}</td><td>{loan.owner}</td><td>{loan.status}</td></tr>)}
          </tbody></table></div>
        </div>

        <div className="panel">
          <h2>Operating Tasks</h2>
          <div className="tableWrap"><table><thead><tr><th>Area</th><th>Task</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead><tbody>
            {tasks.map((task) => <tr key={task.id}><td>{task.area}</td><td>{task.title}</td><td>{task.owner}</td><td>{task.due_date || '—'}</td><td><select value={task.status} onChange={(e) => updateTask(task.id, e.target.value)}><option>Open</option><option>In Progress</option><option>Blocked</option><option>Complete</option></select></td></tr>)}
          </tbody></table></div>
        </div>
      </section>
    </main>
  );
}
