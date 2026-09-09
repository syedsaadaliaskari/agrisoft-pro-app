import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'agrisoft.cloud.tombstones';

export type ShopTable =
  | 'customers'
  | 'vendors'
  | 'products'
  | 'product_variants'
  | 'units'
  | 'categories'
  | 'taxes'
  | 'discounts'
  | 'additions'
  | 'sales'
  | 'purchases'
  | 'vouchers'
  | 'sale_returns'
  | 'purchase_returns';

export type Tombstone = { table: ShopTable; id: string; at: string };

let rows: Tombstone[] = [];
let loaded = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function persistSoon() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void AsyncStorage.setItem(KEY, JSON.stringify(rows));
  }, 50);
}

export async function hydrateTombstones() {
  if (loaded) return;
  const pending = rows;
  const raw = await AsyncStorage.getItem(KEY);
  let stored: Tombstone[] = [];
  try {
    stored = raw ? (JSON.parse(raw) as Tombstone[]) : [];
    if (!Array.isArray(stored)) stored = [];
  } catch {
    stored = [];
  }
  const map = new Map<string, Tombstone>();
  for (const row of stored) map.set(`${row.table}:${row.id}`, row);
  for (const row of pending) map.set(`${row.table}:${row.id}`, row);
  rows = [...map.values()];
  loaded = true;
  await AsyncStorage.setItem(KEY, JSON.stringify(rows));
}

export function rememberDeleted(table: ShopTable, id: string, at = new Date().toISOString()) {
  if (!id) return;
  rows = rows.filter((row) => !(row.table === table && row.id === id));
  rows.push({ table, id, at });
  persistSoon();
}

export function listTombstones() {
  return rows;
}

export function isTombstoned(table: ShopTable, id: string) {
  return rows.some((row) => row.table === table && row.id === id);
}

export async function dropTombstones(done: Tombstone[]) {
  if (!done.length) return;
  const keys = new Set(done.map((row) => `${row.table}:${row.id}`));
  rows = rows.filter((row) => !keys.has(`${row.table}:${row.id}`));
  await AsyncStorage.setItem(KEY, JSON.stringify(rows));
}
