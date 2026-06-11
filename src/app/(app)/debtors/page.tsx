"use client";
import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { formatINR, formatDate, generateId, today } from "@/lib/format";
import toast from "react-hot-toast";
import { Users, Plus, ChevronDown, ChevronUp } from "lucide-react";
import type { Debtor, DebtorEntry } from "@/lib/types";

interface DebtorWithBalance extends Debtor {
  balance: number;
  entries: DebtorEntry[];
}

export default function DebtorsPage() {
  const [debtors, setDebtors] = useState<DebtorWithBalance[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  // Entry form per debtor
  const [entryDebtor, setEntryDebtor] = useState<string | null>(null);
  const [entryType, setEntryType] = useState<"credit_given" | "payment_received">("credit_given");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryNote, setEntryNote] = useState("");
  const [entryDate, setEntryDate] = useState(today());

  const load = useCallback(async () => {
    const [all, entries] = await Promise.all([
      db.debtors.toArray(),
      db.debtor_entries.toArray(),
    ]);
    setDebtors(
      all.map((d) => {
        const dEntries = entries.filter((e) => e.debtor_id === d.id);
        const balance = dEntries.reduce(
          (s, e) => s + (e.type === "credit_given" ? e.amount : -e.amount),
          0
        );
        return { ...d, balance, entries: dEntries };
      }).sort((a, b) => b.balance - a.balance)
    );
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addDebtor() {
    if (!newName.trim()) { toast.error("Enter name."); return; }
    const debtor: Debtor = {
      id: generateId(),
      name: newName.trim(),
      phone: newPhone.trim() || null,
      created_at: new Date().toISOString(),
    };
    await db.debtors.put(debtor as Debtor);
    if (navigator.onLine) await supabase.from("debtors").insert(debtor);
    toast.success("Debtor added.");
    setShowAdd(false);
    setNewName("");
    setNewPhone("");
    load();
  }

  async function addEntry(debtorId: string) {
    const amt = parseFloat(entryAmount);
    if (!amt || amt <= 0) { toast.error("Enter valid amount."); return; }
    const entry: DebtorEntry = {
      id: generateId(),
      debtor_id: debtorId,
      type: entryType,
      amount: amt,
      date: entryDate,
      note: entryNote.trim() || null,
      synced: false,
      created_at: new Date().toISOString(),
    };
    await db.debtor_entries.put(entry as DebtorEntry);
    if (navigator.onLine) {
      const { error } = await supabase.from("debtor_entries").insert({ ...entry, synced: true });
      if (!error) await db.debtor_entries.update(entry.id, { synced: true } as Partial<DebtorEntry>);
    }
    toast.success("Entry saved.");
    setEntryDebtor(null);
    setEntryAmount("");
    setEntryNote("");
    load();
  }

  const totalOutstanding = debtors.reduce((s, d) => s + Math.max(d.balance, 0), 0);

  return (
    <div className="px-4 pt-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50">
            <Users size={20} style={{ color: "var(--muted-gold)" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Debtors</h1>
            <p className="text-xs text-[var(--text-secondary)]">Outstanding: {formatINR(totalOutstanding)}</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="w-9 h-9 rounded-xl flex items-center justify-center border border-[var(--border)] bg-white">
          <Plus size={18} style={{ color: "var(--forest-green)" }} />
        </button>
      </div>

      {showAdd && (
        <div className="card flex flex-col gap-3">
          <p className="text-sm font-bold">New Debtor</p>
          <input type="text" placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-[var(--off-white)] rounded-lg px-3 py-2 text-sm outline-none" />
          <input type="tel" placeholder="Phone (optional)" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="bg-[var(--off-white)] rounded-lg px-3 py-2 text-sm outline-none" />
          <button onClick={addDebtor} className="py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--forest-green)" }}>Add</button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {debtors.map((d) => (
          <div key={d.id} className="card flex flex-col gap-0">
            <button className="flex items-center gap-3 py-1" onClick={() => setExpanded(expanded === d.id ? null : d.id)}>
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-sm font-bold" style={{ color: "var(--muted-gold)" }}>
                {d.name[0].toUpperCase()}
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm">{d.name}</p>
                {d.phone && <p className="text-xs text-[var(--text-secondary)]">{d.phone}</p>}
              </div>
              <p className={`font-bold text-sm ${d.balance > 0 ? "text-sale" : d.balance < 0 ? "text-expense" : "text-[var(--text-secondary)]"}`}>
                {formatINR(d.balance)}
              </p>
              {expanded === d.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {expanded === d.id && (
              <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                {/* Entries */}
                {d.entries.sort((a, b) => b.date.localeCompare(a.date)).map((e) => (
                  <div key={e.id} className="flex items-center gap-2 text-xs">
                    <span className={e.type === "credit_given" ? "text-expense" : "text-sale"}>
                      {e.type === "credit_given" ? "Credit Given" : "Payment Received"}
                    </span>
                    <span className="flex-1 text-[var(--text-secondary)] truncate">{e.note || ""}</span>
                    <span className={`font-semibold ${e.type === "credit_given" ? "text-expense" : "text-sale"}`}>
                      {e.type === "credit_given" ? "-" : "+"}{formatINR(e.amount)}
                    </span>
                    <span className="text-[var(--text-secondary)]">{formatDate(e.date)}</span>
                  </div>
                ))}

                {/* Add entry */}
                {entryDebtor !== d.id ? (
                  <button onClick={() => setEntryDebtor(d.id)} className="text-xs font-semibold text-left mt-1" style={{ color: "var(--forest-green)" }}>
                    + Add entry
                  </button>
                ) : (
                  <div className="flex flex-col gap-2 mt-1">
                    <div className="flex gap-2">
                      {(["credit_given", "payment_received"] as const).map((t) => (
                        <button key={t} onClick={() => setEntryType(t)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${entryType === t ? "text-white border-transparent" : "bg-white text-[var(--text-secondary)] border-[var(--border)]"}`} style={entryType === t ? { background: t === "credit_given" ? "var(--danger)" : "var(--success)" } : {}}>
                          {t === "credit_given" ? "Credit Given" : "Payment Received"}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">₹</span>
                      <input type="number" placeholder="Amount" value={entryAmount} onChange={(e) => setEntryAmount(e.target.value)} inputMode="decimal" className="flex-1 bg-[var(--off-white)] rounded-lg px-3 py-2 text-sm outline-none" />
                    </div>
                    <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="bg-[var(--off-white)] rounded-lg px-3 py-2 text-sm outline-none" max={today()} />
                    <input type="text" placeholder="Note (optional)" value={entryNote} onChange={(e) => setEntryNote(e.target.value)} className="bg-[var(--off-white)] rounded-lg px-3 py-2 text-sm outline-none" />
                    <div className="flex gap-2">
                      <button onClick={() => setEntryDebtor(null)} className="flex-1 py-2 rounded-lg text-xs font-semibold border border-[var(--border)] bg-white">Cancel</button>
                      <button onClick={() => addEntry(d.id)} className="flex-1 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: "var(--forest-green)" }}>Save</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {debtors.length === 0 && (
          <div className="text-center py-12 text-[var(--text-secondary)] text-sm">No debtors yet.</div>
        )}
      </div>
    </div>
  );
}
