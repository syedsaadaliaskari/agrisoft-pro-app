import { getAppConfig } from '@/lib/config';
import { toNumber } from '@/lib/format';
import { newCustomerCode, newId } from '@/lib/id';
import { missingKeysMessage, getSupabase } from '@/lib/supabase';
import type { Customer, Product, ProductVariant, Sale, Tenant } from '@/types/models';

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

function liveVariants(variants: ProductVariant[] | null | undefined): ProductVariant[] {
  return (variants ?? []).filter((variant) => !variant.deleted_at);
}

export function productStockQty(product: Product): number {
  const variants = liveVariants(product.product_variants);
  if (variants.length === 0) return 0;
  return variants.reduce((sum, variant) => sum + toNumber(variant.stock_qty), 0);
}

export async function fetchProducts(): Promise<Product[]> {
  const { client, tenantId } = requireClient();
  const { data, error } = await client
    .from('products')
    .select(
      'id, tenant_id, name, brand, sku, sale_price, cost_price, is_active, product_variants(id, product_id, size, color, stock_qty, sale_price, sku, is_active, deleted_at)',
    )
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(describeError(error));
  }

  return (data ?? []).map((product) => ({
    ...product,
    product_variants: liveVariants(product.product_variants as ProductVariant[] | null),
  }));
}

export async function fetchProduct(id: string): Promise<Product | null> {
  const { client, tenantId } = requireClient();
  const { data, error } = await client
    .from('products')
    .select(
      'id, tenant_id, name, brand, sku, sale_price, cost_price, is_active, product_variants(id, product_id, size, color, stock_qty, sale_price, sku, is_active, deleted_at)',
    )
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(describeError(error));
  }

  if (!data) return null;

  return {
    ...data,
    product_variants: liveVariants(data.product_variants as ProductVariant[] | null),
  };
}

export function matchesProductSearch(product: Product, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    product.name.toLowerCase().includes(q) ||
    (product.brand ?? '').toLowerCase().includes(q)
  );
}

export async function createCustomer(input: {
  name: string;
  phone?: string;
  city?: string;
  address?: string;
}): Promise<Customer> {
  const { client, tenantId } = requireClient();
  const name = input.name.trim();
  if (!name) {
    throw new Error('Name is required.');
  }
  const now = new Date().toISOString();
  const row = {
    id: newId(),
    tenant_id: tenantId,
    code: newCustomerCode(),
    name,
    phone: input.phone?.trim() || null,
    email: null,
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
    opening_balance: 0,
    balance_type: 'debit',
    credit_limit: 0,
    is_active: true,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  const { data, error } = await client.from('customers').insert(row).select().single();
  if (error) {
    throw new Error(describeError(error));
  }
  return data;
}

export async function fetchSales(): Promise<Sale[]> {
  const { client, tenantId } = requireClient();
  const { data, error } = await client
    .from('sales')
    .select(
      'id, tenant_id, invoice_no, invoice_date, customer_id, payment_mode, grand_total, paid_amount, status, sale_items(id, product_name, quantity, line_total, unit_price)',
    )
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .neq('status', 'deleted')
    .order('invoice_date', { ascending: false });

  if (error) {
    throw new Error(describeError(error));
  }

  return data ?? [];
}
