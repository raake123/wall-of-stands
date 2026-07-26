"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ProfilePage() {
  const params = useParams();
  const [profile, setProfile] = useState(null);
  const [stands, setStands] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", params.username)
      .maybeSingle();
    if (!p) return;
    setProfile(p);
    const { data: s } = await supabase
      .from("stands")
      .select("*")
      .eq("user_id", p.id)
      .order("created_at", { ascending: false });
    setStands(s || []);
  }

  if (!profile) {
    return <div className="min-h-screen bg-[#150f18] text-[#9b7fa3] p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#150f18] px-4 py-8">
      <div className="max-w-md mx-auto">
        <a href="/" className="text-[#c9a5d1] text-sm mb-4 inline-block">
          ← Back
        </a>
        <h1
          className="text-2xl italic font-bold text-[#f0e8d8]"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {profile.name}
        </h1>
        <p className="text-[#9b7fa3] mb-2">@{profile.username}</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {(profile.causes || []).map((c) => (
            <span
              key={c}
              className="bg-[#4a3620] text-[#d9a668] text-xs px-3 py-1 rounded-full"
            >
              {c}
            </span>
          ))}
        </div>
        {stands.map((s) => (
          <div key={s.id} className="bg-[#241b28] border border-[#3a2c40] p-4 mb-3">
            <p className="text-[#f0e8d8]" style={{ fontFamily: "Georgia, serif" }}>
              {s.text}
            </p>
            <p className="text-[#c9a5d1] text-xs mt-2">
              {s.support_count} standing with this
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}