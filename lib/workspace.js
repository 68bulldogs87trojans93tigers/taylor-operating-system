export const FALLBACK_WORKSPACE_ID = process.env.NEXT_PUBLIC_WORKSPACE_ID || '11111111-1111-1111-1111-111111111111';

export async function getWorkspaceContext(supabase) {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id || null;
  if (!userId) return { workspaceId: FALLBACK_WORKSPACE_ID, userId: null };

  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  return { workspaceId: data?.workspace_id || FALLBACK_WORKSPACE_ID, userId };
}
