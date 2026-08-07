import { getServerClients } from '../../../../../lib/server-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function fail(error, status = 400) {
  return Response.json({ error }, { status });
}

async function getAccess(request, taskId) {
  const clients = getServerClients(request);
  if (!clients) return { error: 'Task activity is not configured.', status: 503 };
  const { data: authData, error: authError } = await clients.userClient.auth.getUser(clients.token);
  if (authError || !authData.user) return { error: 'Please sign in again.', status: 401 };
  const { data: task, error: taskError } = await clients.userClient
    .from('tasks')
    .select('id,workspace_id,title,business')
    .eq('id', taskId)
    .maybeSingle();
  if (taskError) return { error: taskError.message, status: 500 };
  if (!task) return { error: 'Task not found or access is restricted.', status: 404 };
  return { ...clients, user: authData.user, task };
}

export async function GET(request, { params }) {
  const access = await getAccess(request, params.id);
  if (access.error) return fail(access.error, access.status);
  const { data, error } = await access.userClient
    .from('task_activity')
    .select('id,activity_type,message,field_name,old_value,new_value,created_by,created_at')
    .eq('task_id', access.task.id)
    .order('created_at', { ascending: false });
  if (error) return fail(error.message, 500);

  const authorIds = [...new Set((data || []).map(item => item.created_by).filter(Boolean))];
  const { data: profiles } = authorIds.length
    ? await access.adminClient.from('profiles').select('id,full_name,email').in('id', authorIds)
    : { data: [] };
  const authors = new Map((profiles || []).map(profile => [profile.id, profile.full_name || profile.email || 'Team member']));
  const activity = (data || []).map(item => ({
    ...item,
    authorName: item.created_by ? authors.get(item.created_by) || 'Team member' : 'Firefly OS'
  }));
  return Response.json({ activity });
}

export async function POST(request, { params }) {
  const access = await getAccess(request, params.id);
  if (access.error) return fail(access.error, access.status);
  let body = {};
  try { body = await request.json(); } catch (_) { return fail('Enter a valid note.'); }
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : '';
  if (!message) return fail('Enter a note before posting.');

  const { error } = await access.userClient.from('task_activity').insert({
    workspace_id: access.task.workspace_id,
    task_id: access.task.id,
    activity_type: 'note',
    message,
    created_by: access.user.id
  });
  if (error) return fail(error.message, error.code === '42501' ? 403 : 500);
  return Response.json({ message: 'Note added.' });
}
