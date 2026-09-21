-- Shop staff sign-in (Supabase Auth). Desktop sync still uses service_role — unchanged.
-- Does not drop tables or shop rows. Does not use service_role in the phone.
--
-- Run once in Supabase → SQL Editor. Confirm if it warns (policies = security change).
--
-- After this file:
-- 1. Authentication → Providers → Email → turn OFF "Confirm email" (shop staff).
-- 2. Phone: Create account with email + password + the shop code from PC Settings.
-- 3. You may leave EXPO_PUBLIC_TENANT_ID in .env as a fallback until login works,
--    then you can remove that line. Keep URL + anon key.

CREATE TABLE IF NOT EXISTS public.tenant_members (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  tenant_id text NOT NULL REFERENCES public.tenants (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tenant_id)
);

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS join_code text;

ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.my_shop_ids()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.join_shop(shop_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tid text;
  entered text;
  raw text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  entered := trim(shop_code);
  raw := upper(regexp_replace(entered, '[^A-Za-z0-9]', '', 'g'));
  IF raw = '' THEN
    RAISE EXCEPTION 'Shop code is required';
  END IF;
  SELECT t.id INTO tid
  FROM public.tenants t
  WHERE t.deleted_at IS NULL
    AND COALESCE(t.is_active, true) = true
    AND (
      t.id = entered
      OR lower(t.id) = lower(entered)
      OR upper(regexp_replace(COALESCE(t.join_code, ''), '[^A-Za-z0-9]', '', 'g')) = raw
    )
  LIMIT 1;
  IF tid IS NULL THEN
    RAISE EXCEPTION 'Unknown shop code';
  END IF;
  DELETE FROM public.tenant_members
  WHERE user_id = auth.uid() AND tenant_id <> tid;
  INSERT INTO public.tenant_members (user_id, tenant_id)
  VALUES (auth.uid(), tid)
  ON CONFLICT DO NOTHING;
  RETURN tid;
END;
$$;

REVOKE ALL ON FUNCTION public.my_shop_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_shop_ids() TO authenticated;
REVOKE ALL ON FUNCTION public.join_shop(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_shop(text) TO authenticated;

DROP POLICY IF EXISTS "member_select_own" ON public.tenant_members;
CREATE POLICY "member_select_own" ON public.tenant_members
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DO $$
DECLARE
  t text;
  r record;
  shop text[] := ARRAY[
    'tenants',
    'settings',
    'customers',
    'vendors',
    'accounts',
    'units',
    'categories',
    'taxes',
    'discounts',
    'additions',
    'products',
    'product_variants',
    'vouchers',
    'voucher_entries',
    'sales',
    'sale_items',
    'purchases',
    'purchase_items',
    'sale_returns',
    'sale_return_items',
    'purchase_returns',
    'purchase_return_items',
    'stock_movements',
    'document_counters',
    'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY shop LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    FOR r IN
      SELECT pol.polname
      FROM pg_policy pol
      JOIN pg_class c ON c.oid = pol.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.polname, t);
    END LOOP;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "member_select_tenants" ON public.tenants;
CREATE POLICY "member_select_tenants" ON public.tenants
FOR SELECT TO authenticated
USING (id IN (SELECT public.my_shop_ids()) AND deleted_at IS NULL);

DO $$
DECLARE
  t text;
  live text[] := ARRAY[
    'settings',
    'customers',
    'vendors',
    'accounts',
    'units',
    'categories',
    'taxes',
    'discounts',
    'additions',
    'products',
    'product_variants',
    'vouchers',
    'voucher_entries',
    'sales',
    'sale_items',
    'purchases',
    'purchase_items',
    'sale_returns',
    'sale_return_items',
    'purchase_returns',
    'purchase_return_items',
    'stock_movements',
    'document_counters'
  ];
BEGIN
  FOREACH t IN ARRAY live LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (tenant_id IN (SELECT public.my_shop_ids()) AND deleted_at IS NULL)',
      'member_select_' || t,
      t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT public.my_shop_ids()))',
      'member_insert_' || t,
      t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (tenant_id IN (SELECT public.my_shop_ids())) WITH CHECK (tenant_id IN (SELECT public.my_shop_ids()))',
      'member_update_' || t,
      t
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS "member_select_audit_logs" ON public.audit_logs;
CREATE POLICY "member_select_audit_logs" ON public.audit_logs
FOR SELECT TO authenticated
USING (tenant_id IN (SELECT public.my_shop_ids()));

DROP POLICY IF EXISTS "member_insert_audit_logs" ON public.audit_logs;
CREATE POLICY "member_insert_audit_logs" ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (tenant_id IN (SELECT public.my_shop_ids()));
