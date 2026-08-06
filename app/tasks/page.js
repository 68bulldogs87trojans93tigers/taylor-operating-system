'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AppShell from '../../components/AppShell';
import StatusBadge from '../../components/StatusBadge';
import DataError from '../../components/DataError';
import { getSupabase } from '../../lib/supabase';
import { BUSINESSES } from '../../lib/businesses';
import { getWorkspaceContext } from '../../lib/workspace';

const blank = { title: '', business: 'Firefly Mortgage', owner: 'Billy', due_date: '', priority: 'High', status: 'Not Started', why: '' };

function TasksContent() {
  const searchParams = useSearchParams();
  const initialBusiness = searchParams.get('business') || 'All';
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState(initialBusiness);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(blank);
  const [show, setShow] = useState(false);
  const [context, setContext] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = getSupabase();
    const workspace = await getWorkspaceContext(supabase);
    setContext(workspace);
    const { data, error: loadError } = await supabase.from('tasks').select('*').eq('workspace_id', workspace.workspaceId).order('due_date', { ascending: true, nullsFirst: false });
    if (loadError) setError(loadError.message); else setTasks(data || []);
  }

  async function add(event) {
    event.preventDefault();
    const workspace = context || await getWorkspaceContext(getSupabase());
    const { error: addError } = await getSupabase().from('tasks').insert({
      ...form,
      workspace_id: workspace.workspaceId,
      due_date: form.due_date || null,
      created_by: workspace.userId,
      updated_by: workspace.userId
    });
    if (addError) setError(addError.message);
    else { setForm(blank); setShow(false); load(); }
  }

  async function update(id, patch) {
    const { error: updateError } = await getSupabase().from('tasks').update({ ...patch, updated_by: context?.userId || null }).eq('id', id);
    if (updateError) setError(updateError.message); else load();
  }

  async function remove(id) {
    if (!confirm('Delete this task?')) return;
    const { error: deleteError } = await getSupabase().from('tasks').delete().eq('id', id);
    if (deleteError) setError(deleteError.message); else load();
  }

  const areas = ['All', ...new Set(tasks.map(task => task.business).filter(Boolean))];
  const visible = useMemo(() => tasks.filter(task =>
    (filter === 'All' || task.business === filter) &&
    `${task.title} ${task.owner} ${task.why || ''}`.toLowerCase().includes(search.toLowerCase())
  ), [tasks, filter, search]);

  return <AppShell title="Master Task Board" subtitle="One shared source of truth for assignments and deadlines">
    <DataError message={error}/>
    <div className="toolbar"><div className="filters"><input placeholder="Search tasks…" value={search} onChange={event => setSearch(event.target.value)}/><select value={filter} onChange={event => setFilter(event.target.value)}>{areas.map(area => <option key={area}>{area}</option>)}</select></div><button onClick={() => setShow(!show)}>+ New task</button></div>
    {show && <form className="panel formGrid" onSubmit={add}>
      <label>Task<input required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })}/></label>
      <label>Business<select value={form.business} onChange={event => setForm({ ...form, business: event.target.value })}>{BUSINESSES.map(business => <option key={business}>{business}</option>)}</select></label>
      <label>Owner<input required value={form.owner} onChange={event => setForm({ ...form, owner: event.target.value })}/></label>
      <label>Due date<input type="date" value={form.due_date} onChange={event => setForm({ ...form, due_date: event.target.value })}/></label>
      <label>Priority<select value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value })}><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label>
      <label>Why<input value={form.why} onChange={event => setForm({ ...form, why: event.target.value })}/></label>
      <div className="wide actions"><button>Save task</button><button type="button" className="secondary" onClick={() => setShow(false)}>Cancel</button></div>
    </form>}
    <section className="panel"><div className="tableWrap"><table><thead><tr><th>Task</th><th>Business</th><th>Owner</th><th>Due</th><th>Priority</th><th>Status</th><th></th></tr></thead><tbody>{visible.map(task => <tr key={task.id}>
      <td><strong>{task.title}</strong>{task.why && <small>{task.why}</small>}</td><td>{task.business}</td><td>{task.owner}</td><td>{task.due_date || 'TBD'}</td><td><StatusBadge status={task.priority}/></td>
      <td><select value={task.status} onChange={event => update(task.id, { status: event.target.value })}><option>Not Started</option><option>In Progress</option><option>Blocked</option><option>Complete</option></select></td>
      <td><button className="icon dangerText" onClick={() => remove(task.id)}>Delete</button></td>
    </tr>)}</tbody></table></div></section>
  </AppShell>;
}

export default function Tasks() {
  return <Suspense fallback={<AppShell title="Master Task Board" subtitle="Loading tasks…"><section className="panel">Loading…</section></AppShell>}><TasksContent/></Suspense>;
}
