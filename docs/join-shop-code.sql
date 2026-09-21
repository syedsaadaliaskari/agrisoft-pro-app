-- Paste once in Supabase → SQL Editor → Run.
-- Lets the phone join with the short shop code from PC Settings (not only the long shop id).

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS join_code text;

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

REVOKE ALL ON FUNCTION public.join_shop(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_shop(text) TO authenticated;
