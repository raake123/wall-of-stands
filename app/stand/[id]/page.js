"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme-context";
import { causeFor, tierFor } from "../../lib/causes";
import { isInsideArea, shortArea } from "../../lib/location";
import VoiceRecorder from "../../components/VoiceRecorder";

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

export default function StandDetail() {
  const params = useParams();
  const router = useRouter();
  const { colors } = useTheme();
  const { RED, GOLD, WHITE, BG, CARD, BORDER, MUTED } = colors;

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
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
  const [mediaFailed, setMediaFailed] = useState(false);

  useEffect(() => {
    load();
  }, [params.id]);

  async function load() {
    const { data: sess } = await supabase.auth.getSession();
    setSession(sess?.session || null);
    if (sess?.session) {
      const { data: me } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", sess.session.user.id)
        .maybeSingle();
      setProfile(me);
    }

    const { data: s } = await supabase.from("stands").select("*").eq("id", params.id).maybeSingle();
    if (!s) {
      setNotFound(true);
      return;
    }
    setStand(s);
    setDetails(s.details || "");

    const { data: prof } = await supabase
      .from("profiles")
      .select("name, username, causes, home_location")
      .eq("id", s.user_id)
      .maybeSingle();
    setAuthor(prof);

    if (sess?.session) {
      const { data: sup } = await supabase
        .from("supports")
        .select("id")
        .eq("stand_id", s.id)
        .eq("user_id", sess.session.user.id)
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
        .select("id, name, username, home_location")
        .in("id", ids);
      const map = {};
      (profs || []).forEach((p) => {
        map[p.id] = p;
      });
      setSpeakers(map);
    }

    const { data: ups } = await supabase
      .from("stand_updates")
      .select("*")
      .eq("stand_id", s.id)
      .order("created_at", { ascending: false });
    setUpdates(ups || []);
  }

  async function handleSupport() {
    if (!session || supported) return;
    setSupported(true);
    const { error } = await supabase.from("supports").insert({ stand_id: stand.id, user_id: session.user.id });
    if (error) {
      setSupported(false);
      return;
    }
    await supabase.rpc("increment_support", { stand_id_param: stand.id });
    load();
  }

  async function handleResolve() {
    await supabase.from("stands").delete().eq("id", stand.id);
    router.push("/");
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
    if (!session) return;
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
    const { error: insErr } = await supabase.from("voices").insert({
      stand_id: stand.id,
      user_id: session.user.id,
      audio_url,
      location_label: profile?.home_location || null,
    });
    if (insErr) setVoiceError(insErr.message);
    setPostingVoice(false);
    load();
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG }}>
        <div className="text-center">
          <p className="mb-3" style={{ color: MUTED }}>This stand doesn't exist or was resolved.</p>
          <a href="/" className="text-sm font-bold" style={{ color: GOLD }}>Back to the wall</a>
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
  const momentumPct = Math.min(stand.support_count * 6, 100);
  const isMine = session && stand.user_id === session.user.id;
  const initial = author ? author.name.charAt(0).toUpperCase() : "?";

  const insideVoices = voices.filter((v) =>
    isInsideArea(stand.location_label, v.location_label || speakers[v.user_id]?.home_location)
  );
  const outsideVoices = voices.filter((v) => !insideVoices.includes(v));

  function VoiceRow({ v }) {
    const sp = speakers[v.user_id];
    const area = shortArea(v.location_label || sp?.home_location);
    return (
      <div className="mb-3 rounded-lg p-3" style={{ backgroundColor: CARD, border: "1px solid " + BORDER }}>
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
            style={{ backgroundColor: GOLD, color: "#1a1400" }}
          >
            {(sp?.name || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black truncate" style={{ color: WHITE }}>{sp?.name || "Someone"}</p>
            <p className="text-[10px] truncate" style={{ color: MUTED }}>
              {area ? `${area} · ` : ""}{formatWhen(v.created_at)}
            </p>
          </div>
        </div>
        <audio src={v.audio_url} controls className="w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: BG }}>
      <div className="max-w-md mx-auto px-4 py-6">
        <a href="/" className="text-sm mb-5 inline-flex items-center gap-1 font-bold" style={{ color: MUTED }}>
          <ArrowLeft size={14} />
          Back to the wall
        </a>

        <div className="flex items-center justify-between mb-4">
          <span
            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full"
            style={{ border: "1px solid " + cause.color, color: cause.color }}
          >
            <CIcon size={12} />
            {stand.category || "General"}
          </span>
          {tier === "movement" && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-full"
              style={{ backgroundColor: RED, color: "#fff" }}
            >
              <Flame size={11} /> Movement
            </span>
          )}
          {tier === "surging" && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase" style={{ color: RED }}>
              <Flame size={13} /> Surging
            </span>
          )}
          {tier === "milestone" && <Trophy size={16} color={GOLD} />}
        </div>

        {author && (
          <a
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
          </a>
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
            <Sparkles size={13} />
            {stand.tagline}
          </p>
        )}

        <p className="flex items-center gap-1 text-xs mt-3 mb-4" style={{ color: MUTED }}>
          <Clock size={12} />
          Filed {formatWhen(stand.created_at)}
        </p>

        {stand.media_url && !mediaFailed && (
          <div className="mb-4 rounded-lg overflow-hidden">
            {stand.media_type === "video" ? (
              <video
                src={stand.media_url}
                controls
                className="w-full max-h-[420px] object-cover"
                onError={() => setMediaFailed(true)}
              />
            ) : (
              <img
                src={stand.media_url}
                alt=""
                className="w-full max-h-[420px] object-cover"
                onError={() => setMediaFailed(true)}
              />
            )}
          </div>
        )}
        {stand.audio_url && <audio src={stand.audio_url} controls className="w-full mb-4" />}
        {stand.location_label && (
          <p className="text-sm flex items-center gap-1 mb-4" style={{ color: MUTED }}>
            <MapPin size={14} />
            {stand.location_label}
          </p>
        )}

        <div className="mb-4">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: BORDER }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: momentumPct + "%", background: "linear-gradient(to right, " + RED + ", " + GOLD + ")" }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSupport}
              disabled={supported || !session}
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={
                supported
                  ? { backgroundColor: RED, border: "2px solid " + RED }
                  : { backgroundColor: "transparent", border: "2px solid " + WHITE }
              }
            >
              ✊
            </button>
            <span className="text-sm font-bold" style={{ color: GOLD }}>
              {stand.support_count} standing with this
            </span>
          </div>
          {isMine && (
            <button
              onClick={handleResolve}
              className="text-xs px-3 py-2 rounded flex items-center gap-1 font-bold"
              style={{ border: "1px solid " + GOLD, color: GOLD }}
            >
              <CheckCircle2 size={13} />
              Resolved
            </button>
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

          {updates.length === 0 && (
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
            <VoiceRecorder onSubmit={handlePostVoice} submitting={postingVoice} />
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
              From this area ({insideVoices.length})
            </p>
            {insideVoices.map((v) => (
              <VoiceRow key={v.id} v={v} />
            ))}
          </div>
        )}

        {outsideVoices.length > 0 && (
          <div className="mb-5">
            <p
              className="text-[11px] font-black uppercase tracking-wide mb-2 flex items-center gap-1"
              style={{ color: MUTED }}
            >
              <Globe size={12} />
              Standing from elsewhere ({outsideVoices.length})
            </p>
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
