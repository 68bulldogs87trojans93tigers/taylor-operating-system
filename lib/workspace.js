export const FALLBACK_WORKSPACE_ID = process.env.NEXT_PUBLIC_WORKSPACE_ID || '11111111-1111-1111-1111-111111111111';

export async function getWorkspaceContext(supabase) {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id || null;
  if (!userId) return { workspaceId: FALLBACK_WORKSPACE_ID, userId: null };

  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id,role')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  const workspaceId = data?.workspace_id || FALLBACK_WORKSPACE_ID;
  const { data: businessRows, error: businessError } = await supabase
    .from('workspace_member_business_access')
    .select('business')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);
  const role = data?.role || null;

  return {
    workspaceId,
    userId,
    role,
    canEdit: role === 'admin' || role === 'member',
    isDeveloper: role === 'admin',
    businesses: businessError || !businessRows?.length ? null : businessRows.map(row => row.business)
  };
}
