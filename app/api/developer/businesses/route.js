import { requireDeveloper } from '../../../../lib/server-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function fail(error, status = 400) {
  return Response.json({ error }, { status });
}

function cleanName(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 100) : '';
}

function cleanDescription(value) {
  return typeof value === 'string' ? value.trim().slice(0, 500) : '';
}

export async function GET(request) {
  const access = await requireDeveloper(request);
  if (access.error) return fail(access.error, access.status);
  const { data, error } = await access.adminClient
    .from('businesses')
    .select('id,name,description,is_active,is_system,sort_order,created_at')
    .eq('workspace_id', access.membership.workspace_id)
    .order('sort_order')
    .order('name');
  if (error) return fail(error.message, 500);
  return Response.json({ businesses: data || [] });
}

export async function POST(request) {
  const access = await requireDeveloper(request);
  if (access.error) return fail(access.error, access.status);
  let body;
  try { body = await request.json(); } catch (_) { return fail('Invalid company details.'); }
  const name = cleanName(body.name);
  const description = cleanDescription(body.description);
  if (!name) return fail('Enter a company name.');

  const workspaceId = access.membership.workspace_id;
  const { data: last } = await access.adminClient.from('businesses').select('sort_order').eq('workspace_id', workspaceId).order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await access.adminClient.from('businesses').insert({
    workspace_id: workspaceId,
    name,
    description: description || 'Business workspace and shared accountability.',
    is_active: true,
    is_system: false,
    sort_order: Number(last?.sort_order || 0) + 1,
    created_by: access.user.id
  }).select('id,name,description,is_active,is_system,sort_order').single();
  if (error?.code === '23505') return fail('A company with that name already exists.');
  if (error) return fail(error.message, 500);
  return Response.json({ business: data, message: `${name} was added.` });
}

export async function PATCH(request) {
  const access = await requireDeveloper(request);
  if (access.error) return fail(access.error, access.status);
  let body;
  try { body = await request.json(); } catch (_) { return fail('Invalid company update.'); }
  const id = typeof body.id === 'string' ? body.id : '';
  const name = cleanName(body.name);
  const description = cleanDescription(body.description);
  if (!id || !name) return fail('Choose a company and enter its name.');

  const workspaceId = access.membership.workspace_id;
  const { data: current, error: currentError } = await access.adminClient.from('businesses').select('id,name,is_system').eq('id', id).eq('workspace_id', workspaceId).maybeSingle();
  if (currentError) return fail(currentError.message, 500);
  if (!current) return fail('Company not found.', 404);
  if (current.is_system && current.name !== name) return fail('System company names cannot be changed.');

  if (current.name !== name) {
    const { error: renameError } = await access.userClient.rpc('firefly_rename_business', { target_business_id: id, new_business_name: name });
    if (renameError?.code === '23505') return fail('A company with that name already exists.');
    if (renameError) return fail(renameError.message, 500);
  }

  const update = {
    description: description || 'Business workspace and shared accountability.',
    is_active: current.is_system ? true : body.isActive !== false,
    updated_at: new Date().toISOString()
  };
  const { data, error } = await access.adminClient.from('businesses').update(update).eq('id', id).eq('workspace_id', workspaceId).select('id,name,description,is_active,is_system,sort_order').single();
  if (error) return fail(error.message, 500);
  return Response.json({ business: data, message: `${data.name} was updated.` });
}
