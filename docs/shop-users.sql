-- Run once in Supabase → SQL Editor.
-- Lets a signed-in shop phone read shop users and save a new password hash.
-- Does not change customers, products, sales, or join_shop.
-- Desktop sync still uses service_role.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member_select_users" ON public.users;
CREATE POLICY "member_select_users" ON public.users
FOR SELECT TO authenticated
USING (tenant_id IN (SELECT public.my_shop_ids()) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "member_update_users" ON public.users;
CREATE POLICY "member_update_users" ON public.users
FOR UPDATE TO authenticated
USING (tenant_id IN (SELECT public.my_shop_ids()) AND deleted_at IS NULL)
WITH CHECK (tenant_id IN (SELECT public.my_shop_ids()));

DROP POLICY IF EXISTS "member_select_roles" ON public.roles;
CREATE POLICY "member_select_roles" ON public.roles
FOR SELECT TO authenticated
USING (tenant_id IN (SELECT public.my_shop_ids()) AND deleted_at IS NULL);

GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.roles TO authenticated;
