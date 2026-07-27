"use client";

import Link from "next/link";
import {
  MapPin,
  Clock,
  Mic,
  ChevronRight,
  Sparkles,
  Trophy,
  Flame,
  CheckCircle2,
} from "lucide-react";
import { useTheme } from "../lib/theme-context";
import { causeFor, tierFor } from "../lib/causes";
import { formatLocation, locOf } from "../lib/location";

export function formatWhen(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function StandCard({
  stand: s,
  supported,
  onSupport,
  bursting,
  landed,
  voiceCount = 0,
}) {
  const { colors } = useTheme();
  const { RED, GOLD, GREEN, WHITE, CARD, BORDER, MUTED } = colors;

  const cause = causeFor(s.category);
  const CIcon = cause.Icon;
  const tier = tierFor(s.support_count);
  const momentumPct = Math.min((s.support_count || 0) * 6, 100);
  const progress = s.progress || 0;
  const isResolved = Boolean(s.resolved_at);
  const locationText = formatLocation(locOf(s)) || s.location_label || "";

  const glowClass = isResolved
    ? ""
    : tier === "movement" || tier === "surging"
    ? "animate-surging"
    : tier === "milestone"
    ? "animate-milestone"
    : "";

  return (
    <div
      className={"rounded-lg p-4 mb-4 " + glowClass + (landed ? " animate-impact" : "")}
      style={{
        backgroundColor: CARD,
        borderLeft: "4px solid " + (isResolved ? GREEN : cause.color),
      }}
    >
      <div className="flex items-center justify-between mb-2 gap-2">
        <span
          className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full flex-shrink-0"
          style={{ border: "1px solid " + cause.color, color: cause.color }}
        >
          <CIcon size={12} />
          {s.category || "General"}
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

      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p
            className="font-bold inline"
            style={{
              color: "#1a1400",
              backgroundColor: GOLD,
              boxDecorationBreak: "clone",
              WebkitBoxDecorationBreak: "clone",
              padding: "2px 6px",
              borderRadius: 4,
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
          >
            {s.text}
          </p>
          {s.tagline && (
            <p
              className="flex items-center gap-1 text-xs font-bold italic mt-1.5"
              style={{ color: GOLD, wordBreak: "break-word", overflowWrap: "anywhere" }}
            >
              <Sparkles size={11} className="flex-shrink-0" />
              {s.tagline}
            </p>
          )}
        </div>
        {s.media_url && (
          <Link
            href={`/stand/${s.id}`}
            className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0"
          >
            {s.media_type === "video" ? (
              <video src={s.media_url} className="w-full h-full object-cover" />
            ) : (
              <img
                src={s.media_url}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
          </Link>
        )}
      </div>

      {s.audio_url && <audio src={s.audio_url} controls className="w-full mb-3" />}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
        {locationText && (
          <p
            className="text-xs flex items-center gap-1 min-w-0"
            style={{ color: MUTED, wordBreak: "break-word" }}
          >
            <MapPin size={12} className="flex-shrink-0" />
            {locationText}
          </p>
        )}
        <p className="text-xs flex items-center gap-1" style={{ color: MUTED }}>
          <Clock size={12} className="flex-shrink-0" />
          {formatWhen(s.created_at)}
        </p>
      </div>

      <div className="mb-1">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: BORDER }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: momentumPct + "%",
              background: "linear-gradient(to right, " + RED + ", " + GOLD + ")",
            }}
          />
        </div>
      </div>

      {(progress > 0 || isResolved) && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: MUTED }}>
              Progress
            </span>
            <span className="text-[10px] font-black" style={{ color: GREEN }}>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: BORDER }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: progress + "%", backgroundColor: GREEN }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => onSupport && onSupport(s.id)}
          disabled={supported || isResolved || !onSupport}
          className={
            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-70 " +
            (bursting ? "animate-rally" : "")
          }
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
            {s.support_count} standing with this
          </p>
          <p className="text-[11px] leading-tight" style={{ color: MUTED }}>
            <span style={{ color: RED, fontWeight: 700 }}>{s.support_in || 0} in</span>
            {" · "}
            <span style={{ fontWeight: 700 }}>{s.support_out || 0} out</span>
            {" of the area"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Link
          href={`/stand/${s.id}`}
          className="text-xs flex items-center gap-1 font-bold"
          style={{ color: voiceCount ? RED : MUTED }}
        >
          <Mic size={13} />
          {voiceCount ? `${voiceCount} ${voiceCount === 1 ? "voice" : "voices"}` : "Speak out"}
        </Link>
        <Link
          href={`/stand/${s.id}`}
          className="text-xs font-bold flex items-center gap-1"
          style={{ color: GOLD }}
        >
          Full story
          <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  );
}
