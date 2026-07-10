"use client";

import { useState, useTransition, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Receipt, Search, X, Download, BarChart2, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/sheet";
import { CATEGORIES, CATEGORY_ICONS, CATEGORY_COLORS } from "@/lib/constants";
import { fmt, relDate } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

interface FormState {
  description: string;
  amount: string;
  category: string;
  date: string;
}

const defaultForm: FormState = {
  description: "", amount: "", category: "General",
  date: new Date().toISOString().split("T")[0],
};

export function ExpensesClient({ expenses: initial, userId }: { expenses: Expense[]; userId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [, startTransition] = useTransition();

  const [expenses, setExpenses] = useState<Expense[]>(initial);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [filterMonth, setFilterMonth] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(false);

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);

  // Monthly data for chart — last 12 months
  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      const key = e.date.slice(0, 7); // "YYYY-MM"
      map[key] = (map[key] || 0) + e.amount;
    });
    const sorted = Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-12);
    return sorted.map(([key, total]) => ({
      key,
      label: new Date(key + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      total,
    }));
  }, [expenses]);

  const filtered = expenses
    .filter(e => filterCat === "All" || e.category === filterCat)
    .filter(e => !filterMonth || e.date.startsWith(filterMonth))
    .filter(e => !search || e.description.toLowerCase().includes(search.toLowerCase()));

  const filteredTotal = filtered.reduce((s, e) => s + e.amount, 0);

  // CSV Export
  const handleDownloadCSV = () => {
    const rows = [
      ["Date", "Description", "Category", "Amount (INR)"],
      ...filtered.map(e => [
        e.date,
        `"${e.description.replace(/"/g, '""')}"`,
        e.category,
        e.amount.toFixed(2),
      ])
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const monthLabel = filterMonth ? `_${filterMonth}` : "";
    const catLabel = filterCat !== "All" ? `_${filterCat}` : "";
    a.download = `expenses${monthLabel}${catLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(defaultForm);
    setError("");
    setSheetOpen(true);
  };

  const openEdit = (exp: Expense) => {
    setEditingId(exp.id);
    setForm({ description: exp.description, amount: String(exp.amount), category: exp.category, date: exp.date });
    setError("");
    setSheetOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.amount || Number(form.amount) <= 0) {
      setError("Please fill in a valid description and amount.");
      return;
    }
    setLoading(true);
    const payload = {
      description: form.description,
      amount: Number(form.amount),
      category: form.category,
      date: form.date,
      paid_by: userId,
    };

    if (editingId) {
      const { data, error: err } = await supabase.from("expenses").update(payload).eq("id", editingId).select().single();
      if (err) {
        setError("Error: " + err.message + " (code: " + err.code + ")");
        setLoading(false);
        return;
      }
      if (data) setExpenses(prev => prev.map(ex => ex.id === editingId ? data : ex));
    } else {
      const { data, error: err } = await supabase.from("expenses").insert(payload).select().single();
      if (err) {
        setError("Error: " + err.message + " (code: " + err.code + ")");
        setLoading(false);
        return;
      }
      if (data) setExpenses(prev => [data, ...prev]);
    }

    setLoading(false);
    setSheetOpen(false);
    startTransition(() => router.refresh());
  };

  const handleDelete = async (id: string) => {
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    setDeleteConfirm(null);
    startTransition(() => router.refresh());
  };

  return (
    <div className="min-h-full bg-background relative">
      {/* Stats bar */}
      <div className="px-4 pt-4 pb-3 space-y-4">
        {/* Big total + actions */}
        <div className="rounded-3xl bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/15 p-4 card-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-0.5">
                {filterMonth ? new Date(filterMonth + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "Total Spending"}
              </p>
              <p className="text-3xl font-black tracking-tight">{fmt(filterMonth ? filteredTotal : totalAmount)}</p>
              <p className="text-xs text-muted-foreground mt-1">{filtered.length} transaction{filtered.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => setShowChart(v => !v)}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                  showChart ? "bg-primary text-white" : "bg-primary/20 text-primary"
                }`}>
                <BarChart2 className="w-5 h-5" />
              </button>
              <button onClick={handleDownloadCSV}
                className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center hover:bg-emerald-500/30 transition-all"
                title="Download CSV">
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Monthly Bar Chart */}
          <AnimatePresence>
            {showChart && monthlyData.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 180 }} exit={{ opacity: 0, height: 0 }}
                className="mt-4 overflow-hidden">
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={monthlyData} barSize={24} onClick={(d: any) => d?.activePayload && setFilterMonth((prev: string | null) => prev === d.activePayload[0].payload.key ? null : d.activePayload[0].payload.key)}>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: "rgba(124,58,237,0.08)", radius: 8 }}
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                      formatter={(v: any) => [fmt(Number(v)), "Spent"]}
                    />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                      {monthlyData.map((entry) => (
                        <Cell key={entry.key}
                          fill={filterMonth === entry.key ? "#7C3AED" : "rgba(124,58,237,0.35)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {filterMonth && (
                  <button onClick={() => setFilterMonth(null)}
                    className="flex items-center gap-1 text-[11px] text-primary font-semibold mt-1 mx-auto">
                    <X className="w-3 h-3" /> Clear month filter
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search transactions…"
            className="w-full bg-card border border-border rounded-2xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 card-shadow"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Month filter pills (when chart is shown) */}
        {showChart && monthlyData.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide" style={{ WebkitOverflowScrolling: "touch" }}>
            <button onClick={() => setFilterMonth(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                !filterMonth ? "bg-primary text-white border-primary" : "bg-card text-muted-foreground border-border"
              }`}>All Months</button>
            {monthlyData.map(m => (
              <button key={m.key} onClick={() => setFilterMonth(prev => prev === m.key ? null : m.key)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  filterMonth === m.key ? "bg-primary text-white border-primary" : "bg-card text-muted-foreground border-border"
                }`}>{m.label}</button>
            ))}
          </div>
        )}

        {/* Category filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide"
          style={{ WebkitOverflowScrolling: "touch" }}>
          {["All", ...CATEGORIES].map(cat => (
            <button key={cat}
              onClick={() => setFilterCat(cat)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                filterCat === cat
                  ? "bg-primary text-white border-primary"
                  : "bg-card text-muted-foreground border-border"
              }`}
            >
              {cat !== "All" && <span>{CATEGORY_ICONS[cat]}</span>}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions list */}
      <div className="px-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
              <Receipt className="w-8 h-8 text-primary/40" />
            </div>
            <p className="text-base font-bold mb-1">
              {search ? "No results found" : "No expenses yet"}
            </p>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              {search ? `Try a different search term` : `Tap the + button to log your first transaction`}
            </p>
          </div>
        ) : (
          <div className="rounded-3xl overflow-hidden card-shadow border border-border bg-card divide-y divide-border mb-6">
            <AnimatePresence>
              {filtered.map((exp, i) => (
                <motion.div key={exp.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }}
                  exit={{ opacity: 0, x: 30 }}
                >
                  {deleteConfirm === exp.id ? (
                    <div className="flex items-center justify-between px-4 py-3.5 bg-destructive/5">
                      <p className="text-sm font-medium text-destructive">Delete this expense?</p>
                      <div className="flex gap-2">
                        <button onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted">Cancel</button>
                        <button onClick={() => handleDelete(exp.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-destructive text-white">Delete</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center px-4 py-3.5 gap-3 group active:bg-muted/30 transition-colors">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 ${CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.General}`}>
                        {CATEGORY_ICONS[exp.category] || "📦"}
                      </div>
                      <div className="flex-1 min-w-0" onClick={() => openEdit(exp)}>
                        <p className="text-sm font-semibold truncate">{exp.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{exp.category} · {relDate(exp.date)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold">{fmt(exp.amount)}</p>
                        <button onClick={() => setDeleteConfirm(exp.id)}
                          id={`delete-${exp.id}`}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* FAB */}
      <button onClick={openAdd} id="fab-add-expense"
        className="fixed bottom-24 right-5 md:bottom-8 w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center fab-glow z-30 active:scale-90 transition-transform shadow-xl">
        <Plus className="w-6 h-6" />
      </button>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={editingId ? "Edit Expense" : "New Expense"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Amount (big input) */}
                  <div className="rounded-2xl border border-border bg-background px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                    <label className="text-xs text-muted-foreground font-medium">Amount</label>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-2xl font-bold text-muted-foreground">₹</span>
                      <input
                        type="number" step="0.01" min="0.01" placeholder="0.00" id="expense-amount"
                        value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                        className="flex-1 text-2xl font-black bg-transparent focus:outline-none text-foreground"
                        required
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <input
                    id="expense-description"
                    placeholder="What was this for?"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full bg-background border border-border rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    required
                  />

                  {/* Category scroll */}
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-2">Category</p>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
                      style={{ WebkitOverflowScrolling: "touch" }}>
                      {CATEGORIES.map(cat => (
                        <button key={cat} type="button"
                          onClick={() => setForm(f => ({ ...f, category: cat }))}
                          className={`shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-2xl border text-xs font-semibold transition-all ${
                            form.category === cat
                              ? "bg-primary/15 border-primary/30 text-primary"
                              : "bg-background border-border text-muted-foreground"
                          }`}
                        >
                          <span className="text-base">{CATEGORY_ICONS[cat]}</span>
                          <span>{cat}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date */}
                  <input
                    id="expense-date" type="date"
                    value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full bg-background border border-border rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    required
                  />

                  {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-xl">{error}</p>}

                  <button type="submit" disabled={loading}
                    className="w-full bg-primary text-white font-bold py-4 rounded-2xl fab-glow disabled:opacity-60 transition-all active:scale-[0.98]">
                    {loading ? "Saving…" : editingId ? "Update Expense" : "Add Expense"}
                  </button>
                </form>
      </Sheet>
    </div>
  );
}
