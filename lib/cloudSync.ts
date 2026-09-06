import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

import { getAppConfig } from '@/lib/config';
import {
  applyCloudSnapshot,
  getShopSnapshot,
  setErpPersistHook,
  type Account,
  type AccountType,
  type AmountType,
  type Named,
  type Party,
  type PaymentMode,
  type Product,
  type PurchaseDoc,
  type ReturnDoc,
  type SaleDoc,
  type Voucher,
  type VoucherType,
} from '@/lib/erp';
import { newId } from '@/lib/id';
import { getSupabase } from '@/lib/supabase';
import { markRefreshError, markRefreshSuccess } from '@/lib/syncStatus';

const PULLED_KEY = 'agrisoft.cloud.pulled';
const PAGE = 1000;
const BATCH = 80;

let pushing = false;
let pullTimer: ReturnType<typeof setTimeout> | null = null;
let cloudReady = false;

function n(value: unknown, fallback = 0) {
  const x = Number(value);
  return Number.isFinite(x) ? x : fallback;
}
function text(value: unknown) {
  return value == null ? '' : String(value);
}
function stamp() {
  return new Date().toISOString();
}
function describeError(error: unknown, fallback = "Couldn't sync with the cloud.") {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: string }).message ?? '');
    if (/failed to fetch|network request failed|network error/i.test(message)) return "You're offline.";
    if (message) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function requireCloud() {
  const client = getSupabase();
  const { tenantId, isReady } = getAppConfig();
  if (!client || !isReady) throw new Error("Couldn't reach the cloud.");
  return { client, tenantId };
}

async function fetchTable<T>(table: string): Promise<T[]> {
  const { client, tenantId } = requireCloud();
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = client.from(table).select('*').eq('tenant_id', tenantId).range(from, from + PAGE - 1);
    if (table !== 'audit_logs') query = query.is('deleted_at', null);
    const { data, error } = await query;
    if (error) throw new Error(describeError(error));
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

async function upsertTable(table: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const { client } = requireCloud();
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await client.from(table).upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(describeError(error, `Couldn't save ${table}.`));
  }
}

function namedFrom(
  rows: {
    id: string;
    name: string;
    short_name?: string | null;
    description?: string | null;
    rate?: number | null;
    is_inclusive?: boolean | null;
    type?: string | null;
    value?: number | null;
    is_active?: boolean | null;
  }[],
): Named[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    shortName: row.short_name ?? undefined,
    description: row.description ?? undefined,
    rate: row.rate ?? undefined,
    isInclusive: row.is_inclusive ?? undefined,
    type: (row.type as AmountType | undefined) ?? undefined,
    value: row.value ?? undefined,
    isActive: row.is_active !== false,
  }));
}

function partyFrom(
  rows: {
    id: string;
    code: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    opening_balance?: number | null;
    balance_type?: string | null;
    credit_limit?: number | null;
    is_active?: boolean | null;
  }[],
  fallbackBalance: Party['balanceType'],
): Party[] {
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    phone: text(row.phone),
    email: text(row.email),
    address: text(row.address),
    city: text(row.city),
    openingBalance: n(row.opening_balance),
    balanceType: row.balance_type === 'credit' || row.balance_type === 'debit' ? row.balance_type : fallbackBalance,
    creditLimit: n(row.credit_limit),
    isActive: row.is_active !== false,
  }));
}

export async function pullShopFromCloud() {
  const { tenantId } = requireCloud();
  const [
    settings,
    units,
    categories,
    taxes,
    discounts,
    additions,
    customers,
    vendors,
    accounts,
    products,
    variants,
    vouchers,
    entries,
    sales,
    saleItems,
    purchases,
    purchaseItems,
    saleReturns,
    saleReturnItems,
    purchaseReturns,
    purchaseReturnItems,
    counters,
    audit,
  ] = await Promise.all([
    fetchTable<{ id: string; key: string; value: string | null; group_name?: string | null }>('settings'),
    fetchTable<{ id: string; name: string; short_name: string | null; is_active: boolean }>('units'),
    fetchTable<{ id: string; name: string; description: string | null; is_active: boolean }>('categories'),
    fetchTable<{ id: string; name: string; rate: number; is_inclusive: boolean; is_active: boolean }>('taxes'),
    fetchTable<{ id: string; name: string; type: string; value: number; is_active: boolean }>('discounts'),
    fetchTable<{ id: string; name: string; type: string; value: number; is_active: boolean }>('additions'),
    fetchTable<Record<string, unknown>>('customers'),
    fetchTable<Record<string, unknown>>('vendors'),
    fetchTable<{
      id: string;
      code: string;
      name: string;
      account_type: string;
      is_system: boolean;
      is_active: boolean;
      opening_balance: number;
    }>('accounts'),
    fetchTable<Record<string, unknown>>('products'),
    fetchTable<Record<string, unknown>>('product_variants'),
    fetchTable<Record<string, unknown>>('vouchers'),
    fetchTable<Record<string, unknown>>('voucher_entries'),
    fetchTable<Record<string, unknown>>('sales'),
    fetchTable<Record<string, unknown>>('sale_items'),
    fetchTable<Record<string, unknown>>('purchases'),
    fetchTable<Record<string, unknown>>('purchase_items'),
    fetchTable<Record<string, unknown>>('sale_returns'),
    fetchTable<Record<string, unknown>>('sale_return_items'),
    fetchTable<Record<string, unknown>>('purchase_returns'),
    fetchTable<Record<string, unknown>>('purchase_return_items'),
    fetchTable<{ id: string; doc_type: string; prefix: string; next_number: number; pad_length: number }>('document_counters'),
    fetchTable<{ id: string; created_at: string; module: string; action: string; details: string | null }>('audit_logs'),
  ]);

  const settingMap: Record<string, string> = {};
  const settingIds: Record<string, string> = {};
  for (const row of settings) {
    settingIds[row.key] = row.id;
    settingMap[row.key] = row.value ?? '';
  }

  const variantsByProduct = new Map<string, Product['variants']>();
  for (const row of variants) {
    const productId = text(row.product_id);
    const list = variantsByProduct.get(productId) ?? [];
    list.push({
      id: text(row.id),
      productId,
      sku: text(row.sku),
      barcode: text(row.barcode),
      size: text(row.size),
      color: text(row.color),
      stockQty: n(row.stock_qty),
      salePrice: n(row.sale_price),
      costPrice: n(row.cost_price),
    });
    variantsByProduct.set(productId, list);
  }

  const mappedProducts: Product[] = products.map((row) => ({
    id: text(row.id),
    sku: text(row.sku),
    barcode: text(row.barcode),
    name: text(row.name),
    description: text(row.description),
    categoryId: row.category_id ? text(row.category_id) : null,
    unitId: row.unit_id ? text(row.unit_id) : null,
    brand: text(row.brand),
    gender: text(row.gender),
    season: text(row.season),
    salePrice: n(row.sale_price),
    costPrice: n(row.cost_price),
    wholesalePrice: n(row.wholesale_price),
    taxId: row.tax_id ? text(row.tax_id) : null,
    reorderLevel: n(row.reorder_level, 5),
    isActive: row.is_active !== false,
    variants: variantsByProduct.get(text(row.id)) ?? [],
  }));

  const entriesByVoucher = new Map<string, Voucher['entries']>();
  for (const row of entries) {
    const voucherId = text(row.voucher_id);
    const list = entriesByVoucher.get(voucherId) ?? [];
    list.push({
      id: text(row.id),
      accountId: text(row.account_id),
      debit: n(row.debit),
      credit: n(row.credit),
      narration: text(row.narration),
    });
    entriesByVoucher.set(voucherId, list);
  }

  const mappedVouchers: Voucher[] = vouchers.map((row) => ({
    id: text(row.id),
    voucherNo: text(row.voucher_no),
    voucherType: text(row.voucher_type) as VoucherType,
    voucherDate: text(row.voucher_date),
    partyId: row.party_id ? text(row.party_id) : null,
    partyName: '',
    accountId: row.account_id ? text(row.account_id) : null,
    referenceNo: text(row.reference_no),
    notes: text(row.notes),
    grandTotal: n(row.grand_total),
    status: text(row.status) === 'cancelled' ? 'cancelled' : 'posted',
    entries: entriesByVoucher.get(text(row.id)) ?? [],
  }));

  const customersById = new Map(customers.map((row) => [text(row.id), text(row.name)]));
  const vendorsById = new Map(vendors.map((row) => [text(row.id), text(row.name)]));
  for (const voucher of mappedVouchers) {
    if (!voucher.partyId) continue;
    voucher.partyName = customersById.get(voucher.partyId) || vendorsById.get(voucher.partyId) || '';
  }

  const saleLines = new Map<string, SaleDoc['items']>();
  for (const row of saleItems) {
    const saleId = text(row.sale_id);
    const list = saleLines.get(saleId) ?? [];
    list.push({
      id: text(row.id),
      variantId: text(row.variant_id),
      productName: text(row.product_name),
      size: text(row.size),
      color: text(row.color),
      quantity: n(row.quantity),
      unitPrice: n(row.unit_price),
      lineTotal: n(row.line_total),
    });
    saleLines.set(saleId, list);
  }
  const mappedSales: SaleDoc[] = sales.map((row) => {
    const status = text(row.status);
    return {
      id: text(row.id),
      voucherId: row.voucher_id ? text(row.voucher_id) : null,
      invoiceNo: text(row.invoice_no),
      invoiceDate: text(row.invoice_date),
      customerId: row.customer_id ? text(row.customer_id) : null,
      customerName: customersById.get(text(row.customer_id)) || 'Walk-in',
      paymentMode: (text(row.payment_mode) as PaymentMode) || 'cash',
      subtotal: n(row.subtotal),
      discountAmount: n(row.discount_amount),
      additionAmount: n(row.addition_amount),
      taxAmount: n(row.tax_amount),
      grandTotal: n(row.grand_total),
      paidAmount: n(row.paid_amount),
      notes: text(row.notes),
      status: status === 'cancelled' || status === 'deleted' ? 'cancelled' : 'posted',
      items: saleLines.get(text(row.id)) ?? [],
      deletedAt: status === 'deleted' ? stamp() : null,
    };
  });

  const purchaseLines = new Map<string, PurchaseDoc['items']>();
  for (const row of purchaseItems) {
    const purchaseId = text(row.purchase_id);
    const list = purchaseLines.get(purchaseId) ?? [];
    list.push({
      id: text(row.id),
      variantId: text(row.variant_id),
      productName: text(row.product_name),
      size: text(row.size),
      color: text(row.color),
      quantity: n(row.quantity),
      unitPrice: n(row.unit_cost ?? row.unit_price),
      lineTotal: n(row.line_total),
    });
    purchaseLines.set(purchaseId, list);
  }
  const mappedPurchases: PurchaseDoc[] = purchases.map((row) => {
    const status = text(row.status);
    return {
      id: text(row.id),
      voucherId: row.voucher_id ? text(row.voucher_id) : null,
      invoiceNo: text(row.invoice_no),
      invoiceDate: text(row.invoice_date),
      vendorId: row.vendor_id ? text(row.vendor_id) : null,
      vendorName: vendorsById.get(text(row.vendor_id)) || '',
      paymentMode: (text(row.payment_mode) as PaymentMode) || 'credit',
      subtotal: n(row.subtotal),
      discountAmount: n(row.discount_amount),
      additionAmount: n(row.addition_amount),
      taxAmount: n(row.tax_amount),
      grandTotal: n(row.grand_total),
      paidAmount: n(row.paid_amount),
      notes: text(row.notes),
      status: status === 'cancelled' || status === 'deleted' ? 'cancelled' : 'posted',
      items: purchaseLines.get(text(row.id)) ?? [],
      deletedAt: status === 'deleted' ? stamp() : null,
    };
  });

  const srLines = new Map<string, ReturnDoc['items']>();
  for (const row of saleReturnItems) {
    const id = text(row.sale_return_id);
    const list = srLines.get(id) ?? [];
    list.push({
      id: text(row.id),
      variantId: text(row.variant_id),
      productName: '',
      size: '',
      color: '',
      quantity: n(row.quantity),
      unitPrice: n(row.unit_price),
      lineTotal: n(row.line_total),
    });
    srLines.set(id, list);
  }
  const mappedSaleReturns: ReturnDoc[] = saleReturns.map((row) => ({
    id: text(row.id),
    voucherId: row.voucher_id ? text(row.voucher_id) : null,
    returnNo: text(row.return_no),
    returnDate: text(row.return_date),
    sourceId: row.sale_id ? text(row.sale_id) : null,
    partyName: customersById.get(text(row.customer_id)) || '',
    grandTotal: n(row.grand_total),
    status: 'posted',
    items: srLines.get(text(row.id)) ?? [],
  }));

  const prLines = new Map<string, ReturnDoc['items']>();
  for (const row of purchaseReturnItems) {
    const id = text(row.purchase_return_id);
    const list = prLines.get(id) ?? [];
    list.push({
      id: text(row.id),
      variantId: text(row.variant_id),
      productName: '',
      size: '',
      color: '',
      quantity: n(row.quantity),
      unitPrice: n(row.unit_cost ?? row.unit_price),
      lineTotal: n(row.line_total),
    });
    prLines.set(id, list);
  }
  const mappedPurchaseReturns: ReturnDoc[] = purchaseReturns.map((row) => ({
    id: text(row.id),
    voucherId: row.voucher_id ? text(row.voucher_id) : null,
    returnNo: text(row.return_no),
    returnDate: text(row.return_date),
    sourceId: row.purchase_id ? text(row.purchase_id) : null,
    partyName: vendorsById.get(text(row.vendor_id)) || '',
    grandTotal: n(row.grand_total),
    status: 'posted',
    items: prLines.get(text(row.id)) ?? [],
  }));

  const mappedAccounts: Account[] = accounts.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    accountType: row.account_type as AccountType,
    isSystem: Boolean(row.is_system),
    isActive: row.is_active !== false,
    openingBalance: n(row.opening_balance),
  }));

  const counterMap: Record<string, number> = {};
  const counterIds: Record<string, string> = {};
  for (const row of counters) {
    counterIds[row.doc_type] = row.id;
    counterMap[row.doc_type] = n(row.next_number, 1);
  }

  const settingsPatch: Partial<import('@/lib/erp').ShopSettings> = {};
  if (settingMap.shop_name) settingsPatch.shop_name = settingMap.shop_name;
  if (settingMap.shop_phone != null) settingsPatch.shop_phone = settingMap.shop_phone;
  if (settingMap.shop_address != null) settingsPatch.shop_address = settingMap.shop_address;
  if (settingMap.currency_symbol) settingsPatch.currency_symbol = settingMap.currency_symbol;
  if (settingMap.currency_code) settingsPatch.currency_code = settingMap.currency_code;
  if (settingMap.tax_mode === 'inclusive' || settingMap.tax_mode === 'exclusive') settingsPatch.tax_mode = settingMap.tax_mode;
  if (settingMap.receipt_footer != null) settingsPatch.receipt_footer = settingMap.receipt_footer;
  if (settingMap.n8n_enabled != null) settingsPatch.n8n_enabled = settingMap.n8n_enabled;
  if (settingMap.n8n_webhook_url != null) settingsPatch.n8n_webhook_url = settingMap.n8n_webhook_url;

  await applyCloudSnapshot({
    settings: settingsPatch,
    settingIds,
    units: namedFrom(units),
    categories: namedFrom(categories),
    taxes: namedFrom(taxes),
    discounts: namedFrom(discounts),
    additions: namedFrom(additions),
    customers: partyFrom(customers as never, 'debit'),
    vendors: partyFrom(vendors as never, 'credit'),
    products: mappedProducts,
    accounts: mappedAccounts,
    sales: mappedSales,
    purchases: mappedPurchases,
    saleReturns: mappedSaleReturns,
    purchaseReturns: mappedPurchaseReturns,
    vouchers: mappedVouchers,
    counters: counterMap,
    counterIds,
    audit: audit.map((row) => ({
      id: row.id,
      at: row.created_at,
      module: row.module,
      action: row.action,
      details: row.details ?? '',
    })),
  });

  cloudReady = true;
  await AsyncStorage.setItem(PULLED_KEY, '1');
  setErpPersistHook(schedulePush);
  markRefreshSuccess({
    customerCount: mappedSales.length ? customers.length : customers.length,
    productCount: mappedProducts.length,
    saleCount: mappedSales.length,
  });
  void tenantId;
}

function namedPayload(
  table: 'units' | 'categories' | 'taxes' | 'discounts' | 'additions',
  rows: Named[],
  tenantId: string,
  now: string,
) {
  return rows.map((row) => ({
    id: row.id,
    tenant_id: tenantId,
    name: row.name,
    short_name: table === 'units' ? row.shortName || row.name : undefined,
    description: table === 'categories' ? row.description || null : undefined,
    rate: table === 'taxes' ? row.rate ?? 0 : undefined,
    is_inclusive: table === 'taxes' ? Boolean(row.isInclusive) : undefined,
    type: table === 'discounts' || table === 'additions' ? row.type || 'percent' : undefined,
    value: table === 'discounts' || table === 'additions' ? row.value ?? 0 : undefined,
    is_active: row.isActive,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }));
}

function stripUndef(row: Record<string, unknown>) {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined) next[key] = value;
  }
  return next;
}

export async function pushShopToCloud() {
  if (pushing || !cloudReady) return;
  pushing = true;
  try {
    const { tenantId } = requireCloud();
    const shop = getShopSnapshot();
    const now = stamp();
    const settingsKeys: (keyof typeof shop.settings)[] = [
      'shop_name',
      'shop_phone',
      'shop_address',
      'currency_symbol',
      'currency_code',
      'tax_mode',
      'receipt_footer',
      'n8n_enabled',
      'n8n_webhook_url',
    ];
    const settings = settingsKeys.map((key) => {
      shop.settingIds[key] = shop.settingIds[key] || newId();
      return {
        id: shop.settingIds[key],
        tenant_id: tenantId,
        key,
        value: String(shop.settings[key] ?? ''),
        group_name: 'general',
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
    });

    await upsertTable('settings', settings);
    await upsertTable('units', namedPayload('units', shop.units, tenantId, now).map(stripUndef));
    await upsertTable('categories', namedPayload('categories', shop.categories, tenantId, now).map(stripUndef));
    await upsertTable('taxes', namedPayload('taxes', shop.taxes, tenantId, now).map(stripUndef));
    await upsertTable('discounts', namedPayload('discounts', shop.discounts, tenantId, now).map(stripUndef));
    await upsertTable('additions', namedPayload('additions', shop.additions, tenantId, now).map(stripUndef));
    await upsertTable(
      'customers',
      shop.customers.map((row) => ({
        id: row.id,
        tenant_id: tenantId,
        code: row.code,
        name: row.name,
        phone: row.phone || null,
        email: row.email || null,
        address: row.address || null,
        city: row.city || null,
        opening_balance: row.openingBalance,
        balance_type: row.balanceType,
        credit_limit: row.creditLimit,
        is_active: row.isActive,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })),
    );
    await upsertTable(
      'vendors',
      shop.vendors.map((row) => ({
        id: row.id,
        tenant_id: tenantId,
        code: row.code,
        name: row.name,
        phone: row.phone || null,
        email: row.email || null,
        address: row.address || null,
        city: row.city || null,
        opening_balance: row.openingBalance,
        balance_type: row.balanceType,
        is_active: row.isActive,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })),
    );
    await upsertTable(
      'accounts',
      shop.accounts.map((row) => ({
        id: row.id,
        tenant_id: tenantId,
        code: row.code,
        name: row.name,
        account_type: row.accountType,
        parent_id: null,
        is_system: row.isSystem,
        is_active: row.isActive,
        opening_balance: row.openingBalance,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })),
    );
    await upsertTable(
      'products',
      shop.products.map((row) => ({
        id: row.id,
        tenant_id: tenantId,
        sku: row.sku,
        barcode: row.barcode || null,
        name: row.name,
        description: row.description || null,
        category_id: row.categoryId,
        unit_id: row.unitId,
        brand: row.brand || null,
        gender: row.gender || null,
        season: row.season || null,
        cost_price: row.costPrice,
        sale_price: row.salePrice,
        wholesale_price: row.wholesalePrice,
        tax_id: row.taxId,
        reorder_level: row.reorderLevel,
        is_active: row.isActive,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })),
    );
    await upsertTable(
      'product_variants',
      shop.products.flatMap((product) =>
        product.variants.map((row) => ({
          id: row.id,
          tenant_id: tenantId,
          product_id: product.id,
          sku: row.sku || product.sku,
          barcode: row.barcode || null,
          size: row.size || 'Default',
          color: row.color || 'Default',
          cost_price: row.costPrice,
          sale_price: row.salePrice,
          stock_qty: row.stockQty,
          is_active: true,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })),
      ),
    );

    const accountIds = new Set(shop.accounts.map((row) => row.id));
    await upsertTable(
      'vouchers',
      shop.vouchers.map((row) => ({
        id: row.id,
        tenant_id: tenantId,
        voucher_no: row.voucherNo,
        voucher_type: row.voucherType,
        voucher_date: row.voucherDate,
        party_type: row.voucherType === 'receipt' || row.voucherType === 'sale' || row.voucherType === 'sale_return' ? 'customer' : row.partyId ? 'vendor' : null,
        party_id: row.partyId,
        account_id: row.accountId && accountIds.has(row.accountId) ? row.accountId : null,
        reference_no: row.referenceNo || null,
        notes: row.notes || null,
        subtotal: row.grandTotal,
        discount_amount: 0,
        addition_amount: 0,
        tax_amount: 0,
        grand_total: row.grandTotal,
        paid_amount: row.grandTotal,
        status: row.status,
        created_by: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })),
    );
    await upsertTable(
      'voucher_entries',
      shop.vouchers.flatMap((voucher) =>
        voucher.entries
          .filter((entry) => accountIds.has(entry.accountId))
          .map((entry, index) => ({
            id: entry.id || newId(),
            tenant_id: tenantId,
            voucher_id: voucher.id,
            account_id: entry.accountId,
            debit: entry.debit,
            credit: entry.credit,
            narration: entry.narration || null,
            line_order: index,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          })),
      ),
    );

    const liveSales = shop.sales.filter((row) => row.voucherId);
    await upsertTable(
      'sales',
      liveSales.map((row) => ({
        id: row.id,
        tenant_id: tenantId,
        voucher_id: row.voucherId,
        invoice_no: row.invoiceNo,
        invoice_date: row.invoiceDate,
        customer_id: row.customerId,
        payment_mode: row.paymentMode,
        subtotal: row.subtotal,
        discount_amount: row.discountAmount,
        addition_amount: row.additionAmount,
        tax_amount: row.taxAmount,
        grand_total: row.grandTotal,
        paid_amount: row.paidAmount,
        notes: row.notes || null,
        status: row.status === 'cancelled' ? 'cancelled' : 'completed',
        created_by: null,
        created_at: now,
        updated_at: now,
        deleted_at: row.deletedAt,
      })),
    );
    await upsertTable(
      'sale_items',
      liveSales.flatMap((sale) =>
        sale.items.map((line, index) => ({
          id: line.id || newId(),
          tenant_id: tenantId,
          sale_id: sale.id,
          variant_id: line.variantId,
          product_name: line.productName,
          size: line.size || '-',
          color: line.color || '-',
          quantity: line.quantity,
          unit_price: line.unitPrice,
          cost_price: 0,
          discount_amount: 0,
          tax_amount: 0,
          line_total: line.lineTotal,
          line_order: index,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })),
      ),
    );

    const livePurchases = shop.purchases.filter((row) => row.voucherId);
    await upsertTable(
      'purchases',
      livePurchases.map((row) => ({
        id: row.id,
        tenant_id: tenantId,
        voucher_id: row.voucherId,
        invoice_no: row.invoiceNo,
        invoice_date: row.invoiceDate,
        vendor_id: row.vendorId,
        payment_mode: row.paymentMode,
        subtotal: row.subtotal,
        discount_amount: row.discountAmount,
        addition_amount: row.additionAmount,
        tax_amount: row.taxAmount,
        grand_total: row.grandTotal,
        paid_amount: row.paidAmount,
        notes: row.notes || null,
        status: row.status === 'cancelled' ? 'cancelled' : 'completed',
        created_by: null,
        created_at: now,
        updated_at: now,
        deleted_at: row.deletedAt,
      })),
    );
    await upsertTable(
      'purchase_items',
      livePurchases.flatMap((bill) =>
        bill.items.map((line, index) => ({
          id: line.id || newId(),
          tenant_id: tenantId,
          purchase_id: bill.id,
          variant_id: line.variantId,
          product_name: line.productName,
          size: line.size || '-',
          color: line.color || '-',
          quantity: line.quantity,
          unit_cost: line.unitPrice,
          discount_amount: 0,
          tax_amount: 0,
          line_total: line.lineTotal,
          line_order: index,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })),
      ),
    );

    const liveSaleReturns = shop.saleReturns.filter((row) => row.voucherId);
    await upsertTable(
      'sale_returns',
      liveSaleReturns.map((row) => ({
        id: row.id,
        tenant_id: tenantId,
        voucher_id: row.voucherId,
        return_no: row.returnNo,
        return_date: row.returnDate,
        sale_id: row.sourceId,
        customer_id: null,
        subtotal: row.grandTotal,
        tax_amount: 0,
        grand_total: row.grandTotal,
        notes: null,
        created_by: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })),
    );
    await upsertTable(
      'sale_return_items',
      liveSaleReturns.flatMap((doc) =>
        doc.items.map((line) => ({
          id: line.id || newId(),
          tenant_id: tenantId,
          sale_return_id: doc.id,
          variant_id: line.variantId,
          quantity: line.quantity,
          unit_price: line.unitPrice,
          line_total: line.lineTotal,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })),
      ),
    );
    const livePurchaseReturns = shop.purchaseReturns.filter((row) => row.voucherId);
    await upsertTable(
      'purchase_returns',
      livePurchaseReturns.map((row) => ({
        id: row.id,
        tenant_id: tenantId,
        voucher_id: row.voucherId,
        return_no: row.returnNo,
        return_date: row.returnDate,
        purchase_id: row.sourceId,
        vendor_id: null,
        subtotal: row.grandTotal,
        tax_amount: 0,
        grand_total: row.grandTotal,
        notes: null,
        created_by: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })),
    );
    await upsertTable(
      'purchase_return_items',
      livePurchaseReturns.flatMap((doc) =>
        doc.items.map((line) => ({
          id: line.id || newId(),
          tenant_id: tenantId,
          purchase_return_id: doc.id,
          variant_id: line.variantId,
          quantity: line.quantity,
          unit_cost: line.unitPrice,
          line_total: line.lineTotal,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })),
      ),
    );

    const counterRows = Object.entries(shop.counters).map(([docType, nextNumber]) => {
      shop.counterIds[docType] = shop.counterIds[docType] || newId();
      return {
        id: shop.counterIds[docType],
        tenant_id: tenantId,
        doc_type: docType,
        prefix: '#',
        next_number: nextNumber,
        pad_length: 5,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
    });
    await upsertTable('document_counters', counterRows);
    await upsertTable(
      'audit_logs',
      shop.audit.slice(0, 80).map((row) => ({
        id: row.id,
        tenant_id: tenantId,
        user_id: null,
        action: row.action,
        module: row.module,
        entity_id: null,
        details: row.details,
        created_at: row.at,
      })),
    );

    const movements = [
      ...liveSales.flatMap((sale) =>
        sale.items.map((line) => ({
          id: `${sale.id}:${line.id}:sale`,
          tenant_id: tenantId,
          variant_id: line.variantId,
          movement_type: 'sale',
          quantity: line.quantity,
          reference_type: 'sale',
          reference_id: sale.id,
          notes: sale.invoiceNo,
          created_by: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })),
      ),
      ...livePurchases.flatMap((bill) =>
        bill.items.map((line) => ({
          id: `${bill.id}:${line.id}:purchase`,
          tenant_id: tenantId,
          variant_id: line.variantId,
          movement_type: 'purchase',
          quantity: line.quantity,
          reference_type: 'purchase',
          reference_id: bill.id,
          notes: bill.invoiceNo,
          created_by: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })),
      ),
    ];
    await upsertTable('stock_movements', movements);
    markRefreshSuccess({
      customerCount: shop.customers.length,
      productCount: shop.products.length,
      saleCount: shop.sales.length,
    });
  } finally {
    pushing = false;
  }
}

function schedulePush() {
  if (!cloudReady) return;
  if (pullTimer) clearTimeout(pullTimer);
  pullTimer = setTimeout(() => {
    void pushShopToCloud().catch((err) => markRefreshError(describeError(err)));
  }, 1800);
}

export async function hydrateCloudSync() {
  const pulled = await AsyncStorage.getItem(PULLED_KEY);
  if (pulled) cloudReady = true;
  try {
    await pullShopFromCloud();
    lastAutoAt = Date.now();
    wasOnline = true;
  } catch (err) {
    const message = describeError(err);
    markRefreshError(message);
    if (/offline/i.test(message)) wasOnline = false;
    if (cloudReady) setErpPersistHook(schedulePush);
  }
}

export async function syncShopNow() {
  try {
    if (cloudReady) await pushShopToCloud();
    await pullShopFromCloud();
  } catch (err) {
    const message = describeError(err);
    markRefreshError(message);
    throw new Error(message);
  }
}

const MIN_GAP_MS = 60_000;
const INTERVAL_MS = 15 * 60 * 1000;
const ONLINE_POLL_MS = 30_000;

let autoSyncing = false;
let lastAutoAt = 0;
let wasOnline = true;
let schedulerStarted = false;
let appStateSub: { remove: () => void } | null = null;

async function isCloudReachable(): Promise<boolean> {
  try {
    const { client } = requireCloud();
    const { error } = await client.from('tenants').select('id').limit(1);
    if (error && /failed to fetch|network request failed|network error/i.test(error.message)) {
      return false;
    }
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (/offline|fetch|network/i.test(message)) return false;
    return getAppConfig().isReady;
  }
}

/** Same idea as desktop: when the app is open and the net is back, books refresh without tapping Sync. */
export async function maybeAutoSync(options?: { force?: boolean }) {
  if (!getAppConfig().isReady) return;
  if (autoSyncing) return;
  if (!options?.force && Date.now() - lastAutoAt < MIN_GAP_MS) return;
  if (!(await isCloudReachable())) return;

  autoSyncing = true;
  lastAutoAt = Date.now();
  try {
    await syncShopNow();
  } catch {
    /* status already recorded */
  } finally {
    autoSyncing = false;
  }
}

export function startCloudSyncScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const tickOnline = async () => {
    const online = await isCloudReachable();
    if (online && !wasOnline) {
      void maybeAutoSync({ force: true });
    }
    wasOnline = online;
  };

  void tickOnline();
  setInterval(() => void maybeAutoSync(), INTERVAL_MS);
  setInterval(() => void tickOnline(), ONLINE_POLL_MS);

  appStateSub?.remove();
  appStateSub = AppState.addEventListener('change', (state) => {
    if (state === 'active') void maybeAutoSync();
  });
}
