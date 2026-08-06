'use client';

import { useEffect, useRef, useState } from 'react';
import AppShell from '../../components/AppShell';
import { getSupabase } from '../../lib/supabase';

const welcome = {
  role: 'assistant',
  content: 'I’m your AI COO. Ask me about today’s priorities, overdue work, blocked tasks, team workload, meetings, or the mortgage pipeline.'
};

const quickPrompts = [
  'Give me my morning executive brief.',
  'What is overdue and who owns it?',
  'Where are the biggest risks right now?',
  'Summarize the mortgage pipeline.',
  'What should I focus on today?'
];

export default function AiCoo() {
  const [messages, setMessages] = useState([welcome]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [storageKey, setStorageKey] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data }) => {
      const key = `firefly-ai-coo-chat-${data.session?.user?.id || 'local'}`;
      setStorageKey(key);
      try {
        const saved = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(saved) && saved.length) setMessages([welcome, ...saved.slice(-30)]);
      } catch (_) {}
    });
  }, []);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(messages.filter(message => message !== welcome).slice(-30)));
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, storageKey]);

  async function sendMessage(text) {
    const clean = text.trim();
    if (!clean || busy) return;
    setDraft('');
    setError('');
    const nextMessages = [...messages, { role: 'user', content: clean }];
    setMessages(nextMessages);
    setBusy(true);

    try {
      const { data } = await getSupabase().auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Your session expired. Please sign in again.');

      const response = await fetch('/api/ai-coo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message: clean,
          history: nextMessages
            .filter(message => message.role === 'user' || message.role === 'assistant')
            .slice(-10)
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The AI COO could not respond.');
      setMessages(current => [...current, { role: 'assistant', content: result.reply }]);
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setBusy(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    sendMessage(draft);
  }

  function clearChat() {
    setMessages([welcome]);
    setError('');
    if (storageKey) localStorage.removeItem(storageKey);
  }

  return <AppShell title="AI COO" subtitle="A workspace-aware executive assistant for Firefly OS">
    <div className="cooLayout">
      <section className="panel chatPanel">
        <div className="chatTop"><div><strong>Firefly AI COO</strong><small>Uses the latest workspace data each time you ask</small></div><span className="readOnlyPill">Read-only</span></div>
        <div className="chatMessages" aria-live="polite">
          {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`chatMessage ${message.role}`}>{message.content}</div>)}
          {busy && <div className="chatMessage assistant typing">Reviewing the workspace…</div>}
          <div ref={endRef}/>
        </div>
        {error && <div className="alert error chatError">{error}</div>}
        <form className="chatComposer" onSubmit={submit}>
          <textarea value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(draft); } }} placeholder="Ask about priorities, risks, owners, deadlines, meetings, or loans…" aria-label="Message AI COO"/>
          <div className="composerActions"><small>Enter to send · Shift+Enter for a new line</small><button disabled={busy || !draft.trim()}>{busy ? 'Thinking…' : 'Ask AI COO'}</button></div>
        </form>
      </section>
      <aside className="panel cooSide">
        <h2>Quick questions</h2>
        <div className="quickPrompts">{quickPrompts.map(prompt => <button type="button" key={prompt} disabled={busy} onClick={() => sendMessage(prompt)}>{prompt}</button>)}</div>
        <button type="button" className="secondary" onClick={clearChat}>Clear this chat</button>
        <p className="privacyNote">The AI receives task details, meeting summaries, loan pipeline fields, and team names. Meeting transcripts, team email addresses, and borrower names are excluded. Do not enter PHI or regulated borrower data in chat until your compliance configuration is approved.</p>
      </aside>
    </div>
  </AppShell>;
}
