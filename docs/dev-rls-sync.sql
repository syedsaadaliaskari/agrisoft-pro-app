-- Create-only. Does not drop tables or existing policies.
-- Phone shop sync (anon key). Confirm in SQL Editor if it warns.
-- If this shop was Pro-activated, replace tenant-dev-001 with that tenant UUID.

-- SELECT (live rows only)
CREATE POLICY "mobile_sync_select_settings" ON public.settings FOR SELECT TO anon
USING (tenant_id = 'tenant-dev-001' AND deleted_at IS NULL);
CREATE POLICY "mobile_sync_select_audit" ON public.audit_logs FOR SELECT TO anon
USING (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_select_taxes" ON public.taxes FOR SELECT TO anon
USING (tenant_id = 'tenant-dev-001' AND deleted_at IS NULL);
CREATE POLICY "mobile_sync_select_discounts" ON public.discounts FOR SELECT TO anon
USING (tenant_id = 'tenant-dev-001' AND deleted_at IS NULL);
CREATE POLICY "mobile_sync_select_additions" ON public.additions FOR SELECT TO anon
USING (tenant_id = 'tenant-dev-001' AND deleted_at IS NULL);
CREATE POLICY "mobile_sync_select_voucher_entries" ON public.voucher_entries FOR SELECT TO anon
USING (tenant_id = 'tenant-dev-001' AND deleted_at IS NULL);
CREATE POLICY "mobile_sync_select_stock" ON public.stock_movements FOR SELECT TO anon
USING (tenant_id = 'tenant-dev-001' AND deleted_at IS NULL);
CREATE POLICY "mobile_sync_select_sale_return_items" ON public.sale_return_items FOR SELECT TO anon
USING (tenant_id = 'tenant-dev-001' AND deleted_at IS NULL);
CREATE POLICY "mobile_sync_select_purchase_return_items" ON public.purchase_return_items FOR SELECT TO anon
USING (tenant_id = 'tenant-dev-001' AND deleted_at IS NULL);
CREATE POLICY "mobile_sync_select_counters" ON public.document_counters FOR SELECT TO anon
USING (tenant_id = 'tenant-dev-001' AND deleted_at IS NULL);

-- INSERT
CREATE POLICY "mobile_sync_insert_settings" ON public.settings FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_insert_audit" ON public.audit_logs FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_insert_taxes" ON public.taxes FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_insert_discounts" ON public.discounts FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_insert_additions" ON public.additions FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_insert_customers_upd" ON public.customers FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_insert_accounts" ON public.accounts FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_insert_vouchers" ON public.vouchers FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_insert_voucher_entries" ON public.voucher_entries FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_insert_stock" ON public.stock_movements FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_insert_purchases" ON public.purchases FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_insert_purchase_items" ON public.purchase_items FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_insert_sale_returns" ON public.sale_returns FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_insert_sale_return_items" ON public.sale_return_items FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_insert_purchase_returns" ON public.purchase_returns FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_insert_purchase_return_items" ON public.purchase_return_items FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_insert_counters" ON public.document_counters FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_insert_units" ON public.units FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_insert_categories" ON public.categories FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_insert_vendors" ON public.vendors FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_insert_products" ON public.products FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_insert_variants" ON public.product_variants FOR INSERT TO anon
WITH CHECK (tenant_id = 'tenant-dev-001');

-- UPDATE (allow soft-delete)
CREATE POLICY "mobile_sync_update_settings" ON public.settings FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_update_units" ON public.units FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_update_categories" ON public.categories FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_update_taxes" ON public.taxes FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_update_discounts" ON public.discounts FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_update_additions" ON public.additions FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_update_customers" ON public.customers FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_update_vendors" ON public.vendors FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_update_products" ON public.products FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_update_variants" ON public.product_variants FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_update_accounts" ON public.accounts FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_update_vouchers" ON public.vouchers FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_update_voucher_entries" ON public.voucher_entries FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_update_sales" ON public.sales FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_update_sale_items" ON public.sale_items FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_update_purchases" ON public.purchases FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_update_purchase_items" ON public.purchase_items FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_update_sale_returns" ON public.sale_returns FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_update_sale_return_items" ON public.sale_return_items FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_update_purchase_returns" ON public.purchase_returns FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_update_purchase_return_items" ON public.purchase_return_items FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_update_counters" ON public.document_counters FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_update_stock" ON public.stock_movements FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
CREATE POLICY "mobile_sync_update_audit" ON public.audit_logs FOR UPDATE TO anon
USING (tenant_id = 'tenant-dev-001') WITH CHECK (tenant_id = 'tenant-dev-001');
