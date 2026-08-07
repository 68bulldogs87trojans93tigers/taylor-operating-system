'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AppShell from '../../components/AppShell';
import StatusBadge from '../../components/StatusBadge';
import DataError from '../../components/DataError';
import TaskDetailPanel from '../../components/TaskDetailPanel';
import { getSupabase } from '../../lib/supabase';
import { getBusinesses } from '../../lib/businesses';
import { getWorkspaceContext } from '../../lib/workspace';

const blank = { title: '', business: 'Firefly Mortgage', owner: 'Billy', due_date: '', priority: 'High', status: 'Not Started', why: '' };
const priorityRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const statusRank = { Blocked: 0, 'In Progress': 1, 'Not Started': 2, Complete: 3 };
const sortableColumns = [
  ['title', 'Task'],
  ['business', 'Business'],
  ['owner', 'Owner'],
  ['due_date', 'Due'],
  ['priority', 'Priority'],
  ['status', 'Status']
];

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
  const [sort, setSort] = useState({ key: 'due_date', direction: 'asc' });
  const [businesses, setBusinesses] = useState([]);
  const [latestActivity, setLatestActivity] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const requestedTaskHandled = useRef(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = getSupabase();
    const workspace = await getWorkspaceContext(supabase);
    setContext(workspace);
    const [taskResult, businessData, activityResult] = await Promise.all([
      supabase.from('tasks').select('*').eq('workspace_id', workspace.workspaceId).order('due_date', { ascending: true, nullsFirst: false }),
      getBusinesses(supabase, workspace.workspaceId),
      supabase.from('task_activity').select('task_id,activity_type,message,created_at').eq('workspace_id', workspace.workspaceId).order('created_at', { ascending: false }).limit(1000)
    ]);
    const { data, error: loadError } = taskResult;
    const allowedBusinesses = businessData.filter(business => !workspace.businesses || workspace.businesses.includes(business.name));
    setBusinesses(allowedBusinesses);
    setForm(current => allowedBusinesses.some(business => business.name === current.business)
      ? current
      : { ...current, business: allowedBusinesses[0]?.name || '' });
    const newest = {};
    (activityResult.data || []).forEach(item => { if (!newest[item.task_id]) newest[item.task_id] = item; });
    setLatestActivity(newest);
    if (loadError) setError(loadError.message); else {
      setTasks(data || []);
      setSelectedTask(current => current ? (data || []).find(task => task.id === current.id) || null : current);
    }
  }

  useEffect(() => {
    const requestedTask = searchParams.get('task');
    if (requestedTask && tasks.length && !selectedTask && !requestedTaskHandled.current) {
      const match = tasks.find(task => task.id === requestedTask);
      if (match) {
        requestedTaskHandled.current = true;
        setSelectedTask(match);
      }
    }
  }, [tasks, searchParams, selectedTask]);

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
    else { setForm({ ...blank, business: businesses[0]?.name || '' }); setShow(false); load(); }
  }

  async function update(id, patch) {
    const { error: updateError } = await getSupabase().from('tasks').update({ ...patch, updated_by: context?.userId || null }).eq('id', id);
    if (updateError) setError(updateError.message); else load();
  }

  async function refreshSelected(id) {
    const supabase = getSupabase();
    const { data } = await supabase.from('tasks').select('*').eq('id', id).maybeSingle();
    if (data) setSelectedTask(data);
    await load();
  }

  async function remove(id) {
    if (!confirm('Delete this task?')) return;
    const { error: deleteError } = await getSupabase().from('tasks').delete().eq('id', id);
    if (deleteError) setError(deleteError.message); else load();
  }

  const areas = ['All', ...new Set(tasks.map(task => task.business).filter(Boolean))];
  const visible = useMemo(() => {
    const filtered = tasks.filter(task =>
      (filter === 'All' || task.business === filter) &&
      `${task.title} ${task.business} ${task.owner} ${task.priority} ${task.status} ${task.why || ''}`.toLowerCase().includes(search.toLowerCase())
    );

    return [...filtered].sort((left, right) => {
      let a = left[sort.key];
      let b = right[sort.key];
      if (sort.key === 'priority') { a = priorityRank[a] ?? 99; b = priorityRank[b] ?? 99; }
      if (sort.key === 'status') { a = statusRank[a] ?? 99; b = statusRank[b] ?? 99; }
      if (a === b) return 0;
      if (a === null || a === undefined || a === '') return 1;
      if (b === null || b === undefined || b === '') return -1;
      const comparison = typeof a === 'number'
        ? a - b
        : String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [tasks, filter, search, sort]);

  function changeSort(key) {
    setSort(current => current.key === key
      ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' });
  }

  return <AppShell title="Master Task Board" subtitle="One shared source of truth for assignments and deadlines">
    <DataError message={error}/>
    <div className="toolbar"><div className="filters"><input placeholder="Search tasks…" value={search} onChange={event => setSearch(event.target.value)}/><select value={filter} onChange={event => setFilter(event.target.value)}>{areas.map(area => <option key={area}>{area}</option>)}</select></div>{context?.canEdit ? <button onClick={() => setShow(!show)}>+ New task</button> : <span className="readOnlyPill">Read-only access</span>}</div>
    {show && context?.canEdit && <form className="panel formGrid" onSubmit={add}>
      <label>Task<input required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })}/></label>
      <label>Business<select value={form.business} onChange={event => setForm({ ...form, business: event.target.value })}>{businesses.map(business => <option key={business.id || business.name}>{business.name}</option>)}</select></label>
      <label>Owner<input required value={form.owner} onChange={event => setForm({ ...form, owner: event.target.value })}/></label>
      <label>Due date<input type="date" value={form.due_date} onChange={event => setForm({ ...form, due_date: event.target.value })}/></label>
      <label>Priority<select value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value })}><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label>
      <label>Why<input value={form.why} onChange={event => setForm({ ...form, why: event.target.value })}/></label>
      <div className="wide actions"><button>Save task</button><button type="button" className="secondary" onClick={() => setShow(false)}>Cancel</button></div>
    </form>}
    <section className="panel"><div className="tableWrap"><table><thead><tr>{sortableColumns.map(([key, label]) => <th key={key} aria-sort={sort.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className="sortButton" onClick={() => changeSort(key)}>{label}<span aria-hidden="true">{sort.key === key ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}</span></button></th>)}<th>Notes &amp; updates</th><th></th></tr></thead><tbody>{visible.map(task => <tr key={task.id}>
      <td><strong>{task.title}</strong>{task.why && <small>{task.why}</small>}</td><td>{task.business}</td><td>{task.owner}</td><td>{task.due_date || 'TBD'}</td><td><StatusBadge status={task.priority}/></td>
      <td>{context?.canEdit ? <select value={task.status} onChange={event => update(task.id, { status: event.target.value })}><option>Not Started</option><option>In Progress</option><option>Blocked</option><option>Complete</option></select> : <StatusBadge status={task.status}/>}</td>
      <td className="activityCell"><small>{latestActivity[task.id] ? `Latest: ${latestActivity[task.id].message}` : 'No notes yet'}</small><button type="button" className="notesButton" onClick={() => setSelectedTask(task)}>Notes &amp; updates</button></td>
      <td>{context?.canEdit && <button className="icon dangerText" onClick={() => remove(task.id)}>Delete</button>}</td>
    </tr>)}</tbody></table></div></section>
    {selectedTask && context && <TaskDetailPanel task={selectedTask} context={context} businesses={businesses} onClose={() => setSelectedTask(null)} onSaved={refreshSelected}/>}
  </AppShell>;
}

export default function Tasks() {
  return <Suspense fallback={<AppShell title="Master Task Board" subtitle="Loading tasks…"><section className="panel">Loading…</section></AppShell>}><TasksContent/></Suspense>;
}
