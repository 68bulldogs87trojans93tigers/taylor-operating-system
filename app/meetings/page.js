'use client';

import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import DataError from '../../components/DataError';
import { getSupabase } from '../../lib/supabase';
import { getWorkspaceContext } from '../../lib/workspace';

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [title, setTitle] = useState('');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = getSupabase();
    const { workspaceId } = await getWorkspaceContext(supabase);
    const { data, error: loadError } = await supabase.from('meetings').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false });
    if (loadError) setError(loadError.message); else setMeetings(data || []);
  }

  function parseTasks(text) {
    return text.split('\n').map(line => line.trim()).filter(line => /^[-*]\s*/.test(line)).map(line => line.replace(/^[-*]\s*/, ''));
  }

  async function save(event) {
    event.preventDefault();
    const extracted = parseTasks(transcript);
    const supabase = getSupabase();
    const context = await getWorkspaceContext(supabase);
    const { error: meetingError } = await supabase.from('meetings').insert({
      workspace_id: context.workspaceId,
      title,
      transcript,
      summary: `${extracted.length} task candidates identified.`,
      created_by: context.userId
    });
    if (meetingError) { setError(meetingError.message); return; }
    if (extracted.length) {
      const { error: taskError } = await supabase.from('tasks').insert(extracted.map(line => {
        const parts = line.split('|').map(value => value.trim());
        return {
          workspace_id: context.workspaceId,
          title: parts[0],
          owner: parts[1] || 'Billy',
          business: parts[2] || 'Cross-Business / AI',
          status: 'Not Started',
          priority: 'High',
          created_by: context.userId,
          updated_by: context.userId
        };
      }));
      if (taskError) { setError(taskError.message); return; }
    }
    setTitle(''); setTranscript(''); load();
  }

  return <AppShell title="Meeting Intelligence" subtitle="Capture minutes and convert action lines into shared tasks"><DataError message={error}/><section className="twoCol"><form className="panel" onSubmit={save}><h2>New meeting</h2><label>Meeting title<input required value={title} onChange={event => setTitle(event.target.value)}/></label><label>Notes / transcript<textarea className="largeText" required value={transcript} onChange={event => setTranscript(event.target.value)} placeholder={'Paste notes here.\n\nUse action lines like:\n- Close Baylee loan | Jimmy | Firefly Mortgage\n- Schedule Albertville visit | Billy / Jamie | Medical'}/></label><button>Save meeting and create tasks</button><p className="hint">Lines beginning with “-” or “*” become tasks. Format: Task | Owner | Business.</p></form><div className="panel"><h2>Recent meetings</h2><div className="meetingList">{meetings.map(meeting => <article key={meeting.id}><strong>{meeting.title}</strong><small>{new Date(meeting.created_at).toLocaleString()}</small><p>{meeting.summary}</p></article>)}</div></div></section></AppShell>;
}
