"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  MapPin,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/theme-context";
import { useAuth } from "../lib/auth-context";
import { detectLocation, formatLocation, emptyLocation, hasLocation } from "../lib/location";

const NOTE_LIMIT = 300;

export default function VerifyPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { RED, GOLD, GREEN, WHITE, BG, CARD, CARD_ALT, BORDER, MUTED } = colors;
  const { session, profile, loading, refreshProfile } = useAuth();

  const [note, setNote] = useState("");
  const [gps, setGps] = useState(emptyLocation());
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !session) router.push("/");
  }, [loading, session]);

  useEffect(() => {
    if (profile) {
      setNote(profile.join_note || "");
      if (profile.home_area || profile.home_city) {
        setGps({
          area: profile.home_area || "",
          city: profile.home_city || "",
          state: profile.home_state || "",
          country: profile.home_country || "",
        });
      }
    }
  }, [profile]);

  const status = profile?.verification_status || "unverified";
  const gpsText = formatLocation(gps);

  async function useMyLocation() {
    setError("");
    setLocating(true);
    try {
      setGps(await detectLocation());
    } catch (e) {
      setError(e.message);
    }
    setLocating(false);
  }

  async function submit() {
    if (!hasLocation(gps)) return;
    setSubmitting(true);
    setError("");
    const { error: upErr } = await supabase
      .from("profiles")
      .update({
        home_area: gps.area || null,
        home_city: gps.city || null,
        home_state: gps.state || null,
        home_country: gps.country || null,
        home_location: gpsText || null,
        join_note: note.trim() || null,
        verification_status: "pending",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", session.user.id);
    if (upErr) setError(upErr.message);
    else await refreshProfile();
    setSubmitting(false);
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BG }}>
        <p style={{ color: MUTED }}>Loading...</p>
      </div>
    );
  }

  const banner =
    status === "verified"
      ? {
          Icon: CheckCircle2,
          color: GREEN,
          title: "You're in",
          body: "You can file stands, stand with others, and speak out.",
        }
      : status === "pending"
      ? {
          Icon: Clock,
          color: GOLD,
          title: "Waiting for approval",
          body: "A reviewer will check your request. You can read the wall meanwhile.",
        }
      : status === "rejected"
      ? {
          Icon: AlertTriangle,
          color: RED,
          title: "Not approved",
          body: profile.reject_reason || "Your request wasn't approved. You can ask again below.",
        }
      : null;

  const showForm = status === "unverified" || status === "rejected";
  const canSubmit = hasLocation(gps) && !submitting;

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG }}>
      <div className="max-w-md mx-auto px-4 py-6">
        <Link href="/" className="text-sm mb-5 inline-flex items-center gap-1 font-bold" style={{ color: MUTED }}>
          ← Back to the wall
        </Link>

        <h1 className="text-2xl font-black uppercase tracking-tight mb-1" style={{ color: WHITE }}>
          Ask to <span style={{ color: RED }}>join</span>
        </h1>
        <p className="text-sm mb-5" style={{ color: MUTED }}>
          A stand only carries weight if the people behind it are real residents.
          Every account is approved by a reviewer before it can file a stand or
          stand with one.
        </p>

        {banner && (
          <div
            className="rounded-lg p-4 mb-5 flex items-start gap-3"
            style={{ border: "1.5px solid " + banner.color, backgroundColor: CARD }}
          >
            <banner.Icon size={18} style={{ color: banner.color }} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-sm mb-0.5" style={{ color: banner.color }}>{banner.title}</p>
              <p className="text-xs" style={{ color: MUTED }}>{banner.body}</p>
            </div>
          </div>
        )}

        {showForm && (
          <>
            <div
              className="rounded-lg p-3 mb-5 text-xs flex items-start gap-2"
              style={{ border: "1px solid " + GREEN, color: GREEN, backgroundColor: CARD }}
            >
              <ShieldCheck size={15} className="flex-shrink-0 mt-0.5" />
              <span>
                We don't ask for Aadhaar, any ID document, or a photo of you.
                Only your name, your area, and an optional note.
              </span>
            </div>

            <p className="text-[10px] font-black uppercase tracking-wide mb-2" style={{ color: MUTED }}>
              1 — Your area
            </p>
            <button
              onClick={useMyLocation}
              disabled={locating}
              className="w-full py-3 rounded-lg mb-2 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-wide disabled:opacity-50"
              style={{
                border: "1.5px solid " + (gpsText ? GOLD : BORDER),
                color: gpsText ? "#1a1400" : WHITE,
                backgroundColor: gpsText ? GOLD : CARD_ALT,
              }}
            >
              {locating ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
              {gpsText ? "Location captured — refresh" : "Use my location"}
            </button>
            {gpsText && (
              <p className="text-xs mb-4" style={{ color: GOLD, wordBreak: "break-word" }}>
                {gpsText}
              </p>
            )}

            <p className="text-[10px] font-black uppercase tracking-wide mb-2 mt-4" style={{ color: MUTED }}>
              2 — Anything the reviewer should know (optional)
            </p>
            <textarea
              className="w-full p-3 rounded-lg mb-4 text-sm"
              style={{ backgroundColor: CARD, border: "1px solid " + BORDER, color: WHITE, minHeight: 80 }}
              placeholder="e.g. I live on Ayapakkam Main Road, near the school."
              value={note}
              maxLength={NOTE_LIMIT}
              onChange={(e) => setNote(e.target.value)}
            />

            {error && (
              <div
                className="text-xs p-3 rounded mb-4"
                style={{ border: "1.5px solid " + RED, color: RED, wordBreak: "break-word" }}
              >
                {error}
              </div>
            )}

            <button
              onClick={submit}
              disabled={!canSubmit}
              className="w-full p-3.5 rounded-full font-black uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ backgroundColor: RED, color: "#fff" }}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              {submitting ? "Sending..." : "Ask to join"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
