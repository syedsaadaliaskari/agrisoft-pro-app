-- Read-only. Does not change data, tables, or policies.
-- SQL Editor runs as a privileged role, so this shows rows even if the phone cannot.
-- Paste in Supabase → SQL Editor → Run.

SELECT id, name, slug, is_active, deleted_at
FROM public.tenants
ORDER BY created_at;

SELECT tenant_id, count(*) AS customers
FROM public.customers
WHERE deleted_at IS NULL
GROUP BY tenant_id
ORDER BY tenant_id;
