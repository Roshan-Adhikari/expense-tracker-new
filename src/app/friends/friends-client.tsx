"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Users, Mail, Trash2, User as UserIcon, Search, X, ChevronRight } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

interface FriendProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

interface Friend {
  id: string;
  friend_id: string;
  profiles: FriendProfile;
}

export function FriendsClient({ userId, friends: initialFriends }: { userId: string; friends: Friend[] }) {
  const supabase = createClient();
  const router = useRouter();

  const [friends, setFriends] = useState<Friend[]>(initialFriends);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ type: "error" | "success"; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = friends.filter(f =>
    !search || f.profiles.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    f.profiles.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    const trimmed = email.trim().toLowerCase();

    if (!trimmed) { setStatus({ type: "error", msg: "Please enter an email address." }); setLoading(false); return; }

    const { data: profile } = await supabase.from("profiles").select("id, full_name, avatar_url, email").eq("email", trimmed).single();

    if (!profile) {
      const res = await fetch("/api/send-invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: trimmed }) });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        setStatus({ type: "error", msg: errorData?.error || "Could not send invite." });
      } else {
        setStatus({ type: "success", msg: `Invite sent to ${trimmed}!` });
      }
      setLoading(false); return;
    }

    if (profile.id === userId) { setStatus({ type: "error", msg: "You can't add yourself!" }); setLoading(false); return; }
    if (friends.some(f => f.friend_id === profile.id)) { setStatus({ type: "error", msg: "Already friends!" }); setLoading(false); return; }

    const { error } = await supabase.from("friends").insert([
      { user_id: userId, friend_id: profile.id },
      { user_id: profile.id, friend_id: userId },
    ]);

    if (error) { setStatus({ type: "error", msg: error.message }); setLoading(false); return; }

    setFriends(prev => [...prev, { id: crypto.randomUUID(), friend_id: profile.id, profiles: profile }]);
    setStatus({ type: "success", msg: `${profile.full_name || profile.email} added!` });
    setEmail("");
    setLoading(false);
    router.refresh();
  };

  const handleRemove = async (friendshipId: string, friendId: string) => {
    await supabase.from("friends").delete().eq("id", friendshipId);
    await supabase.from("friends").delete().eq("user_id", friendId).eq("friend_id", userId);
    setFriends(prev => prev.filter(f => f.id !== friendshipId));
    setDeleteConfirm(null);
    router.refresh();
  };

  // Initials helper
  const initials = (name: string | null, email: string) => {
    if (name) return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    return email[0].toUpperCase();
  };

  const bgColors = ["bg-violet-500", "bg-blue-500", "bg-pink-500", "bg-emerald-500", "bg-orange-500", "bg-sky-500"];
  const colorFor = (id: string) => bgColors[id.charCodeAt(0) % bgColors.length];

  return (
    <div className="min-h-full bg-background">
      {/* Header stats */}
      <div className="px-4 pt-4 pb-3 space-y-4">
        <div className="flex items-center justify-between rounded-3xl bg-gradient-to-br from-blue-500/10 to-accent/5 border border-blue-500/15 p-4 card-shadow">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Connected</p>
            <p className="text-3xl font-black">{friends.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">friend{friends.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex -space-x-2">
            {friends.slice(0, 4).map((f, i) => (
              <div key={f.id} className={`w-10 h-10 rounded-full border-2 border-card flex items-center justify-center text-white font-bold text-xs ${colorFor(f.friend_id)}`}
                style={{ zIndex: 4 - i }}>
                {f.profiles.avatar_url
                  ? <img src={f.profiles.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                  : initials(f.profiles.full_name, f.profiles.email)}
              </div>
            ))}
            {friends.length > 4 && (
              <div className="w-10 h-10 rounded-full border-2 border-card bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                +{friends.length - 4}
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search friends…"
            className="w-full bg-card border border-border rounded-2xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 card-shadow" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>}
        </div>
      </div>

      {/* Friends list */}
      <div className="px-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-blue-500/10 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-blue-500/40" />
            </div>
            <p className="text-base font-bold mb-1">
              {search ? "No friends found" : "No friends yet"}
            </p>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              {search ? "Try a different search term" : "Add friends to split expenses and track shared costs"}
            </p>
          </div>
        ) : (
          <div className="rounded-3xl overflow-hidden card-shadow border border-border bg-card divide-y divide-border mb-6">
            <AnimatePresence>
              {filtered.map((friend) => (
                <motion.div key={friend.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 30 }}>
                  {deleteConfirm === friend.id ? (
                    <div className="flex items-center justify-between px-4 py-4 bg-destructive/5">
                      <p className="text-sm font-medium text-destructive">Remove this friend?</p>
                      <div className="flex gap-2">
                        <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted">Cancel</button>
                        <button onClick={() => handleRemove(friend.id, friend.friend_id)} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-destructive text-white">Remove</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center px-4 py-3.5 gap-3 group active:bg-muted/30 transition-colors">
                      {friend.profiles.avatar_url ? (
                        <img src={friend.profiles.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${colorFor(friend.friend_id)}`}>
                          {initials(friend.profiles.full_name, friend.profiles.email)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{friend.profiles.full_name || "Unnamed User"}</p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <Mail className="w-3 h-3 shrink-0" />{friend.profiles.email}
                        </p>
                      </div>
                      <button onClick={() => setDeleteConfirm(friend.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* FAB */}
      <button onClick={() => { setEmail(""); setStatus(null); setSheetOpen(true); }}
        id="fab-add-friend"
        className="fixed bottom-24 right-5 md:bottom-8 w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center fab-glow z-30 active:scale-90 transition-transform shadow-xl">
        <UserPlus className="w-6 h-6" />
      </button>

      {/* Bottom Sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setSheetOpen(false)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bottom-sheet bg-card pb-safe"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <div className="px-5 pb-6">
                <div className="flex items-center justify-between mb-5 mt-2">
                  <h3 className="text-lg font-bold">Add a Friend</h3>
                  <button onClick={() => setSheetOpen(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <p className="text-sm text-muted-foreground mb-4">Enter their email address. If they're not on Expense Tracker yet, we'll send an invite.</p>

                <form onSubmit={handleAddFriend} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="email" id="friend-email" placeholder="friend@example.com"
                      value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full bg-background border border-border rounded-2xl pl-10 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                      required />
                  </div>

                  {status && (
                    <div className={`text-sm px-4 py-3 rounded-2xl font-medium ${status.type === "error" ? "text-destructive bg-destructive/10" : "text-emerald-500 bg-emerald-500/10"}`}>
                      {status.msg}
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full bg-primary text-white font-bold py-4 rounded-2xl fab-glow disabled:opacity-60 active:scale-[0.98] transition-all">
                    {loading ? "Searching…" : "Add Friend"}
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
