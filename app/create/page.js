"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Target,
  Sparkles,
  Image as ImageIcon,
  Video,
  Music,
  MapPin,
  X,
  Loader2,
  FileText,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/theme-context";
import { useAuth } from "../lib/auth-context";
import { CAUSES } from "../lib/causes";
import { detectLocation, formatLocation, emptyLocation } from "../lib/location";
import { compressImage, formatBytes, MAX_VIDEO_BYTES } from "../lib/compress";
import AppChrome from "../components/AppChrome";

const TEXT_LIMIT = 120;
const DETAILS_LIMIT = 2000;
const TAGLINE_LIMIT = 80;

function Composer() {
  const router = useRouter();
  const { colors } = useTheme();
  const { RED, GOLD, WHITE, BG, CARD, CARD_ALT, BORDER, MUTED } = colors;
  const { session, profile, verified } = useAuth();

  const [text, setText] = useState("");
  const [category, setCategory] = useState(CAUSES[0].name);
  const [dropPhase, setDropPhase] = useState("idle");

  const [mediaFile, setMediaFile] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);

  const [location, setLocation] = useState(emptyLocation());
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [uploading, setUploading] = useState(false);
  const [details, setDetails] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [tagline, setTagline] = useState("");
  const [showTagline, setShowTagline] = useState(false);
  const [postError, setPostError] = useState("");

  const locationText = formatLocation(location);

  async function handleMediaSelect(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setPostError("");

    if (file.type.startsWith("video")) {
      // A single long clip can eat a large share of the storage quota.
      if (file.size > MAX_VIDEO_BYTES) {
        setPostError(
          `That video is ${formatBytes(file.size)} — please keep videos under ${formatBytes(
            MAX_VIDEO_BYTES
          )} (about 15 seconds), or attach a photo instead.`
        );
        return;
      }
      setMediaFile(file);
      setMediaType("video");
      setMediaPreview(URL.createObjectURL(file));
      return;
    }

    const shrunk = await compressImage(file);
    setMediaFile(shrunk);
    setMediaType("photo");
    setMediaPreview(URL.createObjectURL(shrunk));
  }

  function clearMedia() {
    setMediaFile(null);
    setMediaType(null);
    setMediaPreview(null);
  }

  function handleAudioSelect(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setAudioFile(file);
    setAudioPreview(URL.createObjectURL(file));
  }

  function clearAudio() {
    setAudioFile(null);
    setAudioPreview(null);
  }

  async function handleUseLocation() {
    setLocationError("");
    setLocating(true);
    try {
      setLocation(await detectLocation());
    } catch (e) {
      setLocationError(e.message);
    }
    setLocating(false);
  }

  async function handlePost() {
    if (!text.trim() || dropPhase !== "idle" || !session || !verified) return;
    setDropPhase("forming");
    setTimeout(() => {
      setDropPhase("falling");
      setTimeout(async () => {
        setUploading(true);
        setPostError("");
        let media_url = null;
        let media_type = null;
        let audio_url = null;
        const failures = [];

        if (mediaFile) {
          try {
            const ext = mediaFile.name.split(".").pop();
            const path = `${session.user.id}/${Date.now()}-media.${ext}`;
            const { error: upErr } = await supabase.storage.from("stand-media").upload(path, mediaFile);
            if (upErr) failures.push(`photo/video: ${upErr.message || JSON.stringify(upErr)}`);
            else {
              media_url = supabase.storage.from("stand-media").getPublicUrl(path).data.publicUrl;
              media_type = mediaType;
            }
          } catch (e) {
            failures.push(`photo/video threw: ${e?.message || String(e)}`);
          }
        }
        if (audioFile) {
          try {
            const ext = audioFile.name.split(".").pop();
            const path = `${session.user.id}/${Date.now()}-audio.${ext}`;
            const { error: upErr } = await supabase.storage.from("stand-media").upload(path, audioFile);
            if (upErr) failures.push(`audio: ${upErr.message || JSON.stringify(upErr)}`);
            else audio_url = supabase.storage.from("stand-media").getPublicUrl(path).data.publicUrl;
          } catch (e) {
            failures.push(`audio threw: ${e?.message || String(e)}`);
          }
        }
        if (failures.length) setPostError(failures.join(" | "));

        // Fall back to the person's home area when they didn't tag a location.
        const loc = locationText
          ? location
          : {
              area: profile?.home_area || "",
              city: profile?.home_city || "",
              state: profile?.home_state || "",
              country: profile?.home_country || "",
            };

        const { data, error } = await supabase
          .from("stands")
          .insert({
            text,
            user_id: session.user.id,
            category,
            media_url,
            media_type,
            audio_url,
            area: loc.area || null,
            city: loc.city || null,
            state: loc.state || null,
            country: loc.country || null,
            location_label: formatLocation(loc) || null,
            details: details.trim() || null,
            tagline: tagline.trim() || null,
          })
          .select()
          .maybeSingle();

        setUploading(false);
        setDropPhase("idle");

        if (error) {
          setPostError(error.message);
          return;
        }
        router.push(data ? `/stand/${data.id}` : "/");
      }, 520);
    }, 280);
  }

  const dropping = dropPhase !== "idle";
  const composerPx = Math.min(108 + text.length * 5, 250);
  const ringGap = text || dropping ? 9 : 0;
  const composerActive = Boolean(text) || dropping;

  const attachBtn = (active) => ({
    border: "1.5px solid " + (active ? GOLD : BORDER),
    color: active ? "#1a1400" : WHITE,
    backgroundColor: active ? GOLD : CARD_ALT,
  });

  return (
    <>
      <p className="text-xs text-center mb-2" style={{ color: MUTED }}>
        Tap the circle, declare your stand
      </p>

      <div className="flex justify-center mb-3">
        <div
          className={
            dropPhase === "forming"
              ? "animate-form-fist"
              : dropPhase === "falling"
              ? "animate-meteor-fall"
              : ""
          }
          style={{
            position: "relative",
            width: composerPx,
            height: composerPx,
            transition: "width 320ms cubic-bezier(.34,1.2,.4,1), height 320ms cubic-bezier(.34,1.2,.4,1)",
          }}
        >
          {composerActive && (
            <div
              className="animate-ring-spin"
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "9999px",
                background:
                  "conic-gradient(from 0deg, " + RED + ", " + GOLD + ", " + RED + ", " + GOLD + ", " + RED + ")",
              }}
            />
          )}
          <div
            style={{
              position: "absolute",
              top: ringGap,
              left: ringGap,
              width: composerPx - ringGap * 2,
              height: composerPx - ringGap * 2,
              borderRadius: "9999px",
              overflow: "hidden",
              backgroundColor: composerActive ? "#1a1400" : CARD_ALT,
              border: composerActive ? "none" : "2.5px solid " + RED,
              boxShadow: composerActive ? "none" : "0 0 14px 1px " + RED + "40",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition:
                "width 320ms cubic-bezier(.34,1.2,.4,1), height 320ms cubic-bezier(.34,1.2,.4,1), background-color 300ms",
            }}
          >
            {dropping ? (
              <span style={{ fontSize: composerPx * 0.32, lineHeight: 1 }}>✊</span>
            ) : (
              <textarea
                className="bg-transparent text-center outline-none resize-none text-sm font-bold"
                style={{ color: text ? GOLD : WHITE, width: "72%", height: "72%", wordBreak: "break-word" }}
                placeholder="I stand for..."
                value={text}
                maxLength={TEXT_LIMIT}
                onChange={(e) => setText(e.target.value)}
              />
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] mb-4" style={{ color: text.length >= TEXT_LIMIT ? RED : MUTED }}>
        {text.length}/{TEXT_LIMIT} — keep it short, add the full story below
      </p>

      <div className="flex justify-center gap-2 mb-4">
        <label
          className="flex-1 py-2.5 rounded-full flex items-center justify-center gap-1.5 cursor-pointer text-[11px] font-black uppercase tracking-wide"
          style={attachBtn(Boolean(mediaFile))}
        >
          {mediaType === "video" ? <Video size={15} /> : <ImageIcon size={15} />}
          Photo
          <input type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaSelect} />
        </label>
        <label
          className="flex-1 py-2.5 rounded-full flex items-center justify-center gap-1.5 cursor-pointer text-[11px] font-black uppercase tracking-wide"
          style={attachBtn(Boolean(audioFile))}
        >
          <Music size={15} />
          Music
          <input type="file" accept="audio/*" className="hidden" onChange={handleAudioSelect} />
        </label>
        <button
          onClick={handleUseLocation}
          disabled={locating}
          className="flex-1 py-2.5 rounded-full flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-wide"
          style={attachBtn(Boolean(locationText))}
        >
          {locating ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
          Place
        </button>
      </div>

      {locationError && (
        <p className="text-xs text-center mb-3" style={{ color: RED }}>{locationError}</p>
      )}
      {postError && (
        <div
          className="text-xs p-3 rounded mb-4"
          style={{ border: "1.5px solid " + RED, color: RED, backgroundColor: "#2a0a0d", wordBreak: "break-word" }}
        >
          <p className="font-black uppercase mb-1">Something went wrong</p>
          <p>{postError}</p>
        </div>
      )}

      {(mediaPreview || audioPreview || locationText) && (
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {mediaPreview && (
            <div
              className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full text-xs"
              style={{ border: "1px solid " + BORDER, color: MUTED }}
            >
              {mediaType === "video" ? (
                <video src={mediaPreview} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <img src={mediaPreview} className="w-6 h-6 rounded-full object-cover" alt="" />
              )}
              {mediaType === "video" ? "Video attached" : "Photo attached"}
              <button onClick={clearMedia} style={{ color: RED }} aria-label="Remove">
                <X size={13} />
              </button>
            </div>
          )}
          {audioPreview && (
            <div
              className="flex items-center gap-2 pl-3 pr-1 py-1 rounded-full text-xs"
              style={{ border: "1px solid " + BORDER, color: MUTED }}
            >
              <Music size={12} />
              Audio attached
              <button onClick={clearAudio} style={{ color: RED }} aria-label="Remove">
                <X size={13} />
              </button>
            </div>
          )}
          {locationText && (
            <div
              className="flex items-center gap-2 pl-3 pr-1 py-1 rounded-full text-xs"
              style={{ border: "1px solid " + BORDER, color: MUTED, wordBreak: "break-word" }}
            >
              <MapPin size={12} className="flex-shrink-0" />
              {locationText}
              <button onClick={() => setLocation(emptyLocation())} style={{ color: RED }} aria-label="Remove">
                <X size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      {showTagline ? (
        <div className="mb-3">
          <input
            className="w-full p-3 rounded-lg text-sm font-bold"
            style={{ backgroundColor: CARD, border: "1.5px solid " + GOLD, color: GOLD }}
            placeholder="A catchy one-liner to hook people in..."
            value={tagline}
            maxLength={TAGLINE_LIMIT}
            onChange={(e) => setTagline(e.target.value)}
            autoFocus
          />
          <p className="text-right text-[11px] mt-1" style={{ color: MUTED }}>
            {tagline.length}/{TAGLINE_LIMIT}
          </p>
        </div>
      ) : (
        <button
          onClick={() => setShowTagline(true)}
          className="w-full py-2.5 rounded-full mb-3 flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-wide"
          style={{ border: "1.5px solid " + BORDER, color: GOLD, backgroundColor: CARD }}
        >
          <Sparkles size={14} />
          Add a tagline
        </button>
      )}

      {showDetails ? (
        <div className="mb-4">
          <textarea
            className="w-full p-3 rounded-lg text-sm"
            style={{ backgroundColor: CARD, border: "1.5px solid " + BORDER, color: WHITE, minHeight: 110 }}
            placeholder="Add the full story — what happened, why it matters..."
            value={details}
            maxLength={DETAILS_LIMIT}
            onChange={(e) => setDetails(e.target.value)}
            autoFocus
          />
          <p className="text-right text-[11px] mt-1" style={{ color: MUTED }}>
            {details.length}/{DETAILS_LIMIT}
          </p>
        </div>
      ) : (
        <button
          onClick={() => setShowDetails(true)}
          className="w-full py-2.5 rounded-full mb-4 flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-wide"
          style={{ border: "1.5px solid " + BORDER, color: GOLD, backgroundColor: CARD }}
        >
          <FileText size={14} />
          Add the full story
        </button>
      )}

      <div className="flex flex-wrap gap-2 justify-center mb-5">
        {CAUSES.map((c) => {
          const CIcon = c.Icon;
          const active = category === c.name;
          return (
            <button
              key={c.name}
              onClick={() => setCategory(c.name)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold"
              style={
                active
                  ? { border: "1.5px solid " + c.color, color: c.color, backgroundColor: CARD }
                  : { border: "1.5px solid " + BORDER, color: MUTED, backgroundColor: "transparent" }
              }
            >
              <CIcon size={13} />
              {c.name}
            </button>
          );
        })}
      </div>

      <button
        onClick={handlePost}
        disabled={dropping || uploading || !text.trim()}
        className="w-full p-3.5 rounded-full font-black uppercase tracking-wide mb-4 flex items-center justify-center gap-2 disabled:opacity-40"
        style={{ backgroundColor: RED, color: "#fff" }}
      >
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Target size={16} />}
        Drop This Stand
      </button>
    </>
  );
}

export default function CreatePage() {
  return (
    <AppChrome>
      <Composer />
    </AppChrome>
  );
}
