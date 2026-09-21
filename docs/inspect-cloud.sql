-- Read-only. Does not change data, tables, or policies.
-- SQL Editor runs as a privileged role, so this shows rows even if the phone cannot.

SELECT
  t.id,
  t.name,
  t.join_code,
  t.is_active,
  t.deleted_at,
  (SELECT count(*) FROM public.customers c WHERE c.tenant_id = t.id AND c.deleted_at IS NULL) AS customers
FROM public.tenants t
ORDER BY t.created_at;

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
