'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import DataError from '../../components/DataError';
import { BUSINESSES } from '../../lib/businesses';
import { getSupabase } from '../../lib/supabase';
import { getWorkspaceContext } from '../../lib/workspace';

const roleLabels = { viewer: 'Read Only', member: 'Editor', admin: 'Developer' };
const blankInvite = { fullName: '', email: '', role: 'viewer', allBusinesses: true, businesses: [] };

export default function DeveloperAccess() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(null);
  const [members, setMembers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [invite, setInvite] = useState(blankInvite);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { initialize(); }, []);

  async function initialize() {
    const context = await getWorkspaceContext(getSupabase());
    setAuthorized(context.isDeveloper);
    if (!context.isDeveloper) return;
    loadMembers();
  }

  async function api(path, options = {}) {
    const { data } = await getSupabase().auth.getSession();
    const response = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}`, ...(options.headers || {}) }
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The request failed.');
    return result;
  }

  async function loadMembers() {
    try {
      const result = await api('/api/developer/members');
      setMembers(result.members || []);
      setCurrentUserId(result.currentUserId || '');
    } catch (loadError) { setError(loadError.message); }
  }

  function toggleBusiness(state, setState, business) {
    const businesses = state.businesses.includes(business)
      ? state.businesses.filter(item => item !== business)
      : [...state.businesses, business];
    setState({ ...state, businesses });
  }

  async function sendInvite(event) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await api('/api/developer/members', { method: 'POST', body: JSON.stringify(invite) });
      setMessage(result.message);
      setInvite(blankInvite);
      await loadMembers();
    } catch (inviteError) { setError(inviteError.message); }
    finally { setBusy(false); }
  }

  function editMember(member) {
    setEditing({ userId: member.userId, role: member.role, allBusinesses: member.allBusinesses, businesses: [...member.businesses] });
  }

  async function saveMember() {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await api('/api/developer/members', { method: 'PATCH', body: JSON.stringify(editing) });
      setMessage(result.message); setEditing(null); await loadMembers();
    } catch (saveError) { setError(saveError.message); }
    finally { setBusy(false); }
  }

  async function revoke(member) {
    if (!confirm(`Revoke Firefly OS access for ${member.email}?`)) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await api('/api/developer/members', { method: 'DELETE', body: JSON.stringify({ userId: member.userId }) });
      setMessage(result.message); await loadMembers();
    } catch (removeError) { setError(removeError.message); }
    finally { setBusy(false); }
  }

  if (authorized === false) return <AppShell title="Developer" subtitle="Restricted Firefly OS administration"><section className="panel blockedPanel"><h2>Developer permission required</h2><p>This area is available only to authorized Firefly OS developers.</p><button onClick={() => router.replace('/dashboard')}>Return to dashboard</button></section></AppShell>;

  return <AppShell title="Developer" subtitle="Invite people and control exactly what they can see and change">
    <DataError message={error}/>{message && <div className="alert">{message}</div>}
    <section className="permissionCards">
      <div className="permissionCard"><strong>Read Only</strong><small>Can navigate assigned areas but cannot change records.</small></div>
      <div className="permissionCard"><strong>Editor</strong><small>Can create and update operational records in assigned areas.</small></div>
      <div className="permissionCard"><strong>Developer</strong><small>Full access, invitations, permissions and developer settings.</small></div>
    </section>
    <div className="developerGrid">
      <form className="panel" onSubmit={sendInvite}>
        <h2>Invite team member</h2>
        <label>Full name<input required value={invite.fullName} onChange={event => setInvite({ ...invite, fullName: event.target.value })}/></label>
        <label>Email<input type="email" required value={invite.email} onChange={event => setInvite({ ...invite, email: event.target.value })}/></label>
        <label>Permission<select value={invite.role} onChange={event => setInvite({ ...invite, role: event.target.value, allBusinesses: event.target.value === 'admin' ? true : invite.allBusinesses })}><option value="viewer">Read Only</option><option value="member">Editor</option><option value="admin">Developer</option></select></label>
        {invite.role !== 'admin' && <>
          <label className="checkRow"><input type="checkbox" checked={invite.allBusinesses} onChange={event => setInvite({ ...invite, allBusinesses: event.target.checked, businesses: event.target.checked ? [] : invite.businesses })}/>Access all businesses</label>
          {!invite.allBusinesses && <div className="businessChecks">{BUSINESSES.map(business => <label className="checkRow" key={business}><input type="checkbox" checked={invite.businesses.includes(business)} onChange={() => toggleBusiness(invite, setInvite, business)}/>{business}</label>)}</div>}
        </>}
        <button disabled={busy}>{busy ? 'Sending…' : 'Send secure invitation'}</button>
        <p className="hint">Invitations expire according to your Supabase Auth settings.</p>
      </form>
      <section className="panel">
        <div className="panelHead"><h2>Team access</h2><span className="count">{members.length} members</span></div>
        <div className="tableWrap"><table><thead><tr><th>Person</th><th>Permission</th><th>Business access</th><th>Status</th><th></th></tr></thead><tbody>{members.map(member => <tr key={member.userId}>
          <td className="memberName"><strong>{member.fullName || member.email}</strong><small>{member.email}</small></td>
          <td><span className="badge">{roleLabels[member.role]}</span></td>
          <td><div className="accessSummary">{member.allBusinesses ? 'All businesses' : member.businesses.join(', ')}</div></td>
          <td><span className={`badge ${member.status === 'Active' ? 'badge-complete' : 'badge-in-progress'}`}>{member.status}</span></td>
          <td><div className="memberActions"><button type="button" className="secondary" onClick={() => editMember(member)}>Edit</button>{member.userId !== currentUserId && <button type="button" className="icon dangerText" onClick={() => revoke(member)}>Revoke</button>}</div></td>
        </tr>)}</tbody></table></div>
        {editing && <div className="scopeEditor">
          <h2>Edit permissions</h2>
          <label>Permission<select className="roleSelect" value={editing.role} onChange={event => setEditing({ ...editing, role: event.target.value, allBusinesses: event.target.value === 'admin' ? true : editing.allBusinesses })}><option value="viewer">Read Only</option><option value="member">Editor</option><option value="admin">Developer</option></select></label>
          {editing.role !== 'admin' && <><label className="checkRow"><input type="checkbox" checked={editing.allBusinesses} onChange={event => setEditing({ ...editing, allBusinesses: event.target.checked, businesses: event.target.checked ? [] : editing.businesses })}/>Access all businesses</label>{!editing.allBusinesses && <div className="businessChecks">{BUSINESSES.map(business => <label className="checkRow" key={business}><input type="checkbox" checked={editing.businesses.includes(business)} onChange={() => toggleBusiness(editing, setEditing, business)}/>{business}</label>)}</div>}</>}
          <div className="actions"><button type="button" disabled={busy} onClick={saveMember}>Save permissions</button><button type="button" className="secondary" onClick={() => setEditing(null)}>Cancel</button></div>
        </div>}
      </section>
    </div>
  </AppShell>;
}
