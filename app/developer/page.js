'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/AppShell';
import DataError from '../../components/DataError';
import { getSupabase } from '../../lib/supabase';
import { getWorkspaceContext } from '../../lib/workspace';

const roleLabels = { viewer: 'Read Only', member: 'Editor', admin: 'Developer' };
const blankInvite = { fullName: '', email: '', role: 'viewer', allBusinesses: true, businesses: [] };
const blankCompany = { name: '', description: '' };

export default function DeveloperAccess() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(null);
  const [members, setMembers] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [invite, setInvite] = useState(blankInvite);
  const [company, setCompany] = useState(blankCompany);
  const [editing, setEditing] = useState(null);
  const [editingCompany, setEditingCompany] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const activeBusinesses = businesses.filter(business => business.is_active);

  useEffect(() => { initialize(); }, []);

  async function initialize() {
    const context = await getWorkspaceContext(getSupabase());
    setAuthorized(context.isDeveloper);
    if (!context.isDeveloper) return;
    await loadAll();
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

  async function loadAll() {
    try {
      const [memberResult, businessResult] = await Promise.all([
        api('/api/developer/members'),
        api('/api/developer/businesses')
      ]);
      setMembers(memberResult.members || []);
      setCurrentUserId(memberResult.currentUserId || '');
      setBusinesses(businessResult.businesses || []);
    } catch (loadError) { setError(loadError.message); }
  }

  function toggleBusiness(state, setState, business) {
    const selected = state.businesses.includes(business)
      ? state.businesses.filter(item => item !== business)
      : [...state.businesses, business];
    setState({ ...state, businesses: selected });
  }

  async function addCompany(event) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await api('/api/developer/businesses', { method: 'POST', body: JSON.stringify(company) });
      setMessage(result.message); setCompany(blankCompany); await loadAll();
    } catch (companyError) { setError(companyError.message); }
    finally { setBusy(false); }
  }

  async function saveCompany(update = editingCompany) {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await api('/api/developer/businesses', { method: 'PATCH', body: JSON.stringify(update) });
      setMessage(result.message); setEditingCompany(null); await loadAll();
    } catch (companyError) { setError(companyError.message); }
    finally { setBusy(false); }
  }

  async function toggleCompanyStatus(business) {
    const action = business.is_active ? 'archive' : 'restore';
    if (!confirm(`${action === 'archive' ? 'Archive' : 'Restore'} ${business.name}?`)) return;
    await saveCompany({ id: business.id, name: business.name, description: business.description, isActive: !business.is_active });
  }

  async function sendInvite(event) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await api('/api/developer/members', { method: 'POST', body: JSON.stringify(invite) });
      setMessage(result.message); setInvite(blankInvite); await loadAll();
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
      setMessage(result.message); setEditing(null); await loadAll();
    } catch (saveError) { setError(saveError.message); }
    finally { setBusy(false); }
  }

  async function revoke(member) {
    if (!confirm(`Revoke Firefly OS access for ${member.email}?`)) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await api('/api/developer/members', { method: 'DELETE', body: JSON.stringify({ userId: member.userId }) });
      setMessage(result.message); await loadAll();
    } catch (removeError) { setError(removeError.message); }
    finally { setBusy(false); }
  }

  if (authorized === false) return <AppShell title="Developer" subtitle="Restricted Firefly OS administration"><section className="panel blockedPanel"><h2>Developer permission required</h2><p>This area is available only to authorized Firefly OS developers.</p><button onClick={() => router.replace('/dashboard')}>Return to dashboard</button></section></AppShell>;

  return <AppShell title="Developer" subtitle="Manage companies, invitations, and access permissions">
    <DataError message={error}/>{message && <div className="alert">{message}</div>}

    <div className="developerGrid companyManager">
      <form className="panel" onSubmit={addCompany}>
        <h2>Add company</h2>
        <label>Company name<input required maxLength="100" value={company.name} onChange={event => setCompany({ ...company, name: event.target.value })} placeholder="Example: Taylor Development"/></label>
        <label>Description<textarea value={company.description} onChange={event => setCompany({ ...company, description: event.target.value })} placeholder="What this company does and what the team should focus on"/></label>
        <button disabled={busy}>{busy ? 'Saving…' : '+ Add company'}</button>
        <p className="hint">New companies immediately appear under Businesses and in the New Task form.</p>
      </form>
      <section className="panel">
        <div className="panelHead"><h2>Companies</h2><span className="count">{activeBusinesses.length} active</span></div>
        <div className="tableWrap"><table><thead><tr><th>Company</th><th>Description</th><th>Status</th><th></th></tr></thead><tbody>{businesses.map(business => <tr key={business.id}>
          <td><strong>{business.name}</strong>{business.is_system && <small>Firefly system company</small>}</td>
          <td>{business.description || '—'}</td>
          <td><span className={`badge ${business.is_active ? 'badge-complete' : ''}`}>{business.is_active ? 'Active' : 'Archived'}</span></td>
          <td><div className="memberActions"><button type="button" className="secondary" onClick={() => setEditingCompany({ id: business.id, name: business.name, description: business.description || '', isActive: business.is_active, isSystem: business.is_system })}>Edit</button>{!business.is_system && <button type="button" className="icon" onClick={() => toggleCompanyStatus(business)}>{business.is_active ? 'Archive' : 'Restore'}</button>}</div></td>
        </tr>)}</tbody></table></div>
        {editingCompany && <div className="scopeEditor">
          <h2>Edit company</h2>
          <label>Company name<input required disabled={editingCompany.isSystem} value={editingCompany.name} onChange={event => setEditingCompany({ ...editingCompany, name: event.target.value })}/></label>
          <label>Description<textarea value={editingCompany.description} onChange={event => setEditingCompany({ ...editingCompany, description: event.target.value })}/></label>
          <div className="actions"><button type="button" disabled={busy} onClick={() => saveCompany()}>Save company</button><button type="button" className="secondary" onClick={() => setEditingCompany(null)}>Cancel</button></div>
        </div>}
      </section>
    </div>

    <section className="permissionCards">
      <div className="permissionCard"><strong>Read Only</strong><small>Can navigate assigned companies but cannot change records.</small></div>
      <div className="permissionCard"><strong>Editor</strong><small>Can create and update records in assigned companies.</small></div>
      <div className="permissionCard"><strong>Developer</strong><small>Full access, companies, invitations, permissions and settings.</small></div>
    </section>
    <div className="developerGrid">
      <form className="panel" onSubmit={sendInvite}>
        <h2>Invite team member</h2>
        <label>Full name<input required value={invite.fullName} onChange={event => setInvite({ ...invite, fullName: event.target.value })}/></label>
        <label>Email<input type="email" required value={invite.email} onChange={event => setInvite({ ...invite, email: event.target.value })}/></label>
        <label>Permission<select value={invite.role} onChange={event => setInvite({ ...invite, role: event.target.value, allBusinesses: event.target.value === 'admin' ? true : invite.allBusinesses })}><option value="viewer">Read Only</option><option value="member">Editor</option><option value="admin">Developer</option></select></label>
        {invite.role !== 'admin' && <><label className="checkRow"><input type="checkbox" checked={invite.allBusinesses} onChange={event => setInvite({ ...invite, allBusinesses: event.target.checked, businesses: event.target.checked ? [] : invite.businesses })}/>Access all companies</label>{!invite.allBusinesses && <div className="businessChecks">{activeBusinesses.map(business => <label className="checkRow" key={business.id}><input type="checkbox" checked={invite.businesses.includes(business.name)} onChange={() => toggleBusiness(invite, setInvite, business.name)}/>{business.name}</label>)}</div>}</>}
        <button disabled={busy}>{busy ? 'Sending…' : 'Send secure invitation'}</button>
        <p className="hint">Invitations expire according to your Supabase Auth settings.</p>
      </form>
      <section className="panel">
        <div className="panelHead"><h2>Team access</h2><span className="count">{members.length} members</span></div>
        <div className="tableWrap"><table><thead><tr><th>Person</th><th>Permission</th><th>Company access</th><th>Status</th><th></th></tr></thead><tbody>{members.map(member => <tr key={member.userId}>
          <td className="memberName"><strong>{member.fullName || member.email}</strong><small>{member.email}</small></td><td><span className="badge">{roleLabels[member.role]}</span></td><td><div className="accessSummary">{member.allBusinesses ? 'All companies' : member.businesses.join(', ')}</div></td><td><span className={`badge ${member.status === 'Active' ? 'badge-complete' : 'badge-in-progress'}`}>{member.status}</span></td><td><div className="memberActions"><button type="button" className="secondary" onClick={() => editMember(member)}>Edit</button>{member.userId !== currentUserId && <button type="button" className="icon dangerText" onClick={() => revoke(member)}>Revoke</button>}</div></td>
        </tr>)}</tbody></table></div>
        {editing && <div className="scopeEditor"><h2>Edit permissions</h2><label>Permission<select className="roleSelect" value={editing.role} onChange={event => setEditing({ ...editing, role: event.target.value, allBusinesses: event.target.value === 'admin' ? true : editing.allBusinesses })}><option value="viewer">Read Only</option><option value="member">Editor</option><option value="admin">Developer</option></select></label>{editing.role !== 'admin' && <><label className="checkRow"><input type="checkbox" checked={editing.allBusinesses} onChange={event => setEditing({ ...editing, allBusinesses: event.target.checked, businesses: event.target.checked ? [] : editing.businesses })}/>Access all companies</label>{!editing.allBusinesses && <div className="businessChecks">{activeBusinesses.map(business => <label className="checkRow" key={business.id}><input type="checkbox" checked={editing.businesses.includes(business.name)} onChange={() => toggleBusiness(editing, setEditing, business.name)}/>{business.name}</label>)}</div>}</>}<div className="actions"><button type="button" disabled={busy} onClick={saveMember}>Save permissions</button><button type="button" className="secondary" onClick={() => setEditing(null)}>Cancel</button></div></div>}
      </section>
    </div>
  </AppShell>;
}
