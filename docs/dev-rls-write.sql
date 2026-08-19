-- Create-only policies for steps 2–4.
-- Does not drop tables or data. Confirm in SQL Editor if it warns (policy = security change).
-- Dev shop: replace tenant-dev-001 if this PC uses an activation UUID.

CREATE POLICY "mobile_anon_select_products"
ON public.products FOR SELECT TO anon
USING (tenant_id = 'tenant-dev-001' AND deleted_at IS NULL);

CREATE POLICY "mobile_anon_select_product_variants"
ON public.product_variants FOR SELECT TO anon
USING (tenant_id = 'tenant-dev-001' AND deleted_at IS NULL);

CREATE POLICY "mobile_anon_insert_customers"
ON public.customers FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');

CREATE POLICY "mobile_anon_select_vouchers"
ON public.vouchers FOR SELECT TO anon
USING (tenant_id = 'tenant-dev-001' AND deleted_at IS NULL);

CREATE POLICY "mobile_anon_select_sales"
ON public.sales FOR SELECT TO anon
USING (tenant_id = 'tenant-dev-001' AND deleted_at IS NULL);

CREATE POLICY "mobile_anon_select_sale_items"
ON public.sale_items FOR SELECT TO anon
USING (tenant_id = 'tenant-dev-001' AND deleted_at IS NULL);
