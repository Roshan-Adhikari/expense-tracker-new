"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownLeft,
  Plus, Receipt, Users, ChevronRight, Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

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

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
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
  const netBalance = totalOwedToMe - totalIOwe;
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  // Spend by category
  const byCategory = personalExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 6);

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
          <p className="text-white/60 text-xs mb-5">Total Personal Spending</p>
          <div className="flex items-end gap-2 mb-6">
            <span className="text-white font-black text-5xl tracking-tight">{fmt(totalPersonal)}</span>
          </div>

          {/* Mini stat row */}
          <div className="flex gap-3">
            <div className="flex-1 bg-white/10 rounded-2xl px-3 py-2.5 backdrop-blur-sm border border-white/10">
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowDownLeft className="w-3.5 h-3.5 text-green-300" />
                <span className="text-white/70 text-[10px] font-medium uppercase tracking-wide">Owed to you</span>
              </div>
              <p className="text-white font-bold text-base">{fmt(totalOwedToMe)}</p>
            </div>
            <div className="flex-1 bg-white/10 rounded-2xl px-3 py-2.5 backdrop-blur-sm border border-white/10">
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-red-300" />
                <span className="text-white/70 text-[10px] font-medium uppercase tracking-wide">You owe</span>
              </div>
              <p className="text-white font-bold text-base">{fmt(totalIOwe)}</p>
            </div>
            <div className={`flex-1 rounded-2xl px-3 py-2.5 backdrop-blur-sm border border-white/10 ${netBalance >= 0 ? "bg-green-500/20" : "bg-red-500/20"}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-white/70" />
                <span className="text-white/70 text-[10px] font-medium uppercase tracking-wide">Net</span>
              </div>
              <p className="text-white font-bold text-base">{fmt(Math.abs(netBalance))}</p>
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

      <div className="px-4 space-y-6 pb-4">
        {/* ── Spending by Category ── */}
        {categories.length > 0 && (
          <motion.section variants={stagger} initial="hidden" animate="show">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-base">Spending by Category</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide"
              style={{ WebkitOverflowScrolling: "touch" }}>
              {categories.map(([cat, amount]) => (
                <motion.div key={cat} variants={fadeUp}
                  className={`shrink-0 snap-start flex flex-col items-center gap-2 px-4 py-3.5 rounded-2xl border card-shadow ${CATEGORY_COLORS[cat] || CATEGORY_COLORS.General} min-w-[88px]`}>
                  <span className="text-2xl">{CATEGORY_ICONS[cat] || "📦"}</span>
                  <span className="text-xs font-semibold">{cat}</span>
                  <span className="text-xs font-bold">{fmt(amount)}</span>
                </motion.div>
              ))}
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
    </div>
  );
}
