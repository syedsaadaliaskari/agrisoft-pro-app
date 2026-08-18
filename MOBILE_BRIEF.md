# Agri Soft Pro — Mobile App Brief

What you are building
A mobile companion app for Agri Soft Pro, a local desktop ERP (Electron + Next.js + SQLite) used by agri shops for sales, purchases, stock, customers, vendors, ledgers, and reports.

The desktop app already exists. You are not rewriting the desktop ERP. You are building a phone/tablet app that shares the same cloud database (Supabase) so shop staff can work on mobile and stay in sync with the desktop when online.

Product name: Agri Soft Pro
Desktop repo (reference only): agrisoft-pro (Electron + SQLite offline)
This repo: new mobile app (create if empty)

Business goal
Shop owners use the desktop PC offline all day. Phones should:

See the same shop data (starting with customers, then products/sales)
Eventually create sales / check stock on the phone
Sync through Supabase Postgres (source of truth in the cloud)
LAN multi-PC is abandoned — do not build Wi‑Fi peer sync. Cloud sync only.

Architecture (must follow)
Desktop (SQLite)  ←→  Supabase Postgres  ←→  Mobile app
     offline              when online              offline later / online MVP
Layer	Role
Supabase
Cloud source of truth per shop (tenant_id)
Desktop
Full ERP; SQLite offline; already syncs customers to Supabase (manual Sync button)
Mobile
Companion UI; talk to Supabase (and later a local DB + outbox like desktop)

Critical rules
- Never replace desktop SQLite with cloud-only — same idea on mobile later: local-first when you add offline.
- Never put SUPABASE_SERVICE_ROLE_KEY in the mobile app. Use anon key + Row Level Security (RLS) only.
- Every shop row is scoped by tenant_id. Dev tenant id: tenant-dev-001 (name: Agri Soft Pro Dev Shop).
- Soft deletes use deleted_at. Ignore rows where deleted_at is not null.
- Prefer same row ids as desktop (text/uuid) so sync converges.

Supabase project (already created)
- Project URL: https://vbyqlfxcfxijmrvilupp.supabase.co
- Dashboard name: agrisoft-pro
- Schema: already applied (tables: tenants, customers, products, product_variants, sales, sale_items, purchases, etc.)
- Desktop .env uses: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (desktop only), SUPABASE_TENANT_ID=tenant-dev-001
- Ask the human for the anon key (or they put it in .env). Do not invent keys. Do not commit secrets.

Stack (use this)
| Choice | Decision |
| --- | --- |
| Framework | Expo (React Native) + TypeScript |
| Router | Expo Router |
| Supabase client | @supabase/supabase-js |
| UI | Simple, clean, native-feeling; Tailwind via NativeWind optional — or plain StyleSheet if faster |
| State | Zustand or React context — keep light |
| Local DB (later phase) | Expo SQLite / WatermelonDB — not required for MVP |
| Auth (MVP) | Simple: hardcode or settings screen for tenant_id + Supabase anon; then upgrade to Supabase Auth |
| Auth (proper) | Supabase Auth + JWT claim / tenant_members — can be phase 2 |

Do not use: Flutter, Ionic, plain React web as the main “app”, or Electron for mobile.

Why Expo: Desktop UI is React; same language; fast Android/iOS builds; good Supabase docs.

Design / UX (match desktop product)
Desktop recently simplified. Follow the same spirit:

- Clear labels: Sale, Customer, Product — not jargon
- No barcode-first workflows
- Names in lists, not account codes
- Calm layout: one job per screen; avoid purple “AI SaaS” look
- Brand: Agri Soft Pro; green/agri-friendly accents OK if consistent
- Mobile-first: large tap targets, simple lists, bottom tabs or drawer for main areas

MVP screens
- Home / Dashboard lite — shop name, sync status, counts
- Customers — list from Supabase customers where tenant_id = … and deleted_at is null
- Settings — tenant id, Supabase URL/anon (dev), last refresh
- (Next) Products list
- (Next) New sale (write to Supabase or local outbox)

Data model (cloud) — what matters for MVP

tenants
id, name, slug, is_active, timestamps, deleted_at

customers (first sync entity — desktop already pushes these)
Important columns:

id, tenant_id, code, name, phone, email, address, city
opening_balance, balance_type, credit_limit, is_active
created_at, updated_at, deleted_at

Query example mindset:

```sql
select * from customers
where tenant_id = 'tenant-dev-001'
  and deleted_at is null
order by name;
```

Later tables (same tenant pattern): products, product_variants, sales, sale_items, purchases, vendors, accounts, vouchers, …

Platform-only tables (vendor Super Admin — usually not in shop mobile app): licenses, client_companies.

RLS / security (must plan for)
Desktop currently uses service_role (bypasses RLS) for sync. Mobile cannot.

You must either:

- Add RLS policies so anon/authenticated can only read/write their tenant_id, or
- For a short dev-only spike: temporary open policies (document clearly as insecure), then lock down.

Preferred end state:

- User signs in with Supabase Auth
- JWT includes or maps to tenant_id
- Policies: tenant_id = auth.jwt() ->> 'tenant_id' (or equivalent membership table)

Until Auth exists, MVP can use a dev settings tenant id and restricted policies the human applies in SQL Editor.

Sync story for the app

Phase A — Online MVP (start here)
- App reads/writes Supabase directly when online
- Pull customers list; pull-to-refresh
- Show error if offline

Phase B — Offline (later, mirror desktop)
- Local SQLite + sync_outbox
- Write locally first → push when online → pull by updated_at cursor
- Conflict rule: last-write-wins on updated_at; stock via movements later

Desktop already proved: customers appear in Supabase Table Editor after Settings → Cloud sync → Sync customers now.

What the desktop already does (context)
- Full ERP offline
- Super Admin = vendor console (companies by area), not shop sales menus
- Shop Admin = sales/purchases/etc.
- Document numbers like #00001
- Sale/purchase returns net from dashboard/report totals
- Cloud sync spike: customers only, manual button

Mobile users are shop staff, not Super Admin vendor tools (unless you add a separate vendor app later).

Milestone plan (build in this order)

Milestone 1 — Skeleton
- Expo app boots
- Env: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_TENANT_ID
- Connect to Supabase; health check / read tenants row

Milestone 2 — Customers
- List customers for tenant
- Search by name/phone
- Detail screen
- Pull-to-refresh

Milestone 3 — Products / stock (read-only)
- List products + variant stock

Milestone 4 — Create customer (write)
- Insert into Supabase with new uuid id, same tenant_id
- Confirm it appears on desktop after desktop Sync (pull) or next sync cycle

Milestone 5 — Auth + RLS hardening

Milestone 6 — Offline outbox + auto sync

Do not jump to full sales POS before milestones 1–2 work reliably.

Env template for this app

```
EXPO_PUBLIC_SUPABASE_URL=https://vbyqlfxcfxijmrvilupp.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_TENANT_ID=tenant-dev-001
```

Add .env to .gitignore. Provide .env.example without secrets.

Repo / process
- New repo separate from desktop
- Keep README: how to run Expo, how it links to Supabase, that desktop is source of ERP features
- Optional: copy supabase/schema.sql into this repo under docs/ for reference (do not re-run casually if tables already exist)

Explicit non-goals (for now)
- Do not rebuild full desktop ERP on phone
- Do not implement LAN
- Do not use service_role in the client
- Do not build Super Admin license/company CRM in the shop app
- Do not require n8n / WhatsApp in v1

Success criteria for first delivery
- npx expo start runs on a phone/emulator
- App shows Agri Soft Pro Dev Shop customers from Supabase
- After desktop syncs a new customer, pull-to-refresh on phone shows them
- No service_role in the bundle
- Clear README for the human

First message to the agent (optional kickoff)
“Scaffold an Expo Router TypeScript app per this brief. Milestone 1–2 only: env, Supabase client, customers list + detail + refresh. Ask me for the anon key if missing. Do not use service_role.”
