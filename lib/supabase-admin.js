import { createClient } from '@supabase/supabase-js';

let adminClient;

export function getSupabaseAdmin() {
  if (adminClient) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Missing server-side Supabase environment variables.');
  }
  adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return adminClient;
}

export async function requireAdmin(request) {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return { error: 'Authentication required.', status: 401 };

  const supabase = getSupabaseAdmin();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return { error: 'Invalid session.', status: 401 };

  const { data: member, error: memberError } = await supabase
    .from('people')
    .select('id,name,email,app_role,active')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  if (memberError || !member || !member.active || member.app_role !== 'admin') {
    return { error: 'Administrator access required.', status: 403 };
  }
  return { supabase, user: authData.user, member };
}
