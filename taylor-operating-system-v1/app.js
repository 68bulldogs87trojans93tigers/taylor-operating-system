const CONFIG = window.TOS_CONFIG || {};
const WORKSPACE_ID = '11111111-1111-1111-1111-111111111111';
const BUSINESSES = ['Firefly Mortgage','Medical','NP Franchise','Construction','Boba Tea','Lake House','Cross-Business / AI'];
const $ = (id) => document.getElementById(id);
const safe = (value='') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n||0));
const fmtDate = d => d ? new Date(`${d}T12:00:00`).toLocaleDateString() : '—';

let db;
const state = { user:null, profile:null, role:null, tasks:[], loans:[], meetings:[], members:[], view:'dashboard', realtime:null };

function toast(message){ const node=$('toast'); node.textContent=message; node.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>node.hidden=true,3300); }
function showAuthStatus(message,error=false){ const node=$('auth-status'); node.textContent=message; node.style.color=error?'#b91c1c':'#64748b'; }
function showSetupAlert(message){ $('setup-alert').hidden=false; $('setup-message').textContent=message; }
function switchAuth(mode){ const signup=mode==='signup'; $('signup-form').hidden=!signup; $('signin-form').hidden=signup; $('signup-tab').classList.toggle('active',signup); $('signin-tab').classList.toggle('active',!signup); showAuthStatus(''); }

function initClient(){
  if(!CONFIG.supabaseUrl || !CONFIG.supabasePublishableKey){
    showSetupAlert('The Supabase URL or publishable key is missing from config.js.');
    return false;
  }
  db = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabasePublishableKey, {
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  return true;
}

async function databaseHealth(showSuccess=false){
  if(!db) return false;
  const {error} = await db.from('workspaces').select('id').limit(1);
  if(error){
    showSetupAlert(`Supabase is connected, but the database tables are not available. Run supabase/setup.sql in SQL Editor, then refresh Table Editor. Details: ${error.message}`);
    if(showSuccess) showAuthStatus(error.message,true);
    return false;
  }
  $('setup-alert').hidden=true;
  if(showSuccess) showAuthStatus('Database connected and tables detected.');
  return true;
}

async function bootstrap(){
  if(!initClient()) return;
  await databaseHealth(false);
  const {data:{session}} = await db.auth.getSession();
  if(session?.user) await enterApp(session.user);
  db.auth.onAuthStateChange(async (event,session)=>{
    if(event==='SIGNED_OUT'){ leaveApp(); }
    if(session?.user && !state.user) await enterApp(session.user);
  });
}

async function enterApp(user){
  state.user=user;
  const healthy=await databaseHealth(false);
  if(!healthy){ state.user=null; return; }
  const [{data:profile},{data:membership,error:memberError}] = await Promise.all([
    db.from('profiles').select('*').eq('id',user.id).maybeSingle(),
    db.from('workspace_members').select('role').eq('workspace_id',WORKSPACE_ID).eq('user_id',user.id).maybeSingle()
  ]);
  if(memberError || !membership){
    showSetupAlert('Your account exists, but it is not connected to the shared workspace. Re-run supabase/setup.sql, then create a new account or contact the administrator.');
    state.user=null;
    return;
  }
  state.profile=profile;
  state.role=membership.role;
  $('auth-screen').hidden=true;
  $('app-shell').hidden=false;
  $('user-name').textContent=`${profile?.full_name||user.email} · ${membership.role}`;
  await loadAll();
  subscribeRealtime();
  render('dashboard');
}

function leaveApp(){
  if(state.realtime) db.removeChannel(state.realtime);
  Object.assign(state,{user:null,profile:null,role:null,tasks:[],loans:[],meetings:[],members:[],view:'dashboard',realtime:null});
  $('app-shell').hidden=true;
  $('auth-screen').hidden=false;
}

async function loadAll(){
  const [tasks,loans,meetings,members] = await Promise.all([
    db.from('tasks').select('*').eq('workspace_id',WORKSPACE_ID).order('due_date',{ascending:true,nullsFirst:false}),
    db.from('loans').select('*').eq('workspace_id',WORKSPACE_ID).order('amount',{ascending:false}),
    db.from('meetings').select('*').eq('workspace_id',WORKSPACE_ID).order('meeting_date',{ascending:false}),
    db.from('workspace_members').select('role,user_id').eq('workspace_id',WORKSPACE_ID)
  ]);
  const err=[tasks.error,loans.error,meetings.error,members.error].find(Boolean);
  if(err) return toast(err.message);
  const memberRows=members.data||[];
  let profileMap={};
  if(memberRows.length){
    const {data:profiles,error:profileError}=await db.from('profiles').select('id,email,full_name').in('id',memberRows.map(m=>m.user_id));
    if(profileError) return toast(profileError.message);
    profileMap=Object.fromEntries((profiles||[]).map(p=>[p.id,p]));
  }
  state.tasks=tasks.data||[];
  state.loans=loans.data||[];
  state.meetings=meetings.data||[];
  state.members=memberRows.map(m=>({role:m.role,user_id:m.user_id,email:profileMap[m.user_id]?.email,full_name:profileMap[m.user_id]?.full_name}));
}

function subscribeRealtime(){
  if(state.realtime) db.removeChannel(state.realtime);
  state.realtime=db.channel('tos-shared-data')
    .on('postgres_changes',{event:'*',schema:'public',table:'tasks',filter:`workspace_id=eq.${WORKSPACE_ID}`},refreshCurrent)
    .on('postgres_changes',{event:'*',schema:'public',table:'loans',filter:`workspace_id=eq.${WORKSPACE_ID}`},refreshCurrent)
    .on('postgres_changes',{event:'*',schema:'public',table:'meetings',filter:`workspace_id=eq.${WORKSPACE_ID}`},refreshCurrent)
    .subscribe();
}
async function refreshCurrent(){ await loadAll(); render(state.view); }

function priorityBadge(p){ const c=p==='Critical'?'red':p==='High'?'orange':p==='Low'?'green':'blue'; return `<span class="badge ${c}">${safe(p)}</span>`; }
function statusBadge(s){ const c=s==='Blocked'?'red':s==='Complete'?'green':s==='In Progress'?'blue':'orange'; return `<span class="badge ${c}">${safe(s)}</span>`; }
function isOverdue(t){ return t.status!=='Complete' && t.due_date && new Date(`${t.due_date}T23:59:59`) < new Date(); }
function owners(){ return [...new Set([...state.tasks.map(t=>t.owner),...state.members.map(m=>m.full_name).filter(Boolean)])].sort(); }
function businessStats(b){ const rows=state.tasks.filter(t=>t.business===b); const complete=rows.filter(t=>t.status==='Complete').length; return {count:rows.length,complete,pct:rows.length?Math.round(complete/rows.length*100):0}; }

function taskTable(rows){
  if(!rows.length) return '<div class="empty">No tasks match this view.</div>';
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Task</th><th>Business</th><th>Owner</th><th>Due</th><th>Priority</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(t=>`<tr><td><strong>${safe(t.title)}</strong><br><span class="fine-print">${safe(t.why||'')}</span></td><td>${safe(t.business)}</td><td>${safe(t.owner)}</td><td>${isOverdue(t)?'<span class="badge red">Overdue</span><br>':''}${fmtDate(t.due_date)}</td><td>${priorityBadge(t.priority)}</td><td><select data-task-status="${t.id}">${['Not Started','In Progress','Blocked','Complete'].map(s=>`<option ${s===t.status?'selected':''}>${s}</option>`).join('')}</select></td><td><button class="text-button" data-edit-task="${t.id}">Edit</button></td></tr>`).join('')}</tbody></table></div>`;
}

function dashboard(){
  const open=state.tasks.filter(t=>t.status!=='Complete');
  const critical=open.filter(t=>t.priority==='Critical');
  const overdue=open.filter(isOverdue);
  const pipeline=state.loans.reduce((sum,l)=>sum+Number(l.amount),0);
  return `<div class="grid kpi-grid">
    <div class="card"><div class="kpi-label">Mortgage pipeline</div><div class="kpi-value">${money(pipeline)}</div></div>
    <div class="card"><div class="kpi-label">Open tasks</div><div class="kpi-value">${open.length}</div></div>
    <div class="card"><div class="kpi-label">Critical</div><div class="kpi-value">${critical.length}</div></div>
    <div class="card"><div class="kpi-label">Overdue</div><div class="kpi-value">${overdue.length}</div></div>
  </div>
  <div class="grid two-panel">
    <div class="card"><div class="section-title"><h2>Immediate priorities</h2><span>Critical and overdue</span></div>${taskTable([...critical,...overdue].filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i).slice(0,8))}</div>
    <div class="card"><div class="section-title"><h2>Loans to close</h2><span>${state.loans.length} files</span></div>${state.loans.map(l=>`<div style="padding:9px 0;border-bottom:1px solid var(--line)"><strong>${safe(l.borrower)}</strong><div>${money(l.amount)} · ${safe(l.stage||'No stage')}</div><small>${safe(l.next_step||'')}</small></div>`).join('')}</div>
  </div>
  <div class="grid business-grid">${BUSINESSES.filter(b=>b!=='Cross-Business / AI').map(b=>{const s=businessStats(b);return `<div class="card business-card"><h3>${safe(b)}</h3><div class="progress"><span style="width:${s.pct}%"></span></div><p>${s.complete} of ${s.count} complete</p></div>`}).join('')}</div>`;
}

function tasksView(){ return `<div class="card"><div class="toolbar"><input id="task-search" placeholder="Search tasks"/><select id="task-business-filter"><option value="">All businesses</option>${BUSINESSES.map(b=>`<option>${b}</option>`).join('')}</select><select id="task-owner-filter"><option value="">All owners</option>${owners().map(o=>`<option>${safe(o)}</option>`).join('')}</select></div><div id="task-results">${taskTable(state.tasks)}</div></div>`; }
function mortgageView(){ const total=state.loans.reduce((a,l)=>a+Number(l.amount),0); return `<div class="grid kpi-grid"><div class="card"><div class="kpi-label">Pipeline</div><div class="kpi-value">${money(total)}</div></div><div class="card"><div class="kpi-label">Loans</div><div class="kpi-value">${state.loans.length}</div></div></div><div class="card" style="margin-top:14px"><div class="section-title"><h2>Loan pipeline</h2><button id="add-loan-btn" class="secondary">+ Loan</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Borrower</th><th>Amount</th><th>Product</th><th>Owner</th><th>Stage</th><th>Next Step</th><th></th></tr></thead><tbody>${state.loans.map(l=>`<tr><td>${safe(l.borrower)}</td><td>${money(l.amount)}</td><td>${safe(l.product||'')}</td><td>${safe(l.owner||'')}</td><td>${safe(l.stage||'')}</td><td>${safe(l.next_step||'')}</td><td><button class="text-button" data-edit-loan="${l.id}">Edit</button></td></tr>`).join('')}</tbody></table></div></div>`; }
function businessView(name,description){ const rows=state.tasks.filter(t=>t.business===name); return `<div class="card"><div class="section-title"><div><h2>${safe(name)}</h2><p>${safe(description)}</p></div><span>${rows.length} tasks</span></div>${taskTable(rows)}</div>`; }
function meetingsView(){ return `<div class="grid meeting-layout"><div class="card"><h2>Process meeting notes</h2><label>Meeting title<input id="meeting-title" placeholder="Weekly operating meeting" /></label><label>Transcript or notes<textarea id="meeting-transcript" rows="14"></textarea></label><button id="process-meeting" class="primary">Save and create tasks</button></div><div class="card"><h2>Recent meetings</h2>${state.meetings.length?state.meetings.slice(0,8).map(m=>`<div style="padding:10px 0;border-bottom:1px solid var(--line)"><strong>${safe(m.title)}</strong><div class="fine-print">${fmtDate(m.meeting_date)}</div><p>${safe(m.summary||'')}</p></div>`).join(''):'<div class="empty">No meetings yet.</div>'}</div></div>`; }
function cooView(){ return `<div class="card"><div class="section-title"><h2>AI COO briefing</h2><span>Rules-based MVP</span></div><div class="command-row">${['Morning Brief','Weekly CEO Report','Overdue Tasks','Tasks by Person','Revenue Opportunities'].map(c=>`<button class="secondary coo-command" data-command="${c}">${c}</button>`).join('')}</div><pre id="coo-output" class="ai-brief">Choose a briefing.</pre></div>`; }
function teamView(){ return `<div class="card"><div class="section-title"><h2>Shared team</h2><span>${state.members.length} users</span></div><div class="member-grid">${state.members.map(m=>`<div class="member-card"><div><strong>${safe(m.full_name||m.email)}</strong><p>${safe(m.email||'')}</p></div><span class="badge blue">${safe(m.role)}</span></div>`).join('')}</div><p class="fine-print" style="margin-top:14px">New confirmed accounts automatically join this workspace. Disable public sign-ups after your team is enrolled.</p></div>`; }

const VIEWS={
  dashboard:['Executive Dashboard',dashboard], tasks:['Master Tasks',tasksView], mortgage:['Firefly Mortgage',mortgageView],
  medical:['Medical',()=>businessView('Medical','Combined facility, Hazel Green clinic, and practice operations.')],
  franchise:['NP Franchise',()=>businessView('NP Franchise','Launch, lead tracking, and franchise operations.')],
  construction:['Construction',()=>businessView('Construction','Homebuilding pipeline, budgets, and schedules.')],
  boba:['Boba Tea',()=>businessView('Boba Tea','Sales, operations, and marketing accountability.')],
  lakehouse:['Lake House',()=>businessView('Lake House','Rental management, maintenance, and pool repair decisions.')],
  meetings:['Meeting Intelligence',meetingsView], coo:['AI COO',cooView], team:['Team',teamView]
};

function render(view){ state.view=view; const [title,fn]=VIEWS[view]; $('page-title').textContent=title; $('view-container').innerHTML=fn(); document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===view)); bindViewEvents(); }

function bindViewEvents(){
  document.querySelectorAll('[data-task-status]').forEach(node=>node.addEventListener('change',async()=>{ const {error}=await db.from('tasks').update({status:node.value,updated_by:state.user.id}).eq('id',node.dataset.taskStatus); if(error)toast(error.message); }));
  document.querySelectorAll('[data-edit-task]').forEach(node=>node.addEventListener('click',()=>openTask(state.tasks.find(t=>t.id===node.dataset.editTask))));
  document.querySelectorAll('[data-edit-loan]').forEach(node=>node.addEventListener('click',()=>openLoan(state.loans.find(l=>l.id===node.dataset.editLoan))));
  $('add-loan-btn')?.addEventListener('click',()=>openLoan());
  const search=$('task-search'), business=$('task-business-filter'), owner=$('task-owner-filter');
  const filter=()=>{ const q=(search?.value||'').toLowerCase(), b=business?.value||'', o=owner?.value||''; const rows=state.tasks.filter(t=>(!q||`${t.title} ${t.why||''}`.toLowerCase().includes(q))&&(!b||t.business===b)&&(!o||t.owner===o)); $('task-results').innerHTML=taskTable(rows); bindViewEvents(); };
  search?.addEventListener('input',filter); business?.addEventListener('change',filter); owner?.addEventListener('change',filter);
  $('process-meeting')?.addEventListener('click',processMeeting);
  document.querySelectorAll('.coo-command').forEach(node=>node.addEventListener('click',()=>runCoo(node.dataset.command)));
}

function openTask(task){
  $('task-dialog-title').textContent=task?'Edit Task':'Add Task'; $('task-id').value=task?.id||''; $('task-title').value=task?.title||'';
  $('task-business').innerHTML=BUSINESSES.map(b=>`<option ${task?.business===b?'selected':''}>${b}</option>`).join('');
  $('task-owner').value=task?.owner||''; $('task-due').value=task?.due_date||''; $('task-priority').value=task?.priority||'High'; $('task-status').value=task?.status||'Not Started'; $('task-why').value=task?.why||''; $('task-notes').value=task?.notes||''; $('task-dialog').showModal();
}
function openLoan(loan){ $('loan-id').value=loan?.id||''; $('loan-borrower').value=loan?.borrower||''; $('loan-amount').value=loan?.amount||''; $('loan-product').value=loan?.product||''; $('loan-owner').value=loan?.owner||''; $('loan-stage').value=loan?.stage||''; $('loan-close').value=loan?.expected_close||''; $('loan-next').value=loan?.next_step||''; $('loan-dialog').showModal(); }

async function processMeeting(){
  const transcript=$('meeting-transcript').value.trim(); if(!transcript) return toast('Paste meeting notes first.');
  const title=$('meeting-title').value.trim()||`Meeting ${new Date().toLocaleDateString()}`;
  const lines=transcript.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  const names=owners().concat(['Billy','Jimmy','Nam','Laralee','Jamie','Lateef']);
  const actionLines=lines.filter(line=>/\b(need to|will|must|should|follow up|contact|finish|complete|schedule|close|obtain|review|launch|confirm|assign)\b/i.test(line)).slice(0,15);
  const actions=actionLines.map(line=>({title:line.replace(/^[-•\d.)\s]+/,'').slice(0,180),owner:names.find(n=>new RegExp(`\\b${n}\\b`,'i').test(line))||'Billy'}));
  const summary=actions.length?`Action items identified:\n${actions.map(a=>`• ${a.owner}: ${a.title}`).join('\n')}`:'Meeting saved. No explicit action statements were detected.';
  const {error}=await db.from('meetings').insert({workspace_id:WORKSPACE_ID,title,transcript,summary,created_by:state.user.id}); if(error)return toast(error.message);
  if(actions.length){ const {error:taskError}=await db.from('tasks').insert(actions.map(a=>({workspace_id:WORKSPACE_ID,title:a.title,business:'Cross-Business / AI',owner:a.owner,priority:'High',status:'Not Started',why:`Created from meeting: ${title}`,created_by:state.user.id,updated_by:state.user.id}))); if(taskError)return toast(taskError.message); }
  toast(`Meeting saved; ${actions.length} task(s) created.`);
}

function runCoo(command){
  const open=state.tasks.filter(t=>t.status!=='Complete'), overdue=open.filter(isOverdue), critical=open.filter(t=>t.priority==='Critical'), pipeline=state.loans.reduce((a,l)=>a+Number(l.amount),0); let out='';
  if(command==='Morning Brief') out=`GOOD MORNING, BILLY\n\nTOP PRIORITIES\n${[...critical,...overdue].filter((v,i,a)=>a.findIndex(x=>x.id===v.id)===i).slice(0,6).map((t,i)=>`${i+1}. ${t.title} — ${t.owner}`).join('\n')||'No critical items.'}\n\nMORTGAGE PIPELINE\n${money(pipeline)} across ${state.loans.length} loans\n\nBLOCKERS\n${open.filter(t=>t.status==='Blocked').map(t=>`• ${t.title}`).join('\n')||'No blocked tasks.'}`;
  else if(command==='Weekly CEO Report') out=`WEEKLY CEO REPORT\n\nOpen tasks: ${open.length}\nCompleted tasks: ${state.tasks.filter(t=>t.status==='Complete').length}\nCritical tasks: ${critical.length}\nOverdue tasks: ${overdue.length}\nMortgage pipeline: ${money(pipeline)}\n\nBUSINESS STATUS\n${BUSINESSES.map(b=>{const s=businessStats(b);return `${b}: ${s.complete}/${s.count} complete`;}).join('\n')}`;
  else if(command==='Overdue Tasks') out=overdue.length?overdue.map(t=>`• ${t.title} — ${t.owner} — due ${fmtDate(t.due_date)}`).join('\n'):'No overdue tasks.';
  else if(command==='Tasks by Person') out=owners().map(p=>{const rows=open.filter(t=>t.owner.includes(p));return rows.length?`${p}\n${rows.map(t=>`  • ${t.title}`).join('\n')}`:'';}).filter(Boolean).join('\n\n');
  else out=`REVENUE OPPORTUNITIES\n\n1. Close the ${money(pipeline)} mortgage pipeline.\n2. Launch and convert NP Franchise leads.\n3. Start the first construction homes.\n4. Improve Boba Tea sales and average ticket.\n5. Structure the combined medical facility to reduce occupancy expense and create rent income.`;
  $('coo-output').textContent=out;
}

$('signin-tab').addEventListener('click',()=>switchAuth('signin'));
$('signup-tab').addEventListener('click',()=>switchAuth('signup'));
$('health-check').addEventListener('click',()=>databaseHealth(true));
$('signin-form').addEventListener('submit',async e=>{ e.preventDefault(); showAuthStatus('Signing in...'); const {error}=await db.auth.signInWithPassword({email:$('signin-email').value.trim(),password:$('signin-password').value}); if(error)showAuthStatus(error.message,true); else showAuthStatus('Signed in.'); });
$('signup-form').addEventListener('submit',async e=>{ e.preventDefault(); showAuthStatus('Creating account...'); const {data,error}=await db.auth.signUp({email:$('signup-email').value.trim(),password:$('signup-password').value,options:{data:{full_name:$('signup-name').value.trim()},emailRedirectTo:window.location.origin}}); if(error)return showAuthStatus(error.message,true); if(data.session)showAuthStatus('Account created and signed in.'); else showAuthStatus('Account created. Check your email to confirm it, then return here and sign in.'); });
$('signout-btn').addEventListener('click',()=>db.auth.signOut());
document.querySelectorAll('.nav-item').forEach(node=>node.addEventListener('click',()=>render(node.dataset.view)));
$('add-task-btn').addEventListener('click',()=>openTask());
$('export-btn').addEventListener('click',()=>{ const blob=new Blob([JSON.stringify({exported_at:new Date().toISOString(),tasks:state.tasks,loans:state.loans,meetings:state.meetings},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='taylor-operating-system-export.json'; a.click(); URL.revokeObjectURL(a.href); });
document.querySelectorAll('.close-task').forEach(node=>node.addEventListener('click',()=>$('task-dialog').close()));
document.querySelectorAll('.close-loan').forEach(node=>node.addEventListener('click',()=>$('loan-dialog').close()));
$('task-form').addEventListener('submit',async e=>{ e.preventDefault(); const id=$('task-id').value; const payload={workspace_id:WORKSPACE_ID,title:$('task-title').value.trim(),business:$('task-business').value,owner:$('task-owner').value.trim(),due_date:$('task-due').value||null,priority:$('task-priority').value,status:$('task-status').value,why:$('task-why').value.trim(),notes:$('task-notes').value.trim(),updated_by:state.user.id}; const result=id?await db.from('tasks').update(payload).eq('id',id):await db.from('tasks').insert({...payload,created_by:state.user.id}); if(result.error)toast(result.error.message); else {$('task-dialog').close();toast('Task saved.');} });
$('loan-form').addEventListener('submit',async e=>{ e.preventDefault(); const id=$('loan-id').value; const payload={workspace_id:WORKSPACE_ID,borrower:$('loan-borrower').value.trim(),amount:Number($('loan-amount').value),product:$('loan-product').value.trim(),owner:$('loan-owner').value.trim(),stage:$('loan-stage').value.trim(),expected_close:$('loan-close').value||null,next_step:$('loan-next').value.trim(),updated_by:state.user.id}; const result=id?await db.from('loans').update(payload).eq('id',id):await db.from('loans').insert({...payload,created_by:state.user.id}); if(result.error)toast(result.error.message); else {$('loan-dialog').close();toast('Loan saved.');} });

bootstrap();
