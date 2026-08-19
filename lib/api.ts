import { getAppConfig } from '@/lib/config';
import { toNumber } from '@/lib/format';
import { newCustomerCode, newId } from '@/lib/id';
import { missingKeysMessage, getSupabase } from '@/lib/supabase';
import type {
  CreateSaleLine,
  Customer,
  PaymentMode,
  Product,
  ProductVariant,
  Sale,
  SellableRow,
  Tenant,
} from '@/types/models';

function requireClient() {
  const client = getSupabase();
  if (!client) {
    throw new Error(missingKeysMessage());
  }
  return { client, tenantId: getAppConfig().tenantId };
}

function describeError(error: unknown, fallback = "Couldn't load this data."): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: string }).message ?? '');
    if (/failed to fetch|network request failed|network error/i.test(message)) {
      return "You're offline.";
    }
    return fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
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
      'id, tenant_id, invoice_no, invoice_date, customer_id, payment_mode, grand_total, paid_amount, status, notes, sale_items(id, product_name, quantity, line_total, unit_price, variant_id, size, color)',
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

const SALE_SELECT =
  'id, tenant_id, invoice_no, invoice_date, customer_id, payment_mode, grand_total, paid_amount, status, notes, sale_items(id, product_name, quantity, line_total, unit_price, variant_id, size, color)';

export async function fetchSale(id: string): Promise<Sale | null> {
  const { client, tenantId } = requireClient();
  const { data, error } = await client
    .from('sales')
    .select(SALE_SELECT)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) {
    throw new Error(describeError(error));
  }
  return data;
}

export function sellableRows(products: Product[]): SellableRow[] {
  const rows: SellableRow[] = [];
  for (const product of products) {
    if (product.is_active === false) continue;
    for (const variant of product.product_variants ?? []) {
      if (variant.is_active === false) continue;
      const detail = [variant.size, variant.color].filter(Boolean).join(' · ');
      rows.push({
        variantId: variant.id,
        productId: product.id,
        name: product.name,
        detail,
        stockQty: toNumber(variant.stock_qty),
        salePrice: toNumber(variant.sale_price ?? product.sale_price),
        costPrice: toNumber(product.cost_price),
      });
    }
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export function matchesSellableSearch(row: SellableRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return row.name.toLowerCase().includes(q) || row.detail.toLowerCase().includes(q);
}

function todayStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function newInvoiceNo(): string {
  return `M-${Date.now().toString(36).toUpperCase()}`;
}

export async function createSale(input: {
  customerId?: string | null;
  paymentMode: PaymentMode;
  items: CreateSaleLine[];
}): Promise<Sale> {
  const { client, tenantId } = requireClient();
  if (!input.items.length) {
    throw new Error('Add at least one product.');
  }
  if (input.paymentMode === 'credit' && !input.customerId) {
    throw new Error('Customer is required for credit sales.');
  }

  const now = new Date().toISOString();
  const invoiceDate = todayStamp();
  const invoiceNo = newInvoiceNo();
  const voucherId = newId();
  const saleId = newId();
  let subtotal = 0;
  const built = input.items.map((line, index) => {
    if (line.quantity <= 0) {
      throw new Error('Quantity must be more than 0.');
    }
    const lineTotal = line.quantity * line.unitPrice;
    subtotal += lineTotal;
    return {
      id: newId(),
      tenant_id: tenantId,
      sale_id: saleId,
      variant_id: line.variantId,
      product_name: line.productName,
      size: line.size || '-',
      color: line.color || '-',
      quantity: line.quantity,
      unit_price: line.unitPrice,
      cost_price: line.costPrice,
      discount_amount: 0,
      tax_amount: 0,
      line_total: lineTotal,
      line_order: index,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
  });

  const variantIds = [...new Set(built.map((line) => line.variant_id))];
  const { data: variants, error: variantError } = await client
    .from('product_variants')
    .select('id, stock_qty, tenant_id')
    .eq('tenant_id', tenantId)
    .in('id', variantIds)
    .is('deleted_at', null);
  if (variantError) {
    throw new Error(describeError(variantError, "Couldn't save this sale."));
  }
  const stockById = new Map((variants ?? []).map((row) => [row.id as string, toNumber(row.stock_qty)]));
  for (const line of built) {
    const have = stockById.get(line.variant_id) ?? 0;
    if (have < line.quantity) {
      throw new Error(`Not enough stock for ${line.product_name}.`);
    }
  }

  const paidAmount = input.paymentMode === 'credit' ? 0 : subtotal;
  const voucher = {
    id: voucherId,
    tenant_id: tenantId,
    voucher_no: invoiceNo,
    voucher_type: 'sale',
    voucher_date: invoiceDate,
    party_type: input.customerId ? 'customer' : null,
    party_id: input.customerId ?? null,
    account_id: null,
    reference_no: null,
    notes: null,
    subtotal,
    discount_amount: 0,
    addition_amount: 0,
    tax_amount: 0,
    grand_total: subtotal,
    paid_amount: paidAmount,
    status: 'posted',
    created_by: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  const sale = {
    id: saleId,
    tenant_id: tenantId,
    voucher_id: voucherId,
    invoice_no: invoiceNo,
    invoice_date: invoiceDate,
    customer_id: input.customerId ?? null,
    payment_mode: input.paymentMode,
    subtotal,
    discount_amount: 0,
    addition_amount: 0,
    tax_amount: 0,
    grand_total: subtotal,
    paid_amount: paidAmount,
    notes: null,
    status: 'completed',
    created_by: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  const { error: voucherErr } = await client.from('vouchers').insert(voucher);
  if (voucherErr) {
    throw new Error(describeError(voucherErr, "Couldn't save this sale."));
  }
  const { error: saleErr } = await client.from('sales').insert(sale);
  if (saleErr) {
    await client.from('vouchers').update({ deleted_at: now, updated_at: now }).eq('id', voucherId);
    throw new Error(describeError(saleErr, "Couldn't save this sale."));
  }
  const { error: itemsErr } = await client.from('sale_items').insert(built);
  if (itemsErr) {
    await client.from('sales').update({ deleted_at: now, updated_at: now, status: 'deleted' }).eq('id', saleId);
    await client.from('vouchers').update({ deleted_at: now, updated_at: now }).eq('id', voucherId);
    throw new Error(describeError(itemsErr, "Couldn't save this sale."));
  }

  for (const line of built) {
    const have = stockById.get(line.variant_id) ?? 0;
    const nextQty = have - line.quantity;
    const { error: stockErr } = await client
      .from('product_variants')
      .update({ stock_qty: nextQty, updated_at: now })
      .eq('id', line.variant_id)
      .eq('tenant_id', tenantId);
    if (stockErr) {
      throw new Error(describeError(stockErr, "Couldn't save this sale."));
    }
    stockById.set(line.variant_id, nextQty);
  }

  const saved = await fetchSale(saleId);
  if (!saved) {
    throw new Error("Couldn't save this sale.");
  }
  return saved;
}
