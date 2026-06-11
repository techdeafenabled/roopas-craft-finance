"use client";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Landmark,
  Users,
  UserCheck,
  List,
  BarChart2,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";

const MENU = [
  { href: "/banks", icon: Landmark, label: "Banks & Accounts", desc: "Manage your bank accounts" },
  { href: "/debtors", icon: Users, label: "Debtors", desc: "People who owe you" },
  { href: "/creditors", icon: UserCheck, label: "Creditors", desc: "People you owe" },
  { href: "/transactions", icon: List, label: "All Transactions", desc: "Complete history" },
  { href: "/reports", icon: BarChart2, label: "Reports", desc: "Charts & summaries" },
  { href: "/settings", icon: Settings, label: "Settings", desc: "PIN, preferences" },
];

export default function MorePage() {
  const { logout } = useAuth();

  return (
    <div className="px-4 pt-6 flex flex-col gap-5">
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-semibold">Roopa&apos;s Craft</p>
        <h1 className="text-xl font-bold mt-0.5">More</h1>
      </div>

      <div className="flex flex-col gap-2">
        {MENU.map(({ href, icon: Icon, label, desc }) => (
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

        <button
          onClick={logout}
          className="card flex items-center gap-3 py-3.5 active:scale-[0.99] transition-transform w-full text-left"
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
    </div>
  );
}
