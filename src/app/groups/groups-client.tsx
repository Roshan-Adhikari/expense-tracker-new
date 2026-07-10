"use client";

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users, Receipt, ChevronRight, Check, X, DollarSign, User as UserIcon, Trash2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from "recharts";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

interface Friend {
  friend_id: string;
  profiles: { id: string; full_name: string | null; email: string } | null;
}
interface Group { id: string; name: string; description: string | null; created_by: string | null; created_at: string; }
interface Profile { id: string; full_name: string | null; avatar_url: string | null; email: string; }
interface GroupMember { group_id: string; user_id: string; profiles: Profile | null; }
interface GroupExpense {
  id: string; description: string; amount: number; category: string;
  date: string; group_id: string | null; paid_by: string;
  profiles: { full_name: string | null } | null;
}
interface ExpenseSplit { expense_id: string; user_id: string; amount_owed: number; is_settled: boolean; }

const CATEGORY_ICONS: Record<string, string> = {
  Food:"🍔", Transport:"🚗", Entertainment:"🎮", Shopping:"🛍️",
  Health:"💊", Housing:"🏠", Travel:"✈️", Utilities:"⚡", General:"📦",
};

const bgColors = ["bg-violet-500","bg-blue-500","bg-pink-500","bg-emerald-500","bg-orange-500","bg-sky-500"];
const colorFor = (id: string) => bgColors[id.charCodeAt(0) % bgColors.length];
const initials = (name: string | null, email: string) =>
  name ? name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase() : email[0].toUpperCase();
function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);
}

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

interface Props {
  userId: string; groups: Group[]; allMembers: GroupMember[];
  allExpenses: GroupExpense[]; allSplits: ExpenseSplit[]; friends: Friend[];
}

export function GroupsClient({ userId, groups: initial, allMembers, allExpenses, allSplits, friends }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [, startTransition] = useTransition();

  const [groups, setGroups] = useState(initial);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(initial[0]?.id || null);
  const [view, setView] = useState<"list" | "detail">("list");

  // Sheet states
  const [groupSheet, setGroupSheet] = useState(false);
  const [expenseSheet, setExpenseSheet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState<"pie" | "bar">("pie");

  // Group form
  const [gName, setGName] = useState("");
  const [gDesc, setGDesc] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Expense form
  const [eDesc, setEDesc] = useState("");
  const [eAmount, setEAmount] = useState("");
  const [eCat, setECat] = useState("General");
  const [eDate, setEDate] = useState(new Date().toISOString().split("T")[0]);
  const [ePaidBy, setEPaidBy] = useState<string>(userId);
  const [splitType, setSplitType] = useState<"equal"|"custom">("equal");
  const [customSplits, setCustomSplits] = useState<Record<string,string>>({});
  const [editedSplits, setEditedSplits] = useState<Record<string, boolean>>({});

  const activeGroup = groups.find(g => g.id === activeGroupId);
  const activeMembers = allMembers.filter(m => m.group_id === activeGroupId);
  const activeExpenses = allExpenses.filter(e => e.group_id === activeGroupId);

  // Auto-balance splits when Total Amount changes
  useEffect(() => {
    if (splitType === "custom" && activeMembers.length > 0) {
      const amountNum = Number(eAmount) || 0;
      let editedSum = 0;
      const uneditedIds: string[] = [];
      activeMembers.forEach(m => {
        if (editedSplits[m.user_id]) {
          editedSum += Number(customSplits[m.user_id]) || 0;
        } else {
          uneditedIds.push(m.user_id);
        }
      });
      if (uneditedIds.length > 0) {
        const remaining = Math.max(0, amountNum - editedSum);
        const splitAmount = (remaining / uneditedIds.length).toFixed(2);
        setCustomSplits(prev => {
          const newSplits = { ...prev };
          uneditedIds.forEach(id => { newSplits[id] = splitAmount; });
          return newSplits;
        });
      }
    }
  }, [eAmount, splitType, activeMembers.length]); // Intentionally omitting edited/customSplits

  const handleCustomSplitChange = (changedUserId: string, value: string) => {
    const amountNum = Number(eAmount) || 0;
    const newEdited = { ...editedSplits, [changedUserId]: true };
    setEditedSplits(newEdited);
    
    let editedSum = 0;
    const uneditedIds: string[] = [];
    
    activeMembers.forEach(m => {
      if (m.user_id === changedUserId) {
        editedSum += Number(value) || 0;
      } else if (newEdited[m.user_id]) {
        editedSum += Number(customSplits[m.user_id]) || 0;
      } else {
        uneditedIds.push(m.user_id);
      }
    });
    
    const newSplits = { ...customSplits, [changedUserId]: value };
    
    if (uneditedIds.length > 0) {
      const remaining = Math.max(0, amountNum - editedSum);
      const splitAmount = (remaining / uneditedIds.length).toFixed(2);
      uneditedIds.forEach(id => {
        newSplits[id] = splitAmount;
      });
    }
    
    setCustomSplits(newSplits);
  };


  const openDetail = (id: string) => { setActiveGroupId(id); setView("detail"); };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!gName.trim()) return;
    setLoading(true);
    const { data: group, error: gError } = await supabase
      .from("groups").insert({ name: gName, description: gDesc, created_by: userId }).select().single();
    if (gError || !group) { 
      setErrorMsg(gError?.message || "Failed to create group");
      setLoading(false); return; 
    }
    const members = [{ group_id: group.id, user_id: userId }, ...selectedFriends.map(fid=>({ group_id: group.id, user_id: fid }))];
    const { error: mError } = await supabase.from("group_members").insert(members);
    if (mError) {
      setErrorMsg("Error adding members: " + mError.message);
      setLoading(false); return;
    }
    setGroups(prev => [group, ...prev]);
    setActiveGroupId(group.id);
    setGroupSheet(false);
    setGName(""); setGDesc(""); setSelectedFriends([]);
    setLoading(false);
    setView("detail");
    startTransition(() => router.refresh());
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroupId || !eDesc || !eAmount) return;
    setLoading(true);
    const amountNum = Number(eAmount);
    const { data: expense, error } = await supabase
      .from("expenses").insert({ description: eDesc, amount: amountNum, category: eCat, date: eDate, paid_by: ePaidBy, group_id: activeGroupId }).select().single();
    if (error || !expense) { setLoading(false); return; }

    const splits = splitType === "equal"
      ? activeMembers.map(m => ({ expense_id: expense.id, user_id: m.user_id, amount_owed: parseFloat((amountNum / activeMembers.length).toFixed(2)), is_settled: m.user_id === ePaidBy }))
      : activeMembers.map(m => ({ expense_id: expense.id, user_id: m.user_id, amount_owed: parseFloat(customSplits[m.user_id] || "0"), is_settled: m.user_id === ePaidBy }));

    await supabase.from("expense_splits").insert(splits);

    // Fire-and-forget notifications
    const othersToNotify = activeMembers.filter(m => m.user_id !== userId);
    for (const member of othersToNotify) {
      if (member.profiles?.email) {
        const splitAmt = splits.find(s => s.user_id === member.user_id)?.amount_owed || 0;
        fetch("/api/send-expense-email", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            friendEmail: member.profiles.email,
            friendName: member.profiles.full_name || "Friend",
            userName: activeMembers.find(m=>m.user_id===userId)?.profiles?.full_name || "Someone",
            amount: amountNum, description: eDesc, groupName: activeGroup?.name || "", splitAmount: splitAmt,
          }),
        }).catch(console.error);
      }
    }

    setExpenseSheet(false);
    setEDesc(""); setEAmount(""); setECat("General"); setCustomSplits({}); setEditedSplits({}); setEPaidBy(userId);
    setLoading(false);
    startTransition(() => router.refresh());
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    setLoading(true);
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) {
      alert("Failed to delete expense: " + error.message);
    } else {
      startTransition(() => router.refresh());
    }
    setLoading(false);
  };

  const handleSettleSplit = async (expenseId: string, debtorId: string, currentSettleState: boolean) => {
    setLoading(true);
    const { error } = await supabase
      .from("expense_splits")
      .update({ is_settled: !currentSettleState })
      .eq("expense_id", expenseId)
      .eq("user_id", debtorId);

    if (error) {
      alert("Failed to update settlement: " + error.message);
    } else {
      startTransition(() => router.refresh());
    }
    setLoading(false);
  };

  const toggleFriend = (fid: string) =>
    setSelectedFriends(prev => prev.includes(fid) ? prev.filter(id=>id!==fid) : [...prev, fid]);

  // ─── GROUP LIST VIEW ───
  if (view === "list") {
    return (
      <div className="min-h-full bg-background">
        <div className="px-4 pt-4 pb-3">
          {/* Header stat */}
          <div className="flex items-center justify-between rounded-3xl bg-gradient-to-br from-violet-500/10 to-accent/5 border border-violet-500/15 p-4 card-shadow mb-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Your Groups</p>
              <p className="text-3xl font-black">{groups.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">expense group{groups.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-violet-500/15 flex items-center justify-center">
              <Users className="w-7 h-7 text-violet-500" />
            </div>
          </div>
        </div>

        <div className="px-4">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-primary/40" />
              </div>
              <p className="text-base font-bold mb-1">No groups yet</p>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">Create a group to split expenses with roommates, friends, or travel buddies.</p>
            </div>
          ) : (
            <div className="rounded-3xl overflow-hidden card-shadow border border-border bg-card divide-y divide-border mb-6">
              {groups.map(group => {
                const members = allMembers.filter(m => m.group_id === group.id);
                const expenses = allExpenses.filter(e => e.group_id === group.id);
                const total = expenses.reduce((s, e) => s + e.amount, 0);
                return (
                  <motion.button key={group.id} layout onClick={() => openDetail(group.id)}
                    id={`group-${group.id}`}
                    className="w-full flex items-center px-4 py-4 gap-3 active:bg-muted/30 transition-colors text-left">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-base font-black text-primary">{group.name[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{group.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {members.length} member{members.length !== 1 ? "s" : ""} · {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-sm font-bold">{fmt(total)}</p>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* FAB */}
        <button onClick={() => setGroupSheet(true)} id="fab-create-group"
          className="fixed bottom-24 right-5 md:bottom-8 w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center fab-glow z-30 active:scale-90 transition-transform shadow-xl">
          <Plus className="w-6 h-6" />
        </button>

        {/* Create Group Sheet */}
        <AnimatePresence>
          {groupSheet && (
            <>
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setGroupSheet(false)} />
              <motion.div initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="fixed bottom-0 left-0 right-0 z-50 bottom-sheet bg-card pb-safe max-h-[90vh] overflow-y-auto">
                <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-border" /></div>
                <div className="px-5 pb-6">
                  <div className="flex items-center justify-between mb-5 mt-2">
                    <h3 className="text-lg font-bold">Create Group</h3>
                    <button onClick={() => setGroupSheet(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4 text-muted-foreground" /></button>
                  </div>
                  <form onSubmit={handleCreateGroup} className="space-y-4">
                    <input id="group-name-input" placeholder="Group name (e.g. Roommates 🏠)"
                      value={gName} onChange={e => setGName(e.target.value)}
                      className="w-full bg-background border border-border rounded-2xl px-4 py-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                      required />
                    <input id="group-desc-input" placeholder="Description (optional)"
                      value={gDesc} onChange={e => setGDesc(e.target.value)}
                      className="w-full bg-background border border-border rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />

                    {/* Friend picker */}
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-2">Add Friends</p>
                      {friends.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-3 py-3 bg-muted/50 rounded-2xl">No friends yet — add some from the Friends tab first.</p>
                      ) : (
                        <div className="space-y-2 max-h-44 overflow-y-auto">
                          {friends.map(f => {
                            if (!f.profiles) return null;
                            const selected = selectedFriends.includes(f.friend_id);
                            return (
                              <button key={f.friend_id} type="button" onClick={() => toggleFriend(f.friend_id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all ${selected ? "bg-primary/10 border-primary/30" : "bg-background border-border"}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${colorFor(f.friend_id)}`}>
                                  {initials(f.profiles.full_name, f.profiles.email)}
                                </div>
                                <div className="flex-1 text-left">
                                  <p className="text-xs font-semibold">{f.profiles.full_name || "Friend"}</p>
                                  <p className="text-[10px] text-muted-foreground">{f.profiles.email}</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                                  {selected && <Check className="w-3 h-3 text-white" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <button type="submit" disabled={loading}
                      className="w-full bg-primary text-white font-bold py-4 rounded-2xl fab-glow disabled:opacity-60 transition-all active:scale-[0.98]">
                      {loading ? "Creating…" : "Create Group"}
                    </button>
                    {errorMsg && <p className="text-sm text-destructive mt-3 text-center">{errorMsg}</p>}
                  </form>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── GROUP DETAIL VIEW ───
  const myShare = allSplits
    .filter(s => s.user_id === userId && activeExpenses.some(e => e.id === s.expense_id))
    .reduce((sum, s) => sum + s.amount_owed, 0);
  const groupTotal = activeExpenses.reduce((s, e) => s + e.amount, 0);
  const myPaid = activeExpenses
    .filter(e => e.paid_by === userId)
    .reduce((sum, e) => sum + e.amount, 0);
  const netGroupBalance = myPaid - myShare;

  const byCategory = activeExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  const groupChartData = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="min-h-full bg-background">
      {/* Back header */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <button onClick={() => setView("list")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-90 transition-transform">
          <ChevronRight className="w-5 h-5 rotate-180 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold truncate">{activeGroup?.name}</h2>
          {activeGroup?.description && <p className="text-xs text-muted-foreground truncate">{activeGroup.description}</p>}
        </div>
      </div>

      {/* Summary cards */}
      <div className="px-4 pb-3 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-card border border-border p-3 card-shadow">
          <p className="text-[10px] text-muted-foreground mb-1">Group Total</p>
          <p className="text-sm font-black truncate">{fmt(groupTotal)}</p>
        </div>
        <div className="rounded-2xl bg-card border border-border p-3 card-shadow">
          <p className="text-[10px] text-muted-foreground mb-1">Your Share</p>
          <p className="text-sm font-black text-primary truncate">{fmt(myShare)}</p>
        </div>
        <div className={`rounded-2xl p-3 border card-shadow ${netGroupBalance >= 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-red-500/10 border-red-500/20 text-red-500"}`}>
          <p className="text-[10px] text-muted-foreground mb-1">{netGroupBalance >= 0 ? "You're Owed" : "You Owe"}</p>
          <p className="text-sm font-black truncate">
            {netGroupBalance >= 0 ? "+" : ""}{fmt(netGroupBalance)}
          </p>
        </div>
      </div>

      {/* Members strip */}
      <div className="px-4 mb-4">
        <div className="rounded-2xl bg-card border border-border p-3.5 card-shadow">
          <p className="text-xs text-muted-foreground font-medium mb-3">Members</p>
          <div className="flex flex-wrap gap-2">
            {activeMembers.map(m => (
              <div key={m.user_id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted text-xs font-semibold">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${colorFor(m.user_id)}`}>
                  {m.profiles ? initials(m.profiles.full_name, m.profiles.email) : "?"}
                </div>
                {m.user_id === userId ? "You" : m.profiles?.full_name?.split(" ")[0] || m.profiles?.email?.split("@")[0]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      {activeExpenses.length > 0 && (
        <div className="px-4 mb-4">
          <div className="rounded-2xl bg-card border border-border p-4 card-shadow">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-muted-foreground">Group Spending Analytics</p>
              <div className="flex gap-1 bg-muted p-0.5 rounded-lg text-[10px] font-bold border border-border/30">
                <button type="button" onClick={() => setChartType("pie")}
                  className={`px-2.5 py-1 rounded-md transition-all ${chartType === "pie" ? "bg-card text-foreground card-shadow" : "text-muted-foreground"}`}>
                  Pie
                </button>
                <button type="button" onClick={() => setChartType("bar")}
                  className={`px-2.5 py-1 rounded-md transition-all ${chartType === "bar" ? "bg-card text-foreground card-shadow" : "text-muted-foreground"}`}>
                  Bar
                </button>
              </div>
            </div>

            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "pie" ? (
                  <PieChart>
                    <Pie
                      data={groupChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={45}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {groupChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[entry.name] || "#6b7280"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => fmt(Number(value))} contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'var(--card)', color: 'var(--foreground)', fontSize: '10px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                  </PieChart>
                ) : (
                  <BarChart data={groupChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => fmt(Number(value))} contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'var(--card)', color: 'var(--foreground)', fontSize: '10px' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {groupChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[entry.name] || "#6b7280"} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Expenses */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold">Expenses</p>
          <button onClick={() => setExpenseSheet(true)} id="add-group-expense-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold border border-primary/20 active:scale-95 transition-transform">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {activeExpenses.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center rounded-3xl border border-border bg-card card-shadow">
            <Receipt className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold mb-1">No expenses yet</p>
            <p className="text-xs text-muted-foreground mb-4">Add the first shared expense for this group.</p>
            <button onClick={() => setExpenseSheet(true)}
              className="inline-flex items-center gap-2 bg-primary text-white text-xs font-bold px-5 py-2.5 rounded-xl fab-glow">
              <Plus className="w-3.5 h-3.5" /> Add Expense
            </button>
          </div>
        ) : (
          <div className="rounded-3xl overflow-hidden card-shadow border border-border bg-card divide-y divide-border mb-6">
            {activeExpenses.map(exp => {
              const splits = allSplits.filter(s => s.expense_id === exp.id);
              const mySplit = splits.find(s => s.user_id === userId);
              const iPaid = exp.paid_by === userId;
              return (
                <div key={exp.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-lg shrink-0">
                        {CATEGORY_ICONS[exp.category] || "📦"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{exp.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {iPaid ? "You paid" : `${exp.profiles?.full_name || "Someone"} paid`} · {new Date(exp.date).toLocaleDateString("en-US",{month:"short",day:"numeric"})}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-3">
                      <div>
                        <p className="text-sm font-bold">{fmt(exp.amount)}</p>
                        {mySplit && <p className={`text-xs font-semibold mt-0.5 ${iPaid ? "text-emerald-500" : "text-red-500"}`}>
                          {iPaid ? `+${fmt(exp.amount - mySplit.amount_owed)}` : `-${fmt(mySplit.amount_owed)}`}
                        </p>}
                      </div>
                      {iPaid && (
                        <button onClick={() => handleDeleteExpense(exp.id)} disabled={loading}
                          className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 active:scale-95 transition-all shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Split breakdown */}
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {splits.map(s => {
                      const mem = activeMembers.find(m => m.user_id === s.user_id);
                      const isPayerOrDebtor = exp.paid_by === userId || s.user_id === userId;
                      const pillClass = `flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs transition-all ${
                        s.is_settled 
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 opacity-60" 
                          : "bg-muted border border-border text-foreground hover:bg-muted/80"
                      } ${isPayerOrDebtor ? "cursor-pointer" : "cursor-default"}`;

                      const Content = (
                        <>
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white shrink-0 ${colorFor(s.user_id)}`}>
                            {mem?.profiles ? initials(mem.profiles.full_name, mem.profiles.email) : "?"}
                          </div>
                          <span className="font-bold">{fmt(s.amount_owed)}</span>
                          {s.is_settled && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
                        </>
                      );

                      if (isPayerOrDebtor) {
                        return (
                          <button
                            key={s.user_id}
                            type="button"
                            disabled={loading}
                            onClick={() => handleSettleSplit(exp.id, s.user_id, s.is_settled)}
                            className={pillClass}
                            title={s.is_settled ? "Mark as unpaid" : "Mark as paid/settled"}
                          >
                            {Content}
                          </button>
                        );
                      }

                      return (
                        <div key={s.user_id} className={pillClass}>
                          {Content}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Expense Sheet */}
      <AnimatePresence>
        {expenseSheet && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setExpenseSheet(false)} />
            <motion.div initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="fixed bottom-0 left-0 right-0 z-50 bottom-sheet bg-card pb-safe max-h-[92vh] overflow-y-auto">
              <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-border" /></div>
              <div className="px-5 pb-6">
                <div className="flex items-center justify-between mb-5 mt-2">
                  <h3 className="text-lg font-bold">Add Group Expense</h3>
                  <button onClick={() => setExpenseSheet(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
                <form onSubmit={handleAddExpense} className="space-y-4">
                  {/* Amount */}
                  <div className="rounded-2xl border border-border bg-background px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
                    <label className="text-xs text-muted-foreground font-medium">Total Amount</label>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-2xl font-bold text-muted-foreground">₹</span>
                      <input type="number" step="0.01" min="0.01" placeholder="0.00" id="group-expense-amount"
                        value={eAmount} onChange={e => setEAmount(e.target.value)}
                        className="flex-1 text-2xl font-black bg-transparent focus:outline-none text-foreground" required />
                    </div>
                  </div>

                  <input id="group-expense-desc" placeholder="What was this for?"
                    value={eDesc} onChange={e => setEDesc(e.target.value)}
                    className="w-full bg-background border border-border rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    required />

                  <input id="group-expense-date" type="date" value={eDate} onChange={e => setEDate(e.target.value)}
                    className="w-full bg-background border border-border rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" required />

                  {/* Paid By selector */}
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-2">Paid By</p>
                    <div className="flex bg-muted p-1 rounded-2xl overflow-x-auto gap-1 hide-scrollbar">
                      {activeMembers.map(m => (
                        <button key={m.user_id} type="button" onClick={() => setEPaidBy(m.user_id)}
                          className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all ${ePaidBy === m.user_id ? "bg-card text-foreground card-shadow" : "text-muted-foreground"}`}>
                          {m.user_id === userId ? "You" : m.profiles?.full_name?.split(" ")[0] || "Member"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Split toggle */}
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-2">Split Method</p>
                    <div className="flex bg-muted p-1 rounded-2xl flex-wrap gap-1">
                      {(["equal","custom"] as const).map(type => (
                        <button key={type} type="button" 
                          onClick={() => {
                            setSplitType(type);
                            if (type === "equal") {
                              setEditedSplits({});
                              setCustomSplits({});
                            }
                          }}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all ${splitType===type ? "bg-card text-foreground card-shadow" : "text-muted-foreground"}`}>
                          {type === "equal" ? "Split Equally" : "Custom Split"}
                        </button>
                      ))}
                      {activeMembers.length === 2 && (
                        <button type="button" 
                          onClick={() => {
                            setSplitType("custom");
                            const other = activeMembers.find(m => m.user_id !== ePaidBy)?.user_id;
                            if (other) {
                              setCustomSplits({ [ePaidBy]: "0", [other]: eAmount });
                              setEditedSplits({ [ePaidBy]: true, [other]: true });
                            }
                          }}
                          className="w-full mt-1 py-2 rounded-xl text-xs font-bold transition-all text-muted-foreground bg-muted hover:bg-muted-foreground/10">
                          {ePaidBy === userId ? "They owe full amount" : "You owe full amount"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Members & amounts */}
                  <div className="space-y-2">
                    {activeMembers.map(member => (
                      <div key={member.user_id} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-muted/50">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${colorFor(member.user_id)}`}>
                          {member.profiles ? initials(member.profiles.full_name, member.profiles.email) : "?"}
                        </div>
                        <p className="flex-1 text-sm font-semibold">
                          {member.user_id === userId ? "You" : member.profiles?.full_name?.split(" ")[0] || "Member"}
                        </p>
                        {splitType === "equal" ? (
                          <p className="text-sm font-bold text-primary">
                            {eAmount ? fmt(Number(eAmount) / activeMembers.length) : "₹0.00"}
                          </p>
                        ) : (
                          <div className="relative w-24">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">₹</span>
                            <input type="number" step="0.01" placeholder="0.00"
                              value={customSplits[member.user_id] || ""}
                              onChange={e => handleCustomSplitChange(member.user_id, e.target.value)}
                              className="w-full bg-background border border-border rounded-xl py-2 pr-2 pl-6 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary/50 text-right" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full bg-primary text-white font-bold py-4 rounded-2xl fab-glow disabled:opacity-60 active:scale-[0.98] transition-all">
                    {loading ? "Adding…" : "Add & Notify Members"}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
