"use client";
import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { formatINR, formatDate, generateId, today } from "@/lib/format";
import toast from "react-hot-toast";
import { UserCheck, Plus, ChevronDown, ChevronUp } from "lucide-react";
import type { Creditor, CreditorEntry } from "@/lib/types";

interface CreditorWithBalance extends Creditor {
  balance: number;
  entries: CreditorEntry[];
}

export default function CreditorsPage() {
  const [creditors, setCreditors] = useState<CreditorWithBalance[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [entryCreditor, setEntryCreditor] = useState<string | null>(null);
  const [entryType, setEntryType] = useState<"credit_taken" | "payment_made">("credit_taken");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryNote, setEntryNote] = useState("");
  const [entryDate, setEntryDate] = useState(today());

  const load = useCallback(async () => {
    const [all, entries] = await Promise.all([
      db.creditors.toArray(),
      db.creditor_entries.toArray(),
    ]);
    setCreditors(
      all.map((c) => {
        const cEntries = entries.filter((e) => e.creditor_id === c.id);
        const balance = cEntries.reduce(
          (s, e) => s + (e.type === "credit_taken" ? e.amount : -e.amount),
          0
        );
        return { ...c, balance, entries: cEntries };
      }).sort((a, b) => b.balance - a.balance)
    );
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addCreditor() {
    if (!newName.trim()) { toast.error("Enter name."); return; }
    const creditor: Creditor = {
      id: generateId(),
      name: newName.trim(),
      phone: newPhone.trim() || null,
      created_at: new Date().toISOString(),
    };
    await db.creditors.put(creditor as Creditor);
    if (navigator.onLine) await supabase.from("creditors").insert(creditor);
    toast.success("Creditor added.");
    setShowAdd(false);
    setNewName("");
    setNewPhone("");
    load();
  }

  async function addEntry(creditorId: string) {
    const amt = parseFloat(entryAmount);
    if (!amt || amt <= 0) { toast.error("Enter valid amount."); return; }
    const entry: CreditorEntry = {
      id: generateId(),
      creditor_id: creditorId,
      type: entryType,
      amount: amt,
      date: entryDate,
      note: entryNote.trim() || null,
      synced: false,
      created_at: new Date().toISOString(),
    };
    await db.creditor_entries.put(entry as CreditorEntry);
    if (navigator.onLine) {
      const { error } = await supabase.from("creditor_entries").insert({ ...entry, synced: true });
      if (!error) await db.creditor_entries.update(entry.id, { synced: true } as Partial<CreditorEntry>);
    }
    toast.success("Entry saved.");
    setEntryCreditor(null);
    setEntryAmount("");
    setEntryNote("");
    load();
  }

  const totalOwed = creditors.reduce((s, c) => s + Math.max(c.balance, 0), 0);

  return (
    <div className="px-4 pt-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <UserCheck size={20} className="text-expense" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Creditors</h1>
            <p className="text-xs text-[var(--text-secondary)]">You owe: {formatINR(totalOwed)}</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="w-9 h-9 rounded-xl flex items-center justify-center border border-[var(--border)] bg-white">
          <Plus size={18} style={{ color: "var(--forest-green)" }} />
        </button>
      </div>

      {showAdd && (
        <div className="card flex flex-col gap-3">
          <p className="text-sm font-bold">New Creditor</p>
          <input type="text" placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-[var(--off-white)] rounded-lg px-3 py-2 text-sm outline-none" />
          <input type="tel" placeholder="Phone (optional)" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="bg-[var(--off-white)] rounded-lg px-3 py-2 text-sm outline-none" />
          <button onClick={addCreditor} className="py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--forest-green)" }}>Add</button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {creditors.map((c) => (
          <div key={c.id} className="card flex flex-col gap-0">
            <button className="flex items-center gap-3 py-1" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-sm font-bold text-expense">
                {c.name[0].toUpperCase()}
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm">{c.name}</p>
                {c.phone && <p className="text-xs text-[var(--text-secondary)]">{c.phone}</p>}
              </div>
              <p className={`font-bold text-sm ${c.balance > 0 ? "text-expense" : c.balance < 0 ? "text-sale" : "text-[var(--text-secondary)]"}`}>
                {formatINR(c.balance)}
              </p>
              {expanded === c.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {expanded === c.id && (
              <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                {c.entries.sort((a, b) => b.date.localeCompare(a.date)).map((e) => (
                  <div key={e.id} className="flex items-center gap-2 text-xs">
                    <span className={e.type === "credit_taken" ? "text-expense" : "text-sale"}>
                      {e.type === "credit_taken" ? "Credit Taken" : "Payment Made"}
                    </span>
                    <span className="flex-1 text-[var(--text-secondary)] truncate">{e.note || ""}</span>
                    <span className={`font-semibold ${e.type === "credit_taken" ? "text-expense" : "text-sale"}`}>
                      {formatINR(e.amount)}
                    </span>
                    <span className="text-[var(--text-secondary)]">{formatDate(e.date)}</span>
                  </div>
                ))}

                {entryCreditor !== c.id ? (
                  <button onClick={() => setEntryCreditor(c.id)} className="text-xs font-semibold text-left mt-1" style={{ color: "var(--forest-green)" }}>
                    + Add entry
                  </button>
                ) : (
                  <div className="flex flex-col gap-2 mt-1">
                    <div className="flex gap-2">
                      {(["credit_taken", "payment_made"] as const).map((t) => (
                        <button key={t} onClick={() => setEntryType(t)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${entryType === t ? "text-white border-transparent" : "bg-white text-[var(--text-secondary)] border-[var(--border)]"}`} style={entryType === t ? { background: t === "credit_taken" ? "var(--danger)" : "var(--success)" } : {}}>
                          {t === "credit_taken" ? "Credit Taken" : "Payment Made"}
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
                      <button onClick={() => setEntryCreditor(null)} className="flex-1 py-2 rounded-lg text-xs font-semibold border border-[var(--border)] bg-white">Cancel</button>
                      <button onClick={() => addEntry(c.id)} className="flex-1 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: "var(--forest-green)" }}>Save</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {creditors.length === 0 && (
          <div className="text-center py-12 text-[var(--text-secondary)] text-sm">No creditors yet.</div>
        )}
      </div>
    </div>
  );
}
