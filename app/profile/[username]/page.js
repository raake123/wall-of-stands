"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LogOut, MapPin, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme-context";
import { useAuth } from "../../lib/auth-context";
import {
  detectLocation,
  formatLocation,
  emptyLocation,
  hasLocation,
} from "../../lib/location";

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { colors } = useTheme();
  const { RED, GOLD, GREEN, WHITE, BG, CARD, BORDER, MUTED } = colors;
  const { session, refreshProfile, logout } = useAuth();

  const [profile, setProfile] = useState(null);
  const [stands, setStands] = useState([]);
  const [notFound, setNotFound] = useState(false);

  const [editingLoc, setEditingLoc] = useState(false);
  const [home, setHome] = useState(emptyLocation());
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const [savingLoc, setSavingLoc] = useState(false);

  useEffect(() => {
    load();
  }, [params.username, session]);

  async function load() {
    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", params.username)
      .maybeSingle();
    if (!p) {
      setNotFound(true);
      return;
    }
    setProfile(p);
    setHome({
      area: p.home_area || "",
      city: p.home_city || "",
      state: p.home_state || "",
      country: p.home_country || "",
    });
    const { data: s } = await supabase
      .from("stands")
      .select("*")
      .eq("user_id", p.id)
      .order("created_at", { ascending: false });
    setStands(s || []);
  }

  async function handleDetect() {
    setLocError("");
    setLocating(true);
    try {
      setHome(await detectLocation());
    } catch (e) {
      setLocError(e.message);
    }
    setLocating(false);
  }

  async function saveLocation() {
    setSavingLoc(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        home_area: home.area.trim() || null,
        home_city: home.city.trim() || null,
        home_state: home.state.trim() || null,
        home_country: home.country.trim() || null,
        home_location: formatLocation(home) || null,
      })
      .eq("id", profile.id);
    setSavingLoc(false);
    if (!error) {
      setEditingLoc(false);
      await load();
      await refreshProfile();
    } else {
      setLocError(error.message);
    }
  }

  async function handleLogOut() {
    await logout();
    router.push("/");
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG }}>
        <div className="text-center">
          <p className="mb-3" style={{ color: MUTED }}>No such profile.</p>
          <Link href="/" className="text-sm font-bold" style={{ color: GOLD }}>Back to the wall</Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BG }}>
        <p style={{ color: MUTED }}>Loading...</p>
      </div>
    );
  }

  const isMe = session?.user?.id === profile.id;
  const totalSupporters = stands.reduce((sum, s) => sum + (s.support_count || 0), 0);
  const resolvedCount = stands.filter((s) => s.resolved_at).length;
  const initial = profile.name.charAt(0).toUpperCase();
  const savedLoc = {
    area: profile.home_area || "",
    city: profile.home_city || "",
    state: profile.home_state || "",
    country: profile.home_country || "",
  };
  const savedLocText = formatLocation(savedLoc) || profile.home_location || "";
  const inputStyle = { backgroundColor: BG, border: "1px solid " + BORDER, color: WHITE };

  return (
    <div className="min-h-screen pb-10" style={{ backgroundColor: BG }}>
      <div className="max-w-md mx-auto px-4 py-6">
        <Link
          href="/"
          className="text-sm mb-4 inline-flex items-center gap-1 font-bold"
          style={{ color: MUTED }}
        >
          <ArrowLeft size={14} />
          Back to the wall
        </Link>

        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black flex-shrink-0"
            style={{ backgroundColor: GOLD, color: "#1a1400" }}
          >
            {initial}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black uppercase tracking-tight truncate" style={{ color: WHITE }}>
              {profile.name}
            </h1>
            <p className="text-sm truncate" style={{ color: MUTED }}>@{profile.username}</p>
          </div>
        </div>

        {(profile.causes || []).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {profile.causes.map((c) => (
              <span
                key={c}
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ border: "1px solid " + GOLD, color: GOLD }}
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Home area — decides whether this person counts as inside an issue's area */}
        <div className="rounded-lg p-4 mb-5" style={{ backgroundColor: CARD, border: "1px solid " + BORDER }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: MUTED }}>
              Stands from
            </p>
            {isMe && !editingLoc && (
              <button onClick={() => setEditingLoc(true)} className="text-xs font-bold" style={{ color: GOLD }}>
                {hasLocation(savedLoc) ? "Edit" : "Set area"}
              </button>
            )}
          </div>

          {editingLoc ? (
            <>
              <button
                onClick={handleDetect}
                disabled={locating}
                className="w-full py-2 rounded-full mb-3 flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-wide disabled:opacity-50"
                style={{ border: "1.5px solid " + GOLD, color: GOLD }}
              >
                {locating ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
                {locating ? "Detecting..." : "Use my current location"}
              </button>
              {[
                { key: "area", ph: "Area / neighbourhood" },
                { key: "city", ph: "City / district" },
                { key: "state", ph: "State" },
                { key: "country", ph: "Country" },
              ].map((f) => (
                <input
                  key={f.key}
                  className="w-full p-2.5 rounded mb-2 text-sm"
                  style={inputStyle}
                  placeholder={f.ph}
                  value={home[f.key]}
                  maxLength={80}
                  onChange={(e) => setHome({ ...home, [f.key]: e.target.value })}
                />
              ))}
              {locError && <p className="text-xs mb-2" style={{ color: RED }}>{locError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setHome(savedLoc);
                    setEditingLoc(false);
                    setLocError("");
                  }}
                  className="px-4 py-2 rounded-full text-xs font-bold"
                  style={{ border: "1px solid " + BORDER, color: MUTED }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveLocation}
                  disabled={savingLoc}
                  className="flex-1 py-2 rounded-full text-xs font-black uppercase disabled:opacity-50"
                  style={{ backgroundColor: GOLD, color: "#1a1400" }}
                >
                  {savingLoc ? "Saving..." : "Save area"}
                </button>
              </div>
            </>
          ) : savedLocText ? (
            <p
              className="text-sm flex items-start gap-1.5"
              style={{ color: WHITE, wordBreak: "break-word" }}
            >
              <MapPin size={14} className="flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
              {savedLocText}
            </p>
          ) : (
            <p className="text-xs" style={{ color: MUTED }}>
              {isMe
                ? "No area set yet. Add it so your support counts as coming from inside the affected area."
                : "This person hasn't set their area."}
            </p>
          )}
        </div>

        <div
          className="flex rounded-lg mb-6 overflow-hidden"
          style={{ backgroundColor: CARD, border: "1px solid " + BORDER }}
        >
          {[
            { v: stands.length, l: "Stands filed", c: RED },
            { v: totalSupporters, l: "Total supporters", c: GOLD },
            { v: resolvedCount, l: "Resolved", c: GREEN },
          ].map((x, i) => (
            <div
              key={x.l}
              className="flex-1 text-center px-2 py-3"
              style={i > 0 ? { borderLeft: "1px solid " + BORDER } : undefined}
            >
              <p className="text-lg font-black" style={{ color: x.c }}>{x.v}</p>
              <p className="text-[10px] uppercase tracking-wide leading-tight" style={{ color: MUTED }}>
                {x.l}
              </p>
            </div>
          ))}
        </div>

        {stands.length === 0 && (
          <p className="text-sm text-center py-10" style={{ color: MUTED }}>
            No stands filed yet.
          </p>
        )}

        {stands.map((s) => (
          <Link
            key={s.id}
            href={`/stand/${s.id}`}
            className="block rounded-lg p-4 mb-3"
            style={{
              backgroundColor: CARD,
              border: "1px solid " + BORDER,
              borderLeft: "4px solid " + (s.resolved_at ? GREEN : BORDER),
            }}
          >
            <p
              className="mb-2 font-medium"
              style={{ color: WHITE, wordBreak: "break-word", overflowWrap: "anywhere" }}
            >
              {s.text}
            </p>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold" style={{ color: GOLD }}>
                {s.support_count} standing with this
              </p>
              {s.resolved_at && (
                <span className="text-[10px] font-black uppercase flex items-center gap-1" style={{ color: GREEN }}>
                  <CheckCircle2 size={11} /> Resolved
                </span>
              )}
            </div>
          </Link>
        ))}

        {isMe && (
          <button
            onClick={handleLogOut}
            className="w-full py-3 rounded-full mt-6 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wide"
            style={{ border: "1.5px solid " + BORDER, color: MUTED }}
          >
            <LogOut size={14} />
            Log out
          </button>
        )}
      </div>
    </div>
  );
}
