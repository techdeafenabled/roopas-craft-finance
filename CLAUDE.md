@AGENTS.md

# Roopa's Craft Jewellery — Finance Tracker

## Project

Business finance tracker PWA for Roopa's Craft Jewellery (handmade nature jewellery). Used by multiple people on different devices at home and stalls/exhibitions. Replaced paper/notebook tracking.

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **UI:** React 19, Tailwind CSS v4, lucide-react icons
- **Local DB:** Dexie 4 (IndexedDB, offline-first)
- **Cloud DB:** Supabase (Postgres, anon key, RLS)
- **Auth:** PIN-only (bcrypt 12 rounds, no email/password)
- **Hosting:** Vercel (auto-deploy from GitHub)
- **PWA:** service worker + manifest.json

## Color Palette

- Primary green: `#306D29`
- Dark green: `#0D530E`
- Light green: `#3D8A35`
- Cream (bg/accent): `#FBF5DD`
- Gold border: `#E7E1B1`
- Page background: `#FBF5DD`
- Cards: `#FFFFFF`
- Text: `#1a1a1a` / `#5a5a5a`

## Architecture

- `src/app/page.tsx` — PIN lock screen
- `src/app/setup/` — first-time PIN + bank setup
- `src/app/(app)/` — all auth-protected routes (dashboard, sales, purchases, expenses, stalls, customers, banks, debtors, creditors, investments, transactions, reports, settings, more)
- `src/components/` — TopNav, Sidebar, BottomNav, EntryForm, PinKeypad, SyncBadge
- `src/lib/` — db.ts (Dexie), supabase.ts, auth.ts, sync.ts, format.ts, backup.ts, bill-generator.ts, types.ts
- `src/context/AuthContext.tsx` — session, sync, auto-backup

## Data Pattern

Offline-first: save to Dexie → sync to Supabase when online. All new tables must follow this pattern. Always write to both Dexie and Supabase.

## Key Rules

- INR currency only
- Bank balances = business portion only (not personal)
- Record transactions only when money actually moves
- Investments are NOT expenses — tracked separately
- Stall expenses use the regular transactions table with `stall_id` set
- Multi-device: PIN + all data syncs via Supabase
- Bottom nav on mobile, sidebar on desktop (lg+)

## Database

- Dexie version 2 with upgrade hook (auto-creates customers from existing debtors)
- `supabase-schema.sql` — full schema for fresh installs
- `supabase-migration-v2.sql` — migration for existing v1 databases
- Tables: app_settings, banks, transactions, transaction_banks, debtors, debtor_entries, creditors, creditor_entries, stalls, customers, investments, investment_entries, creditor_installment_plans, budget_targets, chat_messages, backup_logs

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_ONESIGNAL_APP_ID`
