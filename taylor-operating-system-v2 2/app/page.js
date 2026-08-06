'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const BUSINESS_OPTIONS = ['Lake House', 'Firefly Mortgage', 'Medical', 'NP Franchise', 'Boba Tea', 'Construction', 'Cross-Business / AI']
const STATUS_OPTIONS = ['Open', 'In Progress', 'Blocked', 'Complete', 'On Hold']
const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low']

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0))
}

export default function Home() {
  const [session, setSession] = useState(null)
  const [authMode, setAuthMode] = useState('signin')
  const [authMessage, setAuthMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [loans, setLoans] = useState([])
  const [people, setPeople] = useState([])
  const [activeView, setActiveView] = useState('dashboard')
  const [filterBusiness, setFilterBusiness] = useState('All')
  const [filterOwner, setFilterOwner] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    loadData()
    const channel = supabase
      .channel('tos-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'people' }, loadData)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [session])

  async function loadData() {
    const [taskResult, loanResult, peopleResult] = await Promise.all([
      supabase.from('tasks').select('*').order('due_date', { ascending: true, nullsFirst: false }),
      supabase.from('loans').select('*').order('amount', { ascending: false }),
      supabase.from('people').select('*').order('name')
    ])
    if (!taskResult.error) setTasks(taskResult.data || [])
    if (!loanResult.error) setLoans(loanResult.data || [])
    if (!peopleResult.error) setPeople(peopleResult.data || [])
  }

  async function handleAuth(event) {
    event.preventDefault()
    setAuthMessage('')
    const form = new FormData(event.currentTarget)
    const email = form.get('email')
    const password = form.get('password')
    const fullName = form.get('fullName')

    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName || email } }
      })
      setAuthMessage(error ? error.message : 'Account created. Check your email if confirmation is enabled.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setAuthMessage(error ? error.message : '')
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function createTask(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = {
      business: form.get('business'),
      title: form.get('title'),
      why: form.get('why'),
      owner: form.get('owner'),
      due_date: form.get('due_date') || null,
      priority: form.get('priority'),
      status: 'Open',
      created_by: session.user.id
    }
    const { error } = await supabase.from('tasks').insert(payload)
    if (!error) event.currentTarget.reset()
    else alert(error.message)
  }

  async function updateTask(id, changes) {
    const { error } = await supabase.from('tasks').update(changes).eq('id', id)
    if (error) alert(error.message)
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const businessMatch = filterBusiness === 'All' || task.business === filterBusiness
      const ownerMatch = filterOwner === 'All' || task.owner === filterOwner
      const q = search.toLowerCase().trim()
      const textMatch = !q || `${task.title} ${task.why} ${task.owner} ${task.business}`.toLowerCase().includes(q)
      return businessMatch && ownerMatch && textMatch
    })
  }, [tasks, filterBusiness, filterOwner, search])

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return {
      open: tasks.filter(t => t.status !== 'Complete').length,
      overdue: tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'Complete').length,
      blocked: tasks.filter(t => t.status === 'Blocked').length,
      pipeline: loans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0)
    }
  }, [tasks, loans])

  if (loading) return <main className="center-screen">Loading...</main>
  if (!session) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="brand-mark">TOS</div>
          <h1>Taylor Operating System</h1>
          <p className="muted">Shared operating dashboard for all Taylor businesses.</p>
          <div className="auth-tabs">
            <button className={authMode === 'signin' ? 'active' : ''} onClick={() => setAuthMode('signin')}>Sign In</button>
            <button className={authMode === 'signup' ? 'active' : ''} onClick={() => setAuthMode('signup')}>Create Account</button>
          </div>
          <form onSubmit={handleAuth} className="stack">
            {authMode === 'signup' && <input name="fullName" placeholder="Full name" required />}
            <input name="email" type="email" placeholder="Email" required />
            <input name="password" type="password" placeholder="Password" minLength="8" required />
            <button className="primary" type="submit">{authMode === 'signup' ? 'Create Account' : 'Sign In'}</button>
          </form>
          {authMessage && <p className="notice">{authMessage}</p>}
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-row"><div className="brand-mark small">TOS</div><strong>Taylor OS</strong></div>
          <nav>
            {['dashboard', 'tasks', 'mortgage', 'people'].map(view => (
              <button key={view} className={activeView === view ? 'active' : ''} onClick={() => setActiveView(view)}>
                {view[0].toUpperCase() + view.slice(1)}
              </button>
            ))}
          </nav>
        </div>
        <button className="ghost" onClick={signOut}>Sign Out</button>
      </aside>

      <section className="content">
        <header className="topbar">
          <div><h1>{activeView === 'dashboard' ? 'Executive Dashboard' : activeView[0].toUpperCase() + activeView.slice(1)}</h1><p className="muted">Live shared workspace</p></div>
          <span className="user-pill">{session.user.email}</span>
        </header>

        {activeView === 'dashboard' && (
          <>
            <section className="stat-grid">
              <Stat label="Open tasks" value={stats.open} />
              <Stat label="Overdue" value={stats.overdue} />
              <Stat label="Blocked" value={stats.blocked} />
              <Stat label="Mortgage pipeline" value={formatMoney(stats.pipeline)} />
            </section>
            <section className="two-col">
              <div className="panel">
                <h2>Critical priorities</h2>
                <TaskTable tasks={tasks.filter(t => ['Critical', 'High'].includes(t.priority) && t.status !== 'Complete').slice(0, 8)} updateTask={updateTask} compact />
              </div>
              <div className="panel">
                <h2>Mortgage pipeline</h2>
                <LoanTable loans={loans} />
              </div>
            </section>
            <section className="panel">
              <h2>Add task</h2>
              <TaskForm people={people} createTask={createTask} />
            </section>
          </>
        )}

        {activeView === 'tasks' && (
          <section className="panel">
            <div className="toolbar">
              <input placeholder="Search tasks" value={search} onChange={e => setSearch(e.target.value)} />
              <select value={filterBusiness} onChange={e => setFilterBusiness(e.target.value)}><option>All</option>{BUSINESS_OPTIONS.map(v => <option key={v}>{v}</option>)}</select>
              <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)}><option>All</option>{people.map(p => <option key={p.id}>{p.name}</option>)}</select>
            </div>
            <TaskTable tasks={filteredTasks} updateTask={updateTask} />
          </section>
        )}

        {activeView === 'mortgage' && (
          <section className="panel">
            <div className="section-title"><div><h2>Firefly Mortgage</h2><p className="muted">Immediate pipeline: {formatMoney(stats.pipeline)}</p></div></div>
            <LoanTable loans={loans} />
          </section>
        )}

        {activeView === 'people' && (
          <section className="panel">
            <h2>Tasks by individual</h2>
            <div className="people-grid">
              {people.map(person => (
                <article className="person-card" key={person.id}>
                  <h3>{person.name}</h3><p className="muted">{person.role || 'Team member'}</p>
                  <strong>{tasks.filter(t => t.owner === person.name && t.status !== 'Complete').length} open tasks</strong>
                  <ul>{tasks.filter(t => t.owner === person.name && t.status !== 'Complete').slice(0, 5).map(t => <li key={t.id}>{t.title}</li>)}</ul>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  )
}

function Stat({ label, value }) {
  return <article className="stat"><span>{label}</span><strong>{value}</strong></article>
}

function TaskForm({ people, createTask }) {
  return (
    <form className="task-form" onSubmit={createTask}>
      <input name="title" placeholder="What needs to be done?" required />
      <input name="why" placeholder="Why does it matter?" />
      <select name="business" required>{BUSINESS_OPTIONS.map(v => <option key={v}>{v}</option>)}</select>
      <select name="owner" required><option value="">Select owner</option>{people.map(p => <option key={p.id}>{p.name}</option>)}</select>
      <input name="due_date" type="date" />
      <select name="priority">{PRIORITY_OPTIONS.map(v => <option key={v}>{v}</option>)}</select>
      <button className="primary" type="submit">Add Task</button>
    </form>
  )
}

function TaskTable({ tasks, updateTask, compact = false }) {
  if (!tasks.length) return <p className="muted">No tasks found.</p>
  return (
    <div className="table-wrap"><table><thead><tr><th>Task</th>{!compact && <th>Business</th>}<th>Owner</th><th>Due</th><th>Priority</th><th>Status</th></tr></thead>
      <tbody>{tasks.map(task => <tr key={task.id}><td><strong>{task.title}</strong>{task.why && <small>{task.why}</small>}</td>{!compact && <td>{task.business}</td>}<td>{task.owner}</td><td>{task.due_date || '—'}</td><td><span className={`badge ${task.priority?.toLowerCase()}`}>{task.priority}</span></td><td><select value={task.status} onChange={e => updateTask(task.id, { status: e.target.value })}>{STATUS_OPTIONS.map(v => <option key={v}>{v}</option>)}</select></td></tr>)}</tbody>
    </table></div>
  )
}

function LoanTable({ loans }) {
  return (
    <div className="table-wrap"><table><thead><tr><th>Loan</th><th>Amount</th><th>Product</th><th>Owner</th><th>Next step</th><th>Status</th></tr></thead>
      <tbody>{loans.map(loan => <tr key={loan.id}><td><strong>{loan.name}</strong></td><td>{formatMoney(loan.amount)}</td><td>{loan.product}</td><td>{loan.owner}</td><td>{loan.next_step}</td><td><span className="badge high">{loan.status}</span></td></tr>)}</tbody>
    </table></div>
  )
}
