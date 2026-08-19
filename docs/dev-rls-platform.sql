-- Create-only. Does not drop tables, rows, or existing policies.
-- Does not disable RLS. Does not use service_role.
--
-- Vendor console tables (client companies + licenses) are platform-wide,
-- not scoped by tenant_id. Run this if Super Admin screens stay empty
-- after adding companies on the phone.

CREATE POLICY "mobile_anon_select_client_companies"
ON public.client_companies
FOR SELECT
TO anon
USING (deleted_at IS NULL);

CREATE POLICY "mobile_anon_insert_client_companies"
ON public.client_companies
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "mobile_anon_update_client_companies"
ON public.client_companies
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "mobile_anon_select_licenses"
ON public.licenses
FOR SELECT
TO anon
USING (deleted_at IS NULL);

CREATE POLICY "mobile_anon_insert_licenses"
ON public.licenses
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "mobile_anon_update_licenses"
ON public.licenses
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
