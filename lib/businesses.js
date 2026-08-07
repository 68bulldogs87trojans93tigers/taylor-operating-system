export const DEFAULT_BUSINESSES = [
  { name: 'Firefly Mortgage', description: 'Close loans, prove operations and scale production.', is_system: true },
  { name: 'Medical', description: 'Consolidate facilities and evaluate Hazel Green clinic.', is_system: false },
  { name: 'NP Franchise', description: 'Launch, measure demand and build franchise support.', is_system: false },
  { name: 'Construction', description: 'Launch pipeline, first homes and subdivision analysis.', is_system: false },
  { name: 'Lake House', description: 'Protect revenue, manage repairs and prepare manager transition.', is_system: false },
  { name: 'Boba Tea', description: 'Improve P&L, traffic and operating accountability.', is_system: false },
  { name: 'Cross-Business / AI', description: 'Websites, dashboards, meeting intelligence and automation.', is_system: true }
];

export const BUSINESSES = DEFAULT_BUSINESSES.map(business => business.name);

export async function getBusinesses(supabase, workspaceId, { includeArchived = false } = {}) {
  let query = supabase
    .from('businesses')
    .select('id,name,description,is_active,is_system,sort_order')
    .eq('workspace_id', workspaceId)
    .order('sort_order')
    .order('name');
  if (!includeArchived) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (!error && data?.length) return data;
  return DEFAULT_BUSINESSES.map((business, index) => ({
    id: null,
    ...business,
    is_active: true,
    sort_order: index + 1
  }));
}
