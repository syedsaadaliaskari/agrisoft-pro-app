-- Create-only policies for phone New Sale (step 6).
-- Does not drop tables or data. Confirm in SQL Editor if it warns.
-- Dev shop: replace tenant-dev-001 if this PC uses an activation UUID.

CREATE POLICY "mobile_anon_insert_vouchers"
ON public.vouchers FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001' AND voucher_type = 'sale');

CREATE POLICY "mobile_anon_update_vouchers"
ON public.vouchers FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001')
WITH CHECK (tenant_id = 'tenant-dev-001');

CREATE POLICY "mobile_anon_insert_sales"
ON public.sales FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');

CREATE POLICY "mobile_anon_update_sales"
ON public.sales FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001')
WITH CHECK (tenant_id = 'tenant-dev-001');

CREATE POLICY "mobile_anon_insert_sale_items"
ON public.sale_items FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');

CREATE POLICY "mobile_anon_update_variants"
ON public.product_variants FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001' AND deleted_at IS NULL)
WITH CHECK (tenant_id = 'tenant-dev-001');
