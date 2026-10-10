-- Run once in Supabase → SQL Editor, after the phone and desktop license updates.
-- One Install ID, trial, and activation per shop.
-- Does not change customers, products, sales, or join_shop.

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS install_id text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS trial_started_at text;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_install_id_uidx
  ON public.tenants (install_id)
  WHERE install_id IS NOT NULL AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.sync_shop_license(
  p_tenant_id text,
  p_install_id text,
  p_trial_started_at text,
  p_plan text,
  p_expires_at text,
  p_license_name text,
  p_source text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  shop public.tenants%ROWTYPE;
  today text;
  device_live boolean;
  shop_live boolean;
  next_install text;
  next_trial text;
  next_plan text;
  next_expires text;
  next_name text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Not signed in';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.tenant_members
      WHERE user_id = auth.uid() AND tenant_id = p_tenant_id
    ) THEN
      RAISE EXCEPTION 'Not in this shop';
    END IF;
  END IF;

  SELECT * INTO shop FROM public.tenants WHERE id = p_tenant_id AND deleted_at IS NULL;
  IF shop.id IS NULL THEN
    RAISE EXCEPTION 'Shop not found';
  END IF;

  today := to_char((timezone('utc', now()))::date, 'YYYY-MM-DD');

  device_live := COALESCE(btrim(p_plan), '') <> ''
    AND (p_plan = 'forever' OR COALESCE(btrim(p_expires_at), '') = '' OR p_expires_at >= today);
  shop_live := COALESCE(btrim(shop.plan), '') <> ''
    AND (
      shop.plan = 'forever'
      OR COALESCE(btrim(shop.license_expires_at), '') = ''
      OR shop.license_expires_at >= today
    );

  next_install := NULLIF(btrim(shop.install_id), '');
  next_trial := NULLIF(btrim(shop.trial_started_at), '');
  next_plan := NULLIF(btrim(shop.plan), '');
  next_expires := NULLIF(btrim(shop.license_expires_at), '');
  next_name := NULLIF(btrim(shop.license_name), '');

  IF next_install IS NULL THEN
    next_install := NULLIF(btrim(p_install_id), '');
    next_trial := COALESCE(NULLIF(btrim(p_trial_started_at), ''), today);
    IF device_live THEN
      next_plan := NULLIF(btrim(p_plan), '');
      next_expires := NULLIF(btrim(p_expires_at), '');
      next_name := NULLIF(btrim(p_license_name), '');
    END IF;
  ELSIF device_live AND NOT shop_live THEN
    next_install := NULLIF(btrim(p_install_id), '');
    next_trial := COALESCE(NULLIF(btrim(p_trial_started_at), ''), next_trial, today);
    next_plan := NULLIF(btrim(p_plan), '');
    next_expires := NULLIF(btrim(p_expires_at), '');
    next_name := NULLIF(btrim(p_license_name), '');
  ELSIF shop_live AND device_live AND p_source = 'desktop' THEN
    next_install := NULLIF(btrim(p_install_id), '');
    next_trial := COALESCE(NULLIF(btrim(p_trial_started_at), ''), next_trial, today);
    next_plan := NULLIF(btrim(p_plan), '');
    next_expires := NULLIF(btrim(p_expires_at), '');
    next_name := NULLIF(btrim(p_license_name), '');
  ELSIF NOT shop_live AND NOT device_live THEN
    IF NULLIF(btrim(p_trial_started_at), '') IS NOT NULL
      AND (next_trial IS NULL OR p_trial_started_at < next_trial) THEN
      next_trial := p_trial_started_at;
    END IF;
  END IF;

  IF next_install IS NULL THEN
    next_install := NULLIF(btrim(p_install_id), '');
  END IF;
  IF next_trial IS NULL THEN
    next_trial := COALESCE(NULLIF(btrim(p_trial_started_at), ''), today);
  END IF;

  UPDATE public.tenants
  SET
    install_id = next_install,
    trial_started_at = next_trial,
    plan = next_plan,
    license_expires_at = next_expires,
    license_name = next_name,
    updated_at = now()
  WHERE id = shop.id;

  RETURN jsonb_build_object(
    'install_id', next_install,
    'trial_started_at', next_trial,
    'plan', next_plan,
    'license_expires_at', next_expires,
    'license_name', next_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_shop_license(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_shop_license(text, text, text, text, text, text, text) TO authenticated, service_role;
