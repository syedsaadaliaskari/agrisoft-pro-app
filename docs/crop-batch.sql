-- Batch, expiry, and crop slips for the phone.
-- Run once in Supabase → SQL Editor. Does not drop shop tables or shop rows.
-- The phone will not keep a local-only copy if these are missing.

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS track_batch boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_crop boolean NOT NULL DEFAULT false;

ALTER TABLE public.purchase_items ADD COLUMN IF NOT EXISTS batch_no text;
ALTER TABLE public.purchase_items ADD COLUMN IF NOT EXISTS manufactured_date text;
ALTER TABLE public.purchase_items ADD COLUMN IF NOT EXISTS expiry_date text;

ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS batch_no text;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS expiry_date text;

CREATE TABLE IF NOT EXISTS public.stock_batches (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES public.tenants (id),
  variant_id text NOT NULL REFERENCES public.product_variants (id),
  batch_no text NOT NULL,
  manufactured_date text,
  expiry_date text,
  qty double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS stock_batches_variant_batch_uidx
  ON public.stock_batches (tenant_id, variant_id, batch_no);

CREATE TABLE IF NOT EXISTS public.crop_purchases (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES public.tenants (id),
  voucher_id text NOT NULL REFERENCES public.vouchers (id),
  doc_no text NOT NULL,
  doc_date text NOT NULL,
  party_type text NOT NULL,
  party_id text NOT NULL,
  variant_id text NOT NULL REFERENCES public.product_variants (id),
  product_name text NOT NULL,
  safi_weight double precision NOT NULL DEFAULT 0,
  gross_amount double precision NOT NULL DEFAULT 0,
  commission double precision NOT NULL DEFAULT 0,
  brokerage double precision NOT NULL DEFAULT 0,
  mazdoori double precision NOT NULL DEFAULT 0,
  fees double precision NOT NULL DEFAULT 0,
  bardana double precision NOT NULL DEFAULT 0,
  deduction_amount double precision NOT NULL DEFAULT 0,
  net_payable double precision NOT NULL DEFAULT 0,
  paid_amount double precision NOT NULL DEFAULT 0,
  remarks text,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS crop_purchases_doc_uidx
  ON public.crop_purchases (tenant_id, doc_no);

CREATE TABLE IF NOT EXISTS public.crop_purchase_vehicles (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES public.tenants (id),
  crop_purchase_id text NOT NULL REFERENCES public.crop_purchases (id) ON DELETE CASCADE,
  vehicle_no text NOT NULL,
  bags double precision NOT NULL DEFAULT 0,
  total_weight double precision NOT NULL,
  kaat double precision NOT NULL DEFAULT 0,
  safi_weight double precision NOT NULL,
  rate double precision NOT NULL,
  amount double precision NOT NULL,
  line_order integer NOT NULL DEFAULT 0,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.crop_sales (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES public.tenants (id),
  voucher_id text NOT NULL REFERENCES public.vouchers (id),
  doc_no text NOT NULL,
  doc_date text NOT NULL,
  customer_id text REFERENCES public.customers (id),
  variant_id text NOT NULL REFERENCES public.product_variants (id),
  product_name text NOT NULL,
  weight double precision NOT NULL,
  rate double precision NOT NULL,
  amount double precision NOT NULL,
  paid_amount double precision NOT NULL DEFAULT 0,
  remarks text,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS crop_sales_doc_uidx
  ON public.crop_sales (tenant_id, doc_no);

ALTER TABLE public.stock_batches ADD COLUMN IF NOT EXISTS manufactured_date text;

ALTER TABLE public.crop_sales ADD COLUMN IF NOT EXISTS commission double precision NOT NULL DEFAULT 0;
ALTER TABLE public.crop_sales ADD COLUMN IF NOT EXISTS brokerage double precision NOT NULL DEFAULT 0;
ALTER TABLE public.crop_sales ADD COLUMN IF NOT EXISTS mazdoori double precision NOT NULL DEFAULT 0;
ALTER TABLE public.crop_sales ADD COLUMN IF NOT EXISTS fees double precision NOT NULL DEFAULT 0;
ALTER TABLE public.crop_sales ADD COLUMN IF NOT EXISTS bardana double precision NOT NULL DEFAULT 0;
ALTER TABLE public.crop_sales ADD COLUMN IF NOT EXISTS deduction_amount double precision NOT NULL DEFAULT 0;
ALTER TABLE public.crop_sales ADD COLUMN IF NOT EXISTS net_amount double precision NOT NULL DEFAULT 0;
ALTER TABLE public.crop_sales ADD COLUMN IF NOT EXISTS cost_amount double precision NOT NULL DEFAULT 0;

ALTER TABLE public.units ADD COLUMN IF NOT EXISTS equals_kg double precision;
ALTER TABLE public.crop_purchase_vehicles ADD COLUMN IF NOT EXISTS stock_factor double precision NOT NULL DEFAULT 1;
ALTER TABLE public.crop_purchase_vehicles ADD COLUMN IF NOT EXISTS weigh_unit text;
ALTER TABLE public.crop_sales ADD COLUMN IF NOT EXISTS stock_factor double precision NOT NULL DEFAULT 1;
ALTER TABLE public.crop_sales ADD COLUMN IF NOT EXISTS weigh_unit text;

GRANT SELECT, INSERT, UPDATE ON public.stock_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.crop_purchases TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.crop_purchase_vehicles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.crop_sales TO authenticated;

ALTER TABLE public.stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_purchase_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member_select_stock_batches" ON public.stock_batches;
DROP POLICY IF EXISTS "member_insert_stock_batches" ON public.stock_batches;
DROP POLICY IF EXISTS "member_update_stock_batches" ON public.stock_batches;
CREATE POLICY "member_select_stock_batches" ON public.stock_batches
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.my_shop_ids()) AND deleted_at IS NULL);
CREATE POLICY "member_insert_stock_batches" ON public.stock_batches
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.my_shop_ids()));
CREATE POLICY "member_update_stock_batches" ON public.stock_batches
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.my_shop_ids()))
  WITH CHECK (tenant_id IN (SELECT public.my_shop_ids()));

DROP POLICY IF EXISTS "member_select_crop_purchases" ON public.crop_purchases;
DROP POLICY IF EXISTS "member_insert_crop_purchases" ON public.crop_purchases;
DROP POLICY IF EXISTS "member_update_crop_purchases" ON public.crop_purchases;
CREATE POLICY "member_select_crop_purchases" ON public.crop_purchases
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.my_shop_ids()) AND deleted_at IS NULL);
CREATE POLICY "member_insert_crop_purchases" ON public.crop_purchases
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.my_shop_ids()));
CREATE POLICY "member_update_crop_purchases" ON public.crop_purchases
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.my_shop_ids()))
  WITH CHECK (tenant_id IN (SELECT public.my_shop_ids()));

DROP POLICY IF EXISTS "member_select_crop_purchase_vehicles" ON public.crop_purchase_vehicles;
DROP POLICY IF EXISTS "member_insert_crop_purchase_vehicles" ON public.crop_purchase_vehicles;
DROP POLICY IF EXISTS "member_update_crop_purchase_vehicles" ON public.crop_purchase_vehicles;
CREATE POLICY "member_select_crop_purchase_vehicles" ON public.crop_purchase_vehicles
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.my_shop_ids()) AND deleted_at IS NULL);
CREATE POLICY "member_insert_crop_purchase_vehicles" ON public.crop_purchase_vehicles
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.my_shop_ids()));
CREATE POLICY "member_update_crop_purchase_vehicles" ON public.crop_purchase_vehicles
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.my_shop_ids()))
  WITH CHECK (tenant_id IN (SELECT public.my_shop_ids()));

DROP POLICY IF EXISTS "member_select_crop_sales" ON public.crop_sales;
DROP POLICY IF EXISTS "member_insert_crop_sales" ON public.crop_sales;
DROP POLICY IF EXISTS "member_update_crop_sales" ON public.crop_sales;
CREATE POLICY "member_select_crop_sales" ON public.crop_sales
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT public.my_shop_ids()) AND deleted_at IS NULL);
CREATE POLICY "member_insert_crop_sales" ON public.crop_sales
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT public.my_shop_ids()));
CREATE POLICY "member_update_crop_sales" ON public.crop_sales
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT public.my_shop_ids()))
  WITH CHECK (tenant_id IN (SELECT public.my_shop_ids()));
