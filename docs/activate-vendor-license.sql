-- Run once in Supabase → SQL Editor.
-- Lets Super Admin activate a customer from the phone.
-- Does not change customers, products, sales, or join_shop.
-- Does not allow anon to insert into public.licenses directly.

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS install_id text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS trial_started_at text;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_install_id_uidx
  ON public.tenants (install_id)
  WHERE install_id IS NOT NULL AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.activate_vendor_license(
  p_id text,
  p_name text,
  p_install_id text,
  p_plan text,
  p_activated_at text,
  p_expires_at text,
  p_notes text,
  p_phone text,
  p_tenant_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_install text;
  v_name text;
  v_plan text;
  v_activated text;
  v_expires text;
  v_notes text;
  v_phone text;
  v_id text;
  tid text;
  lid text;
  created text;
BEGIN
  v_install := upper(btrim(coalesce(p_install_id, '')));
  v_name := btrim(coalesce(p_name, ''));
  v_plan := lower(btrim(coalesce(p_plan, '')));
  v_notes := nullif(btrim(coalesce(p_notes, '')), '');
  v_phone := nullif(btrim(coalesce(p_phone, '')), '');
  IF v_name = '' THEN
    RAISE EXCEPTION 'Name is required';
  END IF;
  IF v_install = '' OR length(v_install) > 40 THEN
    RAISE EXCEPTION 'Install ID is required';
  END IF;
  IF v_plan NOT IN ('monthly', 'yearly', 'forever') THEN
    RAISE EXCEPTION 'Invalid plan';
  END IF;

  IF coalesce(p_activated_at, '') ~ '^\d{4}-\d{2}-\d{2}$' THEN
    v_activated := p_activated_at;
  ELSE
    v_activated := to_char((timezone('utc', now()))::date, 'YYYY-MM-DD');
  END IF;
  IF v_plan = 'monthly' THEN
    v_expires := to_char((v_activated::date + interval '1 month')::date, 'YYYY-MM-DD');
  ELSIF v_plan = 'yearly' THEN
    v_expires := to_char((v_activated::date + interval '12 month')::date, 'YYYY-MM-DD');
  ELSE
    v_expires := NULL;
  END IF;

  SELECT id INTO tid
  FROM public.tenants
  WHERE upper(btrim(install_id)) = v_install
    AND deleted_at IS NULL
  LIMIT 1;

  IF tid IS NULL THEN
    SELECT t.id INTO tid
    FROM public.licenses l
    JOIN public.tenants t ON t.id = l.tenant_id AND t.deleted_at IS NULL
    WHERE upper(btrim(l.install_id)) = v_install
      AND l.deleted_at IS NULL
      AND l.tenant_id IS NOT NULL
      AND (t.install_id IS NULL OR btrim(t.install_id) = '' OR upper(btrim(t.install_id)) = v_install)
    ORDER BY l.updated_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF tid IS NULL THEN
    tid := nullif(btrim(coalesce(p_tenant_id, '')), '');
    IF tid IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tenants
      WHERE id = tid
        AND deleted_at IS NULL
        AND install_id IS NOT NULL
        AND btrim(install_id) <> ''
        AND upper(btrim(install_id)) <> v_install
    ) THEN
      tid := NULL;
    END IF;
    IF tid IS NULL OR NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = tid) THEN
      IF tid IS NULL THEN
        tid := gen_random_uuid()::text;
      END IF;
      INSERT INTO public.tenants (
        id, name, plan, license_expires_at, license_name, is_active, install_id, updated_at, deleted_at
      ) VALUES (
        tid, v_name, v_plan, v_expires, v_name, true, v_install, now(), NULL
      );
    ELSE
      UPDATE public.tenants
      SET
        name = v_name,
        plan = v_plan,
        license_expires_at = v_expires,
        license_name = v_name,
        is_active = true,
        install_id = CASE
          WHEN install_id IS NULL OR btrim(install_id) = '' THEN v_install
          ELSE install_id
        END,
        updated_at = now(),
        deleted_at = NULL
      WHERE id = tid;
    END IF;
  ELSE
    UPDATE public.tenants
    SET
      name = v_name,
      plan = v_plan,
      license_expires_at = v_expires,
      license_name = v_name,
      is_active = true,
      install_id = CASE
        WHEN install_id IS NULL OR btrim(install_id) = '' THEN v_install
        ELSE install_id
      END,
      updated_at = now(),
      deleted_at = NULL
    WHERE id = tid;
  END IF;

  SELECT id, created_at::text INTO lid, created
  FROM public.licenses
  WHERE upper(btrim(install_id)) = v_install
    AND deleted_at IS NULL
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF lid IS NULL THEN
    v_id := nullif(btrim(coalesce(p_id, '')), '');
    IF v_id IS NULL THEN
      v_id := gen_random_uuid()::text;
    END IF;
    INSERT INTO public.licenses (
      id, name, install_id, plan, activated_at, expires_at, notes, phone, tenant_id, updated_at, deleted_at
    ) VALUES (
      v_id, v_name, v_install, v_plan, v_activated, v_expires, v_notes, v_phone, tid, now(), NULL
    );
    lid := v_id;
    created := now()::text;
  ELSE
    UPDATE public.licenses
    SET
      name = v_name,
      install_id = v_install,
      plan = v_plan,
      activated_at = v_activated,
      expires_at = v_expires,
      notes = v_notes,
      phone = v_phone,
      tenant_id = tid,
      updated_at = now(),
      deleted_at = NULL
    WHERE id = lid;
  END IF;

  RETURN jsonb_build_object(
    'id', lid,
    'name', v_name,
    'install_id', v_install,
    'plan', v_plan,
    'activated_at', v_activated,
    'expires_at', v_expires,
    'notes', v_notes,
    'phone', v_phone,
    'tenant_id', tid,
    'created_at', created
  );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_vendor_license(text, text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_vendor_license(text, text, text, text, text, text, text, text, text) TO anon, authenticated;
