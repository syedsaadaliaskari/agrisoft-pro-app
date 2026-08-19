-- Read-only. Does not change data, tables, or policies.
-- SQL Editor runs as a privileged role, so this shows rows even if the phone cannot.

SELECT id, name, slug, is_active, deleted_at
FROM public.tenants
ORDER BY created_at;

SELECT tenant_id, count(*) AS customers
FROM public.customers
WHERE deleted_at IS NULL
GROUP BY tenant_id
ORDER BY tenant_id;

SELECT tenant_id, count(*) AS products
FROM public.products
WHERE deleted_at IS NULL
GROUP BY tenant_id
ORDER BY tenant_id;

SELECT tenant_id, count(*) AS variants
FROM public.product_variants
WHERE deleted_at IS NULL
GROUP BY tenant_id
ORDER BY tenant_id;

SELECT tenant_id, count(*) AS sales
FROM public.sales
WHERE deleted_at IS NULL
GROUP BY tenant_id
ORDER BY tenant_id;
