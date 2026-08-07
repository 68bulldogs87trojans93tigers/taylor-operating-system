'use client';

import { useEffect, useState } from 'react';
import DataError from './DataError';
import StatusBadge from './StatusBadge';
import { getSupabase } from '../lib/supabase';

function taskForm(task) {
  return {
    title: task.title || '',
    business: task.business || '',
    owner: task.owner || '',
    due_date: task.due_date || '',
    priority: task.priority || 'Medium',
    status: task.status || 'Not Started',
    why: task.why || ''
  };
}

function displayTime(value) {
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function TaskDetailPanel({ task, context, businesses, onClose, onSaved }) {
  const [form, setForm] = useState(taskForm(task));
  const [activity, setActivity] = useState([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setForm(taskForm(task));
    loadActivity();
  }, [task.id]);

  useEffect(() => {
    function closeOnEscape(event) { if (event.key === 'Escape') onClose(); }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  async function api(options = {}) {
    const { data } = await getSupabase().auth.getSession();
    const response = await fetch(`/api/tasks/${task.id}/activity`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` }
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Task activity could not be loaded.');
    return result;
  }

  async function loadActivity() {
    setLoading(true); setError('');
    try {
      const result = await api();
      setActivity(result.activity || []);
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }

  async function saveTask(event) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    const { error: updateError } = await getSupabase().from('tasks').update({
      ...form,
      due_date: form.due_date || null,
      updated_by: context.userId
    }).eq('id', task.id);
    if (updateError) setError(updateError.message);
    else {
      setMessage('Task updated.');
      await onSaved(task.id);
      await loadActivity();
    }
    setBusy(false);
  }

  async function addNote(event) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await api({ method: 'POST', body: JSON.stringify({ message: note }) });
      setNote(''); setMessage(result.message);
      await loadActivity();
      await onSaved(task.id);
    } catch (noteError) { setError(noteError.message); }
    finally { setBusy(false); }
  }

  return <div className="taskDrawerBackdrop" onMouseDown={onClose}>
    <aside className="taskDrawer" aria-label="Task details and activity" onMouseDown={event => event.stopPropagation()}>
      <div className="taskDrawerHead"><div><small>{task.business}</small><h2>{task.title}</h2></div><button type="button" className="drawerClose" aria-label="Close task details" onClick={onClose}>×</button></div>
      <DataError message={error}/>{message && <div className="alert drawerAlert">{message}</div>}

      {context.canEdit ? <form className="taskDetailForm" onSubmit={saveTask}>
        <label>Task<input required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })}/></label>
        <div className="detailGrid">
          <label>Business<select value={form.business} onChange={event => setForm({ ...form, business: event.target.value })}>{businesses.map(business => <option key={business.id || business.name}>{business.name}</option>)}</select></label>
          <label>Owner<input required value={form.owner} onChange={event => setForm({ ...form, owner: event.target.value })}/></label>
          <label>Due date<input type="date" value={form.due_date} onChange={event => setForm({ ...form, due_date: event.target.value })}/></label>
          <label>Priority<select value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value })}><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label>
          <label>Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}><option>Not Started</option><option>In Progress</option><option>Blocked</option><option>Complete</option></select></label>
        </div>
        <label>Details / why<textarea value={form.why} onChange={event => setForm({ ...form, why: event.target.value })}/></label>
        <button disabled={busy}>{busy ? 'Saving…' : 'Save task updates'}</button>
      </form> : <section className="readOnlyTask"><div className="detailGrid"><div><small>Owner</small><strong>{task.owner}</strong></div><div><small>Due date</small><strong>{task.due_date || 'TBD'}</strong></div><div><small>Priority</small><StatusBadge status={task.priority}/></div><div><small>Status</small><StatusBadge status={task.status}/></div></div>{task.why && <p>{task.why}</p>}</section>}

      <section className="activitySection">
        <div className="panelHead"><h2>Notes & activity</h2><span className="count">{activity.length}</span></div>
        {context.canEdit && <form className="noteComposer" onSubmit={addNote}><textarea required maxLength="2000" value={note} onChange={event => setNote(event.target.value)} placeholder="Add a progress note, decision, blocker, or next step…"/><div><small>{note.length}/2000</small><button disabled={busy || !note.trim()}>{busy ? 'Posting…' : 'Add note'}</button></div></form>}
        {loading ? <p className="hint">Loading activity…</p> : <div className="activityFeed">{activity.map(item => <article className={`activityItem ${item.activity_type}`} key={item.id}><div className="activityMeta"><strong>{item.authorName}</strong><span>{displayTime(item.created_at)}</span></div><p>{item.message}</p>{item.field_name && <div className="changeValues"><span>{item.old_value || '—'}</span><b>→</b><span>{item.new_value || '—'}</span></div>}</article>)}{!activity.length && <p className="hint">No notes or updates yet.</p>}</div>}
      </section>
    </aside>
  </div>;
}
