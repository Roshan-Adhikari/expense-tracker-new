import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Parallelize all queries that only depend on user.id
  const [
    { data: profile },
    { data: personalExpenses },
    { data: groupExpenses },
    { data: personalTotal },
    { data: owedToMe },
    { data: iOwe }
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single(),
    supabase
      .from("expenses")
      .select("*")
      .eq("paid_by", user.id)
      .is("group_id", null)
      .order("date", { ascending: false })
      .limit(5),
    supabase
      .from("expenses")
      .select("*, groups(name)")
      .not("group_id", "is", null)
      .eq("paid_by", user.id)
      .order("date", { ascending: false })
      .limit(5),
    supabase
      .from("expenses")
      .select("amount")
      .eq("paid_by", user.id)
      .is("group_id", null),
    supabase
      .from("expense_splits")
      .select("amount_owed, expenses!inner(paid_by)")
      .eq("expenses.paid_by", user.id)
      .neq("user_id", user.id)
      .eq("is_settled", false),
    supabase
      .from("expense_splits")
      .select("amount_owed")
      .eq("user_id", user.id)
      .eq("is_settled", false)
  ]);

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
