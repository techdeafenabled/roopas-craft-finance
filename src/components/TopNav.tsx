"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import { Search, LogOut, X, Menu } from "lucide-react";
import SyncBadge from "./SyncBadge";

interface TopNavProps {
  onToggleSidebar?: () => void;
}

export default function TopNav({ onToggleSidebar }: TopNavProps) {
  const { logout } = useAuth();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/transactions?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
      setSearchOpen(false);
    }
  }

  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{
        background: "linear-gradient(135deg, #5A7D60, #6B8F71)",
        borderColor: "rgba(255,255,255,0.1)",
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center h-14 px-4 gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10"
        >
          <Menu size={20} />
        </button>

        {/* Logo */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2.5 shrink-0"
        >
          <div className="w-8 h-8 relative rounded-lg overflow-hidden bg-white/15">
            <Image
              src="/logo.png"
              alt="Logo"
              fill
              className="object-contain p-0.5"
              sizes="32px"
            />
          </div>
          <div className="hidden sm:block">
            <p
              className="text-[10px] uppercase tracking-[0.15em] font-semibold leading-none"
              style={{ color: "#c8a059" }}
            >
              Roopa&apos;s Craft
            </p>
            <p className="text-sm font-bold text-white leading-tight">
              Finance
            </p>
          </div>
        </button>

        {/* Search bar — desktop */}
        <form
          onSubmit={handleSearch}
          className="hidden md:flex flex-1 max-w-md mx-auto items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5 focus-within:bg-white/15 transition-colors"
        >
          <Search size={15} className="text-white/50 shrink-0" />
          <input
            type="text"
            placeholder="Search transactions, debtors..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
          />
        </form>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">
          <SyncBadge />

          {/* Mobile search toggle */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10"
          >
            {searchOpen ? <X size={18} /> : <Search size={18} />}
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-red-300 hover:bg-white/10 transition-colors"
            title="Lock App"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>

      {/* Mobile search bar — expandable */}
      {searchOpen && (
        <form
          onSubmit={handleSearch}
          className="md:hidden flex items-center gap-2 px-4 pb-3"
        >
          <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
            <Search size={15} className="text-white/50" />
            <input
              type="text"
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
              autoFocus
            />
          </div>
        </form>
      )}
    </header>
  );
}
