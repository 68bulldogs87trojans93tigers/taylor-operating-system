import { getServerClients } from '../../../../lib/server-access';

export const runtime = 'nodejs';

export async function POST(request) {
  const clients = getServerClients(request);
  if (!clients) return Response.json({ error: 'Invitation setup is not configured.' }, { status: 503 });
  const { data, error } = await clients.userClient.auth.getUser(clients.token);
  if (error || !data.user) return Response.json({ error: 'The invitation link has expired. Request a new invitation.' }, { status: 401 });
  let body = {};
  try { body = await request.json(); } catch (_) {}
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim().slice(0, 120) : '';
  if (fullName) await clients.adminClient.from('profiles').update({ full_name: fullName }).eq('id', data.user.id);
  await clients.adminClient.from('workspace_invitations').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('invited_user_id', data.user.id).eq('status', 'pending');
  return Response.json({ message: 'Welcome to Firefly OS.' });
}
