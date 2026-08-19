# Agri Soft Pro mobile

Read `MOBILE_BRIEF.md` before changing this repo.

This is the shop-staff **mobile companion**, not a rewrite of the desktop ERP.

- Stack: Expo + Expo Router + TypeScript + `@supabase/supabase-js`
- Cloud only (Supabase). No LAN sync. No `SUPABASE_SERVICE_ROLE_KEY`.
- Scope queries by `tenant_id`. Ignore `deleted_at` rows.
- Current scope: milestones 1–3 (Home, Customers, Products read-only, Settings).
