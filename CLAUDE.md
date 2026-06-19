@AGENTS.md

# Roopa's Craft Jewellery — Finance Tracker

## About This Project

Business finance tracker PWA for Roopa's Craft Jewellery — a handmade nature jewellery business. The app replaced paper/notebook tracking which was causing things to get missed.

**Who uses it:** Multiple people — Roopa, family members, and employees. All need access from different devices with the same PIN and data.

**Where it's used:** At home and at stalls/exhibitions. Must work offline at stalls with no internet, then sync when back online.

**Business model:** Sells jewellery at stalls/exhibitions and from home. Bank accounts mix personal and business money — the app tracks ONLY the business portion. Transactions are recorded only when actual money moves (paid/received). Investments (FD, mutual funds) are tracked separately from expenses — the money is still yours, just moved.

## Tech Stack

| What | Technology | Why |
|------|-----------|-----|
| Framework | Next.js 16 (App Router, Turbopack) | Fast, modern, great for PWAs |
| UI | React 19, Tailwind CSS v4, lucide-react | Latest React, mobile-first CSS |
| Local DB | Dexie 4 (IndexedDB) | Works offline, fast on device |
| Cloud DB | Supabase (Postgres, anon key, RLS) | Free tier, real-time sync |
| Auth | PIN-only (bcrypt 12 rounds) | Simple, secure, no email needed |
| Hosting | Vercel (auto-deploy from GitHub) | Free tier, auto-deploy |
| PWA | Service worker + manifest.json | Install on phone like a real app |
| Charts | Recharts | Bar, line, pie charts in reports |

## Color Palette

These colors were chosen by the user from their logo (olive green jewellery + gold text):

| Role | Color | Hex |
|------|-------|-----|
| Primary green | Deep green | `#306D29` |
| Dark green | Navbar/buttons | `#0D530E` |
| Light green | Hover states | `#3D8A35` |
| Cream background | Page & sidebar bg | `#FBF5DD` |
| Gold border | Borders & accents | `#E7E1B1` |
| Cards | White | `#FFFFFF` |
| Text primary | Dark | `#1a1a1a` |
| Text secondary | Gray | `#5a5a5a` |
| Success | Green | `#306D29` |
| Danger | Red | `#dc2626` |
| Warning/Amber | Orange | `#d97706` |

## Architecture

### File Structure

```
src/
├── app/
│   ├── page.tsx                    — PIN lock screen (cream bg, dark green text)
│   ├── layout.tsx                  — Root layout (Montserrat font, viewport meta)
│   ├── globals.css                 — CSS vars, animations, pin-dot styles
│   ├── favicon.ico                 — Logo as favicon
│   ├── icon.png                    — Logo as PWA icon
│   ├── setup/page.tsx              — First-time setup (create PIN + add banks)
│   └── (app)/                      — Auth-protected routes
│       ├── layout.tsx              — TopNav + Sidebar + BottomNav layout
│       ├── dashboard/page.tsx      — Main dashboard (3 KPIs, chart, debts, stalls)
│       ├── sales/page.tsx          — Add sale + transaction list (no tabs)
│       ├── purchases/page.tsx      — Add purchase + transaction list
│       ├── expenses/page.tsx       — Add expense + category selection
│       ├── transactions/page.tsx   — All transactions with filter
│       ├── stalls/page.tsx         — Stall list + create form
│       ├── stalls/[id]/page.tsx    — Stall detail (expenses, sales, profit)
│       ├── customers/page.tsx      — All customers with search
│       ├── customers/[id]/page.tsx — Customer detail + purchase history
│       ├── banks/page.tsx          — Bank accounts management
│       ├── banks/[id]/page.tsx     — Bank passbook (receipts + payments)
│       ├── debtors/page.tsx        — Debtors + WhatsApp bill share
│       ├── creditors/page.tsx      — Creditors list
│       ├── creditors/[id]/page.tsx — Creditor detail + installment plans
│       ├── investments/page.tsx    — Investment list (FD, mutual fund)
│       ├── investments/[id]/page.tsx — Investment detail (invest/withdraw)
│       ├── reports/page.tsx        — 4-tab reports (overview, stalls, banks, profit)
│       ├── settings/page.tsx       — Change PIN + backup/restore
│       └── more/page.tsx           — Menu with all links + logout
├── components/
│   ├── TopNav.tsx                  — Green navbar (logo, search, logout)
│   ├── Sidebar.tsx                 — Desktop nav (grouped links), mobile drawer
│   ├── BottomNav.tsx               — Mobile-only bottom nav (5 tabs)
│   ├── EntryForm.tsx               — Shared transaction form (sale/purchase/expense)
│   ├── PinKeypad.tsx               — PIN input (circular buttons, light/dark mode)
│   ├── SyncBadge.tsx               — Shows pending sync count
│   └── ServiceWorkerRegister.tsx   — PWA service worker
├── context/
│   └── AuthContext.tsx             — Session, online/offline, sync, auto-backup
└── lib/
    ├── types.ts                    — All TypeScript interfaces
    ├── db.ts                       — Dexie DB (version 2, 16 tables)
    ├── supabase.ts                 — Supabase client
    ├── auth.ts                     — PIN verify, lockout, syncFromCloud
    ├── sync.ts                     — Two-way sync (Dexie ↔ Supabase)
    ├── format.ts                   — formatINR, formatDate, generateId, today, getDateRange
    ├── backup.ts                   — Auto daily backup, manual backup, JSON export/restore
    └── bill-generator.ts           — WhatsApp bill text generation + share
```

### Navigation

- **Desktop (lg+):** TopNav (green gradient) + Sidebar (cream, grouped links) + no bottom nav
- **Mobile/PWA:** TopNav (compact) + hamburger menu (opens sidebar as drawer) + BottomNav (5 tabs: Home, Stalls, Sale, History, More)

## Data Pattern

**Offline-first:** Save to Dexie first → sync to Supabase when online. All new tables must follow this pattern. Always write to both Dexie and Supabase.

**Sync flow:**
1. `syncToSupabase()` — uploads unsynced records (where synced=false)
2. `syncFromSupabase()` — pulls all data from Supabase into Dexie
3. Triggered: on app load, when coming back online, after each transaction
4. `syncFromCloud()` in auth.ts — pulls everything on first login from new device

## Key Business Rules

- **INR currency only** — all amounts in Indian Rupees
- **Bank balances = business portion only** — personal expenses in the same bank account are NOT tracked
- **Record only when money moves** — no IOUs in the transaction table. Debtor/creditor entries track credit separately
- **Investments ≠ expenses** — money moved to FD/mutual fund is tracked in `investments` + `investment_entries`, not as an expense. It reduces bank balance but shows as "invested" on dashboard
- **Stall expenses = regular transactions** — expenses linked to a stall use the `transactions` table with `stall_id` set. No separate stall_expenses table. This keeps bank balances accurate automatically
- **Customer ≠ Debtor** — customers table tracks ALL customers. Debtors are a subset (linked via `customers.debtor_id`). You can be a customer without being a debtor
- **Multi-device sync** — PIN hash stored in Supabase. When a new device opens the app, `syncFromCloud()` pulls PIN + all data from Supabase into local Dexie

## Database

### Schema

- **Dexie version 2** with upgrade hook that auto-creates Customer records from existing Debtors
- `supabase-schema.sql` — full schema for fresh installs
- `supabase-migration-v2.sql` — migration SQL for existing v1 databases (run in Supabase SQL Editor)

### Tables (16 total)

| Table | Purpose |
|-------|---------|
| `app_settings` | PIN hash, setup status (single row) |
| `banks` | Bank/cash accounts with opening balance |
| `transactions` | Sales, purchases, expenses (with stall_id, customer_id) |
| `transaction_banks` | Bank splits per transaction |
| `debtors` | People who owe you |
| `debtor_entries` | Credit given / payment received (with bank_id) |
| `creditors` | People you owe |
| `creditor_entries` | Credit taken / payment made (with bank_id) |
| `stalls` | Exhibition/stall tracking (name, place, dates, fee, footfall) |
| `customers` | All customers (linked to debtors via debtor_id) |
| `investments` | Named investments (FD, mutual fund, etc.) |
| `investment_entries` | Invest/withdraw entries per investment |
| `creditor_installment_plans` | Fixed/flexible payment plans for creditors |
| `budget_targets` | Monthly profit/savings/expense targets |
| `chat_messages` | AI assistant chat history (future) |
| `backup_logs` | Auto/manual backup records |

### Expense Categories

`stall`, `stall_rent`, `fuel`, `food`, `travel`, `salary`, `helper_salary`, `other`

## Security

- **PIN:** 4-digit, bcrypt 12 rounds, 5-attempt lockout (30 min)
- **Auto-lock:** 5 minutes inactivity, lock on tab switch
- **Session:** sessionStorage (clears on browser/tab close)
- **RLS:** All Supabase tables have Row Level Security with allow-all policies (PIN is the auth layer)
- **Backup:** Auto daily backup to Supabase, manual backup button, JSON export/restore
- **HTTPS:** Handled by Vercel

## Dashboard Design (Research-Based)

Designed based on research into Khatabook, OkCredit, QuickBooks, and 2026 finance dashboard best practices:

1. **3 KPI cards** (not 4+) — Total Balance (expandable banks), This Month Profit (% vs last month), Outstanding Dues (amber). Research shows 3 numbers are scannable in under 2 seconds
2. **Sales vs Expenses chart** — 12-month bar chart, full width
3. **Debt Overview panel** — Khatabook-style progress bars showing who owes you most
4. **Stall Performance panel** — active stall badge + recent completed stalls with profit
5. **Recent Transactions** — last 5, clean list
6. **No shortcut buttons** — one "+ Add Transaction" button replaces 7+ shortcuts. Everything else is in the sidebar

## Sales & Purchases Pages (Research-Based)

Research from finance UX best practices:

- **No tabs** — form and transaction list on the same page (no switching between Add/History)
- **Bank selection as chips** — tappable buttons instead of dropdown
- **Date grouping** — transactions grouped by "Today", "Yesterday", date
- **Search** — filter transactions by note or bank name
- **Desktop:** form on left (40%), transaction list on right (60%)
- **Mobile:** form on top, list below

## Feature Roadmap (Future)

These features are planned but not yet built:

1. **AI Budget Planner** — Claude API suggests how to split monthly profit into dues/savings/expenses. Needs `ANTHROPIC_API_KEY` env var
2. **AI Chat Assistant** — chat-style bot that queries all business data. Same Claude API
3. **Data Encryption** — encrypt sensitive data in Supabase using Web Crypto API (AES-GCM), key derived from PIN

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` + Vercel | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` + Vercel | Supabase anonymous key |
| `NEXT_PUBLIC_ONESIGNAL_APP_ID` | `.env.local` + Vercel | Push notifications (placeholder) |
| `ANTHROPIC_API_KEY` | Vercel only (future) | Claude AI for budget planner + chat |

## Deployment

- **GitHub:** `https://github.com/techdeafenabled/roopas-craft-finance.git` (main branch)
- **Vercel:** Auto-deploys on push to main. `vercel.json` specifies framework detection
- **Supabase:** Run `supabase-migration-v2.sql` in SQL Editor for new tables
