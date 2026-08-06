import { BUSINESSES } from '../../../../lib/businesses';
import { requireDeveloper } from '../../../../lib/server-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedRoles = new Set(['viewer', 'member', 'admin']);

function fail(error, status = 400) {
  return Response.json({ error }, { status });
}

function normalizeAccess(body) {
  const allBusinesses = body.allBusinesses !== false;
  const businesses = allBusinesses ? [] : [...new Set((body.businesses || []).filter(item => BUSINESSES.includes(item)))];
  if (!allBusinesses && !businesses.length) throw new Error('Choose at least one business.');
  return { allBusinesses, businesses };
}

async function replaceBusinessAccess(admin, workspaceId, userId, role, body) {
  const { allBusinesses, businesses } = normalizeAccess(body);
  const { error: deleteError } = await admin.from('workspace_member_business_access').delete().eq('workspace_id', workspaceId).eq('user_id', userId);
  if (deleteError) throw deleteError;
  if (role !== 'admin' && !allBusinesses) {
    const { error: insertError } = await admin.from('workspace_member_business_access').insert(businesses.map(business => ({ workspace_id: workspaceId, user_id: userId, business })));
    if (insertError) throw insertError;
  }
}

export async function GET(request) {
  const access = await requireDeveloper(request);
  if (access.error) return fail(access.error, access.status);
  const { adminClient: admin, membership } = access;
  const workspaceId = membership.workspace_id;

  const memberResult = await admin.from('workspace_members').select('user_id,role,created_at').eq('workspace_id', workspaceId).order('created_at');
  if (memberResult.error) return fail(memberResult.error.message, 500);
  const userIds = (memberResult.data || []).map(member => member.user_id);
  const [profileResult, businessResult, inviteResult] = await Promise.all([
    userIds.length ? admin.from('profiles').select('id,email,full_name').in('id', userIds) : Promise.resolve({ data: [], error: null }),
    admin.from('workspace_member_business_access').select('user_id,business').eq('workspace_id', workspaceId),
    admin.from('workspace_invitations').select('email,status,invited_user_id,created_at').eq('workspace_id', workspaceId)
  ]);
  const resultError = [profileResult, businessResult, inviteResult].find(result => result.error)?.error;
  if (resultError) return fail(resultError.message, 500);

  const profiles = new Map((profileResult.data || []).map(profile => [profile.id, profile]));
  const invites = new Map((inviteResult.data || []).map(invite => [invite.invited_user_id, invite]));
  const members = (memberResult.data || []).map(member => {
    const profile = profiles.get(member.user_id) || {};
    const invite = invites.get(member.user_id);
    const businesses = (businessResult.data || []).filter(row => row.user_id === member.user_id).map(row => row.business);
    return {
      userId: member.user_id,
      email: profile.email || invite?.email || 'Pending profile',
      fullName: profile.full_name || '',
      role: member.role,
      businesses,
      allBusinesses: member.role === 'admin' || businesses.length === 0,
      status: invite?.status === 'pending' ? 'Invited' : 'Active'
    };
  });
  return Response.json({ members, currentUserId: access.user.id });
}

export async function POST(request) {
  const access = await requireDeveloper(request);
  if (access.error) return fail(access.error, access.status);
  let body;
  try { body = await request.json(); } catch (_) { return fail('Invalid invitation.'); }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim().slice(0, 120) : '';
  const role = allowedRoles.has(body.role) ? body.role : '';
  if (!email || !email.includes('@') || !role) return fail('Enter a valid email and permission level.');
  try { normalizeAccess(body); } catch (error) { return fail(error.message); }

  const { adminClient: admin, membership } = access;
  const workspaceId = membership.workspace_id;
  const origin = new URL(request.url).origin;
  let user;
  let invitationSent = true;
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${origin}/welcome`
  });

  if (inviteError) {
    const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) return fail(usersError.message, 500);
    user = usersData.users.find(item => item.email?.toLowerCase() === email);
    if (!user) return fail(inviteError.message, 400);
    invitationSent = false;
  } else {
    user = invited.user;
  }
  if (!user?.id) return fail('Supabase did not return the invited user.', 500);

  const { error: profileError } = await admin.from('profiles').upsert({ id: user.id, email, full_name: fullName || null }, { onConflict: 'id' });
  if (profileError) return fail(profileError.message, 500);
  const { error: memberError } = await admin.from('workspace_members').upsert({ workspace_id: workspaceId, user_id: user.id, role }, { onConflict: 'workspace_id,user_id' });
  if (memberError) return fail(memberError.message, 500);
  try { await replaceBusinessAccess(admin, workspaceId, user.id, role, body); } catch (error) { return fail(error.message, 500); }

  const { error: invitationError } = await admin.from('workspace_invitations').upsert({
    workspace_id: workspaceId,
    email,
    full_name: fullName || null,
    role,
    invited_by: access.user.id,
    invited_user_id: user.id,
    status: invitationSent ? 'pending' : 'accepted',
    accepted_at: invitationSent ? null : new Date().toISOString()
  }, { onConflict: 'workspace_id,email' });
  if (invitationError) return fail(invitationError.message, 500);

  return Response.json({ message: invitationSent ? `Invitation sent to ${email}.` : `${email} already had a Firefly account, so access was granted immediately.` });
}

export async function PATCH(request) {
  const access = await requireDeveloper(request);
  if (access.error) return fail(access.error, access.status);
  let body;
  try { body = await request.json(); } catch (_) { return fail('Invalid access update.'); }
  const userId = typeof body.userId === 'string' ? body.userId : '';
  const role = allowedRoles.has(body.role) ? body.role : '';
  if (!userId || !role) return fail('Choose a valid member and permission level.');
  if (userId === access.user.id && role !== 'admin') return fail('You cannot remove your own Developer permission.');
  try { normalizeAccess(body); } catch (error) { return fail(error.message); }

  const { adminClient: admin, membership } = access;
  const workspaceId = membership.workspace_id;
  const { data: updated, error: updateError } = await admin.from('workspace_members').update({ role }).eq('workspace_id', workspaceId).eq('user_id', userId).select('user_id').maybeSingle();
  if (updateError) return fail(updateError.message, 500);
  if (!updated) return fail('Member not found.', 404);
  try { await replaceBusinessAccess(admin, workspaceId, userId, role, body); } catch (error) { return fail(error.message, 500); }
  return Response.json({ message: 'Permissions updated.' });
}

export async function DELETE(request) {
  const access = await requireDeveloper(request);
  if (access.error) return fail(access.error, access.status);
  let body;
  try { body = await request.json(); } catch (_) { return fail('Invalid removal request.'); }
  const userId = typeof body.userId === 'string' ? body.userId : '';
  if (!userId) return fail('Member not found.');
  if (userId === access.user.id) return fail('You cannot revoke your own access.');

  const { adminClient: admin, membership } = access;
  const workspaceId = membership.workspace_id;
  const { error } = await admin.from('workspace_members').delete().eq('workspace_id', workspaceId).eq('user_id', userId);
  if (error) return fail(error.message, 500);
  await admin.from('workspace_member_business_access').delete().eq('workspace_id', workspaceId).eq('user_id', userId);
  await admin.from('workspace_invitations').update({ status: 'revoked' }).eq('workspace_id', workspaceId).eq('invited_user_id', userId);
  return Response.json({ message: 'Member access revoked.' });
}
