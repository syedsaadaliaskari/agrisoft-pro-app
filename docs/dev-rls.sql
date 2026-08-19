-- Create-only. Does not drop tables, rows, or existing policies.
-- Does not disable RLS. Does not use service_role.
--
-- If SQL Editor still warns, that is because a POLICY is a security change —
-- not because this deletes shop data. Confirm and Run.
--
-- Dev shop (this PC fallback). If the shop was Pro-activated, replace
-- tenant-dev-001 with that PC's settings.supabase_tenant_id UUID.

CREATE POLICY "mobile_anon_select_tenants"
ON public.tenants
FOR SELECT
TO anon
USING (
  id = 'tenant-dev-001'
  AND deleted_at IS NULL
);

CREATE POLICY "mobile_anon_select_customers"
ON public.customers
FOR SELECT
TO anon
USING (
  tenant_id = 'tenant-dev-001'
  AND deleted_at IS NULL
);
