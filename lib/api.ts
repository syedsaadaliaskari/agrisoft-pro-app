import { getAppConfig } from '@/lib/config';
import { missingKeysMessage, getSupabase } from '@/lib/supabase';
import type { Customer, Tenant } from '@/types/models';

function requireClient() {
  const client = getSupabase();
  if (!client) {
    throw new Error(missingKeysMessage());
  }
  return { client, tenantId: getAppConfig().tenantId };
}

function describeError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: string }).message ?? '');
    if (/failed to fetch|network request failed|network error/i.test(message)) {
      return 'You appear to be offline, or the cloud could not be reached.';
    }
    if (/permission denied|rls|row-level security/i.test(message)) {
      return 'Cloud access was denied. A tenant RLS policy is probably still needed.';
    }
    return message || 'Something went wrong talking to the cloud.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong talking to the cloud.';
}

export async function fetchTenant(): Promise<Tenant | null> {
  const { client, tenantId } = requireClient();
  const { data, error } = await client
    .from('tenants')
    .select('id, name, slug, is_active')
    .eq('id', tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(describeError(error));
  }

  return data;
}

export async function fetchCustomers(): Promise<Customer[]> {
  const { client, tenantId } = requireClient();
  const { data, error } = await client
    .from('customers')
    .select(
      'id, tenant_id, code, name, phone, email, address, city, opening_balance, balance_type, credit_limit, is_active, created_at, updated_at',
    )
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(describeError(error));
  }

  return data ?? [];
}

export async function fetchCustomer(id: string): Promise<Customer | null> {
  const { client, tenantId } = requireClient();
  const { data, error } = await client
    .from('customers')
    .select(
      'id, tenant_id, code, name, phone, email, address, city, opening_balance, balance_type, credit_limit, is_active, created_at, updated_at',
    )
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(describeError(error));
  }

  return data;
}

export function matchesCustomerSearch(customer: Customer, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    customer.name.toLowerCase().includes(q) ||
    (customer.phone ?? '').toLowerCase().includes(q)
  );
}
