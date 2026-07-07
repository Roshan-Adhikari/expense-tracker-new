import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { GroupsClient } from "./groups-client";

export default async function GroupsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get all groups the user is a member of
  const { data: memberRows } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  const groupIds = memberRows?.map((r) => r.group_id) ?? [];

  const { data: groups } = groupIds.length
    ? await supabase
        .from("groups")
        .select("id, name, description, created_by, created_at")
        .in("id", groupIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Get members for each group
  const { data: allMembers } = groupIds.length
    ? await supabase
        .from("group_members")
        .select("group_id, user_id, profiles(id, full_name, avatar_url, email)")
        .in("group_id", groupIds)
    : { data: [] };

  // Get expenses for each group
  const { data: allExpenses } = groupIds.length
    ? await supabase
        .from("expenses")
        .select("id, description, amount, category, date, group_id, paid_by, profiles(full_name)")
        .in("group_id", groupIds)
        .order("date", { ascending: false })
    : { data: [] };

  // Get splits for expenses
  const expenseIds = allExpenses?.map(e => e.id) ?? [];
  const { data: allSplits } = expenseIds.length
    ? await supabase
        .from("expense_splits")
        .select("expense_id, user_id, amount_owed, is_settled")
        .in("expense_id", expenseIds)
    : { data: [] };

  // Get friends for the current user
  const { data: friendsData } = await supabase
    .from("friends")
    .select("friend_id, profiles!friends_friend_id_fkey(id, full_name, email)")
    .eq("user_id", user.id);

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

  return (
    <GroupsClient
      userId={user.id}
      groups={groups ?? []}
      allMembers={formattedMembers}
      allExpenses={formattedExpenses}
      allSplits={allSplits ?? []}
      friends={formattedFriends}
    />
  );
}
