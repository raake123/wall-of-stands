"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Target,
  Sparkles,
  Image as ImageIcon,
  Video,
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
import { compressImage, formatBytes } from "../lib/compress";
import {
  MAX_PHOTOS,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  TEXT_LIMIT,
  TAGLINE_LIMIT,
  DETAILS_LIMIT,
} from "../lib/limits";
import AppChrome from "../components/AppChrome";

function Composer() {
  const router = useRouter();
  const { colors } = useTheme();
  const { RED, GOLD, WHITE, BG, CARD, CARD_ALT, BORDER, MUTED } = colors;
  const { session, profile, approved } = useAuth();

  const [text, setText] = useState("");
  const [category, setCategory] = useState(CAUSES[0].name);
  const [dropPhase, setDropPhase] = useState("idle");

  const [photos, setPhotos] = useState([]); // [{ file, preview }]
  const [video, setVideo] = useState(null); // { file, preview }

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

  async function handlePhotoSelect(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    setPostError("");

    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      setPostError(`You can attach ${MAX_PHOTOS} photos to a stand.`);
      return;
    }
    if (picked.length > room) {
      setPostError(`Only ${room} more photo${room === 1 ? "" : "s"} can be added — the rest were skipped.`);
    }

    const added = [];
    for (const f of picked.slice(0, room)) {
      const shrunk = await compressImage(f);
      added.push({ file: shrunk, preview: URL.createObjectURL(shrunk) });
    }
    setPhotos((prev) => [...prev, ...added]);
  }

  function removePhoto(i) {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleVideoSelect(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setPostError("");
    if (file.size > MAX_VIDEO_BYTES) {
      setPostError(
        `That video is ${formatBytes(file.size)} — keep it under ${formatBytes(MAX_VIDEO_BYTES)} (about ${MAX_VIDEO_SECONDS} seconds).`
      );
      return;
    }
    setVideo({ file, preview: URL.createObjectURL(file) });
  }

  function clearVideo() {
    setVideo(null);
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
    if (!text.trim() || dropPhase !== "idle" || !session || !approved) return;
    setDropPhase("forming");
    setTimeout(() => {
      setDropPhase("falling");
      setTimeout(async () => {
        setUploading(true);
        setPostError("");
        const photo_urls = [];
        let video_url = null;
        const failures = [];

        async function put(file, tag) {
          const ext = (file.name || "bin").split(".").pop();
          const path = `${session.user.id}/${Date.now()}-${tag}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
          const { error } = await supabase.storage.from("stand-media").upload(path, file);
          if (error) {
            failures.push(`${tag}: ${error.message || JSON.stringify(error)}`);
            return null;
          }
          return supabase.storage.from("stand-media").getPublicUrl(path).data.publicUrl;
        }

        for (const p of photos) {
          const url = await put(p.file, "photo");
          if (url) photo_urls.push(url);
        }
        if (video) video_url = await put(video.file, "video");

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
            photo_urls,
            video_url,
            media_url: photo_urls[0] || video_url || null,
            media_type: photo_urls.length ? "photo" : video_url ? "video" : null,
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

      <div className="flex justify-center gap-2 mb-2">
        <label
          className="flex-1 py-2.5 rounded-full flex items-center justify-center gap-1.5 cursor-pointer text-[11px] font-black uppercase tracking-wide"
          style={attachBtn(photos.length > 0)}
        >
          <ImageIcon size={15} />
          Photos {photos.length}/{MAX_PHOTOS}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoSelect}
            disabled={photos.length >= MAX_PHOTOS}
          />
        </label>
        <label
          className="flex-1 py-2.5 rounded-full flex items-center justify-center gap-1.5 cursor-pointer text-[11px] font-black uppercase tracking-wide"
          style={attachBtn(Boolean(video))}
        >
          <Video size={15} />
          Video {video ? "1/1" : `0/1`}
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoSelect}
            disabled={Boolean(video)}
          />
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

      {/* Spell the caps out — people can only use their allowance well if they know it. */}
      <p className="text-[10px] text-center mb-4" style={{ color: MUTED }}>
        Up to {MAX_PHOTOS} photos · 1 video (max {MAX_VIDEO_SECONDS}s) · everyone gets 2 voice
        notes of {MAX_VIDEO_SECONDS}s on each stand
      </p>

      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {photos.map((p, i) => (
            <div key={i} className="relative">
              <img
                src={p.preview}
                alt=""
                className="w-16 h-16 rounded-lg object-cover"
                style={{ border: "1px solid " + BORDER }}
              />
              <button
                onClick={() => removePhoto(i)}
                aria-label="Remove photo"
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: RED, color: "#fff" }}
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {video && (
        <div className="relative mb-3 inline-block">
          <video
            src={video.preview}
            className="w-28 h-20 rounded-lg object-cover"
            style={{ border: "1px solid " + BORDER }}
          />
          <button
            onClick={clearVideo}
            aria-label="Remove video"
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: RED, color: "#fff" }}
          >
            <X size={11} />
          </button>
        </div>
      )}

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

      {locationText && (
        <div className="flex flex-wrap gap-2 justify-center mb-4">
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
