'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
import StatusBadge from '../../components/StatusBadge';
import DataError from '../../components/DataError';
import { getSupabase } from '../../lib/supabase';
import { getWorkspaceContext } from '../../lib/workspace';

export default function Team() {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = getSupabase();
    const { workspaceId } = await getWorkspaceContext(supabase);
    const [taskResult, memberResult] = await Promise.all([
      supabase.from('tasks').select('*').eq('workspace_id', workspaceId).order('due_date'),
      supabase.from('workspace_member_directory').select('*').eq('workspace_id', workspaceId).order('full_name')
    ]);
    if (taskResult.error || memberResult.error) setError(taskResult.error?.message || memberResult.error?.message);
    else { setTasks(taskResult.data || []); setMembers(memberResult.data || []); }
  }

  const people = useMemo(() => {
    const names = new Map();
    members.forEach(member => names.set(member.full_name || member.email, { name: member.full_name || member.email, email: member.email, role: member.role }));
    tasks.forEach(task => task.owner.split('/').map(name => name.trim()).filter(Boolean).forEach(name => {
      if (!names.has(name)) names.set(name, { name, email: '', role: 'Task owner' });
    }));
    return [...names.values()].map(person => ({ ...person, tasks: tasks.filter(task => task.owner.toLowerCase().includes(person.name.toLowerCase())) }));
  }, [tasks, members]);

  return <AppShell title="Team Accountability" subtitle="Every person’s assignments, deadlines and blockers"><DataError message={error}/><section className="teamGrid">{people.map(person => <article className="panel personCard" key={person.name}><div className="panelHead"><div><h2>{person.name}</h2><small>{person.email || person.role}</small></div><span className="count">{person.tasks.filter(task => task.status !== 'Complete').length} open</span></div><div className="taskList compact">{person.tasks.map(task => <Link href={`/tasks?task=${task.id}`} className="taskRow taskRowLink" key={task.id}><div><strong>{task.title}</strong><small>{task.business} · {task.due_date || 'TBD'}</small></div><StatusBadge status={task.status}/></Link>)}{!person.tasks.length && <small>No assigned tasks.</small>}</div></article>)}</section></AppShell>;
}
