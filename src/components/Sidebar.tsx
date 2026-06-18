"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Store,
  TrendingUp,
  ShoppingBag,
  Receipt,
  List,
  Landmark,
  PiggyBank,
  Users,
  UserMinus,
  UserCheck,
  BarChart2,
  Settings,
  X,
} from "lucide-react";

const SECTIONS = [
  {
    title: null,
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    title: "Transactions",
    items: [
      { href: "/sales", icon: TrendingUp, label: "Sales" },
      { href: "/purchases", icon: ShoppingBag, label: "Purchases" },
      { href: "/expenses", icon: Receipt, label: "Expenses" },
      { href: "/transactions", icon: List, label: "History" },
    ],
  },
  {
    title: "Business",
    items: [
      { href: "/stalls", icon: Store, label: "Stalls" },
      { href: "/banks", icon: Landmark, label: "Banks" },
      { href: "/investments", icon: PiggyBank, label: "Investments" },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/customers", icon: Users, label: "Customers" },
      { href: "/debtors", icon: UserMinus, label: "Debtors" },
      { href: "/creditors", icon: UserCheck, label: "Creditors" },
    ],
  },
  {
    title: "Analysis",
    items: [
      { href: "/reports", icon: BarChart2, label: "Reports" },
    ],
  },
  {
    title: null,
    items: [
      { href: "/settings", icon: Settings, label: "Settings" },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 flex flex-col border-r transition-transform duration-200 ease-out
          w-60 bg-[var(--sidebar-bg)] border-[var(--border)]
          lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:translate-x-0 lg:z-30
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Mobile close */}
        <div className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 relative rounded-lg overflow-hidden">
              <Image src="/logo.png" alt="Logo" fill className="object-contain" sizes="28px" />
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--forest-green)" }}>
              RCJ Finance
            </span>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--off-white)]">
            <X size={18} className="text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-1">
          {SECTIONS.map((section, si) => (
            <div key={si} className="flex flex-col gap-0.5">
              {section.title && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] px-2.5 pt-3 pb-1">
                  {section.title}
                </p>
              )}
              {section.items.map(({ href, icon: Icon, label }) => {
                const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "text-white"
                        : "text-[var(--text-secondary)] hover:bg-[var(--off-white)] hover:text-[var(--text-primary)]"
                    }`}
                    style={active ? { background: "var(--forest-green)" } : {}}
                  >
                    <Icon size={17} strokeWidth={active ? 2.2 : 1.7} />
                    {label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--border)]">
          <p className="text-[10px] text-[var(--text-secondary)]">
            Roopa&apos;s Craft Jewellery
          </p>
          <p className="text-[10px] text-[var(--text-secondary)]">
            v2.0.0
          </p>
        </div>
      </aside>
    </>
  );
}
