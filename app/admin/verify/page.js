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
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme-context";
import { useAuth } from "../../lib/auth-context";
import { addressMatchScore, matchVerdict } from "../../lib/address-match";
import { ABANDON_DAYS } from "../../lib/limits";

export default function AdminVerifyPage() {
  const { colors } = useTheme();
  const { RED, GOLD, GREEN, WHITE, BG, CARD, BORDER, MUTED } = colors;
  const { profile, loading } = useAuth();

  const [rows, setRows] = useState([]);
  const [urls, setUrls] = useState({});
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

    // Private bucket — the images are only reachable through short-lived links.
    const map = {};
    for (const r of data || []) {
      for (const [k, path] of [["doc", r.id_doc_path], ["selfie", r.selfie_path]]) {
        if (!path) continue;
        const { data: signed } = await supabase.storage
          .from("identity-docs")
          .createSignedUrl(path, 3600);
        if (signed?.signedUrl) map[`${r.id}-${k}`] = signed.signedUrl;
      }
    }
    setUrls(map);
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
    const { score } = addressMatchScore(row.id_address, row.home_location);
    const patch = approve
      ? {
          verification_status: "verified",
          address_match_score: score,
          reviewed_at: new Date().toISOString(),
          reject_reason: null,
          name: row.id_name || row.name,
        }
      : {
          verification_status: "rejected",
          address_match_score: score,
          reviewed_at: new Date().toISOString(),
          reject_reason: reasons[row.id]?.trim() || "Documents could not be verified.",
        };
    await supabase.from("profiles").update(patch).eq("id", row.id);
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
          Verification queue
        </h1>
        <p className="text-xs mb-5" style={{ color: MUTED }}>
          Check the selfie against the ID photo, and the typed details against the
          document. The address score is a hint, not a decision — people often live
          away from their registered address.
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
          {cleanMsg && (
            <p className="text-[11px] mt-2" style={{ color: GOLD }}>{cleanMsg}</p>
          )}
        </div>

        {loadingRows && (
          <p className="text-sm flex items-center gap-2" style={{ color: MUTED }}>
            <Loader2 size={14} className="animate-spin" /> Loading queue...
          </p>
        )}

        {!loadingRows && rows.length === 0 && (
          <div className="text-center py-14">
            <Clock size={30} color={BORDER} className="mx-auto mb-3" />
            <p className="text-sm" style={{ color: MUTED }}>Nothing waiting for review.</p>
          </div>
        )}

        {rows.map((r) => {
          const { score, reasons: why } = addressMatchScore(r.id_address, r.home_location);
          const verdict = matchVerdict(score);
          const tone = verdict.tone === "good" ? GREEN : verdict.tone === "warn" ? GOLD : RED;
          return (
            <div
              key={r.id}
              className="rounded-lg p-4 mb-5"
              style={{ backgroundColor: CARD, border: "1px solid " + BORDER }}
            >
              <p className="font-black" style={{ color: WHITE }}>{r.name}</p>
              <p className="text-xs mb-3" style={{ color: MUTED }}>@{r.username}</p>

              <div className="grid grid-cols-2 gap-2 mb-3">
                {[["doc", "ID document"], ["selfie", "Selfie"]].map(([k, label]) => (
                  <div key={k}>
                    <p className="text-[10px] font-black uppercase mb-1" style={{ color: MUTED }}>{label}</p>
                    {urls[`${r.id}-${k}`] ? (
                      <a href={urls[`${r.id}-${k}`]} target="_blank" rel="noreferrer">
                        <img
                          src={urls[`${r.id}-${k}`]}
                          alt={label}
                          className="w-full rounded"
                          style={{ height: 110, objectFit: "cover", border: "1px solid " + BORDER }}
                        />
                      </a>
                    ) : (
                      <div
                        className="w-full rounded flex items-center justify-center text-[10px]"
                        style={{ height: 110, border: "1px dashed " + BORDER, color: MUTED }}
                      >
                        missing
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-[10px] font-black uppercase" style={{ color: MUTED }}>Name on ID</p>
              <p className="text-sm mb-2" style={{ color: WHITE, wordBreak: "break-word" }}>{r.id_name || "—"}</p>

              <p className="text-[10px] font-black uppercase" style={{ color: MUTED }}>Address on ID</p>
              <p className="text-sm mb-2" style={{ color: WHITE, wordBreak: "break-word" }}>{r.id_address || "—"}</p>

              <p className="text-[10px] font-black uppercase" style={{ color: MUTED }}>Location at submission</p>
              <p className="text-sm mb-3 flex items-start gap-1" style={{ color: WHITE, wordBreak: "break-word" }}>
                <MapPin size={13} className="flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
                {r.home_location || "—"}
              </p>

              <div className="rounded p-3 mb-3" style={{ border: "1px solid " + tone }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase" style={{ color: MUTED }}>
                    Address similarity
                  </span>
                  <span className="text-sm font-black" style={{ color: tone }}>
                    {score}% · {verdict.label}
                  </span>
                </div>
                <p className="text-[11px]" style={{ color: MUTED }}>{why.join(" · ")}</p>
              </div>

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
          );
        })}
      </div>
    </div>
  );
}
