'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AppShell from '../../components/AppShell';
import StatusBadge from '../../components/StatusBadge';
import DataError from '../../components/DataError';
import { getSupabase } from '../../lib/supabase';
import { getBusinesses } from '../../lib/businesses';
import { getWorkspaceContext } from '../../lib/workspace';

const stages = ['Lead','Application','File Review','Structuring','Processing','Underwriting','Conditions','Clear to Close','Funded','On Hold'];

function BusinessesContent() {
  const searchParams = useSearchParams();
  const selected = searchParams.get('area');
  const [tasks, setTasks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [context, setContext] = useState(null);
  const [error, setError] = useState('');
  const [businesses, setBusinesses] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = getSupabase();
    const workspace = await getWorkspaceContext(supabase);
    const { workspaceId } = workspace;
    setContext(workspace);
    const [taskResult, loanResult, businessData] = await Promise.all([
      supabase.from('tasks').select('*').eq('workspace_id', workspaceId).order('due_date', { ascending: true, nullsFirst: false }),
      supabase.from('loans').select('*').eq('workspace_id', workspaceId).order('amount', { ascending: false }),
      getBusinesses(supabase, workspaceId)
    ]);
    setBusinesses(businessData.filter(business => !workspace.businesses || workspace.businesses.includes(business.name)));
    if (taskResult.error || loanResult.error) setError(taskResult.error?.message || loanResult.error?.message);
    else { setTasks(taskResult.data || []); setLoans(loanResult.data || []); }
  }

  async function updateLoan(id, patch) {
    const { error: updateError } = await getSupabase().from('loans').update(patch).eq('id', id);
    if (updateError) setError(updateError.message); else load();
  }

  const grouped = useMemo(() => businesses.map(business => ({ ...business, items: tasks.filter(task => task.business === business.name) })), [tasks, businesses]);
  const selectedTasks = selected ? tasks.filter(task => task.business === selected) : [];
  const total = loans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);

  if (selected && context?.businesses && !context.businesses.includes(selected)) return <AppShell title={selected} subtitle="Restricted business workspace"><section className="panel blockedPanel"><h2>Business access required</h2><p>Your invitation does not include this business.</p><Link href="/businesses" className="buttonLink">Return to businesses</Link></section></AppShell>;

  const selectedBusiness = businesses.find(business => business.name === selected);

  if (selected) return <AppShell title={selected} subtitle={selectedBusiness?.description || 'Business workspace'}>
    <DataError message={error}/>
    <div className="workspaceTop"><Link href="/businesses" className="backLink">← All businesses</Link><Link href={`/tasks?business=${encodeURIComponent(selected)}`} className="buttonLink">View tasks</Link></div>
    {selected === 'Firefly Mortgage' && <>
      <section className="metrics"><div className="metric"><span>Total pipeline</span><strong>${total.toLocaleString()}</strong></div><div className="metric"><span>Active loans</span><strong>{loans.filter(loan => loan.stage !== 'Funded').length}</strong></div><div className="metric"><span>Open mortgage tasks</span><strong>{selectedTasks.filter(task => task.status !== 'Complete').length}</strong></div></section>
      <section className="panel"><div className="panelHead"><h2>Loan pipeline</h2><span className="count">{loans.length} loans</span></div><div className="tableWrap"><table><thead><tr><th>Borrower</th><th>Amount</th><th>Product</th><th>Owner</th><th>Stage</th><th>Closing</th><th>Next step</th></tr></thead><tbody>{loans.map(loan => <tr key={loan.id}>
        <td><strong>{loan.borrower}</strong></td><td>${Number(loan.amount).toLocaleString()}</td><td>{loan.product}</td><td>{loan.owner}</td>
        <td>{context?.canEdit ? <select value={loan.stage || ''} onChange={event => updateLoan(loan.id, { stage: event.target.value })}>{stages.map(stage => <option key={stage}>{stage}</option>)}</select> : <StatusBadge status={loan.stage}/>}</td>
        <td>{context?.canEdit ? <input type="date" value={loan.expected_close || ''} onChange={event => updateLoan(loan.id, { expected_close: event.target.value || null })}/> : loan.expected_close || 'TBD'}</td>
        <td>{context?.canEdit ? <input value={loan.next_step || ''} onBlur={event => updateLoan(loan.id, { next_step: event.target.value })} onChange={event => setLoans(current => current.map(item => item.id === loan.id ? { ...item, next_step: event.target.value } : item))}/> : loan.next_step || '—'}</td>
      </tr>)}</tbody></table></div></section>
    </>}
    <section className="panel"><div className="panelHead"><h2>{selected === 'Firefly Mortgage' ? 'Business tasks' : 'Tasks'}</h2><span className="count">{selectedTasks.filter(task => task.status !== 'Complete').length} open</span></div><div className="taskList">{selectedTasks.map(task => <div className="taskRow" key={task.id}><div><strong>{task.title}</strong><small>{task.owner} · {task.due_date || 'TBD'}{task.why ? ` · ${task.why}` : ''}</small></div><StatusBadge status={task.status}/></div>)}{!selectedTasks.length && <small>No tasks yet.</small>}</div></section>
  </AppShell>;

  return <AppShell title="Business Workspaces" subtitle="Select a business to see its tasks, pipeline and current priorities">
    <DataError message={error}/><section className="businessGrid">{grouped.map(group => <Link href={`/businesses?area=${encodeURIComponent(group.name)}`} className="businessCard businessLink" key={group.id || group.name}><div className="panelHead"><h2>{group.name}</h2><span className="count">{group.items.filter(task => task.status !== 'Complete').length} open</span></div><p>{group.description || 'Business workspace and shared accountability.'}</p><div className="taskList compact">{group.items.slice(0, 5).map(task => <div className="taskRow" key={task.id}><div><strong>{task.title}</strong><small>{task.owner} · {task.due_date || 'TBD'}</small></div><StatusBadge status={task.status}/></div>)}{!group.items.length && <small>No tasks yet.</small>}</div><span className="openWorkspace">Open workspace →</span></Link>)}</section>
  </AppShell>;
}

export default function Businesses() {
  return <Suspense fallback={<AppShell title="Business Workspaces" subtitle="Loading businesses…"><section className="panel">Loading…</section></AppShell>}><BusinessesContent/></Suspense>;
}
