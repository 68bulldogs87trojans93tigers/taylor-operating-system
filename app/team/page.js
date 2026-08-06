'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
import DataError from '../../components/DataError';
import StatusBadge from '../../components/StatusBadge';
import { getSupabase } from '../../lib/supabase';

const BUSINESSES = [
  ['Mortgage', 'Firefly Mortgage'],
  ['Medical', 'Medical'],
  ['NP Franchise', 'NP Franchise'],
  ['Construction', 'Construction'],
  ['Lake House', 'Lake House'],
  ['Boba Tea', 'Boba Tea'],
  ['Cross-Business / AI', 'Cross-Business / AI']
];

const ALL_BUSINESSES = BUSINESSES.map(([value]) => value);
const blankInvite = { personId: '', name: '', email: '', role: 'member', businessAccess: [] };

function labelForBusiness(value) {
  return BUSINESSES.find(([key]) => key === value)?.[1] || value;
}

export default function Team() {
  const [people, setPeople] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [currentMember, setCurrentMember] = useState(null);
  const [invite, setInvite] = useState(blankInvite);
  const [showInvite, setShowInvite] = useState(false);
  const [editing, setEditing] = useState('');
  const [health, setHealth] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isAdmin = currentMember?.app_role === 'admin';

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = getSupabase();
    const { data: userData } = await supabase.auth.getUser();
    const [peopleResult, tasksResult, meResult] = await Promise.all([
      supabase.from('people').select('*').order('name'),
      supabase.from('tasks').select('*').order('due_date', { ascending: true, nullsFirst: false }),
      userData.user
        ? supabase.from('people').select('*').eq('user_id', userData.user.id).maybeSingle()
        : Promise.resolve({ data: null })
    ]);
    if (peopleResult.error || tasksResult.error || meResult.error) {
      setError(peopleResult.error?.message || tasksResult.error?.message || meResult.error?.message);
      return;
    }
    setPeople(peopleResult.data || []);
    setTasks(tasksResult.data || []);
    setCurrentMember(meResult.data || null);
  }

  async function authorizedFetch(url, options = {}) {
    const { data } = await getSupabase().auth.getSession();
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session?.access_token || ''}`,
        ...(options.headers || {})
      }
    });
  }

  function openInvite(person) {
    setInvite({
      personId: person?.id || '',
      name: person?.name || '',
      email: person?.email || '',
      role: person?.app_role || 'member',
      businessAccess: person?.business_access || []
    });
    setMessage('');
    setShowInvite(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggleBusiness(value) {
    setInvite(current => ({
      ...current,
      businessAccess: current.businessAccess.includes(value)
        ? current.businessAccess.filter(item => item !== value)
        : [...current.businessAccess, value]
    }));
  }

  async function sendInvite(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const response = await authorizedFetch('/api/team/invite', {
      method: 'POST',
      body: JSON.stringify(invite)
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setError(result.error || 'Unable to send invitation.'); return; }
    setMessage(result.message);
    setInvite(blankInvite);
    setShowInvite(false);
    load();
  }

  async function updatePerson(person, patch) {
    setError('');
    const { error: updateError } = await getSupabase().from('people').update(patch).eq('id', person.id);
    if (updateError) setError(updateError.message);
    else { setEditing(''); load(); }
  }

  async function runHealthCheck() {
    setBusy(true);
    setError('');
    const response = await authorizedFetch('/api/team/health');
    const result = await response.json();
    setBusy(false);
    if (!response.ok) setError(result.error || 'Unable to verify launch readiness.');
    else setHealth(result);
  }

  const today = new Date().toISOString().slice(0, 10);
  const cards = useMemo(() => people.map(person => {
    const assigned = tasks.filter(task => task.owner.toLowerCase().includes(person.name.toLowerCase()));
    return {
      ...person,
      tasks: assigned,
      open: assigned.filter(task => task.status !== 'Complete'),
      overdue: assigned.filter(task => task.status !== 'Complete' && task.due_date && task.due_date < today)
    };
  }), [people, tasks, today]);

  const unassigned = tasks.filter(task => !task.owner?.trim()).length;
  const allRlsEnabled = health?.rls && Object.values(health.rls).every(Boolean);

  return <AppShell title="Team Launch" subtitle="Invite the team, control access and see accountability in one place">
    <DataError message={error}/>
    {message && <div className="alert successAlert">{message}</div>}

    <section className="metrics">
      <div className="metric"><span>Active members</span><strong>{people.filter(person => person.status === 'active').length}</strong></div>
      <div className="metric"><span>Invitations pending</span><strong>{people.filter(person => person.status === 'invited').length}</strong></div>
      <div className="metric"><span>Open assignments</span><strong>{tasks.filter(task => task.status !== 'Complete').length}</strong></div>
      <div className={`metric ${unassigned ? 'warning' : ''}`}><span>Unassigned tasks</span><strong>{unassigned}</strong></div>
    </section>

    {isAdmin && <div className="toolbar teamToolbar">
      <button onClick={() => openInvite(null)}>+ Invite teammate</button>
      <button className="secondary" onClick={runHealthCheck} disabled={busy}>{busy ? 'Checking…' : 'Verify production data'}</button>
    </div>}

    {showInvite && isAdmin && <form className="panel invitePanel" onSubmit={sendInvite}>
      <div className="panelHead"><div><h2>Invite teammate</h2><p className="panelIntro">One account per person. Choose only the businesses they need.</p></div><button type="button" className="icon closeButton" onClick={() => setShowInvite(false)}>Close</button></div>
      <div className="formGrid">
        <label>Name<input required value={invite.name} onChange={event => setInvite({ ...invite, name: event.target.value })}/></label>
        <label>Email<input required type="email" value={invite.email} onChange={event => setInvite({ ...invite, email: event.target.value })}/></label>
        <label>Role<select value={invite.role} onChange={event => setInvite({ ...invite, role: event.target.value })}><option value="member">Member</option><option value="manager">Manager</option><option value="admin">Administrator</option></select></label>
        <fieldset className="wide accessFieldset"><legend>Business access</legend><div className="checkGrid">{BUSINESSES.map(([value, label]) => <label className="checkLabel" key={value}><input type="checkbox" checked={invite.businessAccess.includes(value)} onChange={() => toggleBusiness(value)}/><span>{label}</span></label>)}</div><button type="button" className="textButton" onClick={() => setInvite({ ...invite, businessAccess: ALL_BUSINESSES })}>Select all businesses</button></fieldset>
        <div className="wide actions"><button disabled={busy}>{busy ? 'Sending…' : 'Send secure invitation'}</button><button type="button" className="secondary" onClick={() => setShowInvite(false)}>Cancel</button></div>
      </div>
    </form>}

    {health && isAdmin && <section className="panel healthPanel">
      <div className="panelHead"><div><h2>Production data verification</h2><p className="panelIntro">Last checked {new Date(health.checkedAt).toLocaleString()}</p></div><StatusBadge status={health.database && allRlsEnabled ? 'Complete' : 'Blocked'}/></div>
      <div className="healthGrid">
        <div><span className={health.database ? 'healthDot good' : 'healthDot bad'}/><strong>Supabase database</strong><small>{health.database ? 'Connected and queryable' : 'Connection failed'}</small></div>
        <div><span className={health.authentication ? 'healthDot good' : 'healthDot bad'}/><strong>Authentication</strong><small>{health.authentication ? 'Administrator verified' : 'Not verified'}</small></div>
        <div><span className={allRlsEnabled ? 'healthDot good' : 'healthDot bad'}/><strong>Row-level security</strong><small>{allRlsEnabled ? 'Enabled on protected tables' : 'Review required'}</small></div>
        <div><span className={health.invitationService ? 'healthDot good' : 'healthDot bad'}/><strong>Invitation service</strong><small>{health.invitationService ? 'Server configuration available' : 'Not configured'}</small></div>
      </div>
      <div className="countStrip"><span>{health.counts.tasks} tasks</span><span>{health.counts.people} people</span><span>{health.counts.meetings} meetings</span><span>{health.counts.loans} loans</span></div>
    </section>}

    <section className="teamGrid">{cards.map(person => <article className="panel personCard" key={person.id}>
      <div className="panelHead">
        <div><h2>{person.name}</h2><div className="memberMeta"><span className={`memberStatus status-${person.status || 'not_invited'}`}>{(person.status || 'not_invited').replace('_', ' ')}</span><span>{person.app_role || 'member'}</span></div></div>
        <span className="count">{person.open.length} open</span>
      </div>
      <p className="memberEmail">{person.email || 'No account invitation sent'}</p>
      <div className="accessTags">{(person.business_access || []).map(area => <span key={area}>{labelForBusiness(area)}</span>)}{!(person.business_access || []).length && <span className="mutedTag">No business access assigned</span>}</div>
      <div className="miniMetrics"><span><strong>{person.open.length}</strong> open</span><span className={person.overdue.length ? 'dangerText' : ''}><strong>{person.overdue.length}</strong> overdue</span></div>
      <div className="taskList compact">{person.tasks.slice(0, 4).map(task => <div className="taskRow" key={task.id}><div><strong>{task.title}</strong><small>{task.area} · {task.due_date || 'TBD'}</small></div><StatusBadge status={task.status}/></div>)}{!person.tasks.length && <small>No assigned tasks.</small>}</div>
      {isAdmin && <div className="memberActions">
        {!person.user_id && <button onClick={() => openInvite(person)}>Invite</button>}
        {person.user_id && <button className="secondary" onClick={() => setEditing(editing === person.id ? '' : person.id)}>Manage access</button>}
      </div>}
      {editing === person.id && isAdmin && <div className="accessEditor">
        <label>Role<select value={person.app_role} onChange={event => setPeople(current => current.map(item => item.id === person.id ? { ...item, app_role: event.target.value } : item))}><option value="member">Member</option><option value="manager">Manager</option><option value="admin">Administrator</option></select></label>
        <fieldset className="accessFieldset"><legend>Business access</legend><div className="checkGrid">{BUSINESSES.map(([value, label]) => <label className="checkLabel" key={value}><input type="checkbox" checked={(person.business_access || []).includes(value)} onChange={() => setPeople(current => current.map(item => item.id === person.id ? { ...item, business_access: (item.business_access || []).includes(value) ? item.business_access.filter(area => area !== value) : [...(item.business_access || []), value] } : item))}/><span>{label}</span></label>)}</div></fieldset>
        <div className="actions"><button onClick={() => updatePerson(person, { app_role: person.app_role, business_access: person.business_access })}>Save access</button><button className="secondary" onClick={() => setEditing('')}>Cancel</button></div>
      </div>}
    </article>)}</section>
  </AppShell>;
}
