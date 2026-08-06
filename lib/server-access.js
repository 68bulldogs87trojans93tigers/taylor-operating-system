import { createClient } from '@supabase/supabase-js';

export function getServerClients(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!url || !publishableKey || !serviceRoleKey || !token) return null;

  return {
    token,
    userClient: createClient(url, publishableKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    }),
    adminClient: createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    })
  };
}

export async function requireDeveloper(request) {
  const clients = getServerClients(request);
  if (!clients) return { error: 'Developer access is not configured.', status: 503 };
  const { data, error } = await clients.userClient.auth.getUser(clients.token);
  if (error || !data.user) return { error: 'Please sign in again.', status: 401 };

  const { data: membership, error: memberError } = await clients.adminClient
    .from('workspace_members')
    .select('workspace_id,role')
    .eq('user_id', data.user.id)
    .limit(1)
    .maybeSingle();
  if (memberError || membership?.role !== 'admin') return { error: 'Developer permission is required.', status: 403 };
  return { ...clients, user: data.user, membership };
}
