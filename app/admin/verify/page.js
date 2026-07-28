"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  MapPin,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme-context";
import { useAuth } from "../../lib/auth-context";
import { ABANDON_DAYS } from "../../lib/limits";

function formatWhen(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminVerifyPage() {
  const { colors } = useTheme();
  const { RED, GOLD, GREEN, WHITE, BG, CARD, BORDER, MUTED } = colors;
  const { profile, loading } = useAuth();

  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(null);
  const [reasons, setReasons] = useState({});
  const [loadingRows, setLoadingRows] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [cleanMsg, setCleanMsg] = useState("");

  useEffect(() => {
    if (profile?.is_admin) load();
  }, [profile]);

  async function load() {
    setLoadingRows(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("verification_status", "pending")
      .order("submitted_at", { ascending: true });
    setRows(data || []);
    setLoadingRows(false);
  }

  // Stands nobody joined and nobody spoke on are dead weight on the storage
  // quota. Files have to go through the Storage API, so the database only
  // reports what to clear and we do the deleting here.
  async function cleanupAbandoned() {
    setCleaning(true);
    setCleanMsg("");
    const { data, error } = await supabase.rpc("abandoned_stands");
    if (error) {
      setCleanMsg(error.message);
      setCleaning(false);
      return;
    }
    const dead = data || [];
    if (!dead.length) {
      setCleanMsg("Nothing to clean — no abandoned stands.");
      setCleaning(false);
      return;
    }
    const paths = dead.flatMap((r) => r.paths || []);
    if (paths.length) await supabase.storage.from("stand-media").remove(paths);
    const { error: delErr } = await supabase
      .from("stands")
      .delete()
      .in("id", dead.map((r) => r.id));
    setCleanMsg(
      delErr
        ? delErr.message
        : `Cleared ${dead.length} abandoned stand${dead.length === 1 ? "" : "s"} and ${paths.length} file${paths.length === 1 ? "" : "s"}.`
    );
    setCleaning(false);
  }

  async function decide(row, approve) {
    setBusy(row.id);
    await supabase
      .from("profiles")
      .update(
        approve
          ? {
              verification_status: "verified",
              reviewed_at: new Date().toISOString(),
              reject_reason: null,
            }
          : {
              verification_status: "rejected",
              reviewed_at: new Date().toISOString(),
              reject_reason: reasons[row.id]?.trim() || "Request not approved.",
            }
      )
      .eq("id", row.id);
    setBusy(null);
    load();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BG }}>
        <p style={{ color: MUTED }}>Loading...</p>
      </div>
    );
  }

  if (!profile?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG }}>
        <div className="text-center">
          <p className="mb-3" style={{ color: MUTED }}>This page is for reviewers only.</p>
          <Link href="/" className="text-sm font-bold" style={{ color: GOLD }}>Back to the wall</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG }}>
      <div className="max-w-md mx-auto px-4 py-6">
        <Link href="/" className="text-sm mb-5 inline-flex items-center gap-1 font-bold" style={{ color: MUTED }}>
          ← Back to the wall
        </Link>

        <h1 className="text-xl font-black uppercase tracking-tight mb-1 flex items-center gap-2" style={{ color: WHITE }}>
          <ShieldCheck size={20} style={{ color: GOLD }} />
          Join requests
        </h1>
        <p className="text-xs mb-5" style={{ color: MUTED }}>
          These are people with no invite code, so approving them is your
          judgement alone — no documents are collected. Approve the ones you can
          place as really living in the area. Anyone vouched for by a member is
          already in and never appears here.
        </p>

        <div className="rounded-lg p-3 mb-5" style={{ backgroundColor: CARD, border: "1px solid " + BORDER }}>
          <p className="text-[10px] font-black uppercase tracking-wide mb-1" style={{ color: MUTED }}>
            Storage cleanup
          </p>
          <p className="text-[11px] mb-2" style={{ color: MUTED }}>
            Removes stands with 2 or fewer supporters, no voices and no progress
            after {ABANDON_DAYS} days, and frees their files. Resolved stands and
            anything with traction are never touched.
          </p>
          <button
            onClick={cleanupAbandoned}
            disabled={cleaning}
            className="w-full py-2 rounded-full text-xs font-black uppercase flex items-center justify-center gap-1 disabled:opacity-50"
            style={{ border: "1.5px solid " + RED, color: RED }}
          >
            {cleaning ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Clear abandoned stands
          </button>
          {cleanMsg && <p className="text-[11px] mt-2" style={{ color: GOLD }}>{cleanMsg}</p>}
        </div>

        {loadingRows && (
          <p className="text-sm flex items-center gap-2" style={{ color: MUTED }}>
            <Loader2 size={14} className="animate-spin" /> Loading requests...
          </p>
        )}

        {!loadingRows && rows.length === 0 && (
          <div className="text-center py-14">
            <Clock size={30} color={BORDER} className="mx-auto mb-3" />
            <p className="text-sm" style={{ color: MUTED }}>No one waiting to join.</p>
          </div>
        )}

        {rows.map((r) => (
          <div
            key={r.id}
            className="rounded-lg p-4 mb-4"
            style={{ backgroundColor: CARD, border: "1px solid " + BORDER }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-black flex-shrink-0"
                style={{ backgroundColor: GOLD, color: "#1a1400" }}
              >
                {(r.name || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-black truncate" style={{ color: WHITE }}>{r.name}</p>
                <p className="text-xs truncate" style={{ color: MUTED }}>@{r.username}</p>
              </div>
            </div>

            <p className="text-sm flex items-start gap-1.5 mb-2" style={{ color: WHITE, wordBreak: "break-word" }}>
              <MapPin size={14} className="flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
              {r.home_location || "No area given"}
            </p>

            {r.join_note && (
              <p
                className="text-sm mb-2 p-2 rounded"
                style={{ color: WHITE, backgroundColor: BG, wordBreak: "break-word" }}
              >
                {r.join_note}
              </p>
            )}

            <p className="text-[11px] mb-3" style={{ color: MUTED }}>
              Asked {formatWhen(r.submitted_at)}
            </p>

            {r.invite_attempts >= 10 && (
              <p className="text-[11px] mb-3 flex items-start gap-1.5" style={{ color: RED }}>
                <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                Tried 10 wrong invite codes. Could be someone guessing their way
                in — worth being sure who this is.
              </p>
            )}

            <input
              className="w-full p-2.5 rounded mb-2 text-xs"
              style={{ backgroundColor: BG, border: "1px solid " + BORDER, color: WHITE }}
              placeholder="Reason (only needed when rejecting)"
              value={reasons[r.id] || ""}
              maxLength={200}
              onChange={(e) => setReasons({ ...reasons, [r.id]: e.target.value })}
            />

            <div className="flex gap-2">
              <button
                onClick={() => decide(r, false)}
                disabled={busy === r.id}
                className="flex-1 py-2 rounded-full text-xs font-black uppercase flex items-center justify-center gap-1 disabled:opacity-50"
                style={{ border: "1.5px solid " + RED, color: RED }}
              >
                <XCircle size={13} /> Reject
              </button>
              <button
                onClick={() => decide(r, true)}
                disabled={busy === r.id}
                className="flex-1 py-2 rounded-full text-xs font-black uppercase flex items-center justify-center gap-1 disabled:opacity-50"
                style={{ backgroundColor: GREEN, color: "#04240f" }}
              >
                {busy === r.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                Approve
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
