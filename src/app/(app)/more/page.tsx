"use client";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Landmark,
  Users,
  UserCheck,
  UserMinus,
  List,
  BarChart2,
  Settings,
  LogOut,
  ChevronRight,
  Store,
  PiggyBank,
  ShoppingBag,
  Receipt,
} from "lucide-react";

const SECTIONS = [
  {
    title: "Money",
    items: [
      { href: "/banks", icon: Landmark, label: "Banks & Accounts", desc: "Manage accounts, view passbooks" },
      { href: "/investments", icon: PiggyBank, label: "Investments", desc: "FDs, Mutual Funds, etc." },
      { href: "/purchases", icon: ShoppingBag, label: "Purchases", desc: "Record purchases" },
      { href: "/expenses", icon: Receipt, label: "Expenses", desc: "Record expenses" },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/customers", icon: Users, label: "Customers", desc: "All customers & history" },
      { href: "/debtors", icon: UserMinus, label: "Debtors", desc: "People who owe you" },
      { href: "/creditors", icon: UserCheck, label: "Creditors", desc: "People you owe" },
    ],
  },
  {
    title: "Analysis",
    items: [
      { href: "/stalls", icon: Store, label: "Stalls", desc: "Track exhibitions & stalls" },
      { href: "/transactions", icon: List, label: "All Transactions", desc: "Complete history" },
      { href: "/reports", icon: BarChart2, label: "Reports", desc: "Charts & summaries" },
    ],
  },
  {
    title: "Settings",
    items: [
      { href: "/settings", icon: Settings, label: "Settings", desc: "PIN, preferences" },
    ],
  },
];

export default function MorePage() {
  const { logout } = useAuth();

  return (
    <div className="px-4 pt-6 flex flex-col gap-5">
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-semibold">Roopa&apos;s Craft</p>
        <h1 className="text-xl font-bold mt-0.5">More</h1>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.title} className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
            {section.title}
          </p>
          {section.items.map(({ href, icon: Icon, label, desc }) => (
            <Link key={href} href={href} className="card flex items-center gap-3 py-3.5 active:scale-[0.99] transition-transform">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--off-white)" }}>
                <Icon size={18} style={{ color: "var(--forest-green)" }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-[var(--text-secondary)]">{desc}</p>
              </div>
              <ChevronRight size={16} className="text-[var(--text-secondary)]" />
            </Link>
          ))}
        </div>
      ))}

      <button
        onClick={logout}
        className="card flex items-center gap-3 py-3.5 active:scale-[0.99] transition-transform w-full text-left mb-4"
      >
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
          <LogOut size={18} className="text-expense" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-expense">Lock App</p>
          <p className="text-xs text-[var(--text-secondary)]">Return to PIN screen</p>
        </div>
      </button>
    </div>
  );
}
