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
  Ticket,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/theme-context";
import { useAuth } from "../lib/auth-context";
import { detectLocation, formatLocation, emptyLocation, hasLocation } from "../lib/location";

const NOTE_LIMIT = 300;
const CODE_LENGTH = 6;

// The database answers with a short code so the wording lives here, next to
// everything else the person reads.
const REDEEM_MESSAGES = {
  invalid: "That code doesn't match anyone. Check it with whoever gave it to you — your request has gone to a reviewer meanwhile.",
  used_up: "That member has used up their invites. Your request has gone to a reviewer instead.",
  self: "That's your own code — you can't invite yourself.",
  already: "You're already in.",
  locked: "Too many wrong codes have been tried on this account, so codes are switched off for it. A reviewer can still let you in.",
  noauth: "Your session expired. Log in again.",
};

export default function VerifyPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { RED, GOLD, GREEN, WHITE, BG, CARD, CARD_ALT, BORDER, MUTED } = colors;
  const { session, profile, loading, refreshProfile } = useAuth();

  const [note, setNote] = useState("");
  const [code, setCode] = useState("");
  const [gps, setGps] = useState(emptyLocation());
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [vouchedBy, setVouchedBy] = useState("");
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
    setCodeError("");

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

    if (upErr) {
      setError(upErr.message);
      setSubmitting(false);
      return;
    }

    // A valid code lets someone in on the spot. If it fails for any reason the
    // request simply stays with the reviewer, so nobody is left stuck.
    if (code.trim()) {
      const { data, error: rpcErr } = await supabase.rpc("redeem_invite", {
        p_code: code.trim(),
      });
      if (rpcErr) setCodeError(rpcErr.message);
      else if (typeof data === "string" && data.startsWith("ok:")) {
        setVouchedBy(data.slice(3));
      } else {
        setCodeError(REDEEM_MESSAGES[data] || "That code couldn't be used.");
      }
    }

    await refreshProfile();
    setSubmitting(false);
  }

  // Someone can be sitting in the review queue when a neighbour finally hands
  // them a code. No reason to make them wait it out.
  async function redeemOnly() {
    if (!code.trim()) return;
    setSubmitting(true);
    setCodeError("");
    const { data, error: rpcErr } = await supabase.rpc("redeem_invite", {
      p_code: code.trim(),
    });
    if (rpcErr) setCodeError(rpcErr.message);
    else if (typeof data === "string" && data.startsWith("ok:")) setVouchedBy(data.slice(3));
    else setCodeError(REDEEM_MESSAGES[data] || "That code couldn't be used.");
    await refreshProfile();
    setSubmitting(false);
  }

  const codeInput = (
    <input
      className="w-full p-3 rounded-lg text-lg font-black tracking-[0.3em] text-center uppercase"
      style={{ backgroundColor: CARD, border: "1.5px solid " + (code ? GOLD : BORDER), color: GOLD }}
      placeholder="······"
      value={code}
      maxLength={CODE_LENGTH}
      autoCapitalize="characters"
      autoCorrect="off"
      spellCheck={false}
      onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
    />
  );

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
          title: vouchedBy ? `You're in — ${vouchedBy} vouched for you` : "You're in",
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
          A stand only carries weight if the people behind it really live here.
          Every account is approved before it can file a stand or stand with one —
          either by a neighbour who vouches for you, or by a reviewer.
        </p>

        {banner && (
          <div
            className="rounded-lg p-4 mb-5 flex items-start gap-3"
            style={{ border: "1.5px solid " + banner.color, backgroundColor: CARD }}
          >
            <banner.Icon size={18} style={{ color: banner.color }} className="flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-black text-sm mb-0.5" style={{ color: banner.color, wordBreak: "break-word" }}>
                {banner.title}
              </p>
              <p className="text-xs" style={{ color: MUTED, wordBreak: "break-word" }}>{banner.body}</p>
            </div>
          </div>
        )}

        {codeError && status !== "verified" && (
          <div
            className="text-xs p-3 rounded mb-5"
            style={{ border: "1.5px solid " + RED, color: RED, wordBreak: "break-word" }}
          >
            {codeError}
          </div>
        )}

        {status === "pending" && (
          <div className="rounded-lg p-4 mb-5" style={{ backgroundColor: CARD, border: "1px solid " + BORDER }}>
            <p
              className="text-[10px] font-black uppercase tracking-wide mb-1 flex items-center gap-1.5"
              style={{ color: MUTED }}
            >
              <Ticket size={12} style={{ color: GOLD }} />
              Got an invite code since?
            </p>
            <p className="text-[11px] mb-3" style={{ color: MUTED }}>
              Enter it here and you're in right away — no need to wait for the
              reviewer.
            </p>
            {codeInput}
            <button
              onClick={redeemOnly}
              disabled={!code.trim() || submitting}
              className="w-full mt-2 py-2.5 rounded-full text-xs font-black uppercase tracking-wide flex items-center justify-center gap-1.5 disabled:opacity-40"
              style={{ backgroundColor: GOLD, color: "#1a1400" }}
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Ticket size={13} />}
              Use code
            </button>
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
              1 — Invite code, if a neighbour gave you one
            </p>
            {codeInput}
            <p className="text-[11px] mb-4 mt-1" style={{ color: MUTED }}>
              With a code you're in immediately. Without one, a reviewer reads your
              request first — both work.
            </p>

            <p className="text-[10px] font-black uppercase tracking-wide mb-2" style={{ color: MUTED }}>
              2 — Your area
            </p>
            <button
              onClick={useMyLocation}
              disabled={locating}
              className="w-full py-3 rounded-lg mb-2 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-wide disabled:opacity-50"
              style={{ border: "1.5px solid " + BORDER, color: WHITE, backgroundColor: CARD_ALT }}
            >
              {locating ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
              {locating ? "Detecting..." : "Use my location"}
            </button>

            {/* Plenty of people refuse the location prompt, and without a way to
                type it they could never join at all — not even holding a valid
                invite code. */}
            <p className="text-[11px] mb-2" style={{ color: MUTED }}>
              Or type it in yourself:
            </p>
            {[
              { key: "area", ph: "Area / neighbourhood" },
              { key: "city", ph: "City / district" },
              { key: "state", ph: "State" },
              { key: "country", ph: "Country" },
            ].map((f) => (
              <input
                key={f.key}
                className="w-full p-2.5 rounded mb-2 text-sm"
                style={{ backgroundColor: CARD, border: "1px solid " + BORDER, color: WHITE }}
                placeholder={f.ph}
                value={gps[f.key]}
                maxLength={80}
                onChange={(e) => setGps({ ...gps, [f.key]: e.target.value })}
              />
            ))}
            {gpsText && (
              <p className="text-xs mb-4" style={{ color: GOLD, wordBreak: "break-word" }}>
                {gpsText}
              </p>
            )}

            <p className="text-[10px] font-black uppercase tracking-wide mb-2 mt-4" style={{ color: MUTED }}>
              3 — Anything the reviewer should know (optional)
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
              {submitting ? <Loader2 size={16} className="animate-spin" /> : code ? <Ticket size={16} /> : <ShieldCheck size={16} />}
              {submitting ? "Sending..." : code ? "Use code and join" : "Ask to join"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
