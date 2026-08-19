-- Create-only shop-table policies for mobile catalog / parties / purchases / returns / ledgers.
-- Confirm in SQL Editor if it warns. Replace tenant-dev-001 if this shop uses an activation UUID.

CREATE POLICY "mobile_anon_select_units" ON public.units FOR SELECT TO anon
USING (tenant_id = 'tenant-dev-001' AND deleted_at IS NULL);
CREATE POLICY "mobile_anon_insert_units" ON public.units FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');

CREATE POLICY "mobile_anon_select_categories" ON public.categories FOR SELECT TO anon
USING (tenant_id = 'tenant-dev-001' AND deleted_at IS NULL);
CREATE POLICY "mobile_anon_insert_categories" ON public.categories FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');

CREATE POLICY "mobile_anon_select_vendors" ON public.vendors FOR SELECT TO anon
USING (tenant_id = 'tenant-dev-001' AND deleted_at IS NULL);
CREATE POLICY "mobile_anon_insert_vendors" ON public.vendors FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');

CREATE POLICY "mobile_anon_insert_products" ON public.products FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_anon_insert_variants" ON public.product_variants FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');

CREATE POLICY "mobile_anon_select_purchases" ON public.purchases FOR SELECT TO anon
USING (tenant_id = 'tenant-dev-001' AND deleted_at IS NULL);
CREATE POLICY "mobile_anon_select_purchase_items" ON public.purchase_items FOR SELECT TO anon
USING (tenant_id = 'tenant-dev-001' AND deleted_at IS NULL);
CREATE POLICY "mobile_anon_select_purchase_returns" ON public.purchase_returns FOR SELECT TO anon
USING (tenant_id = 'tenant-dev-001' AND deleted_at IS NULL);

CREATE POLICY "mobile_anon_select_sale_returns" ON public.sale_returns FOR SELECT TO anon
USING (tenant_id = 'tenant-dev-001' AND deleted_at IS NULL);

CREATE POLICY "mobile_anon_select_accounts" ON public.accounts FOR SELECT TO anon
USING (tenant_id = 'tenant-dev-001' AND deleted_at IS NULL);
