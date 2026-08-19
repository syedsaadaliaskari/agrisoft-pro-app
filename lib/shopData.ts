import { getAppConfig } from '@/lib/config';
import { toNumber } from '@/lib/format';
import { newId } from '@/lib/id';
import { getSupabase } from '@/lib/supabase';
import type {
  AccountRow,
  InventoryRow,
  NamedRow,
  Product,
  Purchase,
  PurchaseReturn,
  SaleReturn,
} from '@/types/models';
import { fetchProducts, productStockQty, sellableRows } from '@/lib/api';

function requireClient() {
  const client = getSupabase();
  if (!client) throw new Error("Couldn't load this data.");
  return { client, tenantId: getAppConfig().tenantId };
}

function fail(error: unknown, fallback: string): never {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: string }).message ?? '')
      : '';
  if (/failed to fetch|network/i.test(message)) throw new Error("You're offline.");
  throw new Error(fallback);
}

async function listNamed(table: 'units' | 'categories' | 'vendors', select: string): Promise<NamedRow[]> {
  const { client, tenantId } = requireClient();
  const { data, error } = await client
    .from(table)
    .select(select)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('name', { ascending: true });
  if (error) fail(error, "Couldn't load this data.");
  return (data ?? []) as NamedRow[];
}

export async function fetchUnits(): Promise<NamedRow[]> {
  return listNamed('units', 'id, name, short_name, is_active');
}

export async function fetchCategories(): Promise<NamedRow[]> {
  return listNamed('categories', 'id, name, description, is_active');
}

export async function fetchVendors(): Promise<NamedRow[]> {
  return listNamed('vendors', 'id, name, phone, city, is_active');
}

export async function createUnit(name: string, shortName: string): Promise<void> {
  const { client, tenantId } = requireClient();
  const now = new Date().toISOString();
  const { error } = await client.from('units').insert({
    id: newId(),
    tenant_id: tenantId,
    name: name.trim(),
    short_name: (shortName.trim() || name.trim().slice(0, 8)).slice(0, 12),
    is_active: true,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });
  if (error) fail(error, "Couldn't save.");
}

export async function createCategory(name: string): Promise<void> {
  const { client, tenantId } = requireClient();
  const now = new Date().toISOString();
  const { error } = await client.from('categories').insert({
    id: newId(),
    tenant_id: tenantId,
    name: name.trim(),
    parent_id: null,
    description: null,
    is_active: true,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });
  if (error) fail(error, "Couldn't save.");
}

export async function createVendor(name: string, phone?: string): Promise<void> {
  const { client, tenantId } = requireClient();
  const now = new Date().toISOString();
  const { error } = await client.from('vendors').insert({
    id: newId(),
    tenant_id: tenantId,
    code: `V-${Date.now().toString(36).toUpperCase()}`,
    name: name.trim(),
    phone: phone?.trim() || null,
    email: null,
    address: null,
    city: null,
    opening_balance: 0,
    balance_type: 'credit',
    is_active: true,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });
  if (error) fail(error, "Couldn't save.");
}

export async function createProduct(input: {
  name: string;
  salePrice: number;
  costPrice: number;
  stockQty: number;
}): Promise<void> {
  const { client, tenantId } = requireClient();
  const now = new Date().toISOString();
  const productId = newId();
  const sku = `P-${Date.now().toString(36).toUpperCase()}`;
  const { error: productErr } = await client.from('products').insert({
    id: productId,
    tenant_id: tenantId,
    sku,
    name: input.name.trim(),
    description: null,
    category_id: null,
    unit_id: null,
    brand: null,
    cost_price: input.costPrice,
    sale_price: input.salePrice,
    wholesale_price: 0,
    tax_id: null,
    reorder_level: 0,
    is_active: true,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });
  if (productErr) fail(productErr, "Couldn't save.");
  const { error: variantErr } = await client.from('product_variants').insert({
    id: newId(),
    tenant_id: tenantId,
    product_id: productId,
    sku: `${sku}-1`,
    barcode: null,
    size: '-',
    color: '-',
    cost_price: input.costPrice,
    sale_price: input.salePrice,
    stock_qty: input.stockQty,
    is_active: true,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });
  if (variantErr) fail(variantErr, "Couldn't save.");
}

export async function fetchInventory(): Promise<InventoryRow[]> {
  const products = await fetchProducts();
  return sellableRows(products).map((row) => ({
    variantId: row.variantId,
    productId: row.productId,
    name: row.name,
    detail: row.detail,
    stockQty: row.stockQty,
  }));
}

export async function adjustStock(variantId: string, stockQty: number): Promise<void> {
  const { client, tenantId } = requireClient();
  const { error } = await client
    .from('product_variants')
    .update({ stock_qty: stockQty, updated_at: new Date().toISOString() })
    .eq('id', variantId)
    .eq('tenant_id', tenantId);
  if (error) fail(error, "Couldn't save.");
}

export async function fetchPurchases(): Promise<Purchase[]> {
  const { client, tenantId } = requireClient();
  const { data, error } = await client
    .from('purchases')
    .select('id, invoice_no, invoice_date, vendor_id, payment_mode, grand_total, status')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .neq('status', 'deleted')
    .order('invoice_date', { ascending: false });
  if (error) fail(error, "Couldn't load this data.");
  return data ?? [];
}

export async function fetchSaleReturns(): Promise<SaleReturn[]> {
  const { client, tenantId } = requireClient();
  const { data, error } = await client
    .from('sale_returns')
    .select('id, return_no, return_date, sale_id, grand_total')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('return_date', { ascending: false });
  if (error) fail(error, "Couldn't load this data.");
  return data ?? [];
}

export async function fetchPurchaseReturns(): Promise<PurchaseReturn[]> {
  const { client, tenantId } = requireClient();
  const { data, error } = await client
    .from('purchase_returns')
    .select('id, return_no, return_date, purchase_id, grand_total')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('return_date', { ascending: false });
  if (error) fail(error, "Couldn't load this data.");
  return data ?? [];
}

export async function fetchAccounts(): Promise<AccountRow[]> {
  const { client, tenantId } = requireClient();
  const { data, error } = await client
    .from('accounts')
    .select('id, code, name, account_type, opening_balance')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('code', { ascending: true });
  if (error) fail(error, "Couldn't load this data.");
  return data ?? [];
}

export async function fetchDeletedSales(): Promise<{ id: string; invoice_no: string; status: string | null }[]> {
  const { client, tenantId } = requireClient();
  const { data, error } = await client
    .from('sales')
    .select('id, invoice_no, status')
    .eq('tenant_id', tenantId)
    .or('deleted_at.not.is.null,status.eq.deleted')
    .order('updated_at', { ascending: false });
  if (error) fail(error, "Couldn't load this data.");
  return data ?? [];
}

export function stockValue(products: Product[]): number {
  return products.reduce((sum, product) => {
    const qty = productStockQty(product);
    return sum + qty * toNumber(product.cost_price ?? product.sale_price);
  }, 0);
}
