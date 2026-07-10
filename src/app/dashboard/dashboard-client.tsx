"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownLeft,
  Plus, Receipt, Users, ChevronRight, Zap, X, Pencil, Trash2, Check,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { CATEGORY_ICONS, CATEGORY_COLORS, CHART_COLORS } from "@/lib/constants";
import { fmt, relDate } from "@/lib/format";

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  groups?: { name: string } | null;
}

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

interface DashboardClientProps {
  profile: Profile | null;
  personalExpenses: Expense[];
  groupExpenses: Expense[];
  totalPersonal: number;
  totalOwedToMe: number;
  totalIOwe: number;
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function DashboardClient({
  profile, personalExpenses, groupExpenses,
  totalPersonal, totalOwedToMe, totalIOwe,
}: DashboardClientProps) {


  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [budgetModal, setBudgetModal] = useState(false);

  // Custom categories stored in localStorage
  const [customCategories, setCustomCategories] = useState<Record<string, string>>({}); // name -> emoji
  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("🏷️");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatEmoji, setEditCatEmoji] = useState("");

  const COMMON_EMOJIS = ["🏷️","🎯","💼","🎁","🐾","🎨","📱","🎶","🏋️","🍕","☕","🚀","💰","🎓","🧴","🏖️","🎲","🐶","🌿","🏥"];

  // Load budgets and custom categories from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("category_budgets");
      if (stored) setBudgets(JSON.parse(stored));
      const storedCats = localStorage.getItem("custom_categories");
      if (storedCats) setCustomCategories(JSON.parse(storedCats));
    } catch (e) {
      console.error("Failed to load budgets", e);
    }
  }, []);

  const handleSaveBudget = (category: string, limit: number) => {
    const updated = { ...budgets, [category]: limit };
    if (limit <= 0) delete updated[category];
    setBudgets(updated);
    localStorage.setItem("category_budgets", JSON.stringify(updated));
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const name = newCatName.trim();
    const updated = { ...customCategories, [name]: newCatEmoji };
    setCustomCategories(updated);
    localStorage.setItem("custom_categories", JSON.stringify(updated));
    setNewCatName(""); setNewCatEmoji("🏷️");
  };

  const handleDeleteCustomCategory = (name: string) => {
    const updated = { ...customCategories };
    delete updated[name];
    setCustomCategories(updated);
    localStorage.setItem("custom_categories", JSON.stringify(updated));
    const updatedBudgets = { ...budgets };
    delete updatedBudgets[name];
    setBudgets(updatedBudgets);
    localStorage.setItem("category_budgets", JSON.stringify(updatedBudgets));
  };

  const handleSaveEditCategory = (oldName: string) => {
    if (!editCatName.trim()) return;
    const newName = editCatName.trim();
    const updated = { ...customCategories };
    delete updated[oldName];
    updated[newName] = editCatEmoji;
    setCustomCategories(updated);
    localStorage.setItem("custom_categories", JSON.stringify(updated));
    // Migrate budget
    if (budgets[oldName]) {
      const updatedB = { ...budgets, [newName]: budgets[oldName] };
      delete updatedB[oldName];
      setBudgets(updatedB);
      localStorage.setItem("category_budgets", JSON.stringify(updatedB));
    }
    setEditingCat(null);
  };

  // Merged category icons (built-in + custom)
  const allCategoryIcons = { ...CATEGORY_ICONS, ...customCategories };

  const netBalance = totalOwedToMe - totalIOwe;
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  // Spend by category
  const byCategory = personalExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const chartData = categories.map(([name, value]) => ({ name, value }));

  const allRecent = [...personalExpenses, ...groupExpenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="min-h-full bg-background">
      {/* ── Hero Balance Card ── */}
      <div className="bg-gradient-to-br from-primary via-violet-600 to-accent px-4 pt-6 pb-10 relative overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 70% 30%, white 0%, transparent 60%)" }} />
        <div className="absolute -bottom-8 -right-8 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-white/5" />

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10">
          <p className="text-white/70 text-sm font-medium mb-1">Good to see you, {firstName} 👋</p>
          <p className="text-white/60 text-xs mb-5">Net Balance</p>
          <div className="flex items-end gap-2 mb-6">
            <span className={`font-black text-5xl tracking-tight ${netBalance > 0 ? "text-emerald-300" : netBalance < 0 ? "text-rose-300" : "text-white"}`}>
              {netBalance > 0 ? "+" : netBalance < 0 ? "-" : ""}{fmt(Math.abs(netBalance))}
            </span>
          </div>

          {/* Mini stat row */}
          <div className="flex gap-3">
            <div className="flex-1 bg-white/10 rounded-2xl px-3 py-2.5 backdrop-blur-sm border border-white/10">
              <div className="flex items-center gap-1.5 mb-1">
                <Receipt className="w-3.5 h-3.5 text-white/75" />
                <span className="text-white/70 text-[9px] font-bold uppercase tracking-wide">Personal Spend</span>
              </div>
              <p className="text-white font-black text-sm">{fmt(totalPersonal)}</p>
            </div>
            <div className="flex-1 bg-white/10 rounded-2xl px-3 py-2.5 backdrop-blur-sm border border-white/10">
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-300" />
                <span className="text-white/70 text-[9px] font-bold uppercase tracking-wide">You Lent</span>
              </div>
              <p className="text-emerald-300 font-black text-sm">{fmt(totalOwedToMe)}</p>
            </div>
            <div className="flex-1 bg-white/10 rounded-2xl px-3 py-2.5 backdrop-blur-sm border border-white/10">
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-red-300" />
                <span className="text-white/70 text-[9px] font-bold uppercase tracking-wide">You Owe</span>
              </div>
              <p className="text-red-300 font-black text-sm">{fmt(totalIOwe)}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Quick Actions (floating over card) ── */}
      <div className="px-4 -mt-5 mb-6 relative z-10">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Add", icon: Plus, href: "/expenses", color: "bg-primary text-white fab-glow" },
            { label: "Expenses", icon: Receipt, href: "/expenses", color: "glass text-muted-foreground card-shadow" },
            { label: "Friends", icon: Users, href: "/friends", color: "glass text-muted-foreground card-shadow" },
            { label: "Groups", icon: Zap, href: "/groups", color: "glass text-muted-foreground card-shadow" },
          ].map(({ label, icon: Icon, href, color }) => (
            <Link key={label} href={href}
              className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl ${color} border border-border/30 transition-transform active:scale-95`}>
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-6 pb-4 pt-4">
        {/* ── Budget Alerts ── */}
        {(() => {
          const exceeded = categories
            .map(([cat, amount]) => ({ cat, amount, limit: budgets[cat] || 0 }))
            .filter(c => c.limit > 0 && c.amount >= c.limit);
          if (exceeded.length === 0) return null;
          return (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl bg-red-500/10 border border-red-500/20 p-4 card-shadow flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-bold text-sm text-red-500">Budget Limit Exceeded!</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You have exceeded your limit in: {exceeded.map(c => `${c.cat} (${fmt(c.amount)} / ${fmt(c.limit)})`).join(", ")}.
                </p>
              </div>
            </motion.div>
          );
        })()}

        {/* ── Spending by Category ── */}
        {categories.length > 0 && (
          <motion.section variants={stagger} initial="hidden" animate="show">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-base">Spending by Category</h2>
              <button onClick={() => setBudgetModal(true)}
                className="text-xs text-primary font-bold hover:underline active:scale-95 transition-all">
                Configure Budgets
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide"
              style={{ WebkitOverflowScrolling: "touch" }}>
              {categories.map(([cat, amount]) => {
                const limit = budgets[cat] || 0;
                const percent = limit > 0 ? (amount / limit) * 100 : 0;
                return (
                  <motion.div key={cat} variants={fadeUp}
                    className={`shrink-0 snap-start flex flex-col items-center gap-2 px-4 py-3.5 rounded-2xl border card-shadow ${CATEGORY_COLORS[cat] || CATEGORY_COLORS.General} min-w-[105px]`}>
                    <span className="text-2xl">{CATEGORY_ICONS[cat] || "📦"}</span>
                    <span className="text-xs font-semibold">{cat}</span>
                    <span className="text-xs font-bold">{fmt(amount)}</span>
                    {limit > 0 && (
                      <div className="w-full mt-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1 overflow-hidden">
                          <div className={`h-full rounded-full ${percent >= 100 ? "bg-red-500" : percent >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${Math.min(percent, 100)}%` }} />
                        </div>
                        <span className="text-[8px] opacity-75 font-semibold">Limit: {fmt(limit)}</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Recharts Pie Chart */}
            <div className="mt-2 h-64 bg-card rounded-3xl border border-border card-shadow p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[entry.name] || CHART_COLORS.General} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => fmt(Number(value))}
                    contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: 'var(--card)', color: 'var(--foreground)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.section>
        )}

        {/* ── Recent Transactions ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base">Recent Transactions</h2>
            <Link href="/expenses" className="text-xs text-primary font-semibold flex items-center gap-0.5">
              See all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="rounded-3xl overflow-hidden card-shadow border border-border bg-card divide-y divide-border">
            {allRecent.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                  <Receipt className="w-7 h-7 text-primary/50" />
                </div>
                <p className="text-sm font-semibold mb-1">No transactions yet</p>
                <p className="text-xs text-muted-foreground mb-4">Add your first expense to get started</p>
                <Link href="/expenses"
                  className="inline-flex items-center gap-2 bg-primary text-white text-xs font-bold px-5 py-2.5 rounded-xl fab-glow">
                  <Plus className="w-3.5 h-3.5" /> Add Expense
                </Link>
              </div>
            ) : (
              <AnimatePresence>
                {allRecent.map((exp, i) => (
                  <motion.div key={exp.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: i * 0.04 } }}
                    className="flex items-center px-4 py-3.5 gap-3 active:bg-muted/50 transition-colors">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg border shrink-0 ${CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.General}`}>
                      {CATEGORY_ICONS[exp.category] || "📦"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{exp.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{relDate(exp.date)}</span>
                        {exp.groups && (
                          <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                            {exp.groups.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-bold shrink-0">
                      -{fmt(exp.amount)}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </section>

        {/* ── Group Activity Banner ── */}
        {groupExpenses.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Link href="/groups"
              className="flex items-center justify-between p-4 rounded-3xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 card-shadow active:scale-[0.98] transition-transform">
              <div>
                <p className="font-bold text-sm">Group Activity</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {groupExpenses.length} shared expense{groupExpenses.length !== 1 ? "s" : ""} this month
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Link>
          </motion.div>
        )}
      </div>

      {/* Budget Configuration Modal */}
      <AnimatePresence>
        {budgetModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setBudgetModal(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="fixed bottom-0 left-0 right-0 z-50 bottom-sheet bg-card pb-safe max-h-[85vh] overflow-y-auto">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                  <div>
                    <h3 className="font-bold text-base">Configure Budgets</h3>
                    <p className="text-xs text-muted-foreground">Set spending limits for your categories</p>
                  </div>
                  <button onClick={() => setBudgetModal(false)}
                    className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-90 transition-transform">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {/* ─── Built-in Categories ─── */}
                <div className="space-y-2 py-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Default Categories</p>
                  {Object.keys(CATEGORY_ICONS).map((cat) => {
                    const currentVal = budgets[cat] || "";
                    return (
                      <div key={cat} className="flex items-center justify-between gap-3 bg-muted/30 rounded-xl px-3 py-2.5 border border-border/50">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xl">{CATEGORY_ICONS[cat]}</span>
                          <span className="text-xs font-semibold truncate">{cat}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-muted-foreground font-bold">₹</span>
                          <input
                            type="number"
                            placeholder="No Limit"
                            value={currentVal}
                            onChange={(e) => handleSaveBudget(cat, Number(e.target.value))}
                            className="w-24 px-2 py-1 text-xs rounded-xl bg-background border border-border text-right focus:outline-none focus:border-primary font-bold"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ─── Custom Categories ─── */}
                {Object.keys(customCategories).length > 0 && (
                  <div className="space-y-2 py-2 border-t border-border mt-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Your Custom Categories</p>
                    {Object.entries(customCategories).map(([cat, emoji]) => {
                      const currentVal = budgets[cat] || "";
                      const isEditing = editingCat === cat;
                      return (
                        <div key={cat} className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 space-y-2">
                          {isEditing ? (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <input
                                  value={editCatEmoji}
                                  onChange={e => setEditCatEmoji(e.target.value)}
                                  className="w-14 text-center px-2 py-1.5 text-sm rounded-xl bg-background border border-border focus:outline-none focus:border-primary"
                                  maxLength={2}
                                />
                                <input
                                  value={editCatName}
                                  onChange={e => setEditCatName(e.target.value)}
                                  className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-background border border-border focus:outline-none focus:border-primary font-semibold"
                                />
                              </div>
                              <div className="flex gap-1.5 flex-wrap">
                                {COMMON_EMOJIS.map(e => (
                                  <button key={e} type="button" onClick={() => setEditCatEmoji(e)}
                                    className={`text-base p-1 rounded-lg transition-all ${editCatEmoji === e ? "bg-primary/20 scale-110" : "hover:bg-muted"}`}>{e}</button>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleSaveEditCategory(cat)}
                                  className="flex-1 py-1.5 text-[11px] font-bold bg-primary text-white rounded-xl flex items-center justify-center gap-1">
                                  <Check className="w-3 h-3" /> Save
                                </button>
                                <button onClick={() => setEditingCat(null)}
                                  className="flex-1 py-1.5 text-[11px] font-bold bg-muted text-muted-foreground rounded-xl">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-xl">{emoji}</span>
                                <span className="text-xs font-semibold truncate">{cat}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-muted-foreground font-bold">₹</span>
                                <input
                                  type="number"
                                  placeholder="No Limit"
                                  value={currentVal}
                                  onChange={(e) => handleSaveBudget(cat, Number(e.target.value))}
                                  className="w-20 px-2 py-1 text-xs rounded-xl bg-background border border-border text-right focus:outline-none focus:border-primary font-bold"
                                />
                                <button onClick={() => { setEditingCat(cat); setEditCatName(cat); setEditCatEmoji(emoji); }}
                                  className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all">
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button onClick={() => handleDeleteCustomCategory(cat)}
                                  className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ─── Add New Category ─── */}
                <div className="border-t border-border mt-2 pt-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Add New Category</p>
                  <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 space-y-3">
                    <div className="flex gap-2">
                      <input
                        value={newCatEmoji}
                        onChange={e => setNewCatEmoji(e.target.value)}
                        className="w-14 text-center px-2 py-2 text-sm rounded-xl bg-background border border-border focus:outline-none focus:border-primary"
                        maxLength={2}
                        placeholder="🏷️"
                      />
                      <input
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleAddCategory()}
                        placeholder="Category name..."
                        className="flex-1 px-3 py-2 text-xs rounded-xl bg-background border border-border focus:outline-none focus:border-primary font-semibold"
                      />
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {COMMON_EMOJIS.map(e => (
                        <button key={e} type="button" onClick={() => setNewCatEmoji(e)}
                          className={`text-base p-1 rounded-lg transition-all ${newCatEmoji === e ? "bg-primary/20 scale-110" : "hover:bg-muted"}`}>{e}</button>
                      ))}
                    </div>
                    <button onClick={handleAddCategory} disabled={!newCatName.trim()}
                      className="w-full py-2 text-[11px] font-bold bg-primary text-white rounded-xl disabled:opacity-40 flex items-center justify-center gap-1.5 transition-all">
                      <Plus className="w-3.5 h-3.5" /> Add Category
                    </button>
                  </div>
                </div>

                <button onClick={() => setBudgetModal(false)}
                  className="w-full mt-4 py-3 rounded-2xl bg-primary text-white text-xs font-bold fab-glow active:scale-[0.98] transition-transform">
                  Done
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
