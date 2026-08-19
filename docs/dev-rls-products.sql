-- Create-only. Does not drop tables, rows, or existing policies.
-- If SQL Editor warns, that is a security change (policy), not a data wipe.
--
-- Dev shop fallback. Replace tenant-dev-001 if this PC uses an activation UUID.

CREATE POLICY "mobile_anon_select_products"
ON public.products
FOR SELECT
TO anon
USING (
  tenant_id = 'tenant-dev-001'
  AND deleted_at IS NULL
);

CREATE POLICY "mobile_anon_select_product_variants"
ON public.product_variants
FOR SELECT
TO anon
USING (
  tenant_id = 'tenant-dev-001'
  AND deleted_at IS NULL
);
