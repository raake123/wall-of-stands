"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Upload,
  Camera,
  MapPin,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/theme-context";
import { useAuth } from "../lib/auth-context";
import { detectLocation, formatLocation, emptyLocation } from "../lib/location";
import { compressImage } from "../lib/compress";

export default function VerifyPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { RED, GOLD, GREEN, WHITE, BG, CARD, CARD_ALT, BORDER, MUTED } = colors;
  const { session, profile, loading, refreshProfile } = useAuth();

  const [idDoc, setIdDoc] = useState(null);
  const [idPreview, setIdPreview] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [idName, setIdName] = useState("");
  const [idAddress, setIdAddress] = useState("");
  const [gps, setGps] = useState(emptyLocation());
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !session) router.push("/");
  }, [loading, session]);

  useEffect(() => {
    if (profile) {
      setIdName(profile.id_name || profile.name || "");
      setIdAddress(profile.id_address || "");
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

  function pick(setFile, setPreview) {
    return async (e) => {
      const f = e.target.files[0];
      e.target.value = "";
      if (!f) return;
      setError("");
      // Shrunk in the browser first — 1600px still leaves an ID clearly
      // readable for the reviewer at a fraction of the storage.
      const shrunk = await compressImage(f);
      if (shrunk.size > 6 * 1024 * 1024) {
        setError("That file is too large even after compression — try a smaller image.");
        return;
      }
      setFile(shrunk);
      setPreview(URL.createObjectURL(shrunk));
    };
  }

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
    if (!idDoc || !selfie || !idName.trim() || !idAddress.trim() || !gpsText) return;
    setSubmitting(true);
    setError("");
    try {
      const stamp = Date.now();
      const docPath = `${session.user.id}/id-${stamp}-${idDoc.name.split(".").pop()}`;
      const selfiePath = `${session.user.id}/selfie-${stamp}-${selfie.name.split(".").pop()}`;

      const up1 = await supabase.storage.from("identity-docs").upload(docPath, idDoc, { upsert: true });
      if (up1.error) throw new Error("ID upload failed: " + up1.error.message);
      const up2 = await supabase.storage.from("identity-docs").upload(selfiePath, selfie, { upsert: true });
      if (up2.error) throw new Error("Selfie upload failed: " + up2.error.message);

      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          id_doc_path: docPath,
          selfie_path: selfiePath,
          id_name: idName.trim(),
          id_address: idAddress.trim(),
          home_area: gps.area || null,
          home_city: gps.city || null,
          home_state: gps.state || null,
          home_country: gps.country || null,
          home_location: gpsText || null,
          verification_status: "pending",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", session.user.id);
      if (upErr) throw new Error(upErr.message);

      await refreshProfile();
    } catch (e) {
      setError(e.message);
    }
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
      ? { Icon: CheckCircle2, color: GREEN, title: "You're verified", body: "Your identity has been checked. You can file stands, stand with others and speak out." }
      : status === "pending"
      ? { Icon: Clock, color: GOLD, title: "Waiting for review", body: "Your documents are in. A reviewer will check them — you'll get access as soon as you're approved." }
      : status === "rejected"
      ? { Icon: AlertTriangle, color: RED, title: "Not approved", body: profile.reject_reason || "Your submission couldn't be verified. Please submit again with clearer documents." }
      : null;

  const canSubmit = idDoc && selfie && idName.trim() && idAddress.trim() && gpsText && !submitting;
  const showForm = status === "unverified" || status === "rejected";

  const fileBtn = (active) => ({
    border: "1.5px solid " + (active ? GOLD : BORDER),
    color: active ? "#1a1400" : WHITE,
    backgroundColor: active ? GOLD : CARD_ALT,
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG }}>
      <div className="max-w-md mx-auto px-4 py-6">
        <Link href="/" className="text-sm mb-5 inline-flex items-center gap-1 font-bold" style={{ color: MUTED }}>
          ← Back to the wall
        </Link>

        <h1 className="text-2xl font-black uppercase tracking-tight mb-1" style={{ color: WHITE }}>
          Verify who you <span style={{ color: RED }}>are</span>
        </h1>
        <p className="text-sm mb-5" style={{ color: MUTED }}>
          A stand only carries weight if the people behind it are real. Every account
          is checked before it can file a stand or stand with one.
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
              style={{ border: "1px solid " + GOLD, color: GOLD, backgroundColor: CARD }}
            >
              <ShieldCheck size={15} className="flex-shrink-0 mt-0.5" />
              <span>
                Upload a <b>masked Aadhaar</b> — the version showing only the last 4
                digits, downloadable from the UIDAI site. Never upload a full Aadhaar
                number. Your documents go to private storage that only a reviewer can
                open, and are never shown on your public profile.
              </span>
            </div>

            <p className="text-[10px] font-black uppercase tracking-wide mb-2" style={{ color: MUTED }}>
              1 — Masked Aadhaar / government ID
            </p>
            <label
              className="w-full py-3 rounded-lg mb-2 flex items-center justify-center gap-2 cursor-pointer text-[11px] font-black uppercase tracking-wide"
              style={fileBtn(Boolean(idDoc))}
            >
              <Upload size={15} />
              {idDoc ? "ID selected — change" : "Choose ID image"}
              <input type="file" accept="image/*" className="hidden" onChange={pick(setIdDoc, setIdPreview)} />
            </label>
            {idPreview && (
              <div className="relative mb-4">
                <img src={idPreview} alt="" className="w-full rounded-lg" style={{ maxHeight: 200, objectFit: "cover" }} />
                <button
                  onClick={() => { setIdDoc(null); setIdPreview(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: RED, color: "#fff" }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <p className="text-[10px] font-black uppercase tracking-wide mb-2 mt-4" style={{ color: MUTED }}>
              2 — Live selfie
            </p>
            <label
              className="w-full py-3 rounded-lg mb-2 flex items-center justify-center gap-2 cursor-pointer text-[11px] font-black uppercase tracking-wide"
              style={fileBtn(Boolean(selfie))}
            >
              <Camera size={15} />
              {selfie ? "Selfie selected — retake" : "Take a selfie"}
              <input
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={pick(setSelfie, setSelfiePreview)}
              />
            </label>
            {selfiePreview && (
              <div className="relative mb-4">
                <img src={selfiePreview} alt="" className="w-full rounded-lg" style={{ maxHeight: 200, objectFit: "cover" }} />
                <button
                  onClick={() => { setSelfie(null); setSelfiePreview(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: RED, color: "#fff" }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <p className="text-[10px] font-black uppercase tracking-wide mb-2 mt-4" style={{ color: MUTED }}>
              3 — Details exactly as printed on the ID
            </p>
            <input
              className="w-full p-3 rounded-lg mb-2 text-sm"
              style={{ backgroundColor: CARD, border: "1px solid " + BORDER, color: WHITE }}
              placeholder="Full name as on the ID"
              value={idName}
              maxLength={120}
              onChange={(e) => setIdName(e.target.value)}
            />
            <textarea
              className="w-full p-3 rounded-lg mb-4 text-sm"
              style={{ backgroundColor: CARD, border: "1px solid " + BORDER, color: WHITE, minHeight: 90 }}
              placeholder="Address as printed on the ID, including PIN code"
              value={idAddress}
              maxLength={400}
              onChange={(e) => setIdAddress(e.target.value)}
            />

            <p className="text-[10px] font-black uppercase tracking-wide mb-2" style={{ color: MUTED }}>
              4 — Where you are right now
            </p>
            <button
              onClick={useMyLocation}
              disabled={locating}
              className="w-full py-3 rounded-lg mb-2 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-wide disabled:opacity-50"
              style={fileBtn(Boolean(gpsText))}
            >
              {locating ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
              {gpsText ? "Location captured — refresh" : "Turn on location"}
            </button>
            {gpsText && (
              <p className="text-xs mb-4" style={{ color: GOLD, wordBreak: "break-word" }}>
                {gpsText}
              </p>
            )}

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
              {submitting ? "Submitting..." : "Submit for verification"}
            </button>
            <p className="text-[10px] text-center mt-3" style={{ color: MUTED }}>
              By submitting you consent to a reviewer checking these documents to
              confirm your identity. They are stored privately and are not published.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
