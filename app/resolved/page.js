"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Hourglass, CircleDashed, Trophy } from "lucide-react";
import { FEED_PAGE_SIZE } from "../lib/limits";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/theme-context";
import AppChrome from "../components/AppChrome";
import StandCard, { formatWhen } from "../components/StandCard";

function daysBetween(a, b) {
  if (!a || !b) return null;
  const ms = new Date(b) - new Date(a);
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.round(ms / 86400000));
}

function ResolvedBoard() {
  const { colors } = useTheme();
  const { RED, GOLD, GREEN, WHITE, CARD, BORDER, MUTED } = colors;

  const [resolved, setResolved] = useState([]);
  const [inProgress, setInProgress] = useState([]);
  const [counts, setCounts] = useState({
    total: 0, resolved: 0, inProgress: 0, notStarted: 0,
    resolvedSupporters: 0, avgDays: null,
  });
  const [voiceCounts, setVoiceCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    load();
  }, []);

  // The headline percentages come from count queries rather than from loading
  // every stand — the board only needs the resolved ones as actual rows.
  async function load() {
    setLoading(true);

    const { data: totalRows } = await supabase.rpc("wall_totals");
    const t = totalRows?.[0];
    setCounts({
      total: Number(t?.filed) || 0,
      resolved: Number(t?.resolved) || 0,
      inProgress: Number(t?.in_progress) || 0,
      notStarted: Number(t?.not_started) || 0,
      resolvedSupporters: Number(t?.resolved_supporters) || 0,
      avgDays: t?.avg_resolve_days === null || t?.avg_resolve_days === undefined
        ? null
        : Number(t.avg_resolve_days),
    });

    const { data: resolvedRows } = await supabase
      .from("stands")
      .select("*")
      .not("resolved_at", "is", null)
      .order("resolved_at", { ascending: false })
      .limit(FEED_PAGE_SIZE);
    setResolved(resolvedRows || []);

    const { data: progRows } = await supabase
      .from("stands")
      .select("*")
      .is("resolved_at", null)
      .gt("progress", 0)
      .order("progress", { ascending: false })
      .limit(FEED_PAGE_SIZE);
    setInProgress(progRows || []);

    const ids = [...(resolvedRows || []), ...(progRows || [])].map((s) => s.id);
    if (ids.length) {
      const { data: vc } = await supabase.rpc("voice_counts", { p_ids: ids });
      const map = {};
      (vc || []).forEach((r) => {
        map[r.stand_id] = Number(r.n);
      });
      setVoiceCounts(map);
    }

    const { count: members } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "verified");
    setMemberCount(members || 0);
    setLoading(false);
  }

  const total = counts.total;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
  const resolvedPct = pct(counts.resolved);

  // Both come from the whole table, not just the resolved stands on screen.
  const supportersFreed = counts.resolvedSupporters;
  const avgDays = counts.avgDays;

  const segments = [
    { label: "Resolved", n: counts.resolved, color: GREEN, Icon: CheckCircle2 },
    { label: "In progress", n: counts.inProgress, color: GOLD, Icon: Hourglass },
    { label: "Not started", n: counts.notStarted, color: RED, Icon: CircleDashed },
  ];

  if (loading) {
    return (
      <p className="text-sm text-center py-10 flex items-center justify-center gap-2" style={{ color: MUTED }}>
        <Loader2 size={14} className="animate-spin" />
        Loading outcomes...
      </p>
    );
  }

  return (
    <>
      <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: CARD, border: "1px solid " + BORDER }}>
        <p className="text-[10px] font-black uppercase tracking-wide mb-1" style={{ color: MUTED }}>
          Of every stand filed
        </p>
        <p className="text-4xl font-black mb-1" style={{ color: GREEN }}>
          {resolvedPct}%
        </p>
        <p className="text-xs mb-4" style={{ color: MUTED }}>
          {counts.resolved} of {total} {total === 1 ? "stand has" : "stands have"} been resolved
        </p>

        <div className="flex h-2.5 rounded-full overflow-hidden mb-3" style={{ backgroundColor: BORDER }}>
          {segments.map(
            (seg) =>
              seg.n > 0 && (
                <div
                  key={seg.label}
                  style={{ width: pct(seg.n) + "%", backgroundColor: seg.color }}
                  title={`${seg.label}: ${seg.n}`}
                />
              )
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          {segments.map((seg) => {
            const SIcon = seg.Icon;
            return (
              <div key={seg.label} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5" style={{ color: MUTED }}>
                  <SIcon size={13} style={{ color: seg.color }} />
                  {seg.label}
                </span>
                <span className="font-black" style={{ color: seg.color }}>
                  {seg.n} <span style={{ color: MUTED, fontWeight: 400 }}>· {pct(seg.n)}%</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 mb-5">
        <div
          className="flex-1 rounded-lg p-3 text-center"
          style={{ backgroundColor: CARD, border: "1px solid " + BORDER }}
        >
          <p className="text-lg font-black" style={{ color: GOLD }}>{supportersFreed}</p>
          <p className="text-[10px] uppercase tracking-wide leading-tight" style={{ color: MUTED }}>
            People behind resolved stands
          </p>
        </div>
        <div
          className="flex-1 rounded-lg p-3 text-center"
          style={{ backgroundColor: CARD, border: "1px solid " + BORDER }}
        >
          <p className="text-lg font-black" style={{ color: GREEN }}>
            {avgDays === null ? "—" : avgDays}
          </p>
          <p className="text-[10px] uppercase tracking-wide leading-tight" style={{ color: MUTED }}>
            Avg days to resolve
          </p>
        </div>
      </div>

      <p className="text-xs font-black uppercase tracking-wide mb-3" style={{ color: MUTED }}>
        Resolved stands ({counts.resolved})
      </p>

      {resolved.length === 0 ? (
        <div className="text-center py-12">
          <Trophy size={30} color={BORDER} className="mx-auto mb-3" />
          <p className="text-sm" style={{ color: MUTED }}>Nothing resolved yet.</p>
          <p className="text-xs mt-1" style={{ color: BORDER }}>
            When an issue gets fixed, the owner marks it here.
          </p>
        </div>
      ) : (
        resolved.map((s) => {
          const took = daysBetween(s.created_at, s.resolved_at);
          return (
            <div key={s.id}>
              <div
                className="flex items-center justify-between text-[11px] px-1 mb-1 font-bold"
                style={{ color: GREEN }}
              >
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Resolved {formatWhen(s.resolved_at)}
                </span>
                {took !== null && (
                  <span style={{ color: MUTED }}>
                    took {took} {took === 1 ? "day" : "days"}
                  </span>
                )}
              </div>
              <StandCard stand={s} memberCount={memberCount} voiceCount={voiceCounts[s.id] || 0} />
            </div>
          );
        })
      )}

      {inProgress.length > 0 && (
        <>
          <p className="text-xs font-black uppercase tracking-wide mb-3 mt-6" style={{ color: MUTED }}>
            Moving, not finished ({counts.inProgress})
          </p>
          {inProgress.map((s) => (
            <StandCard key={s.id} stand={s} memberCount={memberCount} voiceCount={voiceCounts[s.id] || 0} />
          ))}
        </>
      )}

      <Link
        href="/"
        className="block text-center text-xs font-bold py-3 mt-2"
        style={{ color: GOLD }}
      >
        Back to ongoing stands
      </Link>
    </>
  );
}

export default function ResolvedPage() {
  return (
    <AppChrome>
      <ResolvedBoard />
    </AppChrome>
  );
}
