import AsyncStorage from '@react-native-async-storage/async-storage';

import { getMemberTenantId } from '@/lib/config';
import { getSupabase } from '@/lib/supabase';

const PRODUCT_FLAGS_KEY = 'agrisoft.cloud.productFlags';

type ColumnCheck = { table: string; columns: string[] };

function requireCloud() {
  const client = getSupabase();
  const tenantId = getMemberTenantId();
  if (!client) throw new Error("Couldn't reach the cloud.");
  if (!tenantId) throw new Error('Sign in with your shop code.');
  return { client, tenantId };
}

function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: string }).message ?? '');
  }
  if (error instanceof Error) return error.message;
  return '';
}

function columnName(message: string) {
  const quoted = message.match(/Could not find the '([a-z0-9_]+)' column/i);
  if (quoted) return quoted[1];
  const relation = message.match(/column "?[a-z0-9_]+\.([a-z0-9_]+)"? does not exist/i);
  return relation?.[1] ?? '';
}

function tableName(message: string) {
  const cache = message.match(/Could not find the table '(?:public\.)?([a-z0-9_]+)'/i);
  if (cache) return cache[1];
  const relation = message.match(/relation "(?:public\.)?([a-z0-9_]+)" does not exist/i);
  return relation?.[1] ?? '';
}

async function missingNames(table: string, columns: string[]) {
  const { client, tenantId } = requireCloud();
  const pending = [...columns];
  const missing: string[] = [];
  for (let i = 0; i < columns.length + 1; i += 1) {
    const select = pending.length ? pending.join(',') : 'id';
    const { error } = await client.from(table).select(select).eq('tenant_id', tenantId).limit(0);
    if (!error) return missing;
    const message = errorMessage(error);
    if (/failed to fetch|network request failed|network error/i.test(message)) {
      throw new Error("You're offline. This was not saved.");
    }
    const missingTable = tableName(message);
    if (missingTable) {
      missing.push(`table ${missingTable}`);
      return missing;
    }
    const column = columnName(message);
    if (column && pending.includes(column)) {
      missing.push(`${table}.${column}`);
      pending.splice(pending.indexOf(column), 1);
      continue;
    }
    throw new Error(message || `Couldn't check ${table}.`);
  }
  return missing;
}

/** Throws a list of missing tables or columns. Does not write any shop data. */
export async function requireCloudColumns(checks: ColumnCheck[]) {
  const missing: string[] = [];
  for (const check of checks) {
    missing.push(...(await missingNames(check.table, check.columns)));
  }
  if (missing.length) {
    throw new Error(`Cloud is missing:\n${missing.join('\n')}`);
  }
  if (checks.some((check) => check.table === 'products' && check.columns.includes('track_batch'))) {
    await AsyncStorage.setItem(PRODUCT_FLAGS_KEY, '1');
  }
}

export async function productFlagColumnsReady() {
  return (await AsyncStorage.getItem(PRODUCT_FLAGS_KEY)) === '1';
}

export const PRODUCT_FLAG_COLUMNS = ['track_batch', 'is_crop'];
export const ITEM_BATCH_COLUMNS = ['batch_no', 'expiry_date'];
export const PURCHASE_ITEM_BATCH_COLUMNS = ['batch_no', 'manufactured_date', 'expiry_date'];
export const STOCK_BATCH_COLUMNS = [
  'id',
  'tenant_id',
  'variant_id',
  'batch_no',
  'manufactured_date',
  'expiry_date',
  'qty',
  'created_at',
  'updated_at',
  'deleted_at',
];
export const CROP_PURCHASE_COLUMNS = [
  'id',
  'tenant_id',
  'voucher_id',
  'doc_no',
  'doc_date',
  'party_type',
  'party_id',
  'variant_id',
  'product_name',
  'safi_weight',
  'gross_amount',
  'commission',
  'brokerage',
  'mazdoori',
  'fees',
  'bardana',
  'deduction_amount',
  'net_payable',
  'paid_amount',
  'remarks',
  'status',
  'created_at',
  'updated_at',
  'deleted_at',
];
export const CROP_VEHICLE_COLUMNS = [
  'id',
  'tenant_id',
  'crop_purchase_id',
  'vehicle_no',
  'bags',
  'total_weight',
  'kaat',
  'safi_weight',
  'rate',
  'amount',
  'line_order',
  'deleted_at',
];
export const CROP_SALE_COLUMNS = [
  'id',
  'tenant_id',
  'voucher_id',
  'doc_no',
  'doc_date',
  'customer_id',
  'variant_id',
  'product_name',
  'weight',
  'rate',
  'amount',
  'paid_amount',
  'remarks',
  'status',
  'created_at',
  'updated_at',
  'deleted_at',
];

type BatchShop = {
  products: { trackBatch?: boolean; isCrop?: boolean }[];
  batches?: { batchNo?: string }[];
  purchases: { items: { batchNo?: string }[] }[];
  sales: { items: { batchNo?: string }[] }[];
};

export function shopSendsProductFlags(shop: BatchShop) {
  return shop.products.some((row) => row.trackBatch || row.isCrop);
}

export function shopSendsItemBatches(shop: BatchShop) {
  return (
    (shop.batches ?? []).some((row) => Boolean(row.batchNo)) ||
    shop.purchases.some((row) => row.items.some((line) => Boolean(line.batchNo))) ||
    shop.sales.some((row) => row.items.some((line) => Boolean(line.batchNo)))
  );
}
