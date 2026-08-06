import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/supabase-admin';

export const runtime = 'nodejs';

const ROLES = new Set(['admin', 'manager', 'member']);
const BUSINESSES = new Set([
  'Mortgage', 'Medical', 'NP Franchise', 'Construction',
  'Lake House', 'Boba Tea', 'Cross-Business / AI'
]);

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const role = ROLES.has(body.role) ? body.role : 'member';
    const businessAccess = Array.isArray(body.businessAccess)
      ? [...new Set(body.businessAccess.filter(value => BUSINESSES.has(value)))]
      : [];

    if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'A name and valid email address are required.' }, { status: 400 });
    }

    let personId = body.personId || null;
    if (personId) {
      const { error } = await auth.supabase.from('people').update({
        name, email, app_role: role, business_access: businessAccess,
        status: 'invited', invited_at: new Date().toISOString(), active: true
      }).eq('id', personId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
      const { data, error } = await auth.supabase.from('people').insert({
        name, email, role: 'Team Member', app_role: role,
        business_access: businessAccess, status: 'invited',
        invited_at: new Date().toISOString(), active: true
      }).select('id').single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      personId = data.id;
    }

    const redirectTo = `${new URL(request.url).origin}/welcome`;
    const { data: inviteData, error: inviteError } = await auth.supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { full_name: name }
    });

    if (inviteError) {
      await auth.supabase.from('people').update({ status: 'not_invited' }).eq('id', personId).is('user_id', null);
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    await auth.supabase.from('people').update({
      user_id: inviteData.user.id,
      status: 'invited',
      app_role: role,
      business_access: businessAccess
    }).eq('id', personId);

    return NextResponse.json({ ok: true, message: `Invitation sent to ${email}.` });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to send invitation.' }, { status: 500 });
  }
}
