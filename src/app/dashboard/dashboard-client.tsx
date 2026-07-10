"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownLeft,
  Plus, Receipt, Users, ChevronRight, Zap, X,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

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

const CATEGORY_ICONS: Record<string, string> = {
  Food: "🍔", Transport: "🚗", Entertainment: "🎮",
  Shopping: "🛍️", Health: "💊", Housing: "🏠",
  Travel: "✈️", Education: "📚", Utilities: "⚡", General: "📦",
};

const CATEGORY_COLORS: Record<string, string> = {
  Food: "bg-orange-500/15 text-orange-500 border-orange-500/20",
  Transport: "bg-blue-500/15 text-blue-500 border-blue-500/20",
  Entertainment: "bg-purple-500/15 text-purple-500 border-purple-500/20",
  Shopping: "bg-pink-500/15 text-pink-500 border-pink-500/20",
  Health: "bg-green-500/15 text-green-500 border-green-500/20",
  Housing: "bg-yellow-500/15 text-yellow-500 border-yellow-500/20",
  Travel: "bg-sky-500/15 text-sky-500 border-sky-500/20",
  General: "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

const CHART_COLORS: Record<string, string> = {
  Food: "#f97316",
  Transport: "#3b82f6",
  Entertainment: "#a855f7",
  Shopping: "#ec4899",
  Health: "#22c55e",
  Housing: "#eab308",
  Travel: "#0ea5e9",
  General: "#6b7280",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}

function relDate(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  const router = useRouter();



  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [budgetModal, setBudgetModal] = useState(false);

  // Load budgets from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("category_budgets");
      if (stored) {
        setBudgets(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load budgets", e);
    }
  }, []);

  const handleSaveBudget = (category: string, limit: number) => {
    const updated = { ...budgets, [category]: limit };
    if (limit <= 0) {
      delete updated[category];
    }
    setBudgets(updated);
    localStorage.setItem("category_budgets", JSON.stringify(updated));
  };

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

                <div className="space-y-4 py-2">
                  {Object.keys(CATEGORY_ICONS).map((cat) => {
                    const currentVal = budgets[cat] || "";
                    return (
                      <div key={cat} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xl">{CATEGORY_ICONS[cat]}</span>
                          <span className="text-xs font-semibold truncate">{cat}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground font-semibold">₹</span>
                          <input
                            type="number"
                            placeholder="No Limit"
                            value={currentVal}
                            onChange={(e) => handleSaveBudget(cat, Number(e.target.value))}
                            className="w-24 px-2 py-1 text-xs rounded-xl bg-muted border border-border/50 text-right focus:outline-none focus:border-primary font-bold"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button onClick={() => setBudgetModal(false)}
                  className="w-full mt-6 py-3 rounded-2xl bg-primary text-white text-xs font-bold fab-glow active:scale-[0.98] transition-transform">
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
