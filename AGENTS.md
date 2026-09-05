# Agri Soft Pro mobile

Read `MOBILE_BRIEF.md` before changing this repo.
Read `DESIGN.md` before changing colors, type, radii, or layout. Import tokens from `constants/theme.ts`. Do not scatter hex values.

This is the shop-staff **mobile companion**, not a rewrite of the desktop ERP.

- Stack: Expo + Expo Router + TypeScript + `@supabase/supabase-js`
- Cloud only (Supabase). No LAN sync. No `SUPABASE_SERVICE_ROLE_KEY`.
- Scope queries by `tenant_id`. Ignore `deleted_at` rows.
- Visual sync: desktop light theme only (`DESIGN.md`).
