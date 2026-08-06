import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/supabase-admin';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const tables = ['tasks', 'people', 'meetings', 'loans'];
    const results = await Promise.all(tables.map(table =>
      auth.supabase.from(table).select('*', { count: 'exact', head: true })
    ));
    const counts = Object.fromEntries(tables.map((table, index) => [table, results[index].count || 0]));
    const database = results.every(result => !result.error);
    const { data: rls, error: rlsError } = await auth.supabase.rpc('firefly_rls_status');

    return NextResponse.json({
      database,
      authentication: true,
      invitationService: true,
      rls: rlsError ? null : rls,
      counts,
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to verify launch readiness.' }, { status: 500 });
  }
}
