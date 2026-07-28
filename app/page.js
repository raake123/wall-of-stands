"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Flame, TrendingUp, Sparkles, MapPin, Loader2, ChevronDown } from "lucide-react";
import { FEED_PAGE_SIZE } from "./lib/limits";
import { supabase } from "./lib/supabase";
import { useTheme } from "./lib/theme-context";
import { useAuth } from "./lib/auth-context";
import { CAUSES } from "./lib/causes";
import { isInsideArea, locOf, hasLocation } from "./lib/location";
import AppChrome from "./components/AppChrome";
import StatsRow from "./components/StatsRow";
import StandCard from "./components/StandCard";

function OngoingWall() {
  const router = useRouter();
  const { colors } = useTheme();
  const { RED, GOLD, WHITE, BG, CARD, BORDER, MUTED } = colors;
  const { session, profile, approved, loading: authLoading } = useAuth();

  const [stands, setStands] = useState([]);
  const [loadingStands, setLoadingStands] = useState(true);
  const [mySupports, setMySupports] = useState([]);
  const [filter, setFilter] = useState("All");
  const [sortMode, setSortMode] = useState("new");
  const [burstId, setBurstId] = useState(null);
  const [voiceCounts, setVoiceCounts] = useState({});
  const [memberCount, setMemberCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totals, setTotals] = useState({ filed: 0, supporters: 0, resolved: 0 });

  useEffect(() => {
    loadStands();
    loadResidentCount();
    loadTotals();
  }, []);

  // Counted across the whole wall, not just the page on screen.
  async function loadTotals() {
    const { data } = await supabase.rpc("wall_totals");
    const t = data?.[0];
    if (t) {
      setTotals({
        filed: Number(t.filed) || 0,
        supporters: Number(t.supporters) || 0,
        resolved: Number(t.resolved) || 0,
      });
    }
  }

  useEffect(() => {
    if (session) loadMySupports();
  }, [session]);

  useEffect(() => {
    if (!authLoading && session && !profile) router.push("/onboarding");
  }, [authLoading, session, profile]);

  // A page at a time. Loading the whole wall on every visit would burn the
  // free bandwidth allowance long before the database ever filled up.
  async function loadStands(offset = 0) {
    if (offset === 0) setLoadingStands(true);
    else setLoadingMore(true);

    const { data } = await supabase
      .from("stands")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + FEED_PAGE_SIZE - 1);

    const batch = data || [];
    setStands((prev) => (offset === 0 ? batch : [...prev, ...batch]));
    setHasMore(batch.length === FEED_PAGE_SIZE);
    loadVoiceCounts(batch.map((s) => s.id));
    setLoadingStands(false);
    setLoadingMore(false);
  }

  async function loadMySupports() {
    const { data } = await supabase
      .from("supports")
      .select("stand_id")
      .eq("user_id", session.user.id);
    setMySupports((data || []).map((s) => s.stand_id));
  }

  // Counts only, and only for the stands actually on screen — the old version
  // pulled every voice row in the database on every page load.
  async function loadVoiceCounts(ids) {
    if (!ids?.length) return;
    const { data } = await supabase.rpc("voice_counts", { p_ids: ids });
    setVoiceCounts((prev) => {
      const next = { ...prev };
      (data || []).forEach((r) => {
        next[r.stand_id] = Number(r.n);
      });
      return next;
    });
  }

  // The "strong" bar scales with how many approved members actually exist.
  async function loadResidentCount() {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "verified");
    setMemberCount(count || 0);
  }

  async function handleSupport(id) {
    if (!session || !approved || mySupports.includes(id)) return;
    setBurstId(id);
    setTimeout(() => setBurstId(null), 600);

    const stand = stands.find((s) => s.id === id);
    const me = {
      area: profile?.home_area || "",
      city: profile?.home_city || "",
      state: profile?.home_state || "",
      country: profile?.home_country || "",
    };
    const inside = isInsideArea(locOf(stand), me);

    const { error } = await supabase.from("supports").insert({
      stand_id: id,
      user_id: session.user.id,
      inside,
      area: me.area || null,
      city: me.city || null,
      state: me.state || null,
      country: me.country || null,
    });
    if (error) return;
    await supabase.rpc("increment_support", { stand_id_param: id, is_inside: inside });
    loadStands();
    loadMySupports();
    loadTotals();
  }

  const ongoing = stands.filter((s) => !s.resolved_at);

  const filtered = filter === "All" ? ongoing : ongoing.filter((s) => s.category === filter);
  const visibleStands =
    sortMode === "rising"
      ? [...filtered].sort((a, b) => (b.support_count || 0) - (a.support_count || 0))
      : filtered;

  const needsLocation = profile && !hasLocation({
    area: profile.home_area,
    city: profile.home_city,
    state: profile.home_state,
  });

  return (
    <>
      <StatsRow filed={totals.filed} supporters={totals.supporters} resolved={totals.resolved} />

      {needsLocation && (
        <Link
          href={`/profile/${profile.username}`}
          className="flex items-start gap-2 rounded-lg p-3 mb-4 text-xs"
          style={{ border: "1px solid " + GOLD, color: GOLD, backgroundColor: CARD }}
        >
          <MapPin size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            <b>Set your area</b> so your support counts as coming from inside the
            affected area. Tap here to add it.
          </span>
        </Link>
      )}

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setSortMode("new")}
          className="flex-1 py-2 rounded-full text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-1"
          style={
            sortMode === "new"
              ? { backgroundColor: GOLD, color: "#1a1400" }
              : { border: "1px solid " + BORDER, color: MUTED }
          }
        >
          <Sparkles size={12} />
          New
        </button>
        <button
          onClick={() => setSortMode("rising")}
          className="flex-1 py-2 rounded-full text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-1"
          style={
            sortMode === "rising"
              ? { backgroundColor: RED, color: "#fff" }
              : { border: "1px solid " + BORDER, color: MUTED }
          }
        >
          <TrendingUp size={12} />
          Rising
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
        <button
          onClick={() => setFilter("All")}
          className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold"
          style={
            filter === "All"
              ? { backgroundColor: WHITE, color: BG }
              : { border: "1px solid " + BORDER, color: MUTED }
          }
        >
          All
        </button>
        {CAUSES.map((c) => (
          <button
            key={c.name}
            onClick={() => setFilter(c.name)}
            className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold"
            style={
              filter === c.name
                ? { backgroundColor: c.color, color: "#0a0a0a" }
                : { border: "1px solid " + BORDER, color: MUTED }
            }
          >
            {c.name}
          </button>
        ))}
      </div>

      {loadingStands && (
        <p className="text-sm text-center py-10" style={{ color: MUTED }}>
          Loading the wall...
        </p>
      )}

      {!loadingStands && visibleStands.length === 0 && (
        <div className="text-center py-14">
          <Flame size={32} color={BORDER} className="mx-auto mb-3" />
          <p className="text-sm" style={{ color: MUTED }}>No ongoing stands here yet.</p>
          <Link href="/create" className="text-xs mt-2 inline-block font-bold" style={{ color: GOLD }}>
            Be the first — create a stand
          </Link>
        </div>
      )}

      {visibleStands.map((s) => (
        <StandCard
          key={s.id}
          stand={s}
          memberCount={memberCount}
          supported={mySupports.includes(s.id)}
          onSupport={approved ? handleSupport : undefined}
          bursting={burstId === s.id}
          voiceCount={voiceCounts[s.id] || 0}
        />
      ))}

      {hasMore && !loadingStands && (
        <button
          onClick={() => loadStands(stands.length)}
          disabled={loadingMore}
          className="w-full py-3 rounded-full text-xs font-black uppercase tracking-wide flex items-center justify-center gap-1.5 disabled:opacity-50"
          style={{ border: "1.5px solid " + BORDER, color: GOLD }}
        >
          {loadingMore ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
          {loadingMore ? "Loading..." : "Show older stands"}
        </button>
      )}
    </>
  );
}

export default function Home() {
  return (
    <AppChrome>
      <OngoingWall />
    </AppChrome>
  );
}
