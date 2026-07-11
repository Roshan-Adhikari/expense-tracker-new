"use client";

import { useState, useEffect, useTransition } from "react";
import { motion } from "framer-motion";
import { Plus, Users, Receipt, ChevronRight, Check, Trash2, Pencil, Activity } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from "recharts";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Sheet } from "@/components/sheet";
import { CATEGORY_ICONS, CHART_COLORS } from "@/lib/constants";
import { fmt, colorFor, initials } from "@/lib/format";
import { netBalanceForUser } from "@/lib/balances";

interface Friend {
  friend_id: string;
  profiles: { id: string; full_name: string | null; email: string } | null;
}
interface Group { id: string; name: string; description: string | null; created_by: string | null; created_at: string; }
interface Profile { id: string; full_name: string | null; avatar_url: string | null; email: string; }
interface GroupMember { group_id: string; user_id: string; profiles: Profile | null; }
interface GroupExpense {
  id: string; description: string; amount: number; category: string;
  date: string; created_at?: string; group_id: string | null; paid_by: string;
  profiles: { full_name: string | null } | null;
}
interface ExpenseSplit { expense_id: string; user_id: string; amount_owed: number; is_settled: boolean; }
interface ActivityLog { id: string; group_id: string; user_id: string; action: string; details: any; created_at: string; profiles: Profile | null; }

interface Props {
  userId: string; groups: Group[]; allMembers: GroupMember[];
  allExpenses: GroupExpense[]; allSplits: ExpenseSplit[]; friends: Friend[];
  activityLogs?: ActivityLog[];
}

export function GroupsClient({ userId, groups: initial, allMembers, allExpenses, allSplits, friends, activityLogs = [] }: Props) {
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

  const [localExpenses, setLocalExpenses] = useState(allExpenses);
  const [localSplits, setLocalSplits] = useState(allSplits);
  const [localLogs, setLocalLogs] = useState(activityLogs);
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);

  useEffect(() => setLocalExpenses(allExpenses), [allExpenses]);
  useEffect(() => setLocalSplits(allSplits), [allSplits]);
  useEffect(() => setLocalLogs(activityLogs), [activityLogs]);

  // Deep link: ?group=GROUP_ID&expense=EXPENSE_ID
  const searchParams = useSearchParams();
  useEffect(() => {
    const groupParam = searchParams.get("group");
    const expenseParam = searchParams.get("expense");
    if (!groupParam) return;
    setActiveGroupId(groupParam);
    setView("detail");
    if (expenseParam) {
      // Wait for state to settle, then open the edit sheet
      setTimeout(() => {
        const expense = allExpenses.find(e => e.id === expenseParam);
        if (expense) openEditExpense(expense);
      }, 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const logActivity = (action: string, details: any, gId: string = activeGroupId!) => {
    if (!gId) return;
    const newLog: ActivityLog = { id: Math.random().toString(), group_id: gId, user_id: userId, action, details, created_at: new Date().toISOString(), profiles: { id: userId, full_name: "You", avatar_url: null, email: "" } };
    setLocalLogs(prev => [newLog, ...prev]);
    supabase.from("activity_logs").insert({ group_id: gId, user_id: userId, action, details }).then();
  };

  const activeGroup = groups.find(g => g.id === activeGroupId);
  const activeMembers = allMembers.filter(m => m.group_id === activeGroupId);
  const activeExpenses = localExpenses.filter(e => e.group_id === activeGroupId);

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
    
    // Fire-and-forget notifications for new group
    const me = { id: userId, full_name: "Someone" }; // We'll get a real name if we can, but we don't have the user's full name readily here, so we might just use "Someone" or the userId if needed. Wait, we have friends profiles.
    for (const fid of selectedFriends) {
      const friend = friends.find(f => f.friend_id === fid);
      if (friend?.profiles?.email) {
        fetch("/api/send-group-email", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            friendEmail: friend.profiles.email,
            friendName: friend.profiles.full_name || "Friend",
            userName: "Your friend",
            groupName: gName,
          }),
        }).catch(console.error);
      }
    }
    logActivity("group_created", { name: gName }, group.id);
    startTransition(() => router.refresh());
  };

  const openAddExpense = () => {
    setEditExpenseId(null);
    setEDesc(""); setEAmount(""); setECat("General"); setCustomSplits({}); setEditedSplits({}); setEPaidBy(userId); setSplitType("equal");
    setExpenseSheet(true);
  };

  const openEditExpense = (expense: GroupExpense) => {
    setEditExpenseId(expense.id);
    setEDesc(expense.description);
    setEAmount(expense.amount.toString());
    setECat(expense.category);
    setEDate(expense.date);
    setEPaidBy(expense.paid_by);
    
    // Parse custom splits
    const splits = localSplits.filter(s => s.expense_id === expense.id);
    const isCustom = splits.some(s => s.amount_owed !== parseFloat((expense.amount / splits.length).toFixed(2)) && s.amount_owed !== parseFloat((expense.amount / splits.length).toFixed(2)) + 0.01 && s.amount_owed !== parseFloat((expense.amount / splits.length).toFixed(2)) - 0.01);
    
    if (isCustom) {
      setSplitType("custom");
      const cSplits: Record<string, string> = {};
      const eSplits: Record<string, boolean> = {};
      splits.forEach(s => { cSplits[s.user_id] = s.amount_owed.toString(); eSplits[s.user_id] = true; });
      setCustomSplits(cSplits);
      setEditedSplits(eSplits);
    } else {
      setSplitType("equal");
    }
    setExpenseSheet(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroupId || !eDesc || !eAmount) return;
    setLoading(true);
    const amountNum = Number(eAmount);
    
    let expenseData = { description: eDesc, amount: amountNum, category: eCat, date: eDate, paid_by: ePaidBy, group_id: activeGroupId };
    let expenseId = editExpenseId;

    if (editExpenseId) {
      const { data, error } = await supabase.from("expenses").update(expenseData).eq("id", editExpenseId).select("id, description, amount, category, date, created_at, group_id, paid_by, profiles(full_name)").single();
      if (error || !data) { alert("Failed to update: " + error?.message); setLoading(false); return; }
      
      const newExpense = { ...data, profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles };
      setLocalExpenses(prev => prev.map(ex => ex.id === editExpenseId ? newExpense : ex));
      
      // Delete old splits to replace
      await supabase.from("expense_splits").delete().eq("expense_id", editExpenseId);
      logActivity("expense_edited", { description: eDesc, amount: amountNum });
    } else {
      const { data, error } = await supabase.from("expenses").insert(expenseData).select("id, description, amount, category, date, created_at, group_id, paid_by, profiles(full_name)").single();
      if (error || !data) { alert("Failed to add expense: " + (error?.message || "Unknown error")); setLoading(false); return; }
      expenseId = data.id;
      const newExpense = { ...data, profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles };
      setLocalExpenses(prev => [newExpense, ...prev]);
      logActivity("expense_added", { description: eDesc, amount: amountNum });
    }

    const splits = splitType === "equal"
      ? activeMembers.map(m => ({ expense_id: expenseId!, user_id: m.user_id, amount_owed: parseFloat((amountNum / activeMembers.length).toFixed(2)), is_settled: m.user_id === ePaidBy }))
      : activeMembers.map(m => ({ expense_id: expenseId!, user_id: m.user_id, amount_owed: parseFloat(customSplits[m.user_id] || "0"), is_settled: m.user_id === ePaidBy }));

    setLocalSplits(prev => [...splits, ...prev.filter(s => s.expense_id !== expenseId)]);
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
            isEdit: !!editExpenseId
          }),
        }).catch(console.error);
      }
    }

    setExpenseSheet(false);
    setEditExpenseId(null);
    setEDesc(""); setEAmount(""); setECat("General"); setCustomSplits({}); setEditedSplits({}); setEPaidBy(userId);
    setLoading(false);
    startTransition(() => router.refresh());
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    setLoading(true);
    setLocalExpenses(prev => prev.filter(e => e.id !== id));
    setLocalSplits(prev => prev.filter(s => s.expense_id !== id));

    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) {
      alert("Failed to delete expense: " + error.message);
      startTransition(() => router.refresh());
    } else {
      startTransition(() => router.refresh());
    }
    setLoading(false);
  };

  const handleSettleSplit = async (expenseId: string, debtorId: string, currentSettleState: boolean) => {
    setLoading(true);
    setLocalSplits(prev => prev.map(s => 
      s.expense_id === expenseId && s.user_id === debtorId ? { ...s, is_settled: !currentSettleState } : s
    ));
    const { error } = await supabase
      .from("expense_splits")
      .update({ is_settled: !currentSettleState })
      .eq("expense_id", expenseId)
      .eq("user_id", debtorId);

    if (error) {
      alert("Failed to update settlement: " + error.message);
      setLocalSplits(prev => prev.map(s => 
        s.expense_id === expenseId && s.user_id === debtorId ? { ...s, is_settled: currentSettleState } : s
      ));
    } else {
      if (!currentSettleState) {
        const expense = localExpenses.find(e => e.id === expenseId);
        const debtorName = activeMembers.find(m => m.user_id === debtorId)?.profiles?.full_name || "Someone";
        logActivity("split_settled", { description: expense?.description, debtorName });
      }
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
                const expenses = localExpenses.filter(e => e.group_id === group.id);
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
        <Sheet open={groupSheet} onClose={() => setGroupSheet(false)} title="Create Group" className="max-h-[90vh]">
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
        </Sheet>
      </div>
    );
  }

  // ─── GROUP DETAIL VIEW ───
  const myShare = localSplits
    .filter(s => s.user_id === userId && activeExpenses.some(e => e.id === s.expense_id))
    .reduce((sum, s) => sum + s.amount_owed, 0);
  const groupTotal = activeExpenses.reduce((s, e) => s + e.amount, 0);
  const netGroupBalance = netBalanceForUser(
    userId,
    activeExpenses.map(e => ({ id: e.id, amount: e.amount, paid_by: e.paid_by, group_id: e.group_id })),
    localSplits
  );

  const byMember = activeExpenses.reduce<Record<string, number>>((acc, e) => {
    const mem = activeMembers.find(m => m.user_id === e.paid_by);
    const name = e.paid_by === userId ? "You" : (mem?.profiles?.full_name || "Someone");
    acc[name] = (acc[name] || 0) + e.amount;
    return acc;
  }, {});
  const groupChartData = Object.entries(byMember)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const MEMBER_CHART_COLORS = ["#7C3AED", "#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#EC4899", "#8B5CF6", "#06B6D4"];

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
                        <Cell key={`cell-${index}`} fill={MEMBER_CHART_COLORS[index % MEMBER_CHART_COLORS.length]} />
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
                        <Cell key={`cell-${index}`} fill={MEMBER_CHART_COLORS[index % MEMBER_CHART_COLORS.length]} />
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
          <button onClick={openAddExpense} id="add-group-expense-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold border border-primary/20 active:scale-95 transition-transform">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {activeExpenses.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center rounded-3xl border border-border bg-card card-shadow">
            <Receipt className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold mb-1">No expenses yet</p>
            <p className="text-xs text-muted-foreground mb-4">Add the first shared expense for this group.</p>
            <button onClick={openAddExpense}
              className="inline-flex items-center gap-2 bg-primary text-white text-xs font-bold px-5 py-2.5 rounded-xl fab-glow">
              <Plus className="w-3.5 h-3.5" /> Add Expense
            </button>
          </div>
        ) : (
          <div className="rounded-3xl overflow-hidden card-shadow border border-border bg-card divide-y divide-border mb-6">
            {[...activeExpenses]
              .sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime())
              .map(exp => {
              const splits = localSplits.filter(s => s.expense_id === exp.id);
              const mySplit = splits.find(s => s.user_id === userId);
              const iPaid = exp.paid_by === userId;
              const memberNames = splits
                .map(s => {
                  const mem = activeMembers.find(m => m.user_id === s.user_id);
                  return s.user_id === userId ? "You" : (mem?.profiles?.full_name || "Someone");
                })
                .join(" · ");
              const entryTime = exp.created_at
                ? new Date(exp.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
                : "";
              const entryDate = new Date(exp.created_at || exp.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
              return (
                <div key={exp.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-lg shrink-0">
                        {CATEGORY_ICONS[exp.category] || "📦"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{exp.description}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          <span className="font-medium">{iPaid ? "You" : (exp.profiles?.full_name || "Someone")}</span>
                          {" paid · "}
                          <span className="text-muted-foreground/70">{memberNames}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">{entryDate}{entryTime ? ` · ${entryTime}` : ""}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-3">
                      <div>
                        <p className="text-sm font-bold">{fmt(exp.amount)}</p>
                        {mySplit && <p className={`text-xs font-semibold mt-0.5 ${iPaid ? "text-emerald-500" : "text-red-500"}`}>
                          {iPaid ? `+${fmt(exp.amount - mySplit.amount_owed)}` : `-${fmt(mySplit.amount_owed)}`}
                        </p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditExpense(exp)} disabled={loading}
                          className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 transition-all shrink-0">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteExpense(exp.id)} disabled={loading}
                          className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 active:scale-95 transition-all shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Split breakdown */}
                  <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] text-muted-foreground">
                    <span className="font-bold text-[9px] uppercase tracking-wider text-muted-foreground/60 mr-1">Splits:</span>
                    {splits.map(s => {
                      const mem = activeMembers.find(m => m.user_id === s.user_id);
                      const isPayerOrDebtor = exp.paid_by === userId || s.user_id === userId;
                      const isMe = s.user_id === userId;
                      const name = isMe ? "You" : mem?.profiles?.full_name?.split(" ")[0] || "Someone";
                      const isPayer = exp.paid_by === s.user_id;
                      
                      return (
                        <div key={s.user_id} className="flex items-center gap-1.5 bg-muted/20 px-2 py-0.5 rounded-lg border border-border/40 shrink-0">
                          <span>
                            <span className="font-semibold text-foreground">{name}</span>
                            {isPayer ? ` paid total ${fmt(exp.amount)}` : ` ${name === "You" ? "owe" : "owes"} ${fmt(s.amount_owed)}`}
                          </span>
                          {!isPayer && s.amount_owed > 0 && (
                            <span className={`text-[9px] font-bold px-1 rounded ${
                              s.is_settled ? "text-emerald-500 bg-emerald-500/10" : "text-orange-500 bg-orange-500/10"
                            }`}>
                              {s.is_settled ? "Paid" : "Unpaid"}
                            </span>
                          )}
                          {!isPayer && s.amount_owed > 0 && isPayerOrDebtor && (
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => handleSettleSplit(exp.id, s.user_id, s.is_settled)}
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary text-white hover:bg-primary/95 transition-all active:scale-95 ml-1 shrink-0"
                            >
                              {s.is_settled ? "Undo" : "Mark Paid"}
                            </button>
                          )}
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

      {/* Activity Feed */}
      <div className="px-4 mt-8 mb-24">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          <p className="text-sm font-bold">Recent Activity</p>
        </div>
        <div className="space-y-4">
          {localLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6 bg-muted/30 rounded-2xl border border-border">No activity yet</p>
          ) : (
            <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[2px] before:bg-gradient-to-b before:from-border before:via-border before:to-transparent">
              {localLogs.map((log, i) => {
                const isYou = log.user_id === userId;
                const name = isYou ? "You" : (log.profiles?.full_name || "Someone");
                
                let icon = <Activity className="w-3 h-3 text-muted-foreground" />;
                let text = <><span className="font-semibold">{name}</span> did something</>;
                
                if (log.action === "group_created") {
                  icon = <Users className="w-3 h-3 text-violet-500" />;
                  text = <><span className="font-semibold">{name}</span> created the group <span className="font-semibold">{log.details?.name}</span></>;
                } else if (log.action === "expense_added") {
                  icon = <Receipt className="w-3 h-3 text-primary" />;
                  text = <><span className="font-semibold">{name}</span> added an expense: <span className="font-semibold">{log.details?.description}</span> ({fmt(log.details?.amount)})</>;
                } else if (log.action === "expense_edited") {
                  icon = <Pencil className="w-3 h-3 text-orange-500" />;
                  text = <><span className="font-semibold">{name}</span> updated the expense: <span className="font-semibold">{log.details?.description}</span></>;
                } else if (log.action === "split_settled") {
                  icon = <Check className="w-3 h-3 text-emerald-500" />;
                  text = <><span className="font-semibold">{name}</span> marked <span className="font-semibold">{log.details?.debtorName}</span> as paid for <span className="italic">{log.details?.description}</span></>;
                }

                return (
                  <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-border bg-card shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      {icon}
                    </div>
                    <div className="w-[calc(100%-3.5rem)] md:w-[calc(50%-2.5rem)] bg-card p-3.5 rounded-2xl border border-border card-shadow relative">
                      <div className="absolute top-4 -left-2 md:group-odd:-right-2 md:group-odd:left-auto md:group-odd:rotate-180 w-3 h-3 bg-card border-l border-t border-border rotate-[-45deg]" />
                      <p className="text-xs leading-relaxed">{text}</p>
                      <p className="text-[10px] text-muted-foreground mt-1.5 font-medium tracking-wide uppercase">{new Date(log.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Expense Sheet */}
      <Sheet
        open={expenseSheet}
        onClose={() => setExpenseSheet(false)}
        title={editExpenseId ? "Edit Expense" : "Add Group Expense"}
      >
                <form onSubmit={handleSaveExpense} className="space-y-4">
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
                          {ePaidBy === m.user_id && " paid"}
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
                          {ePaidBy === userId
                          ? (() => {
                              const other = activeMembers.find(m => m.user_id !== userId);
                              const otherName = other?.profiles?.full_name?.split(" ")[0] || "They";
                              return `${otherName} owes full amount`;
                            })()
                          : (() => {
                              const payer = activeMembers.find(m => m.user_id === ePaidBy);
                              const payerName = payer?.profiles?.full_name?.split(" ")[0] || "They";
                              return `You owe ${payerName} full amount`;
                            })()
                          }
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Members & amounts */}
                  <div className="space-y-2">
                    {splitType === "custom" && (
                      <p className="text-[11px] text-muted-foreground mb-1.5 px-1 font-semibold">
                        Enter each person's share (amount owed) of this expense:
                      </p>
                    )}
                    {activeMembers.map(member => (
                      <div key={member.user_id} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-muted/50">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${colorFor(member.user_id)}`}>
                          {member.profiles ? initials(member.profiles.full_name, member.profiles.email) : "?"}
                        </div>
                        <p className="flex-1 text-sm font-semibold">
                          {member.user_id === userId ? "You owe" : `${member.profiles?.full_name?.split(" ")[0] || "Member"} owes`}
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
      </Sheet>
    </div>
  );
}
