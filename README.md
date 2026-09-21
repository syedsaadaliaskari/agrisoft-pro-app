# Agri Soft Pro — Mobile

Phone and tablet companion for **Agri Soft Pro**, the desktop agri-shop ERP (Electron + Next.js + SQLite).

This app does **not** replace the desktop system. It talks to the same **Supabase** cloud database so staff can see shop data on a phone while the desktop stays the full ERP.

```
Desktop (SQLite, offline)  ↔  Supabase Postgres  ↔  Mobile (this repo)
```

Cloud sync only. No LAN / Wi‑Fi peer sync.

Read [MOBILE_BRIEF.md](./MOBILE_BRIEF.md) for product rules.

## What works now

Shop staff sign in with email + the desktop shop join code. Books stay on the phone (AsyncStorage) and sync to Supabase when online.

- Dashboard, sales, purchases, returns
- Customers, vendors, products, inventory
- Receive / make payment, expense, income, owner draw
- Ledgers and reports
- Share invoice as PDF (system share sheet)
- English / Urdu on login, Settings, and menu labels
- Offline till: saves on the phone, skips cloud pull until the unsynced work is pushed

Journal is hidden (desktop 0.3.6 removed it). Super Admin, licenses, LAN sync, and a full POS are out of scope.

## Setup (Expo Go / local)

1. Install [Node.js 20+](https://nodejs.org/).
2. Copy env and add the **anon** key only:

```bash
copy .env.example .env
```

```
EXPO_PUBLIC_SUPABASE_URL=https://vbyqlfxcfxijmrvilupp.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Get the anon key from the desktop `.env` (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) or Supabase Dashboard → Project Settings → API → `anon` `public`.

**Never** put `SUPABASE_SERVICE_ROLE_KEY` in this app. Do not commit `.env`. Shop id after sign-in comes from the join code, not from `tenant-dev-001`.

3. Install and start:

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS). Emulators: press `a` for Android.

Restart Expo after changing `.env`.

```bash
npm run typecheck
```

## Android APK (EAS)

Do **not** put the anon key in `eas.json` or git. Store it as an EAS secret, then build:

```bash
npx eas-cli login
npx eas-cli secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --scope project --type string
npx eas-cli build -p android --profile preview
```

When prompted, paste the same anon key used in `.env`. The preview profile already has the project URL and builds an **internal APK**.

If the secret is already set, the local helper reads `.env` only for this machine and restores `eas.json` afterward (the key is not committed):

```bash
npm run build:apk
```

Install the APK from the EAS dashboard link. Staff still sign in with email + shop code; the APK does not bake a shop tenant id.

## How this links to the desktop

- Desktop remains the source of ERP features.
- Phone and desktop share the same tenant after the phone joins with the shop code from desktop.
- Soft-deleted rows (`deleted_at` not null) are ignored.

If the list errors with a permission denied / RLS message, add tenant-scoped policies in the Supabase SQL Editor. Desktop uses `service_role` (bypasses RLS); the phone cannot.

## Stack

Expo (React Native) + TypeScript, Expo Router, `@supabase/supabase-js`.
