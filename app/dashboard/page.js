'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
import StatusBadge from '../../components/StatusBadge';
import DataError from '../../components/DataError';
import { getSupabase } from '../../lib/supabase';
import { getWorkspaceContext } from '../../lib/workspace';

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
    const supabase = getSupabase();
    const channel = supabase.channel('dash-live').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, load).on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, load).subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function load() {
    const supabase = getSupabase();
    const { workspaceId } = await getWorkspaceContext(supabase);
    const [taskResult, loanResult] = await Promise.all([
      supabase.from('tasks').select('*').eq('workspace_id', workspaceId).order('due_date'),
      supabase.from('loans').select('*').eq('workspace_id', workspaceId).order('amount', { ascending: false })
    ]);
    if (taskResult.error || loanResult.error) setError(taskResult.error?.message || loanResult.error?.message);
    else { setTasks(taskResult.data || []); setLoans(loanResult.data || []); }
  }

  const today = new Date().toISOString().slice(0, 10);
  const open = tasks.filter(task => task.status !== 'Complete');
  const overdue = open.filter(task => task.due_date && task.due_date < today);
  const blocked = open.filter(task => task.status === 'Blocked');
  const pipeline = loans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
  const byBusiness = useMemo(() => Object.entries(open.reduce((summary, task) => {
    summary[task.business] = (summary[task.business] || 0) + 1;
    return summary;
  }, {})).sort((left, right) => right[1] - left[1]), [tasks]);

  return <AppShell title="Executive Dashboard" subtitle="What needs attention across every business">
    <DataError message={error}/>
    <section className="metrics"><div className="metric"><span>Open tasks</span><strong>{open.length}</strong></div><div className="metric danger"><span>Overdue</span><strong>{overdue.length}</strong></div><div className="metric warning"><span>Blocked</span><strong>{blocked.length}</strong></div><div className="metric"><span>Mortgage pipeline</span><strong>${pipeline.toLocaleString()}</strong></div></section>
    <section className="twoCol"><div className="panel"><div className="panelHead"><h2>Immediate attention</h2></div><div className="taskList">{[...overdue, ...blocked.filter(task => !overdue.some(item => item.id === task.id)), ...open.filter(task => !overdue.some(item => item.id === task.id) && task.status !== 'Blocked')].slice(0, 8).map(task => <div className="taskRow" key={task.id}><div><strong>{task.title}</strong><small>{task.business} · {task.owner} · Due {task.due_date || 'TBD'}</small></div><StatusBadge status={task.status}/></div>)}</div></div><div className="panel"><div className="panelHead"><h2>Workload by business</h2></div>{byBusiness.map(([business, count]) => <div className="barRow" key={business}><span>{business}</span><div className="bar"><i style={{ width: `${Math.min(100, count * 14)}%` }}/></div><strong>{count}</strong></div>)}</div></section>
    <section className="panel"><div className="panelHead"><h2>Mortgage pipeline</h2></div><div className="tableWrap"><table><thead><tr><th>Borrower</th><th>Amount</th><th>Stage</th><th>Owner</th><th>Expected close</th></tr></thead><tbody>{loans.map(loan => <tr key={loan.id}><td>{loan.borrower}</td><td>${Number(loan.amount).toLocaleString()}</td><td><StatusBadge status={loan.stage}/></td><td>{loan.owner}</td><td>{loan.expected_close || 'TBD'}</td></tr>)}</tbody></table></div></section>
  </AppShell>;
}
