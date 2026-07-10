"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useRef, useState } from "react";
import { User } from "@supabase/supabase-js";
import { LogOut, ChevronDown, User as UserIcon } from "lucide-react";
import { cn } from "@/components/ui";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

export function UserMenu({ direction = "up" }: { direction?: "up" | "down" }) {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(({ data }) => setProfile(data));
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!user) return null;

  const name = profile?.full_name || user.email?.split("@")[0] || "User";
  const avatar = profile?.avatar_url;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 w-full p-2 rounded-xl hover:bg-white/5 transition-colors"
        id="user-menu-btn"
      >
        {avatar ? (
          <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-white" />
          </div>
        )}
        <div className="flex-1 text-left min-w-0 hidden md:block">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform hidden md:block", open && "rotate-180")} />
      </button>

      {open && (
        <div className={`absolute ${direction === "up" ? "bottom-full mb-2" : "top-full mt-2"} right-0 md:left-0 w-48 glass border border-white/10 rounded-xl overflow-hidden shadow-xl z-50`}>
          <div className="p-3 border-b border-white/5">
            <p className="text-sm font-medium truncate">{name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            id="signout-btn"
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
