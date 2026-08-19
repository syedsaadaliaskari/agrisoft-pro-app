# Desktop → Mobile cloud context

Safe pack from the desktop ERP. Do not put `SUPABASE_SERVICE_ROLE_KEY` in this app.

**Project:** https://vbyqlfxcfxijmrvilupp.supabase.co  
**Desktop repo:** agri-soft-pro (Electron + SQLite)  
**Cloud schema (desktop):** `supabase/schema.sql`

## Tenant id the phone must use

Desktop resolve order:

1. Local setting `supabase_tenant_id` (written on Pro activation — unique UUID per shop)
2. Else `.env` `SUPABASE_TENANT_ID` (dev/vendor fallback, currently `tenant-dev-001`)

Phone:

```
EXPO_PUBLIC_TENANT_ID=<same id the shop PC actually syncs with>
```

This PC’s env fallback is still `tenant-dev-001` (Agri Soft Pro Dev Shop). If the shop under test was activated with a new Pro code, use that UUID instead — do not guess.

Companies in cloud = table `tenants` (not `companies`).

| id | name | slug |
| --- | --- | --- |
| tenant-dev-001 | Agri Soft Pro Dev Shop | agrisoft-pro-dev |

Activated shops: desktop upserts `tenants` with a new UUID `id` + company name.

## Customers

- Table: `public.customers`
- Shop key: `tenant_id` → `tenants.id` (no `company_id`)
- Ignore `deleted_at is not null`
- Desktop can push/pull customers; LWW on `updated_at`

## RLS

Desktop `schema.sql` has no policies. Desktop sync uses `service_role` (bypasses RLS).  
The phone uses the **anon** key. If RLS was enabled in the dashboard with no anon policies, Table Editor still shows rows and the phone sees none.

Fix: create-only SELECT policies in `docs/dev-rls.sql`. Do not drop tables. Do not turn RLS off.

## Desktop sync paths (reference)

| What | Path |
| --- | --- |
| Env load | `electron/sync/env.ts` |
| Tenant + PostgREST | `electron/sync/client.ts` |
| Customers | `electron/sync/customers.ts` → `runCustomerCloudSync()` |
| Scheduler | `electron/sync/scheduler.ts` |
| Activation tenant | `electron/db/license.ts` (`tenantId` in payload v2) |
