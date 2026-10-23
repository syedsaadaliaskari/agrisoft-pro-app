import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

import { productFlagColumnsReady, shopSendsItemBatches, shopSendsProductFlags } from '@/lib/cloudSchema';
import { getAppConfig, getMemberTenantId } from '@/lib/config';
import {
  applyCloudSnapshot,
  getShopSnapshot,
  setErpPersistHook,
  type Account,
  type AccountType,
  type AmountType,
  type CropPurchase,
  type CropSale,
  type Named,
  type Party,
  type PaymentMode,
  type Product,
  type PurchaseDoc,
  type ReturnDoc,
  type SaleDoc,
  type StockBatch,
  type Voucher,
  type VoucherType,
} from '@/lib/erp';
import { newId } from '@/lib/id';
import { getSupabase } from '@/lib/supabase';
import { markOffline, markPendingPush, markRefreshError, markRefreshSuccess, getSyncStatus } from '@/lib/syncStatus';
import {
  dropTombstones,
  hydrateTombstones,
  isTombstoned,
  listTombstones,
  type ShopTable,
} from '@/lib/tombstones';

const PULLED_KEY = 'agrisoft.cloud.pulled';
const LAST_PULL_KEY = 'agrisoft.cloud.lastPullAt';
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
  const tenantId = getMemberTenantId();
  if (!client) throw new Error("Couldn't reach the cloud.");
  if (!tenantId) throw new Error('Sign in with your shop code.');
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

/** Existing cloud row ids, including soft-deleted rows that still hold the unique key. */
async function remoteIdsBy(table: string, keyOf: (row: Record<string, unknown>) => string): Promise<Record<string, string>> {
  const { client, tenantId } = requireCloud();
  const ids: Record<string, string> = {};
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client.from(table).select('*').eq('tenant_id', tenantId).range(from, from + PAGE - 1);
    if (error) throw new Error(describeError(error, `Couldn't read ${table}.`));
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    for (const row of rows) {
      const key = keyOf(row);
      const id = text(row.id);
      if (key && id) ids[key] = id;
    }
    if (rows.length < PAGE) break;
  }
  return ids;
}

function remoteRowIds(table: string, keyColumn: string) {
  return remoteIdsBy(table, (row) => text(row[keyColumn]));
}

/** Point phone rows at the cloud row that already owns this shop key, and remember the id change. */
async function bindCloudIds(table: string, keyColumn: string, rows: Record<string, unknown>[]) {
  const remote = await remoteRowIds(table, keyColumn);
  const map = new Map<string, string>();
  for (const row of rows) {
    const localId = text(row.id);
    const cloudId = remote[text(row[keyColumn])];
    if (!localId || !cloudId) continue;
    row.id = cloudId;
    map.set(localId, cloudId);
  }
  return map;
}

function cloudRef(value: unknown, ...maps: Map<string, string>[]) {
  const id = text(value);
  if (!id) return null;
  for (const map of maps) {
    const next = map.get(id);
    if (next) return next;
  }
  return id;
}

async function saveRowsByNaturalKey(table: string, keyColumn: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const remote = await remoteRowIds(table, keyColumn);
  const { client, tenantId } = requireCloud();
  for (const row of rows) {
    const key = text(row[keyColumn]);
    const { id: _id, created_at: _created, ...patch } = row;
    const remoteId = remote[key];
    if (remoteId) {
      const { error } = await client.from(table).update(patch).eq('id', remoteId).eq('tenant_id', tenantId);
      if (error) throw new Error(describeError(error, `Couldn't save ${table}.`));
      continue;
    }
    const updated = await client.from(table).update(patch).eq('tenant_id', tenantId).eq(keyColumn, key).select('id');
    if (updated.error) throw new Error(describeError(updated.error, `Couldn't save ${table}.`));
    if ((updated.data ?? []).length > 0) continue;
    const inserted = await client.from(table).insert(row);
    if (isRowConflict(inserted.error)) continue;
    if (inserted.error) throw new Error(describeError(inserted.error, `Couldn't save ${table}.`));
  }
}

function isRowConflict(error: { message?: string; code?: string; details?: string } | null) {
  if (!error) return false;
  const blob = `${error.code || ''} ${error.message || ''} ${error.details || ''}`;
  return error.code === '23505' || /duplicate key|unique constraint|row-level security|23505/i.test(blob);
}

async function upsertTable(table: string, rows: Record<string, unknown>[], keyColumn?: string) {
  const idMap = keyColumn ? await bindCloudIds(table, keyColumn, rows) : new Map<string, string>();
  if (!rows.length) return idMap;
  if (keyColumn) {
    await saveRowsByNaturalKey(table, keyColumn, rows);
    return idMap;
  }
  const { client } = requireCloud();
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await client.from(table).upsert(chunk, { onConflict: 'id' });
    if (error && isRowConflict(error)) continue;
    if (error) throw new Error(describeError(error, `Couldn't save ${table}.`));
  }
  return idMap;
}

async function pushTombstones() {
  await hydrateTombstones();
  const pending = listTombstones();
  if (!pending.length) return;
  const { client, tenantId } = requireCloud();
  const done: typeof pending = [];
  for (const row of pending) {
    const { error } = await client
      .from(row.table)
      .update({ deleted_at: row.at, updated_at: row.at })
      .eq('id', row.id)
      .eq('tenant_id', tenantId);
    if (error) throw new Error(describeError(error, "Couldn't update the cloud after a delete."));
    done.push(row);
  }
  await dropTombstones(done);
}

async function fetchOptional<T>(table: string): Promise<T[] | null> {
  try {
    return await fetchTable<T>(table);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/could not find the table|does not exist|schema cache/i.test(message)) return null;
    throw err;
  }
}

function flag(value: unknown) {
  return value === true || value === 1 || value === '1' || value === 'true';
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
    equals_kg?: number | null;
    is_active?: boolean | null;
  }[],
  keepEquals = false,
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
    equalsKg:
      'equals_kg' in row
        ? row.equals_kg == null || Number(row.equals_kg) <= 0
          ? null
          : Number(row.equals_kg)
        : keepEquals
          ? storeUnitsEquals(row.id)
          : undefined,
    isActive: row.is_active !== false,
  }));
}

function storeUnitsEquals(id: string) {
  return getShopSnapshot().units.find((unit) => unit.id === id)?.equalsKg ?? null;
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
    updated_at?: string | null;
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
    updatedAt: text(row.updated_at) || undefined,
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
    isCrop: flag(row.is_crop),
    trackBatch: flag(row.is_crop) ? false : flag(row.track_batch),
    updatedAt: text(row.updated_at) || undefined,
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
      batchNo: text(row.batch_no),
      expiryDate: text(row.expiry_date),
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
      updatedAt: text(row.updated_at) || undefined,
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
      batchNo: text(row.batch_no),
      manufacturedDate: text(row.manufactured_date),
      expiryDate: text(row.expiry_date),
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
      updatedAt: text(row.updated_at) || undefined,
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

  const remoteCustomers = partyFrom(customers as never, 'debit').filter(
    (row) => row.isActive && !isTombstoned('customers', row.id),
  );
  const remoteVendors = partyFrom(vendors as never, 'credit').filter(
    (row) => row.isActive && !isTombstoned('vendors', row.id),
  );
  const remoteProducts = mappedProducts.filter((row) => row.isActive && !isTombstoned('products', row.id));
  const remoteSales = mappedSales.filter((row) => !row.deletedAt && !isTombstoned('sales', row.id));
  const remotePurchases = mappedPurchases.filter((row) => !row.deletedAt && !isTombstoned('purchases', row.id));

  const [batchRows, cropPurchaseRows, cropVehicleRows, cropSaleRows] = await Promise.all([
    fetchOptional<Record<string, unknown>>('stock_batches'),
    fetchOptional<Record<string, unknown>>('crop_purchases'),
    fetchOptional<Record<string, unknown>>('crop_purchase_vehicles'),
    fetchOptional<Record<string, unknown>>('crop_sales'),
  ]);
  const mappedBatches: StockBatch[] | undefined = batchRows
    ? batchRows.map((row) => ({
        id: text(row.id),
        variantId: text(row.variant_id),
        batchNo: text(row.batch_no),
        manufacturedDate: text(row.manufactured_date),
        expiryDate: text(row.expiry_date),
        qty: n(row.qty),
        updatedAt: text(row.updated_at) || undefined,
      }))
    : undefined;
  const vehiclesByPurchase = new Map<string, CropPurchase['vehicles']>();
  for (const row of cropVehicleRows ?? []) {
    const purchaseId = text(row.crop_purchase_id);
    const list = vehiclesByPurchase.get(purchaseId) ?? [];
    list.push({
      id: text(row.id),
      vehicleNo: text(row.vehicle_no),
      bags: n(row.bags),
      totalWeight: n(row.total_weight),
      kaat: n(row.kaat),
      safiWeight: n(row.safi_weight),
      rate: n(row.rate),
      amount: n(row.amount),
      stockFactor: 'stock_factor' in row ? n(row.stock_factor) || 1 : 1,
      weighUnit: 'weigh_unit' in row ? text(row.weigh_unit) || null : null,
      lineOrder: n(row.line_order),
    });
    vehiclesByPurchase.set(purchaseId, list);
  }
  const mappedCropPurchases: CropPurchase[] | undefined = cropPurchaseRows
    ? cropPurchaseRows.map((row) => {
        const partyType = text(row.party_type) === 'vendor' ? 'vendor' : 'customer';
        const partyId = text(row.party_id);
        return {
          id: text(row.id),
          voucherId: text(row.voucher_id),
          docNo: text(row.doc_no),
          docDate: text(row.doc_date),
          partyType,
          partyId,
          partyName: (partyType === 'customer' ? customersById.get(partyId) : vendorsById.get(partyId)) || '',
          variantId: text(row.variant_id),
          productName: text(row.product_name),
          safiWeight: n(row.safi_weight),
          grossAmount: n(row.gross_amount),
          commission: n(row.commission),
          brokerage: n(row.brokerage),
          mazdoori: n(row.mazdoori),
          fees: n(row.fees),
          bardana: n(row.bardana),
          deductionAmount: n(row.deduction_amount),
          netPayable: n(row.net_payable),
          paidAmount: n(row.paid_amount),
          cashPaid: 0,
          bankPaid: 0,
          remarks: text(row.remarks),
          status: 'completed',
          vehicles: (vehiclesByPurchase.get(text(row.id)) ?? []).sort((a, b) => (a.lineOrder ?? 0) - (b.lineOrder ?? 0)),
          updatedAt: text(row.updated_at) || undefined,
        };
      })
    : undefined;
  const mappedCropSales: CropSale[] | undefined = cropSaleRows
    ? cropSaleRows.map((row) => ({
        id: text(row.id),
        voucherId: text(row.voucher_id),
        docNo: text(row.doc_no),
        docDate: text(row.doc_date),
        customerId: text(row.customer_id),
        customerName: customersById.get(text(row.customer_id)) || '',
        variantId: text(row.variant_id),
        productName: text(row.product_name),
        weight: n(row.weight),
        rate: n(row.rate),
        amount: n(row.amount),
        stockFactor: 'stock_factor' in row ? n(row.stock_factor) || 1 : 1,
        weighUnit: 'weigh_unit' in row ? text(row.weigh_unit) || null : null,
        commission: n(row.commission),
        brokerage: n(row.brokerage),
        mazdoori: n(row.mazdoori),
        fees: n(row.fees),
        bardana: n(row.bardana),
        deductionAmount: n(row.deduction_amount),
        netAmount: n(row.deduction_amount) > 0 || n(row.net_amount) > 0 ? n(row.net_amount) : n(row.amount),
        costAmount: n(row.cost_amount),
        paidAmount: n(row.paid_amount),
        cashPaid: 0,
        bankPaid: 0,
        remarks: text(row.remarks),
        status: text(row.status) === 'deleted' ? 'deleted' : 'completed',
        updatedAt: text(row.updated_at) || undefined,
      }))
    : undefined;

  await applyCloudSnapshot({
    settings: settingsPatch,
    settingIds,
    units: namedFrom(units, true),
    categories: namedFrom(categories),
    taxes: namedFrom(taxes),
    discounts: namedFrom(discounts),
    additions: namedFrom(additions),
    customers: remoteCustomers,
    vendors: remoteVendors,
    products: remoteProducts,
    accounts: mappedAccounts,
    sales: remoteSales,
    purchases: remotePurchases,
    batches: mappedBatches,
    cropPurchases: mappedCropPurchases,
    cropSales: mappedCropSales,
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
  await AsyncStorage.setItem(LAST_PULL_KEY, stamp());
  setErpPersistHook(onLocalChange);
  markRefreshSuccess({
    customerCount: remoteCustomers.length,
    productCount: remoteProducts.length,
    saleCount: remoteSales.length,
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
    equals_kg: table === 'units' ? row.equalsKg ?? null : undefined,
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
    const sendFlags = shopSendsProductFlags(shop) || (await productFlagColumnsReady());
    const sendItemBatches = shopSendsItemBatches(shop);
    const now = stamp();
    const settingsKeys: (keyof typeof shop.settings)[] = [
      'shop_name',
      'shop_phone',
      'shop_address',
      'currency_symbol',
      'currency_code',
      'tax_mode',
      'receipt_footer',
    ];
    const remoteSettingIds = await remoteRowIds('settings', 'key');
    const settings = settingsKeys.map((key) => {
      shop.settingIds[key] = remoteSettingIds[key] || shop.settingIds[key] || newId();
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

    await saveRowsByNaturalKey('settings', 'key', settings);
    const equalsProbe = await getSupabase()?.from('units').select('equals_kg').eq('tenant_id', tenantId).limit(0);
    const sendEquals = Boolean(equalsProbe && !equalsProbe.error);
    const unitIds = await upsertTable(
      'units',
      namedPayload('units', shop.units.filter((row) => row.isActive), tenantId, now)
        .map(stripUndef)
        .map((row) => {
          if (!sendEquals) delete row.equals_kg;
          return row;
        }),
      'name',
    );
    const categoryIds = await upsertTable('categories', namedPayload('categories', shop.categories.filter((row) => row.isActive), tenantId, now).map(stripUndef), 'name');
    const taxIds = await upsertTable('taxes', namedPayload('taxes', shop.taxes.filter((row) => row.isActive), tenantId, now).map(stripUndef), 'name');
    await upsertTable('discounts', namedPayload('discounts', shop.discounts.filter((row) => row.isActive), tenantId, now).map(stripUndef), 'name');
    await upsertTable('additions', namedPayload('additions', shop.additions.filter((row) => row.isActive), tenantId, now).map(stripUndef), 'name');
    const customerIds = await upsertTable(
      'customers',
      shop.customers
        .filter((row) => row.isActive && !isTombstoned('customers', row.id))
        .map((row) => ({
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
        updated_at: row.updatedAt || now,
        deleted_at: null,
      })),
      'code',
    );
    const vendorIds = await upsertTable(
      'vendors',
      shop.vendors
        .filter((row) => row.isActive && !isTombstoned('vendors', row.id))
        .map((row) => ({
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
        updated_at: row.updatedAt || now,
        deleted_at: null,
      })),
      'code',
    );
    const accountIds = await upsertTable(
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
      'code',
    );
    const productIds = await upsertTable(
      'products',
      shop.products
        .filter((row) => row.isActive && !isTombstoned('products', row.id))
        .map((row) => ({
        id: row.id,
        tenant_id: tenantId,
        sku: row.sku,
        barcode: row.barcode || null,
        name: row.name,
        description: row.description || null,
        category_id: cloudRef(row.categoryId, categoryIds),
        unit_id: cloudRef(row.unitId, unitIds),
        brand: row.brand || null,
        gender: row.gender || null,
        season: row.season || null,
        cost_price: row.costPrice,
        sale_price: row.salePrice,
        wholesale_price: row.wholesalePrice,
        tax_id: cloudRef(row.taxId, taxIds),
        reorder_level: row.reorderLevel,
        is_active: row.isActive,
        created_at: now,
        updated_at: row.updatedAt || now,
        deleted_at: null,
        ...(sendFlags ? { track_batch: Boolean(row.trackBatch), is_crop: Boolean(row.isCrop) } : {}),
      })),
      'sku',
    );
    const variantIds = await upsertTable(
      'product_variants',
      shop.products
        .filter((row) => row.isActive && !isTombstoned('products', row.id))
        .flatMap((product) =>
        product.variants.map((row) => ({
          id: row.id,
          tenant_id: tenantId,
          product_id: cloudRef(product.id, productIds),
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
      'sku',
    );

    const localAccountIds = new Set(shop.accounts.map((row) => row.id));
    const voucherIdMap = await upsertTable(
      'vouchers',
      shop.vouchers.map((row) => ({
        id: row.id,
        tenant_id: tenantId,
        voucher_no: row.voucherNo,
        voucher_type: row.voucherType,
        voucher_date: row.voucherDate,
        party_type:
          row.voucherType === 'receipt' ||
          row.voucherType === 'sale' ||
          row.voucherType === 'sale_return' ||
          row.voucherType === 'crop_sale' ||
          row.voucherType === 'crop_purchase'
            ? 'customer'
            : row.partyId
              ? 'vendor'
              : null,
        party_id: cloudRef(row.partyId, customerIds, vendorIds),
        account_id: row.accountId && localAccountIds.has(row.accountId) ? cloudRef(row.accountId, accountIds) : null,
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
      'voucher_no',
    );
    await upsertTable(
      'voucher_entries',
      shop.vouchers.flatMap((voucher) =>
        voucher.entries
          .filter((entry) => localAccountIds.has(entry.accountId))
          .map((entry, index) => ({
            id: entry.id || newId(),
            tenant_id: tenantId,
            voucher_id: cloudRef(voucher.id, voucherIdMap),
            account_id: cloudRef(entry.accountId, accountIds),
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

    const liveSales = shop.sales.filter(
      (row) => row.voucherId && !row.deletedAt && !isTombstoned('sales', row.id),
    );
    const saleIds = await upsertTable(
      'sales',
      liveSales.map((row) => ({
        id: row.id,
        tenant_id: tenantId,
        voucher_id: cloudRef(row.voucherId, voucherIdMap),
        invoice_no: row.invoiceNo,
        invoice_date: row.invoiceDate,
        customer_id: cloudRef(row.customerId, customerIds),
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
      'invoice_no',
    );
    await upsertTable(
      'sale_items',
      liveSales.flatMap((sale) =>
        sale.items.map((line, index) => ({
          id: line.id || newId(),
          tenant_id: tenantId,
          sale_id: cloudRef(sale.id, saleIds),
          variant_id: cloudRef(line.variantId, variantIds),
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
          ...(sendItemBatches ? { batch_no: line.batchNo || null, expiry_date: line.expiryDate || null } : {}),
        })),
      ),
    );

    const livePurchases = shop.purchases.filter(
      (row) => row.voucherId && !row.deletedAt && !isTombstoned('purchases', row.id),
    );
    const purchaseIds = await upsertTable(
      'purchases',
      livePurchases.map((row) => ({
        id: row.id,
        tenant_id: tenantId,
        voucher_id: cloudRef(row.voucherId, voucherIdMap),
        invoice_no: row.invoiceNo,
        vendor_id: cloudRef(row.vendorId, vendorIds),
        invoice_date: row.invoiceDate,
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
      'invoice_no',
    );
    await upsertTable(
      'purchase_items',
      livePurchases.flatMap((bill) =>
        bill.items.map((line, index) => ({
          id: line.id || newId(),
          tenant_id: tenantId,
          purchase_id: cloudRef(bill.id, purchaseIds),
          variant_id: cloudRef(line.variantId, variantIds),
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
          ...(sendItemBatches
            ? {
                batch_no: line.batchNo || null,
                manufactured_date: line.manufacturedDate || null,
                expiry_date: line.expiryDate || null,
              }
            : {}),
        })),
      ),
    );

    const liveSaleReturns = shop.saleReturns.filter((row) => row.voucherId);
    const saleReturnIds = await upsertTable(
      'sale_returns',
      liveSaleReturns.map((row) => ({
        id: row.id,
        tenant_id: tenantId,
        voucher_id: cloudRef(row.voucherId, voucherIdMap),
        return_no: row.returnNo,
        return_date: row.returnDate,
        sale_id: cloudRef(row.sourceId, saleIds),
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
      'return_no',
    );
    await upsertTable(
      'sale_return_items',
      liveSaleReturns.flatMap((doc) =>
        doc.items.map((line) => ({
          id: line.id || newId(),
          tenant_id: tenantId,
          sale_return_id: cloudRef(doc.id, saleReturnIds),
          variant_id: cloudRef(line.variantId, variantIds),
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
    const purchaseReturnIds = await upsertTable(
      'purchase_returns',
      livePurchaseReturns.map((row) => ({
        id: row.id,
        tenant_id: tenantId,
        voucher_id: cloudRef(row.voucherId, voucherIdMap),
        return_no: row.returnNo,
        return_date: row.returnDate,
        purchase_id: cloudRef(row.sourceId, purchaseIds),
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
      'return_no',
    );
    await upsertTable(
      'purchase_return_items',
      livePurchaseReturns.flatMap((doc) =>
        doc.items.map((line) => ({
          id: line.id || newId(),
          tenant_id: tenantId,
          purchase_return_id: cloudRef(doc.id, purchaseReturnIds),
          variant_id: cloudRef(line.variantId, variantIds),
          quantity: line.quantity,
          unit_cost: line.unitPrice,
          line_total: line.lineTotal,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })),
      ),
    );

    const remoteCounterIds = await remoteRowIds('document_counters', 'doc_type');
    const counterRows = Object.entries(shop.counters).map(([docType, nextNumber]) => {
      shop.counterIds[docType] = remoteCounterIds[docType] || shop.counterIds[docType] || newId();
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
    await saveRowsByNaturalKey('document_counters', 'doc_type', counterRows);
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

    if (sendItemBatches && shop.batches.length) {
      await upsertTable(
        'stock_batches',
        shop.batches.map((row) => ({
          id: row.id,
          tenant_id: tenantId,
          variant_id: cloudRef(row.variantId, variantIds),
          batch_no: row.batchNo,
          manufactured_date: row.manufacturedDate || null,
          expiry_date: row.expiryDate || null,
          qty: row.qty,
          created_at: row.updatedAt || now,
          updated_at: row.updatedAt || now,
          deleted_at: null,
        })),
      );
    }
    if (shop.cropPurchases.length) {
      await upsertTable(
        'crop_purchases',
        shop.cropPurchases.map((row) => ({
          id: row.id,
          tenant_id: tenantId,
          voucher_id: cloudRef(row.voucherId, voucherIdMap),
          doc_no: row.docNo,
          doc_date: row.docDate,
          party_type: row.partyType,
          party_id: cloudRef(row.partyId, customerIds, vendorIds),
          variant_id: cloudRef(row.variantId, variantIds),
          product_name: row.productName,
          safi_weight: row.safiWeight,
          gross_amount: row.grossAmount,
          commission: row.commission,
          brokerage: row.brokerage,
          mazdoori: row.mazdoori,
          fees: row.fees,
          bardana: row.bardana,
          deduction_amount: row.deductionAmount,
          net_payable: row.netPayable,
          paid_amount: row.paidAmount,
          remarks: row.remarks || null,
          status: row.status,
          created_at: row.updatedAt || now,
          updated_at: row.updatedAt || now,
          deleted_at: row.status === 'deleted' ? row.updatedAt || now : null,
        })),
      );
      const vehicleFactorProbe = await getSupabase()
        ?.from('crop_purchase_vehicles')
        .select('stock_factor')
        .eq('tenant_id', tenantId)
        .limit(0);
      const sendVehicleFactor = Boolean(vehicleFactorProbe && !vehicleFactorProbe.error);
      await upsertTable(
        'crop_purchase_vehicles',
        shop.cropPurchases.filter((row) => row.status !== 'deleted').flatMap((row) =>
          row.vehicles.map((vehicle, index) => ({
            id: vehicle.id,
            tenant_id: tenantId,
            crop_purchase_id: row.id,
            vehicle_no: vehicle.vehicleNo,
            bags: vehicle.bags,
            total_weight: vehicle.totalWeight,
            kaat: vehicle.kaat,
            safi_weight: vehicle.safiWeight,
            rate: vehicle.rate,
            amount: vehicle.amount,
            line_order: index,
            deleted_at: null,
            ...(sendVehicleFactor ? { stock_factor: vehicle.stockFactor ?? 1, weigh_unit: vehicle.weighUnit ?? null } : {}),
          })),
        ),
      );
    }
    if (shop.cropSales.length) {
      const chargeProbe = await getSupabase()
        ?.from('crop_sales')
        .select('mazdoori,net_amount,cost_amount')
        .eq('tenant_id', tenantId)
        .limit(0);
      const sendSaleCharges = Boolean(chargeProbe && !chargeProbe.error);
      const saleFactorProbe = await getSupabase()?.from('crop_sales').select('stock_factor').eq('tenant_id', tenantId).limit(0);
      const sendSaleFactor = Boolean(saleFactorProbe && !saleFactorProbe.error);
      await upsertTable(
        'crop_sales',
        shop.cropSales.map((row) => ({
          id: row.id,
          tenant_id: tenantId,
          voucher_id: cloudRef(row.voucherId, voucherIdMap),
          doc_no: row.docNo,
          doc_date: row.docDate,
          customer_id: cloudRef(row.customerId, customerIds),
          variant_id: cloudRef(row.variantId, variantIds),
          product_name: row.productName,
          weight: row.weight,
          rate: row.rate,
          amount: row.amount,
          paid_amount: row.paidAmount,
          remarks: row.remarks || null,
          status: row.status,
          created_at: row.updatedAt || now,
          updated_at: row.updatedAt || now,
          deleted_at: row.status === 'deleted' ? row.updatedAt || now : null,
          ...(sendSaleFactor ? { stock_factor: row.stockFactor ?? 1, weigh_unit: row.weighUnit ?? null } : {}),
          ...(sendSaleCharges
            ? {
                commission: row.commission || 0,
                brokerage: row.brokerage || 0,
                mazdoori: row.mazdoori || 0,
                fees: row.fees || 0,
                bardana: row.bardana || 0,
                deduction_amount: row.deductionAmount || 0,
                net_amount: row.netAmount || row.amount,
                cost_amount: row.costAmount || 0,
              }
            : {}),
        })),
      );
    }

    const movements = [
      ...liveSales.flatMap((sale) =>
        sale.items.map((line) => ({
          id: `${sale.id}:${line.id}:sale`,
          tenant_id: tenantId,
          variant_id: cloudRef(line.variantId, variantIds),
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
          variant_id: cloudRef(line.variantId, variantIds),
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
      ...shop.cropPurchases.map((row) => ({
        id: `${row.id}:crop-in`,
        tenant_id: tenantId,
        variant_id: cloudRef(row.variantId, variantIds),
        movement_type: 'purchase',
        quantity: row.safiWeight,
        reference_type: 'crop_purchase',
        reference_id: row.id,
        notes: row.docNo,
        created_by: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })),
      ...shop.cropSales.map((row) => ({
        id: `${row.id}:crop-out`,
        tenant_id: tenantId,
        variant_id: cloudRef(row.variantId, variantIds),
        movement_type: 'sale',
        quantity: row.weight,
        reference_type: 'crop_sale',
        reference_id: row.id,
        notes: row.docNo,
        created_by: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })),
    ];
    await upsertTable('stock_movements', movements);
    markRefreshSuccess({
      customerCount: shop.customers.length,
      productCount: shop.products.length,
      saleCount: shop.sales.length,
    });
    await syncShopUsersQuietly();
  } finally {
    pushing = false;
  }
}

async function syncShopUsersQuietly() {
  try {
    const { syncShopUsers } = await import('@/lib/userSync');
    await syncShopUsers();
  } catch {
    /* a password sync must not stop customers, products, or sales */
  }
}

function onLocalChange() {
  markPendingPush();
  schedulePush();
}

function schedulePush() {
  if (!cloudReady) return;
  if (pullTimer) clearTimeout(pullTimer);
  pullTimer = setTimeout(() => {
    void (async () => {
      await pushTombstones();
      await pushShopToCloud();
    })().catch((err) => {
      const message = describeError(err);
      if (/offline/i.test(message)) markOffline();
      else markRefreshError(message);
    });
  }, 1800);
}

export async function resetCloudPullState() {
  cloudReady = false;
  if (pullTimer) {
    clearTimeout(pullTimer);
    pullTimer = null;
  }
  await AsyncStorage.removeItem(PULLED_KEY);
  await AsyncStorage.removeItem(LAST_PULL_KEY);
}

/** Drop leftover phone rows, then pull this shop from the cloud. */
export async function reloadShopFromCloud() {
  const { resetLocalShopBooks } = await import('@/lib/erp');
  const { clearTombstones } = await import('@/lib/tombstones');
  await resetLocalShopBooks();
  await resetCloudPullState();
  await clearTombstones();
  await pullShopFromCloud();
}

export async function hydrateCloudSync() {
  if (!getMemberTenantId()) return;
  const pulled = await AsyncStorage.getItem(PULLED_KEY);
  if (pulled) cloudReady = true;
  setErpPersistHook(onLocalChange);
  try {
    await hydrateTombstones();
    await pushTombstones();
    await pullShopFromCloud();
    await pushShopToCloud();
    await syncShopUsersQuietly();
    lastAutoAt = Date.now();
    wasOnline = true;
  } catch (err) {
    const message = describeError(err);
    markRefreshError(message);
    if (/offline/i.test(message)) wasOnline = false;
  }
}

export async function syncShopNow() {
  if (!getMemberTenantId()) throw new Error('Sign in with your shop code.');
  try {
    await hydrateTombstones();
    await pushTombstones();
    await pullShopFromCloud();
    await pushShopToCloud();
    await syncShopUsersQuietly();
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
  if (!getMemberTenantId()) return false;
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
  if (!getMemberTenantId() || !getAppConfig().isReady) return;
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
