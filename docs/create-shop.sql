-- Run once in Supabase → SQL Editor.
-- Adds a way for a phone with no computer to start an empty shop.
-- Does not change join_shop, existing shops, or desktop sync.

CREATE OR REPLACE FUNCTION public.create_shop(shop_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  tid text;
  code text;
  shop text;
  slug text;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tenant_members WHERE user_id = uid) THEN
    RAISE EXCEPTION 'This account already belongs to a shop';
  END IF;

  shop := btrim(shop_name);
  IF shop = '' THEN
    RAISE EXCEPTION 'Shop name is required';
  END IF;

  tid := gen_random_uuid()::text;
  LOOP
    code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.tenants WHERE join_code = code AND deleted_at IS NULL
    );
  END LOOP;

  slug := lower(regexp_replace(shop, '[^a-zA-Z0-9]+', '-', 'g'));
  slug := trim(both '-' from slug);
  IF slug = '' THEN
    slug := 'shop';
  END IF;
  slug := slug || '-' || substr(replace(tid, '-', ''), 1, 8);

  INSERT INTO public.tenants (id, name, slug, join_code, is_active, created_at, updated_at, deleted_at)
  VALUES (tid, shop, slug, code, true, now(), now(), NULL);

  INSERT INTO public.tenant_members (user_id, tenant_id)
  VALUES (uid, tid);

  RETURN jsonb_build_object('tenant_id', tid, 'join_code', code);
END;
$$;

REVOKE ALL ON FUNCTION public.create_shop(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_shop(text) TO authenticated;
