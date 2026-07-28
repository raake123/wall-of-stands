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
  Flag,
  EyeOff,
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
  const [reports, setReports] = useState([]);
  const [reportBusy, setReportBusy] = useState(null);

  useEffect(() => {
    if (profile?.is_admin) {
      load();
      loadReports();
    }
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

  async function loadReports() {
    const { data } = await supabase.rpc("open_reports");
    setReports(data || []);
  }

  // Hiding takes it off the wall for everyone but its author; dismissing says
  // the report was looked at and the content stays. Either way the report is
  // closed, which is what the IT Rules ask for — that complaints get answered.
  async function actOnReport(r, hide) {
    setReportBusy(r.report_id);
    if (hide) {
      const patch = { hidden_at: new Date().toISOString(), hidden_reason: r.reason };
      await supabase
        .from(r.kind === "stand" ? "stands" : "voices")
        .update(patch)
        .eq("id", r.target_id);
    }
    await supabase
      .from("reports")
      .update({ handled_at: new Date().toISOString() })
      .eq("id", r.report_id);
    setReportBusy(null);
    loadReports();
  }

  async function unhide(r) {
    setReportBusy(r.report_id);
    await supabase
      .from(r.kind === "stand" ? "stands" : "voices")
      .update({ hidden_at: null, hidden_reason: null })
      .eq("id", r.target_id);
    await supabase
      .from("reports")
      .update({ handled_at: new Date().toISOString() })
      .eq("id", r.report_id);
    setReportBusy(null);
    loadReports();
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

        {reports.length > 0 && (
          <div className="mb-6">
            <p
              className="text-xs font-black uppercase tracking-wide mb-1 flex items-center gap-1.5"
              style={{ color: RED }}
            >
              <Flag size={13} />
              Reported ({reports.length})
            </p>
            <p className="text-[11px] mb-3" style={{ color: MUTED }}>
              Every report has to get an answer. Hiding takes it off the wall for
              everyone except the person who posted it.
            </p>

            {reports.map((r) => (
              <div
                key={r.report_id}
                className="rounded-lg p-3 mb-3"
                style={{ backgroundColor: CARD, border: "1.5px solid " + RED }}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                    style={{ border: "1px solid " + MUTED, color: MUTED }}
                  >
                    {r.kind}
                  </span>
                  {r.report_count > 1 && (
                    <span className="text-[10px] font-black" style={{ color: RED }}>
                      {r.report_count} people reported this
                    </span>
                  )}
                </div>

                {r.headline && (
                  <p
                    className="text-sm font-bold mb-1"
                    style={{ color: WHITE, wordBreak: "break-word" }}
                  >
                    {r.headline}
                  </p>
                )}
                {r.audio_url && <audio src={r.audio_url} controls className="w-full mb-2" />}

                <p className="text-xs mb-1" style={{ color: RED, wordBreak: "break-word" }}>
                  {r.reason}
                </p>
                <p className="text-[10px] mb-2" style={{ color: MUTED }}>
                  Reported by {r.reporter} · {formatWhen(r.created_at)}
                  {r.hidden ? " · already hidden" : ""}
                </p>

                <div className="flex gap-2 items-center">
                  <Link
                    href={`/stand/${r.stand_id}`}
                    className="text-[11px] font-bold"
                    style={{ color: GOLD }}
                  >
                    Open
                  </Link>
                  <button
                    onClick={() => actOnReport(r, false)}
                    disabled={reportBusy === r.report_id}
                    className="flex-1 py-1.5 rounded-full text-[11px] font-black uppercase disabled:opacity-40"
                    style={{ border: "1.5px solid " + BORDER, color: MUTED }}
                  >
                    Leave it up
                  </button>
                  {r.hidden ? (
                    <button
                      onClick={() => unhide(r)}
                      disabled={reportBusy === r.report_id}
                      className="flex-1 py-1.5 rounded-full text-[11px] font-black uppercase disabled:opacity-40"
                      style={{ backgroundColor: GREEN, color: "#04240f" }}
                    >
                      Put it back
                    </button>
                  ) : (
                    <button
                      onClick={() => actOnReport(r, true)}
                      disabled={reportBusy === r.report_id}
                      className="flex-1 py-1.5 rounded-full text-[11px] font-black uppercase disabled:opacity-40 flex items-center justify-center gap-1"
                      style={{ backgroundColor: RED, color: "#fff" }}
                    >
                      {reportBusy === r.report_id ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <EyeOff size={11} />
                      )}
                      Hide
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

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
