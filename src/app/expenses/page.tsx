import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ExpensesClient } from "./expenses-client";

export default async function ExpensesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: expenses } = await supabase
    .from("expenses")
    .select("*")
    .eq("paid_by", user.id)
    .is("group_id", null)
    .order("date", { ascending: false });

  return <ExpensesClient expenses={expenses ?? []} userId={user.id} />;
}
