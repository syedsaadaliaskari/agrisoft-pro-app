export type Tenant = {
  id: string;
  name: string;
  slug: string | null;
  is_active: boolean | null;
};

export type Customer = {
  id: string;
  tenant_id: string;
  code: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  opening_balance: number | string | null;
  balance_type: string | null;
  credit_limit: number | string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  stock_qty: number | string | null;
  sale_price: number | string | null;
  sku: string | null;
  is_active: boolean | null;
  deleted_at: string | null;
};

export type Product = {
  id: string;
  tenant_id: string;
  name: string;
  brand: string | null;
  sku: string | null;
  sale_price: number | string | null;
  cost_price: number | string | null;
  is_active: boolean | null;
  product_variants?: ProductVariant[];
};

export type SaleItem = {
  id: string;
  product_name: string;
  quantity: number | string | null;
  line_total: number | string | null;
  unit_price: number | string | null;
  variant_id?: string | null;
  size?: string | null;
  color?: string | null;
};

export type PaymentMode = 'cash' | 'credit' | 'bank';

export type CreateSaleLine = {
  variantId: string;
  productName: string;
  size: string | null;
  color: string | null;
  quantity: number;
  unitPrice: number;
  costPrice: number;
};

export type SellableRow = {
  variantId: string;
  productId: string;
  name: string;
  detail: string;
  stockQty: number;
  salePrice: number;
  costPrice: number;
};

export type Sale = {
  id: string;
  tenant_id: string;
  invoice_no: string;
  invoice_date: string;
  customer_id: string | null;
  payment_mode: string | null;
  grand_total: number | string | null;
  paid_amount: number | string | null;
  status: string | null;
  notes?: string | null;
  sale_items?: SaleItem[];
};

export type NamedRow = {
  id: string;
  name: string;
  short_name?: string | null;
  description?: string | null;
  phone?: string | null;
  city?: string | null;
  is_active?: boolean | null;
};

export type Purchase = {
  id: string;
  invoice_no: string;
  invoice_date: string;
  vendor_id: string | null;
  payment_mode: string | null;
  grand_total: number | string | null;
  status: string | null;
};

export type SaleReturn = {
  id: string;
  return_no: string;
  return_date: string;
  sale_id: string | null;
  grand_total: number | string | null;
};

export type PurchaseReturn = {
  id: string;
  return_no: string;
  return_date: string;
  purchase_id: string | null;
  grand_total: number | string | null;
};

export type AccountRow = {
  id: string;
  code: string;
  name: string;
  account_type: string;
  opening_balance: number | string | null;
};

export type InventoryRow = {
  variantId: string;
  productId: string;
  name: string;
  detail: string;
  stockQty: number;
};
