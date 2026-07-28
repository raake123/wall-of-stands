"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  CheckCircle2,
  Trophy,
  Flame,
  Sparkles,
  Clock,
  Plus,
  Users,
  Globe,
  Loader2,
  Trash2,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme-context";
import { useAuth } from "../../lib/auth-context";
import { causeFor, tierFor } from "../../lib/causes";
import { isInsideArea, formatLocation, locOf, hasLocation } from "../../lib/location";
import VoiceRecorder from "../../components/VoiceRecorder";
import { VOICES_PER_STAND, MAX_VOICES_PER_STAND, supportTarget } from "../../lib/limits";

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

function homeLocOf(p) {
  if (!p) return null;
  return {
    area: p.home_area || "",
    city: p.home_city || "",
    state: p.home_state || "",
    country: p.home_country || "",
  };
}

export default function StandDetail() {
  const params = useParams();
  const router = useRouter();
  const { colors } = useTheme();
  const { RED, GOLD, GREEN, WHITE, BG, CARD, BORDER, MUTED } = colors;
  const { session, profile, verified } = useAuth();

  const [stand, setStand] = useState(null);
  const [author, setAuthor] = useState(null);
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState([]);
  const [speakers, setSpeakers] = useState({});
  const [updates, setUpdates] = useState([]);
  const [details, setDetails] = useState("");
  const [editingDetails, setEditingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [updateText, setUpdateText] = useState("");
  const [addingUpdate, setAddingUpdate] = useState(false);
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [postingVoice, setPostingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [draftProgress, setDraftProgress] = useState(0);
  const [savingProgress, setSavingProgress] = useState(false);
  const [residentCount, setResidentCount] = useState(0);
  const [deletingVoice, setDeletingVoice] = useState(null);
  const [confirmVoice, setConfirmVoice] = useState(null);

  useEffect(() => {
    load();
  }, [params.id, session]);

  async function load() {
    const { data: s } = await supabase.from("stands").select("*").eq("id", params.id).maybeSingle();
    if (!s) {
      setNotFound(true);
      return;
    }
    setStand(s);
    setDetails(s.details || "");
    setDraftProgress(s.progress || 0);

    const { data: prof } = await supabase
      .from("profiles")
      .select("name, username, causes, home_area, home_city, home_state, home_country")
      .eq("id", s.user_id)
      .maybeSingle();
    setAuthor(prof);

    if (session) {
      const { data: sup } = await supabase
        .from("supports")
        .select("id")
        .eq("stand_id", s.id)
        .eq("user_id", session.user.id)
        .maybeSingle();
      setSupported(Boolean(sup));
    }

    const { data: vs } = await supabase
      .from("voices")
      .select("*")
      .eq("stand_id", s.id)
      .order("created_at", { ascending: false });
    setVoices(vs || []);

    const ids = [...new Set((vs || []).map((v) => v.user_id))];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, name, username, home_area, home_city, home_state, home_country")
        .in("id", ids);
      const map = {};
      (profs || []).forEach((p) => {
        map[p.id] = p;
      });
      setSpeakers(map);
    }

    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "verified");
    setResidentCount(count || 0);

    const { data: ups } = await supabase
      .from("stand_updates")
      .select("*")
      .eq("stand_id", s.id)
      .order("created_at", { ascending: false });
    setUpdates(ups || []);
  }

  async function handleSupport() {
    if (!session || !verified || supported || stand.resolved_at) return;
    setSupported(true);
    const me = homeLocOf(profile) || {};
    const inside = isInsideArea(locOf(stand), me);
    const { error } = await supabase.from("supports").insert({
      stand_id: stand.id,
      user_id: session.user.id,
      area: me.area || null,
      city: me.city || null,
      state: me.state || null,
      country: me.country || null,
    });
    if (error) {
      setSupported(false);
      return;
    }
    await supabase.rpc("increment_support", { stand_id_param: stand.id, is_inside: inside });
    load();
  }

  async function saveProgress(value, resolve = false) {
    setSavingProgress(true);
    const patch = { progress: value };
    if (resolve) {
      patch.progress = 100;
      patch.resolved_at = new Date().toISOString();
    }
    const { error } = await supabase.from("stands").update(patch).eq("id", stand.id);
    setSavingProgress(false);
    if (!error) {
      if (resolve) router.push("/resolved");
      else load();
    }
  }

  async function handleDeleteVoice(v) {
    setDeletingVoice(v.id);
    // Drop the file too, otherwise the storage stays used up.
    const path = (v.audio_url || "").split("/stand-media/")[1];
    if (path) await supabase.storage.from("stand-media").remove([path]);
    await supabase.from("voices").delete().eq("id", v.id);
    setDeletingVoice(null);
    setConfirmVoice(null);
    load();
  }

  async function handleSaveDetails() {
    setSavingDetails(true);
    await supabase.from("stands").update({ details }).eq("id", stand.id);
    setStand({ ...stand, details });
    setSavingDetails(false);
    setEditingDetails(false);
  }

  async function handleAddUpdate() {
    if (!updateText.trim()) return;
    setSavingUpdate(true);
    await supabase
      .from("stand_updates")
      .insert({ stand_id: stand.id, user_id: session.user.id, text: updateText.trim() });
    setUpdateText("");
    setAddingUpdate(false);
    setSavingUpdate(false);
    load();
  }

  async function handlePostVoice(blob) {
    if (!session || !verified || myVoiceCount >= VOICES_PER_STAND) return;
    setPostingVoice(true);
    setVoiceError("");
    const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
    const path = `${session.user.id}/voice-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("stand-media").upload(path, blob);
    if (upErr) {
      setVoiceError(upErr.message || "Couldn't upload your voice.");
      setPostingVoice(false);
      return;
    }
    const audio_url = supabase.storage.from("stand-media").getPublicUrl(path).data.publicUrl;
    const me = homeLocOf(profile) || {};
    const { error: insErr } = await supabase.from("voices").insert({
      stand_id: stand.id,
      user_id: session.user.id,
      audio_url,
      area: me.area || null,
      city: me.city || null,
      state: me.state || null,
      country: me.country || null,
      location_label: formatLocation(me) || null,
    });
    if (insErr) setVoiceError(insErr.message);
    setPostingVoice(false);
    load();
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG }}>
        <div className="text-center">
          <p className="mb-3" style={{ color: MUTED }}>This stand doesn't exist.</p>
          <Link href="/" className="text-sm font-bold" style={{ color: GOLD }}>Back to the wall</Link>
        </div>
      </div>
    );
  }

  if (!stand) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BG }}>
        <p style={{ color: MUTED }}>Loading...</p>
      </div>
    );
  }

  const cause = causeFor(stand.category);
  const CIcon = cause.Icon;
  const tier = tierFor(stand.support_count);
  const momentumPct = Math.min((stand.support_count || 0) * 6, 100);
  const isMine = session && stand.user_id === session.user.id;
  const initial = author ? author.name.charAt(0).toUpperCase() : "?";
  const standLoc = locOf(stand);
  const standLocText = formatLocation(standLoc) || stand.location_label || "";
  const isResolved = Boolean(stand.resolved_at);
  const photoList =
    stand.photo_urls?.length > 0
      ? stand.photo_urls
      : stand.media_type === "photo" && stand.media_url
      ? [stand.media_url]
      : [];
  const videoUrl =
    stand.video_url || (stand.media_type === "video" ? stand.media_url : null);

  const voiceLoc = (v) => {
    const own = locOf(v);
    if (own.area || own.city || own.state) return own;
    return homeLocOf(speakers[v.user_id]) || {};
  };

  // Without a location on the stand there is no "area" to be inside of, so
  // grouping would just label everyone an outsider. Show one flat list instead.
  const myVoiceCount = session
    ? voices.filter((v) => v.user_id === session.user.id).length
    : 0;
  const target = supportTarget(residentCount);
  const reached = (stand.support_count || 0) >= target;
  const targetPct = Math.min(100, Math.round(((stand.support_count || 0) / target) * 100));
  const voicesFull = voices.length >= MAX_VOICES_PER_STAND;

  const canGroupVoices = hasLocation(standLoc);
  const insideVoices = canGroupVoices
    ? voices.filter((v) => isInsideArea(standLoc, voiceLoc(v)))
    : [];
  const outsideVoices = canGroupVoices
    ? voices.filter((v) => !isInsideArea(standLoc, voiceLoc(v)))
    : voices;

  function VoiceRow({ v }) {
    const sp = speakers[v.user_id];
    const loc = voiceLoc(v);
    const locText = formatLocation(loc) || v.location_label || "";
    return (
      <div className="mb-3 rounded-lg p-3" style={{ backgroundColor: CARD, border: "1px solid " + BORDER }}>
        <div className="flex items-start gap-2 mb-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
            style={{ backgroundColor: GOLD, color: "#1a1400" }}
          >
            {(sp?.name || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-black truncate" style={{ color: WHITE }}>
                {sp?.name || "Someone"}
              </p>
              {session && v.user_id === session.user.id && (
                confirmVoice === v.id ? (
                  <span className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setConfirmVoice(null)}
                      className="text-[10px] font-bold"
                      style={{ color: MUTED }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteVoice(v)}
                      disabled={deletingVoice === v.id}
                      className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: RED, color: "#fff" }}
                    >
                      {deletingVoice === v.id ? "..." : "Delete"}
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmVoice(v.id)}
                    aria-label="Delete my voice"
                    className="flex-shrink-0"
                    style={{ color: MUTED }}
                  >
                    <Trash2 size={13} />
                  </button>
                )
              )}
            </div>
            <p className="text-[10px] flex items-center gap-1" style={{ color: MUTED }}>
              <Clock size={9} className="flex-shrink-0" />
              {formatWhen(v.created_at)}
            </p>
            {locText && (
              <p
                className="text-[10px] flex items-start gap-1 mt-0.5"
                style={{ color: MUTED, wordBreak: "break-word" }}
              >
                <MapPin size={9} className="flex-shrink-0 mt-0.5" />
                {locText}
              </p>
            )}
          </div>
        </div>
        <audio src={v.audio_url} controls className="w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: BG }}>
      <div className="max-w-md mx-auto px-4 py-6">
        <Link href="/" className="text-sm mb-5 inline-flex items-center gap-1 font-bold" style={{ color: MUTED }}>
          <ArrowLeft size={14} />
          Back to the wall
        </Link>

        <div className="flex items-center justify-between mb-4 gap-2">
          <span
            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full"
            style={{ border: "1px solid " + cause.color, color: cause.color }}
          >
            <CIcon size={12} />
            {stand.category || "General"}
          </span>
          {isResolved ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-full"
              style={{ backgroundColor: GREEN, color: "#04240f" }}
            >
              <CheckCircle2 size={11} /> Resolved
            </span>
          ) : tier === "movement" ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-full"
              style={{ backgroundColor: RED, color: "#fff" }}
            >
              <Flame size={11} /> Movement
            </span>
          ) : tier === "surging" ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase" style={{ color: RED }}>
              <Flame size={13} /> Surging
            </span>
          ) : tier === "milestone" ? (
            <Trophy size={16} color={GOLD} />
          ) : null}
        </div>

        {author && (
          <Link
            href={`/profile/${author.username}`}
            className="flex items-center gap-3 mb-4 rounded-lg p-3"
            style={{ backgroundColor: CARD, border: "1px solid " + BORDER }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-black flex-shrink-0"
              style={{ backgroundColor: GOLD, color: "#1a1400" }}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <p className="font-black truncate" style={{ color: WHITE }}>{author.name}</p>
              <p className="text-xs truncate" style={{ color: MUTED }}>@{author.username}</p>
            </div>
          </Link>
        )}

        <p
          className="text-xl font-bold inline"
          style={{
            color: "#1a1400",
            backgroundColor: GOLD,
            boxDecorationBreak: "clone",
            WebkitBoxDecorationBreak: "clone",
            padding: "3px 8px",
            borderRadius: 6,
            wordBreak: "break-word",
            overflowWrap: "anywhere",
          }}
        >
          {stand.text}
        </p>
        {stand.tagline && (
          <p
            className="flex items-center gap-1 text-sm font-bold italic mt-2"
            style={{ color: GOLD, wordBreak: "break-word", overflowWrap: "anywhere" }}
          >
            <Sparkles size={13} className="flex-shrink-0" />
            {stand.tagline}
          </p>
        )}

        <div className="flex flex-col gap-1 mt-3 mb-4">
          <p className="flex items-center gap-1 text-xs" style={{ color: MUTED }}>
            <Clock size={12} className="flex-shrink-0" />
            Filed {formatWhen(stand.created_at)}
          </p>
          {standLocText && (
            <p
              className="flex items-start gap-1 text-xs"
              style={{ color: MUTED, wordBreak: "break-word" }}
            >
              <MapPin size={12} className="flex-shrink-0 mt-0.5" />
              {standLocText}
            </p>
          )}
        </div>

        {photoList.length > 0 && (
          <div className={"mb-4 grid gap-2 " + (photoList.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
            {photoList.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="w-full rounded-lg object-cover"
                style={{ maxHeight: photoList.length === 1 ? 420 : 180 }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ))}
          </div>
        )}
        {videoUrl && (
          <video
            src={videoUrl}
            controls
            className="w-full rounded-lg mb-4 max-h-[420px] object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        {stand.audio_url && <audio src={stand.audio_url} controls className="w-full mb-4" />}

        <div className="mb-2">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: BORDER }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: momentumPct + "%", background: "linear-gradient(to right, " + RED + ", " + GOLD + ")" }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleSupport}
            disabled={supported || !session || !verified || isResolved}
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-70"
            style={
              supported
                ? { backgroundColor: RED, border: "2px solid " + RED }
                : { backgroundColor: "transparent", border: "2px solid " + WHITE }
            }
          >
            ✊
          </button>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight" style={{ color: GOLD }}>
              {stand.support_count} standing with this
            </p>
            {hasLocation(standLoc) && (
              <p className="text-[11px] leading-tight" style={{ color: MUTED }}>
                <span style={{ color: RED, fontWeight: 700 }}>{stand.support_in || 0} in</span>
                {" · "}
                <span style={{ fontWeight: 700 }}>{stand.support_out || 0} out</span>
                {" of the area"}
              </p>
            )}
          </div>
        </div>

        {/* How close this stand is to being strong enough to carry weight */}
        {!isResolved && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: MUTED }}>
                {reached ? "Strong stand" : `Needs ${target - (stand.support_count || 0)} more to be strong`}
              </span>
              <span className="text-[10px] font-black" style={{ color: reached ? GREEN : GOLD }}>
                {stand.support_count || 0}/{target}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: BORDER }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: targetPct + "%", backgroundColor: reached ? GREEN : GOLD }}
              />
            </div>
          </div>
        )}

        {/* Owner-rated progress */}
        <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: CARD, border: "1px solid " + BORDER }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black uppercase tracking-wide" style={{ color: MUTED }}>
              Progress on this issue
            </p>
            <span className="text-sm font-black" style={{ color: isResolved ? GREEN : GOLD }}>
              {isResolved ? 100 : draftProgress}%
            </span>
          </div>

          <div className="h-2.5 rounded-full overflow-hidden mb-3" style={{ backgroundColor: BORDER }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: (isResolved ? 100 : draftProgress) + "%",
                backgroundColor: isResolved ? GREEN : GOLD,
              }}
            />
          </div>

          {isMine && !isResolved ? (
            <>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={draftProgress}
                onChange={(e) => setDraftProgress(Number(e.target.value))}
                className="w-full mb-3"
                style={{ accentColor: GOLD }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => saveProgress(draftProgress)}
                  disabled={savingProgress || draftProgress === (stand.progress || 0)}
                  className="flex-1 py-2 rounded-full text-xs font-black uppercase tracking-wide disabled:opacity-40"
                  style={{ backgroundColor: GOLD, color: "#1a1400" }}
                >
                  {savingProgress ? "Saving..." : "Save progress"}
                </button>
                <button
                  onClick={() => saveProgress(100, true)}
                  disabled={savingProgress}
                  className="flex-1 py-2 rounded-full text-xs font-black uppercase tracking-wide flex items-center justify-center gap-1 disabled:opacity-40"
                  style={{ backgroundColor: GREEN, color: "#04240f" }}
                >
                  {savingProgress ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  Resolved
                </button>
              </div>
              <p className="text-[10px] mt-2" style={{ color: MUTED }}>
                Only you can move this bar. Pushing it to 100% and tapping Resolved closes the stand.
              </p>
            </>
          ) : (
            <p className="text-[11px]" style={{ color: MUTED }}>
              {isResolved
                ? `Marked resolved by the person who filed it on ${formatWhen(stand.resolved_at)}.`
                : draftProgress > 0
                ? "The person who filed this stand rates it this far along."
                : "No movement reported yet by the person who filed this."}
            </p>
          )}
        </div>

        <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: CARD, border: "1px solid " + BORDER }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black uppercase tracking-wide" style={{ color: MUTED }}>The full story</p>
            {isMine && !editingDetails && (
              <button onClick={() => setEditingDetails(true)} className="text-xs font-bold" style={{ color: GOLD }}>
                {stand.details ? "Edit" : "Add story"}
              </button>
            )}
          </div>
          {editingDetails ? (
            <div>
              <textarea
                className="w-full p-3 rounded text-sm mb-1"
                style={{ backgroundColor: BG, border: "1px solid " + BORDER, color: WHITE, minHeight: 140 }}
                placeholder="What happened? Give people the full context behind this stand..."
                value={details}
                maxLength={2000}
                onChange={(e) => setDetails(e.target.value)}
              />
              <p className="text-right text-[11px] mb-2" style={{ color: MUTED }}>{details.length}/2000</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setDetails(stand.details || "");
                    setEditingDetails(false);
                  }}
                  className="px-4 py-2 rounded-full text-xs font-bold"
                  style={{ border: "1px solid " + BORDER, color: MUTED }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDetails}
                  disabled={savingDetails}
                  className="flex-1 py-2 rounded-full text-xs font-bold uppercase"
                  style={{ backgroundColor: GOLD, color: "#1a1400" }}
                >
                  {savingDetails ? "Saving..." : "Save story"}
                </button>
              </div>
            </div>
          ) : stand.details ? (
            <p
              className="text-sm whitespace-pre-wrap"
              style={{ color: WHITE, wordBreak: "break-word", overflowWrap: "anywhere" }}
            >
              {stand.details}
            </p>
          ) : (
            <p className="text-sm" style={{ color: MUTED }}>
              {isMine ? "Add the full story so people know what happened." : "No additional story yet."}
            </p>
          )}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-black uppercase tracking-wide" style={{ color: MUTED }}>
              Progress timeline
            </p>
            {isMine && !addingUpdate && (
              <button
                onClick={() => setAddingUpdate(true)}
                className="text-xs font-bold flex items-center gap-1"
                style={{ color: GOLD }}
              >
                <Plus size={12} />
                Add update
              </button>
            )}
          </div>

          {addingUpdate && (
            <div className="mb-3">
              <textarea
                className="w-full p-3 rounded text-sm mb-2"
                style={{ backgroundColor: CARD, border: "1px solid " + BORDER, color: WHITE, minHeight: 80 }}
                placeholder="What changed? e.g. Municipality acknowledged the complaint."
                value={updateText}
                maxLength={500}
                onChange={(e) => setUpdateText(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setUpdateText("");
                    setAddingUpdate(false);
                  }}
                  className="px-4 py-2 rounded-full text-xs font-bold"
                  style={{ border: "1px solid " + BORDER, color: MUTED }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUpdate}
                  disabled={savingUpdate}
                  className="flex-1 py-2 rounded-full text-xs font-bold uppercase"
                  style={{ backgroundColor: GOLD, color: "#1a1400" }}
                >
                  {savingUpdate ? "Saving..." : "Post update"}
                </button>
              </div>
            </div>
          )}

          <div className="relative pl-4" style={{ borderLeft: "2px solid " + BORDER }}>
            {isResolved && (
              <div className="mb-4 relative">
                <div
                  className="absolute w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: GREEN, left: -21.5, top: 5 }}
                />
                <p className="text-[10px] font-bold uppercase mb-1" style={{ color: GREEN }}>
                  {formatWhen(stand.resolved_at)}
                </p>
                <p className="text-sm font-bold" style={{ color: GREEN }}>Resolved</p>
              </div>
            )}
            {updates.map((u) => (
              <div key={u.id} className="mb-4 relative">
                <div
                  className="absolute w-2 h-2 rounded-full"
                  style={{ backgroundColor: GOLD, left: -21, top: 5 }}
                />
                <p className="text-[10px] font-bold uppercase mb-1" style={{ color: GOLD }}>
                  {formatWhen(u.created_at)}
                </p>
                <p
                  className="text-sm"
                  style={{ color: WHITE, wordBreak: "break-word", overflowWrap: "anywhere" }}
                >
                  {u.text}
                </p>
              </div>
            ))}
            <div className="relative">
              <div
                className="absolute w-2 h-2 rounded-full"
                style={{ backgroundColor: RED, left: -21, top: 5 }}
              />
              <p className="text-[10px] font-bold uppercase mb-1" style={{ color: RED }}>
                {formatWhen(stand.created_at)}
              </p>
              <p className="text-sm" style={{ color: MUTED }}>Stand filed</p>
            </div>
          </div>

          {updates.length === 0 && !isResolved && (
            <p className="text-xs mt-3" style={{ color: MUTED }}>
              No updates yet — nothing has moved on this issue since it was filed.
            </p>
          )}
        </div>

        <p className="text-xs font-black uppercase tracking-wide mb-1" style={{ color: MUTED }}>
          Voices ({voices.length})
        </p>
        <p className="text-[11px] mb-4" style={{ color: MUTED }}>
          No typing here — real voices only.
        </p>

        {session ? (
          <div className="mb-5">
            {voicesFull ? (
              <div
                className="w-full py-3 rounded-full text-[11px] font-bold text-center"
                style={{ border: "1px solid " + BORDER, color: MUTED }}
              >
                Voices closed — {MAX_VOICES_PER_STAND} residents have spoken
              </div>
            ) : (
              <VoiceRecorder
                onSubmit={handlePostVoice}
                submitting={postingVoice}
                remaining={VOICES_PER_STAND - myVoiceCount}
              />
            )}
            {voiceError && (
              <p className="text-xs text-center mt-2" style={{ color: RED }}>{voiceError}</p>
            )}
          </div>
        ) : (
          <p className="text-xs mb-5" style={{ color: MUTED }}>Log in to speak out on this stand.</p>
        )}

        {insideVoices.length > 0 && (
          <div className="mb-5">
            <p
              className="text-[11px] font-black uppercase tracking-wide mb-2 flex items-center gap-1"
              style={{ color: RED }}
            >
              <Users size={12} />
              People from inside the area ({insideVoices.length})
            </p>
            {insideVoices.map((v) => (
              <VoiceRow key={v.id} v={v} />
            ))}
          </div>
        )}

        {outsideVoices.length > 0 && (
          <div className="mb-5">
            {canGroupVoices && (
              <p
                className="text-[11px] font-black uppercase tracking-wide mb-2 flex items-center gap-1"
                style={{ color: MUTED }}
              >
                <Globe size={12} />
                People from outside the area ({outsideVoices.length})
              </p>
            )}
            {outsideVoices.map((v) => (
              <VoiceRow key={v.id} v={v} />
            ))}
          </div>
        )}

        {voices.length === 0 && (
          <p className="text-xs" style={{ color: MUTED }}>
            No one has spoken out yet. Be the first voice on this issue.
          </p>
        )}
      </div>
    </div>
  );
}
