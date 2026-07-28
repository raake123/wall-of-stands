"use client";

import { useState } from "react";
import { Flag, Loader2, Check } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/theme-context";
import { useAuth } from "../lib/auth-context";

const REASONS = [
  "Not true / made up",
  "Abusive or threatening",
  "Someone's private details",
  "Nothing to do with this area",
  "Spam or an advertisement",
];

/**
 * Reporting a stand or a voice. Pass exactly one of standId / voiceId.
 * A person can report a given thing once, so the count a reviewer sees is a
 * count of people rather than a count of taps.
 */
export default function ReportButton({ standId, voiceId, compact = false }) {
  const { colors } = useTheme();
  const { RED, GOLD, GREEN, WHITE, BG, CARD, BORDER, MUTED } = colors;
  const { session, approved } = useAuth();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!session || !approved) return null;

  async function submit() {
    if (!reason) return;
    setBusy(true);
    setError("");
    const { error: insErr } = await supabase.from("reports").insert({
      stand_id: standId || null,
      voice_id: voiceId || null,
      reporter_id: session.user.id,
      reason: note.trim() ? `${reason} — ${note.trim()}` : reason,
    });
    setBusy(false);
    if (insErr) {
      // The one-per-person index is doing its job; say so plainly.
      setError(
        insErr.code === "23505"
          ? "You've already reported this. A reviewer will look at it."
          : insErr.message
      );
      return;
    }
    setDone(true);
    setOpen(false);
  }

  if (done) {
    return (
      <span
        className="text-[11px] font-bold inline-flex items-center gap-1"
        style={{ color: GREEN }}
      >
        <Check size={12} /> Reported
      </span>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[11px] font-bold inline-flex items-center gap-1"
        style={{ color: MUTED }}
        aria-label="Report this"
      >
        <Flag size={compact ? 11 : 12} />
        {compact ? "" : "Report"}
      </button>
    );
  }

  return (
    <div className="rounded-lg p-3 mt-2" style={{ backgroundColor: BG, border: "1px solid " + BORDER }}>
      <p className="text-[10px] font-black uppercase tracking-wide mb-2" style={{ color: MUTED }}>
        What's wrong with this?
      </p>

      <div className="flex flex-col gap-1.5 mb-2">
        {REASONS.map((r) => (
          <button
            key={r}
            onClick={() => setReason(r)}
            className="text-left text-xs px-2.5 py-1.5 rounded"
            style={
              reason === r
                ? { backgroundColor: RED, color: "#fff", fontWeight: 700 }
                : { border: "1px solid " + BORDER, color: WHITE }
            }
          >
            {r}
          </button>
        ))}
      </div>

      <input
        className="w-full p-2 rounded mb-2 text-xs"
        style={{ backgroundColor: CARD, border: "1px solid " + BORDER, color: WHITE }}
        placeholder="Anything to add (optional)"
        value={note}
        maxLength={200}
        onChange={(e) => setNote(e.target.value)}
      />

      {error && (
        <p className="text-[11px] mb-2" style={{ color: GOLD, wordBreak: "break-word" }}>
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => {
            setOpen(false);
            setError("");
          }}
          className="px-3 py-1.5 rounded-full text-[11px] font-bold"
          style={{ border: "1px solid " + BORDER, color: MUTED }}
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!reason || busy}
          className="flex-1 py-1.5 rounded-full text-[11px] font-black uppercase disabled:opacity-40 flex items-center justify-center gap-1"
          style={{ backgroundColor: RED, color: "#fff" }}
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Flag size={12} />}
          Send report
        </button>
      </div>
    </div>
  );
}
