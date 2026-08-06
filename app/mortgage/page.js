'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
import StatusBadge from '../../components/StatusBadge';
import DataError from '../../components/DataError';
import { getSupabase } from '../../lib/supabase';
import { getWorkspaceContext } from '../../lib/workspace';

const stages = ['Lead','Application','File Review','Structuring','Processing','Underwriting','Conditions','Clear to Close','Funded','On Hold'];

export default function Mortgage() {
  const [loans, setLoans] = useState([]);
  const [error, setError] = useState('');
  const [context, setContext] = useState(null);
  useEffect(() => { load(); }, []);
  async function load() {
    const supabase = getSupabase();
    const workspace = await getWorkspaceContext(supabase);
    const { workspaceId } = workspace;
    setContext(workspace);
    const { data, error: loadError } = await supabase.from('loans').select('*').eq('workspace_id', workspaceId).order('amount', { ascending: false });
    if (loadError) setError(loadError.message); else setLoans(data || []);
  }
  async function update(id, patch) {
    const { error: updateError } = await getSupabase().from('loans').update(patch).eq('id', id);
    if (updateError) setError(updateError.message); else load();
  }
  const total = useMemo(() => loans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0), [loans]);
  return <AppShell title="Firefly Mortgage" subtitle="Live loan pipeline and closing accountability"><DataError message={error}/>{!context?.canEdit && <div className="toolbar"><span className="readOnlyPill">Read-only access</span></div>}<section className="metrics"><div className="metric"><span>Total pipeline</span><strong>${total.toLocaleString()}</strong></div><div className="metric"><span>Active loans</span><strong>{loans.filter(loan => loan.stage !== 'Funded').length}</strong></div></section><section className="panel"><div className="tableWrap"><table><thead><tr><th>Borrower</th><th>Amount</th><th>Product</th><th>Owner</th><th>Stage</th><th>Closing</th><th>Next step</th></tr></thead><tbody>{loans.map(loan => <tr key={loan.id}><td><strong>{loan.borrower}</strong></td><td>${Number(loan.amount).toLocaleString()}</td><td>{loan.product}</td><td>{loan.owner}</td><td>{context?.canEdit ? <select value={loan.stage || ''} onChange={event => update(loan.id, { stage: event.target.value })}>{stages.map(stage => <option key={stage}>{stage}</option>)}</select> : <StatusBadge status={loan.stage}/>}</td><td>{context?.canEdit ? <input type="date" value={loan.expected_close || ''} onChange={event => update(loan.id, { expected_close: event.target.value || null })}/> : loan.expected_close || 'TBD'}</td><td>{context?.canEdit ? <input value={loan.next_step || ''} onBlur={event => update(loan.id, { next_step: event.target.value })} onChange={event => setLoans(current => current.map(item => item.id === loan.id ? { ...item, next_step: event.target.value } : item))}/> : loan.next_step || '—'}</td></tr>)}</tbody></table></div></section><section className="kanban">{stages.slice(0, 9).map(stage => <div className="kanbanCol" key={stage}><h3>{stage}</h3>{loans.filter(loan => loan.stage === stage).map(loan => <div className="loanCard" key={loan.id}><strong>{loan.borrower}</strong><span>${Number(loan.amount).toLocaleString()}</span><small>{loan.owner}</small><StatusBadge status={loan.stage}/></div>)}</div>)}</section></AppShell>;
}
