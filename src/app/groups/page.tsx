import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { GroupsClient } from "./groups-client";

export default async function GroupsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Step 1: Parallel fetch group IDs and friends (which only depend on user.id)
  const [memberRowsRes, friendsRes] = await Promise.all([
    supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id),
    supabase
      .from("friends")
      .select("friend_id, profiles!friends_friend_id_fkey(id, full_name, email)")
      .eq("user_id", user.id)
  ]);

  const memberRows = memberRowsRes.data;
  const friendsData = friendsRes.data;
  const groupIds = memberRows?.map((r) => r.group_id) ?? [];

  // Step 2: Parallel fetch groups, allMembers, allExpenses, and allSplits for those groups
  const [groupsRes, allMembersRes, allExpensesRes, allSplitsRes, logsRes] = groupIds.length
    ? await Promise.all([
        supabase
          .from("groups")
          .select("id, name, description, created_by, created_at")
          .in("id", groupIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("group_members")
          .select("group_id, user_id, profiles(id, full_name, avatar_url, email)")
          .in("group_id", groupIds),
        supabase
          .from("expenses")
          .select("id, description, amount, category, date, group_id, paid_by, profiles(full_name)")
          .in("group_id", groupIds)
          .order("date", { ascending: false }),
        supabase
          .from("expense_splits")
          .select("expense_id, user_id, amount_owed, is_settled, expenses!inner(group_id)")
          .in("expenses.group_id", groupIds),
        supabase
          .from("activity_logs")
          .select("id, group_id, user_id, action, details, created_at, profiles(full_name, avatar_url)")
          .in("group_id", groupIds)
          .order("created_at", { ascending: false })
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const groups = groupsRes.data;
  const allMembers = allMembersRes.data;
  const allExpenses = allExpensesRes.data;
  const allSplitsRaw = allSplitsRes.data;
  const activityLogs = logsRes.data;

  // Format splits to remove the nested expenses property
  const allSplits = (allSplitsRaw ?? []).map((s: any) => ({
    expense_id: s.expense_id,
    user_id: s.user_id,
    amount_owed: s.amount_owed,
    is_settled: s.is_settled
  }));

  const formattedMembers = (allMembers ?? []).map((m: any) => ({
    group_id: m.group_id,
    user_id: m.user_id,
    profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
  })).filter(m => m.profiles !== null && m.profiles !== undefined);

  const formattedExpenses = (allExpenses ?? []).map((e: any) => ({
    id: e.id,
    description: e.description,
    amount: e.amount,
    category: e.category,
    date: e.date,
    group_id: e.group_id,
    paid_by: e.paid_by,
    profiles: Array.isArray(e.profiles) ? e.profiles[0] : e.profiles
  }));

  const formattedFriends = (friendsData ?? []).map((f: any) => ({
    friend_id: f.friend_id,
    profiles: Array.isArray(f.profiles) ? f.profiles[0] : f.profiles
  })).filter(f => f.profiles !== null && f.profiles !== undefined);

  const formattedLogs = (activityLogs ?? []).map((log: any) => ({
    id: log.id,
    group_id: log.group_id,
    user_id: log.user_id,
    action: log.action,
    details: log.details,
    created_at: log.created_at,
    profiles: Array.isArray(log.profiles) ? log.profiles[0] : log.profiles
  }));

  return (
    <GroupsClient
      userId={user.id}
      groups={groups ?? []}
      allMembers={formattedMembers}
      allExpenses={formattedExpenses}
      allSplits={allSplits ?? []}
      friends={formattedFriends}
      activityLogs={formattedLogs}
    />
  );
}
