# Agri Soft Pro — Mobile

Phone and tablet companion for **Agri Soft Pro**, the desktop agri-shop ERP (Electron + Next.js + SQLite).

This app does **not** replace the desktop system. It talks to the same **Supabase** cloud database so staff can see shop data on a phone while the desktop stays the full ERP.

```
Desktop (SQLite, offline)  ↔  Supabase Postgres  ↔  Mobile (this repo)
```

Cloud sync only. No LAN / Wi‑Fi peer sync.

Read [MOBILE_BRIEF.md](./MOBILE_BRIEF.md) for product rules and milestones.

## What works now (milestones 1–2)

- Expo Router app with Home, Customers, Settings
- Customer list, search (name/phone), detail, pull-to-refresh
- Product list (read-only), search (name/brand), detail with size/color stock
- Supabase client using the **anon** key only (never `service_role`)
- Runs without keys: you will see a “waiting for keys” state until `.env` is filled

Not built yet: products, new sale, Auth/RLS hardening, offline outbox.

## Setup

1. Install [Node.js 20+](https://nodejs.org/) and [Expo Go](https://expo.dev/go) on your phone (optional).
2. Copy env and add the anon key:

```bash
copy .env.example .env
```

Fill:

```
EXPO_PUBLIC_SUPABASE_URL=https://vbyqlfxcfxijmrvilupp.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_TENANT_ID=tenant-dev-001
```

Get the anon key from the desktop `.env` (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) or Supabase Dashboard → Project Settings → API → `anon` `public`.

**Never** put `SUPABASE_SERVICE_ROLE_KEY` in this app.

3. Install and start:

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS). Emulators: press `a` for Android.

Restart Expo after changing `.env`.

## How this links to the desktop

- Desktop remains the source of ERP features (sales, purchases, stock, reports).
- Desktop currently pushes **customers** to Supabase with a manual Cloud sync button.
- After a desktop sync, pull-to-refresh on the phone should show the same customers for `tenant-dev-001` (Agri Soft Pro Dev Shop).
- Soft-deleted rows (`deleted_at` not null) are ignored.

If the list errors with a permission denied / RLS message, the human needs a tenant-scoped policy in the Supabase SQL Editor. Desktop uses `service_role` (bypasses RLS); the phone cannot.

## Stack

Expo (React Native) + TypeScript, Expo Router, `@supabase/supabase-js`.
