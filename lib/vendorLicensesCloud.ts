import { getAppConfig } from '@/lib/config';
import { getSupabase } from '@/lib/supabase';
import { type CloudLicense, type LicensePlan, ymd } from '@/lib/vendorLicenseUi';

function asPlan(value: unknown): LicensePlan {
  if (value === 'monthly' || value === 'yearly' || value === 'forever') return value;
  return 'yearly';
}

/** Live read of public.licenses. Phone never writes this table. */
export async function fetchCloudLicenses(): Promise<CloudLicense[]> {
  const client = getSupabase();
  const { hasAnonKey } = getAppConfig();
  if (!client || !hasAnonKey) {
    throw new Error("Couldn't load this data.");
  }
  const { data, error } = await client
    .from('licenses')
    .select('id,name,phone,plan,activated_at,expires_at,notes,install_id,tenant_id,updated_at')
    .is('deleted_at', null)
    .order('name', { ascending: true });
  if (error) {
    if (/failed to fetch|network/i.test(error.message)) throw new Error("You're offline.");
    throw new Error("Couldn't load this data.");
  }
  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ''),
    phone: row.phone ? String(row.phone) : '',
    plan: asPlan(row.plan),
    activatedAt: ymd(row.activated_at) ?? String(row.activated_at ?? '').slice(0, 10),
    expiresAt: ymd(row.expires_at),
    notes: row.notes ? String(row.notes) : null,
    installId: row.install_id ? String(row.install_id) : '',
    tenantId: row.tenant_id ? String(row.tenant_id) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  }));
}
