'use client';
import Link from 'next/link';
import {Suspense,useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import AppShell from '../../components/AppShell';
import StatusBadge from '../../components/StatusBadge';
import DataError from '../../components/DataError';
import {getSupabase} from '../../lib/supabase';

const businessOrder=['Mortgage','Medical','NP Franchise','Construction','Lake House','Boba Tea','Cross-Business / AI'];
const labels={'Mortgage':'Firefly Mortgage','Medical':'Medical','NP Franchise':'NP Franchise','Construction':'Construction','Lake House':'Lake House','Boba Tea':'Boba Tea','Cross-Business / AI':'Cross-Business / AI'};
const descriptions={'Lake House':'Protect revenue, manage repairs and prepare manager transition.','Mortgage':'Close loans, prove operations and scale production.','Medical':'Consolidate facilities and evaluate Hazel Green clinic.','NP Franchise':'Launch, measure demand and build franchise support.','Boba Tea':'Improve P&L, traffic and operating accountability.','Construction':'Launch pipeline, first homes and subdivision analysis.','Cross-Business / AI':'Websites, dashboards, meeting intelligence and automation.'};
const stages=['Lead','Application','Processing','Underwriting','Conditions','Clear to Close','Funded','On Hold'];

function BusinessesContent(){
  const searchParams=useSearchParams();
  const selected=searchParams.get('area');
  const [tasks,setTasks]=useState([]),[loans,setLoans]=useState([]),[error,setError]=useState('');
  useEffect(()=>{load()},[]);
  async function load(){
    const supabase=getSupabase();
    const [taskResult,loanResult]=await Promise.all([
      supabase.from('tasks').select('*').order('due_date',{ascending:true,nullsFirst:false}),
      supabase.from('loans').select('*').order('amount',{ascending:false})
    ]);
    if(taskResult.error)setError(taskResult.error.message); else setTasks(taskResult.data||[]);
    if(loanResult.error)setError(loanResult.error.message); else setLoans(loanResult.data||[]);
  }
  async function updateLoan(id,patch){const {error}=await getSupabase().from('loans').update(patch).eq('id',id);if(error)setError(error.message);else load()}
  const grouped=useMemo(()=>businessOrder.map(area=>({area,items:tasks.filter(t=>t.area===area)})),[tasks]);
  const selectedTasks=selected?tasks.filter(t=>t.area===selected):[];
  const total=loans.reduce((a,l)=>a+Number(l.amount||0),0);
  const expected=loans.reduce((a,l)=>a+Number(l.expected_revenue||0),0);

  if(selected){
    return <AppShell title={labels[selected]||selected} subtitle={descriptions[selected]||'Business workspace'}>
      <DataError message={error}/>
      <div className="workspaceTop"><Link href="/businesses" className="backLink">← All businesses</Link><Link href={`/tasks?business=${encodeURIComponent(selected)}`} className="buttonLink">View tasks</Link></div>
      {selected==='Mortgage' && <>
        <section className="metrics"><div className="metric"><span>Total pipeline</span><strong>${total.toLocaleString()}</strong></div><div className="metric"><span>Active loans</span><strong>{loans.filter(l=>l.stage!=='Funded').length}</strong></div><div className="metric"><span>Expected revenue</span><strong>${expected.toLocaleString()}</strong></div><div className="metric"><span>Open tasks</span><strong>{selectedTasks.filter(t=>t.status!=='Complete').length}</strong></div></section>
        <section className="panel"><div className="panelHead"><h2>Loan pipeline</h2><span className="count">{loans.length} loans</span></div><div className="tableWrap"><table><thead><tr><th>Loan</th><th>Amount</th><th>Product</th><th>Owner</th><th>Stage</th><th>Closing</th><th>Next step</th></tr></thead><tbody>{loans.map(l=><tr key={l.id}><td><strong>{l.name}</strong></td><td>${Number(l.amount).toLocaleString()}</td><td>{l.product}</td><td>{l.owner}</td><td><select value={l.stage} onChange={e=>updateLoan(l.id,{stage:e.target.value})}>{stages.map(s=><option key={s}>{s}</option>)}</select></td><td><input type="date" value={l.expected_close||''} onChange={e=>updateLoan(l.id,{expected_close:e.target.value||null})}/></td><td><input value={l.next_step||''} onBlur={e=>updateLoan(l.id,{next_step:e.target.value})} onChange={e=>setLoans(loans.map(x=>x.id===l.id?{...x,next_step:e.target.value}:x))}/></td></tr>)}</tbody></table></div></section>
      </>}
      <section className="panel"><div className="panelHead"><h2>{selected==='Mortgage'?'Business tasks':'Tasks'}</h2><span className="count">{selectedTasks.filter(t=>t.status!=='Complete').length} open</span></div><div className="taskList">{selectedTasks.map(t=><div className="taskRow" key={t.id}><div><strong>{t.title}</strong><small>{t.owner} · {t.due_date||'TBD'}{t.why?` · ${t.why}`:''}</small></div><StatusBadge status={t.status}/></div>)}{!selectedTasks.length&&<small>No tasks yet.</small>}</div></section>
    </AppShell>;
  }

  return <AppShell title="Business Workspaces" subtitle="Select a business to see its tasks, pipeline and current priorities"><DataError message={error}/><section className="businessGrid">{grouped.map(g=><Link href={`/businesses?area=${encodeURIComponent(g.area)}`} className="businessCard businessLink" key={g.area}><div className="panelHead"><h2>{labels[g.area]}</h2><span className="count">{g.items.filter(t=>t.status!=='Complete').length} open</span></div><p>{descriptions[g.area]}</p><div className="taskList compact">{g.items.slice(0,5).map(t=><div className="taskRow" key={t.id}><div><strong>{t.title}</strong><small>{t.owner} · {t.due_date||'TBD'}</small></div><StatusBadge status={t.status}/></div>)}{!g.items.length&&<small>No tasks yet.</small>}</div><span className="openWorkspace">Open workspace →</span></Link>)}</section></AppShell>;
}

export default function Businesses(){return <Suspense fallback={<AppShell title="Business Workspaces" subtitle="Loading businesses…"><section className="panel">Loading…</section></AppShell>}><BusinessesContent/></Suspense>}
