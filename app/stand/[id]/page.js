"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  CheckCircle2,
  Trophy,
  Flame,
  Send,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme-context";
import { causeFor, tierFor } from "../../lib/causes";

export default function StandDetail() {
  const params = useParams();
  const router = useRouter();
  const { colors } = useTheme();
  const { RED, GOLD, WHITE, BG, CARD, BORDER, MUTED } = colors;

  const [session, setSession] = useState(null);
  const [stand, setStand] = useState(null);
  const [author, setAuthor] = useState(null);
  const [supported, setSupported] = useState(false);
  const [comments, setComments] = useState([]);
  const [commenterNames, setCommenterNames] = useState({});
  const [commentText, setCommentText] = useState("");
  const [details, setDetails] = useState("");
  const [editingDetails, setEditingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    load();
  }, [params.id]);

  async function load() {
    const { data: s } = await supabase.from("stands").select("*").eq("id", params.id).maybeSingle();
    if (!s) {
      setNotFound(true);
      return;
    }
    setStand(s);
    setDetails(s.details || "");

    const { data: prof } = await supabase
      .from("profiles")
      .select("name, username, causes")
      .eq("id", s.user_id)
      .maybeSingle();
    setAuthor(prof);

    const { data: sess } = await supabase.auth.getSession();
    if (sess?.session) {
      const { data: sup } = await supabase
        .from("supports")
        .select("id")
        .eq("stand_id", s.id)
        .eq("user_id", sess.session.user.id)
        .maybeSingle();
      setSupported(Boolean(sup));
    }

    const { data: cs } = await supabase
      .from("comments")
      .select("*")
      .eq("stand_id", s.id)
      .order("created_at", { ascending: true });
    setComments(cs || []);
    const ids = [...new Set((cs || []).map((c) => c.user_id))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, username").in("id", ids);
      const map = {};
      (profs || []).forEach((p) => {
        map[p.id] = p.username;
      });
      setCommenterNames(map);
    }
  }

  async function handleSupport() {
    if (!session || supported) return;
    setSupported(true);
    const { error } = await supabase.from("supports").insert({ stand_id: stand.id, user_id: session.user.id });
    if (error) {
      setSupported(false);
      return;
    }
    await supabase.from("stands").update({ support_count: stand.support_count + 1 }).eq("id", stand.id);
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

  async function handleComment() {
    if (!commentText.trim() || !session) return;
    await supabase.from("comments").insert({ stand_id: stand.id, user_id: session.user.id, text: commentText });
    setCommentText("");
    const { data: cs } = await supabase
      .from("comments")
      .select("*")
      .eq("stand_id", stand.id)
      .order("created_at", { ascending: true });
    setComments(cs || []);
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
            <div>
              <p className="font-black" style={{ color: WHITE }}>{author.name}</p>
              <p className="text-xs" style={{ color: MUTED }}>@{author.username}</p>
            </div>
          </a>
        )}

        <p
          className="text-xl font-bold mb-4"
          style={{ color: WHITE, wordBreak: "break-word", overflowWrap: "anywhere" }}
        >
          {stand.text}
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
        {stand.media_url && mediaFailed && (
          <p className="text-xs mb-4" style={{ color: MUTED }}>
            Attached media couldn't be loaded (the file may have failed to upload).
          </p>
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
              disabled={supported}
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
              <button
                onClick={() => setEditingDetails(true)}
                className="text-xs font-bold"
                style={{ color: GOLD }}
              >
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
            <p className="text-sm whitespace-pre-wrap" style={{ color: WHITE }}>{stand.details}</p>
          ) : (
            <p className="text-sm" style={{ color: MUTED }}>
              {isMine ? "Add the full story so people know what happened." : "No additional story yet."}
            </p>
          )}
        </div>

        <p className="text-xs font-black uppercase tracking-wide mb-3" style={{ color: MUTED }}>
          Responses ({comments.length})
        </p>
        {comments.map((c) => (
          <div key={c.id} className="mb-3">
            <span className="text-xs font-bold" style={{ color: GOLD }}>@{commenterNames[c.user_id] || "..."}</span>
            <p className="text-sm" style={{ color: WHITE }}>{c.text}</p>
          </div>
        ))}
        {session && (
          <div className="flex gap-2 mt-2">
            <input
              className="flex-1 text-sm p-2 rounded"
              style={{ backgroundColor: CARD, border: "1px solid " + BORDER, color: WHITE }}
              placeholder="Add a response"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button
              onClick={handleComment}
              className="px-3 rounded font-bold flex items-center"
              style={{ backgroundColor: RED, color: "#fff" }}
            >
              <Send size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
