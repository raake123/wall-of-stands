"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Home as HomeIcon, User, LogOut } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme-context";

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { colors } = useTheme();
  const { RED, GOLD, WHITE, BG, CARD, BORDER, MUTED } = colors;

  const [profile, setProfile] = useState(null);
  const [stands, setStands] = useState([]);
  const [isMe, setIsMe] = useState(false);

  useEffect(() => {
    load();
  }, [params.username]);

  async function load() {
    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", params.username)
      .maybeSingle();
    if (!p) return;
    setProfile(p);
    const { data: session } = await supabase.auth.getSession();
    setIsMe(session?.session?.user?.id === p.id);
    const { data: s } = await supabase
      .from("stands")
      .select("*")
      .eq("user_id", p.id)
      .order("created_at", { ascending: false });
    setStands(s || []);
  }

  async function handleLogOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BG }}>
        <p style={{ color: MUTED }}>Loading...</p>
      </div>
    );
  }

  const totalSupporters = stands.reduce((sum, s) => sum + (s.support_count || 0), 0);
  const initial = profile.name.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: BG }}>
      <div className="max-w-md mx-auto px-4 py-6">
        <a
          href="/"
          className="text-sm mb-4 inline-flex items-center gap-1 font-bold"
          style={{ color: MUTED }}
        >
          <ArrowLeft size={14} />
          Back
        </a>

        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black flex-shrink-0"
            style={{ backgroundColor: GOLD, color: "#1a1400" }}
          >
            {initial}
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: WHITE }}>
              {profile.name}
            </h1>
            <p className="text-sm" style={{ color: MUTED }}>@{profile.username}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {(profile.causes || []).map((c) => (
            <span
              key={c}
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ border: "1px solid " + GOLD, color: GOLD }}
            >
              {c}
            </span>
          ))}
        </div>

        <div
          className="flex justify-between px-4 py-3 rounded-lg mb-6"
          style={{ backgroundColor: CARD, border: "1px solid " + BORDER }}
        >
          <div className="text-center flex-1">
            <p className="text-lg font-black" style={{ color: GOLD }}>{stands.length}</p>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>Stands filed</p>
          </div>
          <div className="text-center flex-1" style={{ borderLeft: "1px solid " + BORDER }}>
            <p className="text-lg font-black" style={{ color: RED }}>{totalSupporters}</p>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>Total supporters</p>
          </div>
        </div>

        {stands.length === 0 && (
          <p className="text-sm text-center py-10" style={{ color: MUTED }}>
            No stands filed yet.
          </p>
        )}

        {stands.map((s) => (
          <div
            key={s.id}
            className="rounded-lg p-4 mb-3"
            style={{ backgroundColor: CARD, border: "1px solid " + BORDER }}
          >
            <p
              className="mb-2 font-medium"
              style={{ color: WHITE, wordBreak: "break-word", overflowWrap: "anywhere" }}
            >
              {s.text}
            </p>
            <p className="text-xs font-bold" style={{ color: GOLD }}>
              {s.support_count} standing with this
            </p>
          </div>
        ))}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 flex justify-around py-3"
        style={{ backgroundColor: CARD, borderTop: "1px solid " + BORDER }}
      >
        <a href="/" className="flex flex-col items-center" style={{ color: MUTED }}>
          <HomeIcon size={20} />
          <span className="text-[10px] mt-1 font-bold">Wall</span>
        </a>
        <div className="flex flex-col items-center" style={{ color: RED }}>
          <User size={20} />
          <span className="text-[10px] mt-1 font-bold">Profile</span>
        </div>
        {isMe && (
          <button onClick={handleLogOut} className="flex flex-col items-center" style={{ color: MUTED }}>
            <LogOut size={20} />
            <span className="text-[10px] mt-1 font-bold">Log out</span>
          </button>
        )}
      </div>
    </div>
  );
}
