import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch personal expenses (not in a group)
  const { data: personalExpenses } = await supabase
    .from("expenses")
    .select("*")
    .eq("paid_by", user.id)
    .is("group_id", null)
    .order("date", { ascending: false })
    .limit(5);

  // Fetch group expenses (in a group)
  const { data: groupExpenses } = await supabase
    .from("expenses")
    .select("*, groups(name)")
    .not("group_id", "is", null)
    .eq("paid_by", user.id)
    .order("date", { ascending: false })
    .limit(5);

  // Fetch total personal
  const { data: personalTotal } = await supabase
    .from("expenses")
    .select("amount")
    .eq("paid_by", user.id)
    .is("group_id", null);

  // Fetch amount owed to user (splits where user paid)
  const { data: owedToMe } = await supabase
    .from("expense_splits")
    .select("amount_owed, expenses!inner(paid_by)")
    .eq("expenses.paid_by", user.id)
    .neq("user_id", user.id)
    .eq("is_settled", false);

  // Fetch amount user owes others
  const { data: iOwe } = await supabase
    .from("expense_splits")
    .select("amount_owed")
    .eq("user_id", user.id)
    .eq("is_settled", false);

  const totalPersonal = personalTotal?.reduce((s, e) => s + e.amount, 0) ?? 0;
  const totalOwedToMe = owedToMe?.reduce((s, e) => s + e.amount_owed, 0) ?? 0;
  const totalIOwe = iOwe?.reduce((s, e) => s + e.amount_owed, 0) ?? 0;

  return (
    <DashboardClient
      profile={profile}
      personalExpenses={personalExpenses ?? []}
      groupExpenses={groupExpenses ?? []}
      totalPersonal={totalPersonal}
      totalOwedToMe={totalOwedToMe}
      totalIOwe={totalIOwe}
    />
  );
}
