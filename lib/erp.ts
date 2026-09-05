import AsyncStorage from '@react-native-async-storage/async-storage';

import { newId } from '@/lib/id';

export type PaymentMode = 'cash' | 'credit' | 'bank';
export type AmountType = 'percent' | 'fixed';
export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export type VoucherType =
  | 'sale'
  | 'sale_return'
  | 'purchase'
  | 'purchase_return'
  | 'payment'
  | 'receipt'
  | 'journal'
  | 'expense'
  | 'income';

export type ShopSettings = {
  shop_name: string;
  shop_phone: string;
  shop_address: string;
  currency_symbol: string;
  currency_code: string;
  tax_mode: 'exclusive' | 'inclusive';
  receipt_footer: string;
  n8n_enabled: string;
  n8n_webhook_url: string;
};

export type Named = {
  id: string;
  name: string;
  shortName?: string;
  description?: string;
  rate?: number;
  isInclusive?: boolean;
  type?: AmountType;
  value?: number;
  isActive: boolean;
};

export type Party = {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  openingBalance: number;
  balanceType: 'debit' | 'credit';
  creditLimit: number;
  isActive: boolean;
};

export type Variant = {
  id: string;
  productId: string;
  sku: string;
  barcode: string;
  size: string;
  color: string;
  stockQty: number;
  salePrice: number;
  costPrice: number;
};

export type Product = {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  description: string;
  categoryId: string | null;
  unitId: string | null;
  brand: string;
  gender: string;
  season: string;
  salePrice: number;
  costPrice: number;
  wholesalePrice: number;
  taxId: string | null;
  reorderLevel: number;
  isActive: boolean;
  variants: Variant[];
};

export type Account = {
  id: string;
  code: string;
  name: string;
  accountType: AccountType;
  isSystem: boolean;
  isActive: boolean;
  openingBalance: number;
};

export type DocLine = {
  id: string;
  variantId: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type DocTotalsInput = {
  discountAmount?: number;
  additionAmount?: number;
  taxAmount?: number;
  paidAmount?: number;
  paymentMode: PaymentMode;
};

export type SaleDoc = {
  id: string;
  voucherId: string | null;
  invoiceNo: string;
  invoiceDate: string;
  customerId: string | null;
  customerName: string;
  paymentMode: PaymentMode;
  subtotal: number;
  discountAmount: number;
  additionAmount: number;
  grandTotal: number;
  paidAmount: number;
  taxAmount: number;
  notes: string;
  status: 'posted' | 'cancelled';
  items: DocLine[];
  deletedAt: string | null;
};

export type PurchaseDoc = {
  id: string;
  voucherId: string | null;
  invoiceNo: string;
  invoiceDate: string;
  vendorId: string | null;
  vendorName: string;
  paymentMode: PaymentMode;
  subtotal: number;
  discountAmount: number;
  additionAmount: number;
  grandTotal: number;
  paidAmount: number;
  taxAmount: number;
  notes: string;
  status: 'posted' | 'cancelled';
  items: DocLine[];
  deletedAt: string | null;
};

export type ReturnDoc = {
  id: string;
  voucherId: string | null;
  returnNo: string;
  returnDate: string;
  sourceId: string | null;
  partyName: string;
  grandTotal: number;
  status: 'posted' | 'cancelled';
  items: DocLine[];
};

export type VoucherEntry = {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  narration: string;
};

export type Voucher = {
  id: string;
  voucherNo: string;
  voucherType: VoucherType;
  voucherDate: string;
  partyId: string | null;
  partyName: string;
  accountId: string | null;
  referenceNo: string;
  notes: string;
  grandTotal: number;
  status: 'posted' | 'cancelled';
  entries: VoucherEntry[];
};

export type AuditRow = {
  id: string;
  at: string;
  module: string;
  action: string;
  details: string;
};

export type LedgerLine = {
  date: string;
  voucherNo: string;
  voucherType: VoucherType;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
};

type Store = {
  settings: ShopSettings;
  units: Named[];
  categories: Named[];
  taxes: Named[];
  discounts: Named[];
  additions: Named[];
  customers: Party[];
  vendors: Party[];
  products: Product[];
  accounts: Account[];
  sales: SaleDoc[];
  purchases: PurchaseDoc[];
  saleReturns: ReturnDoc[];
  purchaseReturns: ReturnDoc[];
  vouchers: Voucher[];
  counters: Record<string, number>;
  counterIds: Record<string, string>;
  settingIds: Record<string, string>;
  audit: AuditRow[];
};

const KEY = 'agrisoft.erp';
const listeners = new Set<() => void>();

function today() {
  return new Date().toISOString().slice(0, 10);
}
function now() {
  return new Date().toISOString();
}

function seed(): Store {
  const acc = (
    code: string,
    name: string,
    accountType: AccountType,
  ): Account => ({
    id: newId(),
    code,
    name,
    accountType,
    isSystem: true,
    isActive: true,
    openingBalance: 0,
  });
  return {
    settings: {
      shop_name: 'Agri Soft Store',
      shop_phone: '',
      shop_address: '',
      currency_symbol: 'Rs',
      currency_code: 'PKR',
      tax_mode: 'exclusive',
      receipt_footer: 'Thank you for shopping with Agri Soft!',
      n8n_enabled: '0',
      n8n_webhook_url: '',
    },
    units: [
      { id: newId(), name: 'Kilogram', shortName: 'kg', isActive: true },
      { id: newId(), name: 'Bag', shortName: 'bag', isActive: true },
      { id: newId(), name: 'Litre', shortName: 'L', isActive: true },
      { id: newId(), name: 'Piece', shortName: 'Pc', isActive: true },
      { id: newId(), name: 'Packet', shortName: 'Pkt', isActive: true },
      { id: newId(), name: 'Quintal', shortName: 'Qtl', isActive: true },
    ],
    categories: [
      { id: newId(), name: 'Seeds', isActive: true },
      { id: newId(), name: 'Fertilizers', isActive: true },
      { id: newId(), name: 'Pesticides', isActive: true },
      { id: newId(), name: 'Feed', isActive: true },
      { id: newId(), name: 'Tools', isActive: true },
    ],
    taxes: [
      { id: newId(), name: 'No Tax', rate: 0, isInclusive: false, isActive: true },
      { id: newId(), name: 'GST 5%', rate: 5, isInclusive: false, isActive: true },
      { id: newId(), name: 'GST 18%', rate: 18, isInclusive: false, isActive: true },
    ],
    discounts: [],
    additions: [],
    customers: [],
    vendors: [],
    products: [],
    accounts: [
      acc('1000', 'Assets', 'asset'),
      acc('1100', 'Cash', 'asset'),
      acc('1200', 'Bank', 'asset'),
      acc('1300', 'Receivables', 'asset'),
      acc('1400', 'Inventory', 'asset'),
      acc('2000', 'Liabilities', 'liability'),
      acc('2100', 'Payables', 'liability'),
      acc('3000', 'Equity', 'equity'),
      acc('3100', 'Owner Equity', 'equity'),
      acc('4000', 'Income', 'income'),
      acc('4100', 'Sales', 'income'),
      acc('4200', 'Other Income', 'income'),
      acc('5000', 'Expenses', 'expense'),
      acc('5100', 'Cost of Goods', 'expense'),
      acc('5200', 'Operating Expenses', 'expense'),
      acc('5300', 'Purchase Returns', 'expense'),
    ],
    sales: [],
    purchases: [],
    saleReturns: [],
    purchaseReturns: [],
    vouchers: [],
    counters: {
      sale: 1,
      sale_return: 1,
      purchase: 1,
      purchase_return: 1,
      payment: 1,
      receipt: 1,
      journal: 1,
      expense: 1,
      income: 1,
      customer: 1,
      vendor: 1,
      product: 1,
    },
    counterIds: {},
    settingIds: {},
    audit: [],
  };
}

let store: Store = seed();

function emit() {
  listeners.forEach((fn) => fn());
}
let persistHook: (() => void) | null = null;
let skipPersistHook = false;

export function setErpPersistHook(fn: (() => void) | null) {
  persistHook = fn;
}

async function persist() {
  await AsyncStorage.setItem(KEY, JSON.stringify(store));
  if (!skipPersistHook) persistHook?.();
}
function nextDoc(kind: string) {
  const n = store.counters[kind] ?? 1;
  store.counters[kind] = n + 1;
  return `#${String(n).padStart(5, '0')}`;
}
function accountByCode(code: string) {
  const row = store.accounts.find((a) => a.code === code && a.isActive);
  if (!row) throw new Error('Chart of accounts is missing.');
  return row;
}
function audit(module: string, action: string, details: string) {
  store.audit.unshift({ id: newId(), at: now(), module, action, details });
  store.audit = store.audit.slice(0, 400);
}
function findVariant(variantId: string) {
  for (const product of store.products) {
    const variant = product.variants.find((row) => row.id === variantId);
    if (variant) return { product, variant };
  }
  return null;
}
function bumpStock(variantId: string, delta: number) {
  const found = findVariant(variantId);
  if (!found) throw new Error('Product not found.');
  const next = found.variant.stockQty + delta;
  if (next < -0.0001) throw new Error(`Not enough stock for ${found.product.name}.`);
  found.variant.stockQty = next;
}

export function subscribeErp(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function computeDocTotals(
  subtotal: number,
  extra: {
    discountAmount?: number;
    additionAmount?: number;
    taxAmount?: number;
    paidAmount?: number;
    paymentMode?: PaymentMode;
  },
) {
  const discountAmount = num(extra.discountAmount);
  const additionAmount = num(extra.additionAmount);
  const taxAmount = num(extra.taxAmount);
  const grandTotal = Math.max(0, Math.round((subtotal - discountAmount + additionAmount + taxAmount) * 100) / 100);
  const paidAmount =
    extra.paidAmount == null ? (extra.paymentMode === 'credit' ? 0 : grandTotal) : num(extra.paidAmount);
  return { subtotal, discountAmount, additionAmount, taxAmount, grandTotal, paidAmount };
}

function makeLines(items: { id?: string; variantId: string; quantity: number; unitPrice: number }[]): DocLine[] {
  return items.map((line) => {
    const found = findVariant(line.variantId);
    if (!found) throw new Error('Product not found.');
    return {
      id: line.id || newId(),
      variantId: line.variantId,
      productName: found.product.name,
      size: found.variant.size,
      color: found.variant.color,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.quantity * line.unitPrice,
    };
  });
}

function payAccount(mode: PaymentMode, creditCode: '1300' | '2100') {
  if (mode === 'credit') return accountByCode(creditCode);
  return mode === 'bank' ? accountByCode('1200') : accountByCode('1100');
}

function cancelLinkedVoucher(type: VoucherType, referenceNo: string) {
  for (const row of store.vouchers) {
    if (row.voucherType === type && row.referenceNo === referenceNo && row.status === 'posted') {
      row.status = 'cancelled';
    }
  }
}

function hashNum(code: string | undefined) {
  const match = String(code ?? '').match(/#(\d+)/);
  return match ? Number(match[1]) : 0;
}

function bumpCounter(kind: string, codes: string[]) {
  store.counters[kind] = Math.max(store.counters[kind] ?? 1, ...codes.map((code) => hashNum(code) + 1), 1);
}

function migrateStore() {
  const blank = seed();
  store.counters = { ...blank.counters, ...store.counters };
  for (const party of store.customers) {
    party.email = party.email ?? '';
    party.balanceType = party.balanceType ?? 'debit';
    party.creditLimit = party.creditLimit ?? 0;
  }
  for (const party of store.vendors) {
    party.email = party.email ?? '';
    party.balanceType = party.balanceType ?? 'credit';
    party.creditLimit = party.creditLimit ?? 0;
  }
  for (const product of store.products) {
    product.barcode = product.barcode ?? '';
    product.description = product.description ?? '';
    product.gender = product.gender ?? '';
    product.season = product.season ?? '';
    product.wholesalePrice = product.wholesalePrice ?? 0;
    product.brand = product.brand ?? '';
    product.variants = product.variants?.length
      ? product.variants.map((variant) => ({
          ...variant,
          productId: variant.productId ?? product.id,
          sku: variant.sku || product.sku,
          barcode: variant.barcode ?? '',
          size: variant.size ?? '',
          color: variant.color ?? '',
        }))
      : [
          {
            id: newId(),
            productId: product.id,
            sku: product.sku,
            barcode: '',
            size: '',
            color: '',
            stockQty: 0,
            salePrice: product.salePrice,
            costPrice: product.costPrice,
          },
        ];
  }
  const fillDoc = (doc: SaleDoc | PurchaseDoc) => {
    doc.voucherId = doc.voucherId ?? null;
    doc.subtotal = doc.subtotal ?? doc.grandTotal;
    doc.discountAmount = doc.discountAmount ?? 0;
    doc.additionAmount = doc.additionAmount ?? 0;
    doc.taxAmount = doc.taxAmount ?? 0;
    doc.paidAmount = doc.paidAmount ?? 0;
    for (const line of doc.items) {
      line.id = line.id || newId();
      line.size = line.size ?? '';
      line.color = line.color ?? '';
    }
  };
  store.sales.forEach(fillDoc);
  store.purchases.forEach(fillDoc);
  for (const row of store.saleReturns) {
    row.voucherId = row.voucherId ?? null;
    for (const line of row.items) line.id = line.id || newId();
  }
  for (const row of store.purchaseReturns) {
    row.voucherId = row.voucherId ?? null;
    for (const line of row.items) line.id = line.id || newId();
  }
  for (const voucher of store.vouchers) {
    voucher.entries = voucher.entries.map((entry) => ({ ...entry, id: entry.id || newId() }));
  }
  store.counterIds = store.counterIds ?? {};
  store.settingIds = store.settingIds ?? {};
  bumpCounter('sale', store.sales.map((row) => row.invoiceNo));
  bumpCounter('purchase', store.purchases.map((row) => row.invoiceNo));
  bumpCounter('sale_return', store.saleReturns.map((row) => row.returnNo));
  bumpCounter('purchase_return', store.purchaseReturns.map((row) => row.returnNo));
  bumpCounter('customer', store.customers.map((row) => row.code));
  bumpCounter('vendor', store.vendors.map((row) => row.code));
  bumpCounter('product', store.products.map((row) => row.sku));
  for (const voucher of store.vouchers) bumpCounter(voucher.voucherType, [voucher.voucherNo]);
}

export async function hydrateErp() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Store;
      store = { ...seed(), ...parsed, settings: { ...seed().settings, ...parsed.settings } };
      migrateStore();
      await persist();
    } else {
      store = seed();
      await persist();
    }
  } catch {
    store = seed();
  }
  emit();
}

export function money(value: number) {
  const n = Number(value) || 0;
  const symbol = store.settings.currency_symbol || 'Rs';
  return `${symbol} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getSettings() {
  return store.settings;
}
export async function saveSettings(patch: Partial<ShopSettings>) {
  store.settings = { ...store.settings, ...patch };
  audit('settings', 'update', 'Shop settings saved');
  await persist();
  emit();
}

export function listUnits() {
  return store.units.filter((r) => r.isActive);
}
export function listCategories() {
  return store.categories.filter((r) => r.isActive);
}
export function listTaxes() {
  return store.taxes.filter((r) => r.isActive);
}
export function listDiscounts() {
  return store.discounts.filter((r) => r.isActive);
}
export function listAdditions() {
  return store.additions.filter((r) => r.isActive);
}
export function listCustomers() {
  return store.customers.filter((r) => r.isActive).sort((a, b) => a.name.localeCompare(b.name));
}
export function listVendors() {
  return store.vendors.filter((r) => r.isActive).sort((a, b) => a.name.localeCompare(b.name));
}
export function listProducts() {
  return store.products.filter((r) => r.isActive).sort((a, b) => a.name.localeCompare(b.name));
}
export function listAccounts(filter?: { accountType?: AccountType; cashBankOnly?: boolean }) {
  return store.accounts.filter((row) => {
    if (!row.isActive) return false;
    if (filter?.accountType && row.accountType !== filter.accountType) return false;
    if (filter?.cashBankOnly && row.code !== '1100' && row.code !== '1200') return false;
    return true;
  });
}
export function listSales() {
  return store.sales.filter((r) => !r.deletedAt).sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
}
export function listPurchases() {
  return store.purchases.filter((r) => !r.deletedAt).sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
}
export function listSaleReturns() {
  return [...store.saleReturns].sort((a, b) => b.returnDate.localeCompare(a.returnDate));
}
export function listPurchaseReturns() {
  return [...store.purchaseReturns].sort((a, b) => b.returnDate.localeCompare(a.returnDate));
}
export function listVouchers(type: VoucherType) {
  return store.vouchers.filter((r) => r.voucherType === type).sort((a, b) => b.voucherDate.localeCompare(a.voucherDate));
}
export function listAudit() {
  return store.audit;
}
export function getCustomer(id: string) {
  return store.customers.find((r) => r.id === id) ?? null;
}
export function getVendor(id: string) {
  return store.vendors.find((r) => r.id === id) ?? null;
}
export function getProduct(id: string) {
  return store.products.find((r) => r.id === id) ?? null;
}
export function getSale(id: string) {
  return store.sales.find((r) => r.id === id) ?? null;
}
export function getPurchase(id: string) {
  return store.purchases.find((r) => r.id === id) ?? null;
}
export function getSaleReturn(id: string) {
  return store.saleReturns.find((r) => r.id === id) ?? null;
}
export function getPurchaseReturn(id: string) {
  return store.purchaseReturns.find((r) => r.id === id) ?? null;
}
export function getVoucher(id: string) {
  return store.vouchers.find((r) => r.id === id) ?? null;
}

export function inventoryRows() {
  return store.products.flatMap((product) =>
    product.variants.map((variant) => ({
      variantId: variant.id,
      productId: product.id,
      name: product.name,
      detail: [variant.size, variant.color].filter(Boolean).join(' · '),
      stockQty: variant.stockQty,
      salePrice: variant.salePrice || product.salePrice,
      costPrice: variant.costPrice || product.costPrice,
      reorderLevel: product.reorderLevel,
      isLow: variant.stockQty <= product.reorderLevel,
    })),
  );
}

async function saveNamed(
  table: 'units' | 'categories' | 'taxes' | 'discounts' | 'additions',
  row: Named,
  isNew: boolean,
) {
  if (isNew) store[table].push(row);
  else {
    const i = store[table].findIndex((r) => r.id === row.id);
    if (i >= 0) store[table][i] = row;
  }
  audit(table, isNew ? 'create' : 'update', row.name);
  await persist();
  emit();
}

export async function upsertNamed(
  table: 'units' | 'categories' | 'taxes' | 'discounts' | 'additions',
  input: Partial<Named> & { name: string; id?: string },
) {
  const name = input.name.trim();
  if (!name) throw new Error('Name is required');
  const existing = input.id ? store[table].find((r) => r.id === input.id) : undefined;
  const row: Named = {
    id: existing?.id ?? newId(),
    name,
    shortName: input.shortName ?? existing?.shortName,
    description: input.description ?? existing?.description,
    rate: input.rate ?? existing?.rate,
    isInclusive: input.isInclusive ?? existing?.isInclusive ?? false,
    type: input.type ?? existing?.type,
    value: input.value ?? existing?.value,
    isActive: input.isActive ?? existing?.isActive ?? true,
  };
  await saveNamed(table, row, !existing);
}

export async function removeNamed(
  table: 'units' | 'categories' | 'taxes' | 'discounts' | 'additions',
  id: string,
) {
  const row = store[table].find((r) => r.id === id);
  if (row) row.isActive = false;
  audit(table, 'delete', row?.name ?? id);
  await persist();
  emit();
}

async function upsertParty(kind: 'customers' | 'vendors', input: Partial<Party> & { name: string; id?: string }) {
  const name = input.name.trim();
  if (!name) throw new Error('Name is required');
  const existing = input.id ? store[kind].find((r) => r.id === input.id) : undefined;
  const row: Party = {
    id: existing?.id ?? newId(),
    code: existing?.code ?? nextDoc(kind === 'customers' ? 'customer' : 'vendor'),
    name,
    phone: input.phone ?? existing?.phone ?? '',
    email: input.email ?? existing?.email ?? '',
    address: input.address ?? existing?.address ?? '',
    city: input.city ?? existing?.city ?? '',
    openingBalance: input.openingBalance ?? existing?.openingBalance ?? 0,
    balanceType: input.balanceType ?? existing?.balanceType ?? (kind === 'vendors' ? 'credit' : 'debit'),
    creditLimit: input.creditLimit ?? existing?.creditLimit ?? 0,
    isActive: input.isActive ?? existing?.isActive ?? true,
  };
  if (existing) Object.assign(existing, row);
  else store[kind].push(row);
  audit(kind, existing ? 'update' : 'create', name);
  await persist();
  emit();
  return row;
}

export const saveCustomer = (input: Partial<Party> & { name: string; id?: string }) => upsertParty('customers', input);
export const saveVendor = (input: Partial<Party> & { name: string; id?: string }) => upsertParty('vendors', input);

export async function removeParty(kind: 'customers' | 'vendors', id: string) {
  const row = store[kind].find((r) => r.id === id);
  if (!row) return;
  row.isActive = false;
  audit(kind, 'delete', row.name);
  await persist();
  emit();
}

export async function saveProduct(input: {
  id?: string;
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  brand?: string;
  gender?: string;
  season?: string;
  categoryId?: string | null;
  unitId?: string | null;
  taxId?: string | null;
  salePrice: number;
  costPrice: number;
  wholesalePrice?: number;
  stockQty?: number;
  reorderLevel?: number;
  isActive?: boolean;
  variants?: {
    id?: string;
    size?: string;
    color?: string;
    barcode?: string;
    stockQty?: number;
    salePrice?: number;
    costPrice?: number;
  }[];
}) {
  const name = input.name.trim();
  if (!name) throw new Error('Name is required');
  const existing = input.id ? store.products.find((r) => r.id === input.id) : undefined;
  const sku = input.sku?.trim() || existing?.sku || nextDoc('product');
  const variants = (input.variants?.length
    ? input.variants
    : existing?.variants?.length
      ? existing.variants
      : [{ size: '', color: '', stockQty: input.stockQty ?? 0, salePrice: input.salePrice, costPrice: input.costPrice }]
  ).map((variant, index) => ({
    id: variant.id || existing?.variants[index]?.id || newId(),
    productId: existing?.id ?? '',
    sku: index === 0 ? sku : `${sku}-${index + 1}`,
    barcode: variant.barcode ?? existing?.variants[index]?.barcode ?? '',
    size: variant.size ?? '',
    color: variant.color ?? '',
    stockQty: variant.stockQty ?? existing?.variants[index]?.stockQty ?? input.stockQty ?? 0,
    salePrice: variant.salePrice ?? input.salePrice,
    costPrice: variant.costPrice ?? input.costPrice,
  }));
  const row: Product = {
    id: existing?.id ?? newId(),
    sku,
    barcode: input.barcode ?? existing?.barcode ?? '',
    name,
    description: input.description ?? existing?.description ?? '',
    categoryId: input.categoryId ?? existing?.categoryId ?? null,
    unitId: input.unitId ?? existing?.unitId ?? null,
    brand: input.brand ?? existing?.brand ?? '',
    gender: input.gender ?? existing?.gender ?? '',
    season: input.season ?? existing?.season ?? '',
    salePrice: input.salePrice,
    costPrice: input.costPrice,
    wholesalePrice: input.wholesalePrice ?? existing?.wholesalePrice ?? 0,
    taxId: input.taxId ?? existing?.taxId ?? null,
    reorderLevel: input.reorderLevel ?? existing?.reorderLevel ?? 5,
    isActive: input.isActive ?? existing?.isActive ?? true,
    variants: variants.map((variant) => ({ ...variant, productId: existing?.id ?? '' })),
  };
  row.variants.forEach((variant) => {
    variant.productId = row.id;
  });
  if (existing) Object.assign(existing, row);
  else store.products.push(row);
  audit('products', existing ? 'update' : 'create', name);
  await persist();
  emit();
  return row;
}

export async function removeProduct(id: string) {
  const row = store.products.find((r) => r.id === id);
  if (!row) return;
  row.isActive = false;
  audit('products', 'delete', row.name);
  await persist();
  emit();
}

export async function adjustStock(variantId: string, newQty: number) {
  const found = findVariant(variantId);
  if (!found) throw new Error('Product not found.');
  found.variant.stockQty = newQty;
  audit('inventory', 'adjust', `${found.product.name} → ${newQty}`);
  await persist();
  emit();
}

function postVoucher(
  input: Omit<Voucher, 'id' | 'status' | 'voucherNo' | 'entries'> & {
    voucherNo?: string;
    entries: Array<Omit<VoucherEntry, 'id'> & { id?: string }>;
  },
) {
  const row: Voucher = {
    id: newId(),
    voucherNo: input.voucherNo || nextDoc(input.voucherType),
    voucherType: input.voucherType,
    voucherDate: input.voucherDate,
    partyId: input.partyId,
    partyName: input.partyName,
    accountId: input.accountId,
    referenceNo: input.referenceNo,
    notes: input.notes,
    grandTotal: input.grandTotal,
    status: 'posted',
    entries: input.entries.map((entry) => ({
      id: entry.id || newId(),
      accountId: entry.accountId,
      debit: entry.debit,
      credit: entry.credit,
      narration: entry.narration,
    })),
  };
  store.vouchers.unshift(row);
  return row;
}

type LineInput = { variantId: string; quantity: number; unitPrice: number };
type MoneyBits = {
  discountAmount?: number;
  additionAmount?: number;
  taxAmount?: number;
  paidAmount?: number;
  notes?: string;
};

export async function createSale(input: {
  invoiceDate: string;
  customerId: string | null;
  paymentMode: PaymentMode;
  items: LineInput[];
} & MoneyBits) {
  if (!input.items.length) throw new Error('Add at least one item.');
  const customer = input.customerId ? getCustomer(input.customerId) : null;
  const items = makeLines(input.items);
  for (const line of items) bumpStock(line.variantId, -line.quantity);
  const totals = computeDocTotals(
    items.reduce((s, l) => s + l.lineTotal, 0),
    input,
  );
  const other = payAccount(input.paymentMode, '1300');
  const sales = accountByCode('4100');
  const invoiceNo = nextDoc('sale');
  const invoiceDate = input.invoiceDate || today();
  const voucher = postVoucher({
    voucherNo: invoiceNo,
    voucherType: 'sale',
    voucherDate: invoiceDate,
    partyId: customer?.id ?? null,
    partyName: customer?.name ?? 'Walk-in',
    accountId: other.id,
    referenceNo: invoiceNo,
    notes: input.notes ?? '',
    grandTotal: totals.grandTotal,
    entries: [
      { id: newId(), accountId: other.id, debit: totals.grandTotal, credit: 0, narration: invoiceNo },
      { id: newId(), accountId: sales.id, debit: 0, credit: totals.grandTotal, narration: invoiceNo },
    ],
  });
  const doc: SaleDoc = {
    id: newId(),
    voucherId: voucher.id,
    invoiceNo,
    invoiceDate,
    customerId: customer?.id ?? null,
    customerName: customer?.name ?? 'Walk-in',
    paymentMode: input.paymentMode,
    ...totals,
    notes: input.notes ?? '',
    status: 'posted',
    items,
    deletedAt: null,
  };
  store.sales.unshift(doc);
  audit('sales', 'create', doc.invoiceNo);
  await persist();
  emit();
  return doc;
}

export async function updateSale(
  id: string,
  input: {
    invoiceDate: string;
    customerId: string | null;
    paymentMode: PaymentMode;
    items: LineInput[];
  } & MoneyBits,
) {
  const sale = getSale(id);
  if (!sale || sale.status !== 'posted') throw new Error('Sale not found.');
  if (!input.items.length) throw new Error('Add at least one item.');
  for (const line of sale.items) bumpStock(line.variantId, line.quantity);
  try {
    const items = makeLines(input.items);
    for (const line of items) bumpStock(line.variantId, -line.quantity);
    const customer = input.customerId ? getCustomer(input.customerId) : null;
    const totals = computeDocTotals(
      items.reduce((s, l) => s + l.lineTotal, 0),
      input,
    );
    const other = payAccount(input.paymentMode, '1300');
    const sales = accountByCode('4100');
    Object.assign(sale, {
      invoiceDate: input.invoiceDate || sale.invoiceDate,
      customerId: customer?.id ?? null,
      customerName: customer?.name ?? 'Walk-in',
      paymentMode: input.paymentMode,
      ...totals,
      notes: input.notes ?? '',
      items,
    });
    cancelLinkedVoucher('sale', sale.invoiceNo);
    const voucher = postVoucher({
      voucherNo: sale.invoiceNo,
      voucherType: 'sale',
      voucherDate: sale.invoiceDate,
      partyId: sale.customerId,
      partyName: sale.customerName,
      accountId: other.id,
      referenceNo: sale.invoiceNo,
      notes: sale.notes,
      grandTotal: totals.grandTotal,
      entries: [
        { id: newId(), accountId: other.id, debit: totals.grandTotal, credit: 0, narration: sale.invoiceNo },
        { id: newId(), accountId: sales.id, debit: 0, credit: totals.grandTotal, narration: sale.invoiceNo },
      ],
    });
    sale.voucherId = voucher.id;
    audit('sales', 'update', sale.invoiceNo);
    await persist();
    emit();
    return sale;
  } catch (err) {
    for (const line of sale.items) bumpStock(line.variantId, -line.quantity);
    throw err;
  }
}

export async function createPurchase(input: {
  invoiceDate: string;
  vendorId: string | null;
  paymentMode: PaymentMode;
  items: LineInput[];
} & MoneyBits) {
  if (!input.items.length) throw new Error('Add at least one item.');
  const vendor = input.vendorId ? getVendor(input.vendorId) : null;
  if (!vendor) throw new Error('Choose a vendor.');
  const items = makeLines(input.items);
  for (const line of items) bumpStock(line.variantId, line.quantity);
  const totals = computeDocTotals(
    items.reduce((s, l) => s + l.lineTotal, 0),
    input,
  );
  const other = payAccount(input.paymentMode, '2100');
  const inventory = accountByCode('1400');
  const invoiceNo = nextDoc('purchase');
  const invoiceDate = input.invoiceDate || today();
  const voucher = postVoucher({
    voucherNo: invoiceNo,
    voucherType: 'purchase',
    voucherDate: invoiceDate,
    partyId: vendor.id,
    partyName: vendor.name,
    accountId: other.id,
    referenceNo: invoiceNo,
    notes: input.notes ?? '',
    grandTotal: totals.grandTotal,
    entries: [
      { id: newId(), accountId: inventory.id, debit: totals.grandTotal, credit: 0, narration: invoiceNo },
      { id: newId(), accountId: other.id, debit: 0, credit: totals.grandTotal, narration: invoiceNo },
    ],
  });
  const doc: PurchaseDoc = {
    id: newId(),
    voucherId: voucher.id,
    invoiceNo,
    invoiceDate,
    vendorId: vendor.id,
    vendorName: vendor.name,
    paymentMode: input.paymentMode,
    ...totals,
    notes: input.notes ?? '',
    status: 'posted',
    items,
    deletedAt: null,
  };
  store.purchases.unshift(doc);
  audit('purchases', 'create', doc.invoiceNo);
  await persist();
  emit();
  return doc;
}

export async function updatePurchase(
  id: string,
  input: {
    invoiceDate: string;
    vendorId: string | null;
    paymentMode: PaymentMode;
    items: LineInput[];
  } & MoneyBits,
) {
  const purchase = getPurchase(id);
  if (!purchase || purchase.status !== 'posted') throw new Error('Purchase not found.');
  if (!input.items.length) throw new Error('Add at least one item.');
  const vendor = input.vendorId ? getVendor(input.vendorId) : null;
  if (!vendor) throw new Error('Choose a vendor.');
  for (const line of purchase.items) bumpStock(line.variantId, -line.quantity);
  try {
    const items = makeLines(input.items);
    for (const line of items) bumpStock(line.variantId, line.quantity);
    const totals = computeDocTotals(
      items.reduce((s, l) => s + l.lineTotal, 0),
      input,
    );
    const other = payAccount(input.paymentMode, '2100');
    const inventory = accountByCode('1400');
    Object.assign(purchase, {
      invoiceDate: input.invoiceDate || purchase.invoiceDate,
      vendorId: vendor.id,
      vendorName: vendor.name,
      paymentMode: input.paymentMode,
      ...totals,
      notes: input.notes ?? '',
      items,
    });
    cancelLinkedVoucher('purchase', purchase.invoiceNo);
    const voucher = postVoucher({
      voucherNo: purchase.invoiceNo,
      voucherType: 'purchase',
      voucherDate: purchase.invoiceDate,
      partyId: vendor.id,
      partyName: vendor.name,
      accountId: other.id,
      referenceNo: purchase.invoiceNo,
      notes: purchase.notes,
      grandTotal: totals.grandTotal,
      entries: [
        { accountId: inventory.id, debit: totals.grandTotal, credit: 0, narration: purchase.invoiceNo },
        { accountId: other.id, debit: 0, credit: totals.grandTotal, narration: purchase.invoiceNo },
      ],
    });
    purchase.voucherId = voucher.id;
    audit('purchases', 'update', purchase.invoiceNo);
    await persist();
    emit();
    return purchase;
  } catch (err) {
    for (const line of purchase.items) bumpStock(line.variantId, line.quantity);
    throw err;
  }
}

export async function createSaleReturn(input: { saleId: string; items: { variantId: string; quantity: number }[] }) {
  const sale = getSale(input.saleId);
  if (!sale || sale.status !== 'posted') throw new Error('Sale not found.');
  const items: DocLine[] = input.items.map((line) => {
    const orig = sale.items.find((row) => row.variantId === line.variantId);
    if (!orig) throw new Error('Item was not on that sale.');
    bumpStock(line.variantId, line.quantity);
    return {
      id: newId(),
      variantId: line.variantId,
      productName: orig.productName,
      size: orig.size,
      color: orig.color,
      quantity: line.quantity,
      unitPrice: orig.unitPrice,
      lineTotal: line.quantity * orig.unitPrice,
    };
  });
  const grandTotal = items.reduce((s, l) => s + l.lineTotal, 0);
  const sales = accountByCode('4100');
  const recv = payAccount(sale.paymentMode, '1300');
  const returnNo = nextDoc('sale_return');
  const returnDate = today();
  const voucher = postVoucher({
    voucherNo: returnNo,
    voucherType: 'sale_return',
    voucherDate: returnDate,
    partyId: sale.customerId,
    partyName: sale.customerName,
    accountId: recv.id,
    referenceNo: returnNo,
    notes: sale.invoiceNo,
    grandTotal,
    entries: [
      { accountId: sales.id, debit: grandTotal, credit: 0, narration: returnNo },
      { accountId: recv.id, debit: 0, credit: grandTotal, narration: returnNo },
    ],
  });
  const doc: ReturnDoc = {
    id: newId(),
    voucherId: voucher.id,
    returnNo,
    returnDate,
    sourceId: sale.id,
    partyName: sale.customerName,
    grandTotal,
    status: 'posted',
    items,
  };
  store.saleReturns.unshift(doc);
  audit('sales', 'return', doc.returnNo);
  await persist();
  emit();
  return doc;
}

export async function createPurchaseReturn(input: { purchaseId: string; items: { variantId: string; quantity: number }[] }) {
  const purchase = getPurchase(input.purchaseId);
  if (!purchase || purchase.status !== 'posted') throw new Error('Purchase not found.');
  const items: DocLine[] = input.items.map((line) => {
    const orig = purchase.items.find((row) => row.variantId === line.variantId);
    if (!orig) throw new Error('Item was not on that bill.');
    bumpStock(line.variantId, -line.quantity);
    return {
      id: newId(),
      variantId: line.variantId,
      productName: orig.productName,
      size: orig.size,
      color: orig.color,
      quantity: line.quantity,
      unitPrice: orig.unitPrice,
      lineTotal: line.quantity * orig.unitPrice,
    };
  });
  const grandTotal = items.reduce((s, l) => s + l.lineTotal, 0);
  const inventory = accountByCode('1400');
  const pay = payAccount(purchase.paymentMode, '2100');
  const returnNo = nextDoc('purchase_return');
  const returnDate = today();
  const voucher = postVoucher({
    voucherNo: returnNo,
    voucherType: 'purchase_return',
    voucherDate: returnDate,
    partyId: purchase.vendorId,
    partyName: purchase.vendorName,
    accountId: pay.id,
    referenceNo: returnNo,
    notes: purchase.invoiceNo,
    grandTotal,
    entries: [
      { accountId: pay.id, debit: grandTotal, credit: 0, narration: returnNo },
      { accountId: inventory.id, debit: 0, credit: grandTotal, narration: returnNo },
    ],
  });
  const doc: ReturnDoc = {
    id: newId(),
    voucherId: voucher.id,
    returnNo,
    returnDate,
    sourceId: purchase.id,
    partyName: purchase.vendorName,
    grandTotal,
    status: 'posted',
    items,
  };
  store.purchaseReturns.unshift(doc);
  audit('purchases', 'return', doc.returnNo);
  await persist();
  emit();
  return doc;
}

export async function receivePayment(input: {
  voucherDate: string;
  customerId: string;
  accountId: string;
  amount: number;
  referenceNo?: string;
  notes?: string;
}) {
  if (input.amount <= 0) throw new Error('Amount is required.');
  const customer = getCustomer(input.customerId);
  if (!customer) throw new Error('Choose a customer.');
  const cash = store.accounts.find((a) => a.id === input.accountId);
  if (!cash) throw new Error('Choose cash or bank.');
  const recv = accountByCode('1300');
  postVoucher({
    voucherType: 'receipt',
    voucherDate: input.voucherDate || today(),
    partyId: customer.id,
    partyName: customer.name,
    accountId: cash.id,
    referenceNo: input.referenceNo ?? '',
    notes: input.notes ?? '',
    grandTotal: input.amount,
    entries: [
      { accountId: cash.id, debit: input.amount, credit: 0, narration: 'Receive payment' },
      { accountId: recv.id, debit: 0, credit: input.amount, narration: customer.name },
    ],
  });
  audit('transactions', 'receipt', `${customer.name} ${input.amount}`);
  await persist();
  emit();
}

export async function makePayment(input: {
  voucherDate: string;
  vendorId: string;
  accountId: string;
  amount: number;
  referenceNo?: string;
  notes?: string;
}) {
  if (input.amount <= 0) throw new Error('Amount is required.');
  const vendor = getVendor(input.vendorId);
  if (!vendor) throw new Error('Choose a vendor.');
  const cash = store.accounts.find((a) => a.id === input.accountId);
  if (!cash) throw new Error('Choose cash or bank.');
  const pay = accountByCode('2100');
  postVoucher({
    voucherType: 'payment',
    voucherDate: input.voucherDate || today(),
    partyId: vendor.id,
    partyName: vendor.name,
    accountId: cash.id,
    referenceNo: input.referenceNo ?? '',
    notes: input.notes ?? '',
    grandTotal: input.amount,
    entries: [
      { accountId: pay.id, debit: input.amount, credit: 0, narration: vendor.name },
      { accountId: cash.id, debit: 0, credit: input.amount, narration: 'Make payment' },
    ],
  });
  audit('transactions', 'payment', `${vendor.name} ${input.amount}`);
  await persist();
  emit();
}

export async function postExpense(input: {
  voucherDate: string;
  expenseAccountId: string;
  accountId: string;
  amount: number;
  notes?: string;
}) {
  if (input.amount <= 0) throw new Error('Amount is required.');
  const exp = store.accounts.find((a) => a.id === input.expenseAccountId);
  const cash = store.accounts.find((a) => a.id === input.accountId);
  if (!exp || !cash) throw new Error('Choose accounts.');
  postVoucher({
    voucherType: 'expense',
    voucherDate: input.voucherDate || today(),
    partyId: null,
    partyName: exp.name,
    accountId: cash.id,
    referenceNo: '',
    notes: input.notes ?? '',
    grandTotal: input.amount,
    entries: [
      { accountId: exp.id, debit: input.amount, credit: 0, narration: exp.name },
      { accountId: cash.id, debit: 0, credit: input.amount, narration: 'Expense' },
    ],
  });
  audit('transactions', 'expense', `${exp.name} ${input.amount}`);
  await persist();
  emit();
}

export async function postIncome(input: {
  voucherDate: string;
  incomeAccountId: string;
  accountId: string;
  amount: number;
  notes?: string;
}) {
  if (input.amount <= 0) throw new Error('Amount is required.');
  const inc = store.accounts.find((a) => a.id === input.incomeAccountId);
  const cash = store.accounts.find((a) => a.id === input.accountId);
  if (!inc || !cash) throw new Error('Choose accounts.');
  postVoucher({
    voucherType: 'income',
    voucherDate: input.voucherDate || today(),
    partyId: null,
    partyName: inc.name,
    accountId: cash.id,
    referenceNo: '',
    notes: input.notes ?? '',
    grandTotal: input.amount,
    entries: [
      { accountId: cash.id, debit: input.amount, credit: 0, narration: 'Income' },
      { accountId: inc.id, debit: 0, credit: input.amount, narration: inc.name },
    ],
  });
  audit('transactions', 'income', `${inc.name} ${input.amount}`);
  await persist();
  emit();
}

export async function postJournal(input: {
  voucherDate: string;
  notes?: string;
  entries: { accountId: string; debit: number; credit: number; narration?: string }[];
}) {
  const debit = input.entries.reduce((s, e) => s + e.debit, 0);
  const credit = input.entries.reduce((s, e) => s + e.credit, 0);
  if (Math.abs(debit - credit) > 0.01 || debit <= 0) throw new Error('Journal must balance.');
  postVoucher({
    voucherType: 'journal',
    voucherDate: input.voucherDate || today(),
    partyId: null,
    partyName: '',
    accountId: null,
    referenceNo: '',
    notes: input.notes ?? '',
    grandTotal: debit,
    entries: input.entries.map((e) => ({
      accountId: e.accountId,
      debit: e.debit,
      credit: e.credit,
      narration: e.narration ?? '',
    })),
  });
  audit('transactions', 'journal', String(debit));
  await persist();
  emit();
}

export async function cancelVoucher(id: string) {
  const row = store.vouchers.find((v) => v.id === id);
  if (!row || row.status === 'cancelled') return;
  row.status = 'cancelled';
  audit('transactions', 'cancel', row.voucherNo);
  await persist();
  emit();
}

export async function cancelSale(id: string) {
  const sale = getSale(id);
  if (!sale || sale.status === 'cancelled') return;
  sale.status = 'cancelled';
  sale.deletedAt = now();
  for (const line of sale.items) bumpStock(line.variantId, line.quantity);
  cancelLinkedVoucher('sale', sale.invoiceNo);
  audit('sales', 'delete', sale.invoiceNo);
  await persist();
  emit();
}

export async function cancelPurchase(id: string) {
  const purchase = getPurchase(id);
  if (!purchase || purchase.status === 'cancelled') return;
  purchase.status = 'cancelled';
  purchase.deletedAt = now();
  for (const line of purchase.items) bumpStock(line.variantId, -line.quantity);
  cancelLinkedVoucher('purchase', purchase.invoiceNo);
  audit('purchases', 'delete', purchase.invoiceNo);
  await persist();
  emit();
}

function inRange(date: string, from?: string, to?: string) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export function accountLedger(accountId: string, from?: string, to?: string) {
  const account = store.accounts.find((a) => a.id === accountId);
  if (!account) throw new Error('Account not found.');
  let balance = account.openingBalance;
  const lines: LedgerLine[] = [];
  const rows = [...store.vouchers]
    .filter((v) => v.status === 'posted')
    .sort((a, b) => a.voucherDate.localeCompare(b.voucherDate));
  for (const voucher of rows) {
    for (const entry of voucher.entries) {
      if (entry.accountId !== accountId) continue;
      const before = inRange(voucher.voucherDate, from, to);
      balance += entry.debit - entry.credit;
      if (before) {
        lines.push({
          date: voucher.voucherDate,
          voucherNo: voucher.voucherNo,
          voucherType: voucher.voucherType,
          narration: entry.narration || voucher.notes,
          debit: entry.debit,
          credit: entry.credit,
          balance,
        });
      }
    }
  }
  return { account, lines, closing: balance };
}

export function partyLedger(kind: 'customer' | 'vendor', partyId: string, from?: string, to?: string) {
  const party = kind === 'customer' ? getCustomer(partyId) : getVendor(partyId);
  if (!party) throw new Error('Party not found.');
  let balance = party.openingBalance;
  const lines: LedgerLine[] = [];
  const rows = [...store.vouchers]
    .filter((v) => v.status === 'posted' && v.partyId === partyId)
    .sort((a, b) => a.voucherDate.localeCompare(b.voucherDate));
  for (const voucher of rows) {
    const debit = voucher.entries.reduce((s, e) => s + e.debit, 0);
    const credit = voucher.entries.reduce((s, e) => s + e.credit, 0);
    const amount = kind === 'customer' ? debit - credit : credit - debit;
    balance += voucher.voucherType === 'receipt' || voucher.voucherType === 'payment' ? -voucher.grandTotal : voucher.grandTotal;
    if (inRange(voucher.voucherDate, from, to)) {
      lines.push({
        date: voucher.voucherDate,
        voucherNo: voucher.voucherNo,
        voucherType: voucher.voucherType,
        narration: voucher.notes,
        debit: kind === 'customer' ? (voucher.voucherType === 'receipt' ? 0 : voucher.grandTotal) : voucher.voucherType === 'payment' ? voucher.grandTotal : 0,
        credit: kind === 'customer' ? (voucher.voucherType === 'receipt' ? voucher.grandTotal : 0) : voucher.voucherType === 'payment' ? 0 : voucher.grandTotal,
        balance,
      });
    }
    void amount;
  }
  return { party, lines, closing: balance };
}

export function salesReport(from?: string, to?: string) {
  const rows = listSales().filter((r) => r.status === 'posted' && inRange(r.invoiceDate, from, to));
  return {
    rows,
    totalGrand: rows.reduce((s, r) => s + r.grandTotal, 0),
    totalPaid: rows.reduce((s, r) => s + r.paidAmount, 0),
    totalTax: rows.reduce((s, r) => s + r.taxAmount, 0),
  };
}
export function purchasesReport(from?: string, to?: string) {
  const rows = listPurchases().filter((r) => r.status === 'posted' && inRange(r.invoiceDate, from, to));
  return {
    rows,
    totalGrand: rows.reduce((s, r) => s + r.grandTotal, 0),
    totalPaid: rows.reduce((s, r) => s + r.paidAmount, 0),
  };
}
export function profitReport(from?: string, to?: string) {
  const sales = salesReport(from, to).totalGrand;
  const purchases = purchasesReport(from, to).totalGrand;
  const expenses = listVouchers('expense')
    .filter((v) => v.status === 'posted' && inRange(v.voucherDate, from, to))
    .reduce((s, v) => s + v.grandTotal, 0);
  const income = listVouchers('income')
    .filter((v) => v.status === 'posted' && inRange(v.voucherDate, from, to))
    .reduce((s, v) => s + v.grandTotal, 0);
  return { sales, purchases, expenses, income, profit: sales + income - purchases - expenses };
}
export function stockReport() {
  return inventoryRows();
}
export function taxReport(from?: string, to?: string) {
  const sales = salesReport(from, to);
  return { totalTax: sales.totalTax, invoices: sales.rows.length };
}
export function deletedSales() {
  return store.sales.filter((r) => r.deletedAt);
}

export function dashboardSummary() {
  const t = today();
  const sales = listSales().filter((r) => r.status === 'posted');
  const purchases = listPurchases().filter((r) => r.status === 'posted');
  const todaySales = sales.filter((r) => r.invoiceDate === t);
  const todayPurchases = purchases.filter((r) => r.invoiceDate === t);
  const month = t.slice(0, 7);
  const monthSales = sales.filter((r) => r.invoiceDate.startsWith(month)).reduce((s, r) => s + r.grandTotal, 0);
  const monthPurchases = purchases.filter((r) => r.invoiceDate.startsWith(month)).reduce((s, r) => s + r.grandTotal, 0);
  const inv = inventoryRows();
  const points = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const date = d.toISOString().slice(0, 10);
    return {
      date,
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
      total: sales.filter((r) => r.invoiceDate === date).reduce((s, r) => s + r.grandTotal, 0),
    };
  });
  return {
    todaySalesTotal: todaySales.reduce((s, r) => s + r.grandTotal, 0),
    todaySalesCount: todaySales.length,
    todayPurchasesTotal: todayPurchases.reduce((s, r) => s + r.grandTotal, 0),
    todayPurchasesCount: todayPurchases.length,
    monthProfit: monthSales - monthPurchases,
    monthSales,
    customerCount: listCustomers().length,
    vendorCount: listVendors().length,
    productCount: listProducts().length,
    lowStockCount: inv.filter((r) => r.isLow).length,
    points,
  };
}

export function getShopSnapshot() {
  return store;
}

export async function applyCloudSnapshot(patch: {
  settings?: Partial<ShopSettings>;
  settingIds?: Record<string, string>;
  units?: Named[];
  categories?: Named[];
  taxes?: Named[];
  discounts?: Named[];
  additions?: Named[];
  customers?: Party[];
  vendors?: Party[];
  products?: Product[];
  accounts?: Account[];
  sales?: SaleDoc[];
  purchases?: PurchaseDoc[];
  saleReturns?: ReturnDoc[];
  purchaseReturns?: ReturnDoc[];
  vouchers?: Voucher[];
  counters?: Record<string, number>;
  counterIds?: Record<string, string>;
  audit?: AuditRow[];
}) {
  skipPersistHook = true;
  try {
    if (patch.settings) store.settings = { ...store.settings, ...patch.settings };
    if (patch.settingIds) store.settingIds = patch.settingIds;
    if (patch.units) store.units = patch.units;
    if (patch.categories) store.categories = patch.categories;
    if (patch.taxes) store.taxes = patch.taxes;
    if (patch.discounts) store.discounts = patch.discounts;
    if (patch.additions) store.additions = patch.additions;
    if (patch.customers) store.customers = patch.customers;
    if (patch.vendors) store.vendors = patch.vendors;
    if (patch.products) store.products = patch.products;
    if (patch.accounts?.length) store.accounts = patch.accounts;
    if (patch.sales) store.sales = patch.sales;
    if (patch.purchases) store.purchases = patch.purchases;
    if (patch.saleReturns) store.saleReturns = patch.saleReturns;
    if (patch.purchaseReturns) store.purchaseReturns = patch.purchaseReturns;
    if (patch.vouchers) store.vouchers = patch.vouchers;
    if (patch.counters) store.counters = { ...store.counters, ...patch.counters };
    if (patch.counterIds) store.counterIds = patch.counterIds;
    if (patch.audit) store.audit = patch.audit;
    migrateStore();
    await persist();
    emit();
  } finally {
    skipPersistHook = false;
  }
}

export function exportShopJson() {
  return JSON.stringify(store, null, 2);
}

export async function importShopJson(raw: string) {
  const parsed = JSON.parse(raw) as Store;
  if (!parsed?.settings || !Array.isArray(parsed.accounts)) throw new Error('Not a valid shop backup.');
  store = { ...seed(), ...parsed };
  await persist();
  emit();
}
