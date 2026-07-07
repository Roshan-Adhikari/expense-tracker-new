import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { FriendsClient } from "./friends-client";

export default async function FriendsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get all friends with profile info
  const { data: friendsData } = await supabase
    .from("friends")
    .select(`
      id,
      friend_id,
      profiles!friends_friend_id_fkey(id, full_name, avatar_url, email)
    `)
    .eq("user_id", user.id);

  const formattedFriends = (friendsData ?? []).map((f: any) => ({
    id: f.id,
    friend_id: f.friend_id,
    profiles: Array.isArray(f.profiles) ? f.profiles[0] : f.profiles
  })).filter(f => f.profiles !== null && f.profiles !== undefined);

  return (
    <FriendsClient
      userId={user.id}
      friends={formattedFriends}
    />
  );
}
