"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  User,
  Target,
  MessageCircle,
  CheckCircle2,
  Home as HomeIcon,
  Trophy,
  Flame,
  Sun,
  Moon,
  TrendingUp,
  Sparkles,
  Image as ImageIcon,
  Video,
  Music,
  MapPin,
  X,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { useTheme } from "./lib/theme-context";
import { CAUSES, causeFor, tierFor } from "./lib/causes";

const TEXT_LIMIT = 120;
const DETAILS_LIMIT = 2000;
const COMMENT_LIMIT = 300;
const TAGLINE_LIMIT = 80;

export default function Home() {
  const router = useRouter();
  const { colors, theme, toggleTheme } = useTheme();
  const { RED, GOLD, WHITE, BG, CARD, CARD_ALT, BORDER, MUTED } = colors;

  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  const [stands, setStands] = useState([]);
  const [loadingStands, setLoadingStands] = useState(true);
  const [mySupports, setMySupports] = useState([]);
  const [text, setText] = useState("");
  const [category, setCategory] = useState(CAUSES[0].name);
  const [dropPhase, setDropPhase] = useState("idle");
  const [filter, setFilter] = useState("All");
  const [sortMode, setSortMode] = useState("new");
  const [justLandedId, setJustLandedId] = useState(null);
  const [burstId, setBurstId] = useState(null);

  const [mediaFile, setMediaFile] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [details, setDetails] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [tagline, setTagline] = useState("");
  const [showTagline, setShowTagline] = useState(false);
  const [postError, setPostError] = useState("");

  const [openComments, setOpenComments] = useState({});
  const [comments, setComments] = useState({});
  const [commentText, setCommentText] = useState({});
  const [commenterNames, setCommenterNames] = useState({});

  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      }
    });
    loadStands();
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadMySupports();
      loadProfile();
    }
  }, [session]);

  async function loadProfile() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();
    if (!data) {
      router.push("/onboarding");
      return;
    }
    setProfile(data);
  }

  async function loadStands() {
    setLoadingStands(true);
    const { data } = await supabase
      .from("stands")
      .select("*")
      .order("created_at", { ascending: false });
    setStands(data || []);
    setLoadingStands(false);
  }

  async function loadMySupports() {
    const { data } = await supabase
      .from("supports")
      .select("stand_id")
      .eq("user_id", session.user.id);
    setMySupports((data || []).map((s) => s.stand_id));
  }

  async function handleSignUp() {
    setAuthError("");
    if (!email.trim() || !password.trim()) {
      setAuthError("Enter an email and password first.");
      return;
    }
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) setAuthError(error.message);
  }

  async function handleLogIn() {
    setAuthError("");
    if (!email.trim() || !password.trim()) {
      setAuthError("Enter an email and password first.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) setAuthError(error.message);
  }

  async function handleForgotPassword() {
    setAuthError("");
    if (!email.trim()) {
      setAuthError("Type your email above, then tap Forgot password.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) setAuthError(error.message);
    else setAuthError("Check your email for a reset link.");
  }

  async function handleSetNewPassword() {
    setResetMsg("");
    if (!newPassword.trim() || newPassword.length < 6) {
      setResetMsg("Password must be at least 6 characters.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setResetMsg(error.message);
      return;
    }
    setRecoveryMode(false);
    setNewPassword("");
  }

  async function handleLogOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  function handleMediaSelect(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setMediaFile(file);
    setMediaType(file.type.startsWith("video") ? "video" : "photo");
    setMediaPreview(URL.createObjectURL(file));
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

  function handleUseLocation() {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Location isn't supported in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          setLocationLabel(
            data.display_name
              ? data.display_name.split(",").slice(0, 3).join(",")
              : `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`
          );
        } catch {
          setLocationLabel(`${latitude.toFixed(3)}, ${longitude.toFixed(3)}`);
        }
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocationError(
          err.code === 1
            ? "Location permission denied. Allow it in your browser's site settings."
            : "Couldn't get your location. Try again."
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }

  async function handlePost() {
    if (!text.trim() || dropPhase !== "idle") return;
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
            if (upErr) {
              failures.push(`photo/video: ${upErr.message || upErr.error || JSON.stringify(upErr)}`);
            } else {
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
            if (upErr) {
              failures.push(`audio: ${upErr.message || upErr.error || JSON.stringify(upErr)}`);
            } else {
              audio_url = supabase.storage.from("stand-media").getPublicUrl(path).data.publicUrl;
            }
          } catch (e) {
            failures.push(`audio threw: ${e?.message || String(e)}`);
          }
        }
        if (failures.length) {
          setPostError(failures.join(" | "));
        }
        const { data } = await supabase
          .from("stands")
          .insert({
            text,
            user_id: session.user.id,
            category,
            media_url,
            media_type,
            audio_url,
            location_label: locationLabel || null,
            details: details.trim() || null,
            tagline: tagline.trim() || null,
          })
          .select()
          .maybeSingle();
        setText("");
        clearMedia();
        clearAudio();
        setLocationLabel("");
        setDetails("");
        setShowDetails(false);
        setTagline("");
        setShowTagline(false);
        setUploading(false);
        setDropPhase("idle");
        await loadStands();
        if (data) {
          setJustLandedId(data.id);
          setTimeout(() => setJustLandedId(null), 700);
        }
      }, 520);
    }, 280);
  }

  async function handleSupport(id, currentCount) {
    if (mySupports.includes(id)) return;
    setBurstId(id);
    setTimeout(() => setBurstId(null), 600);
    const { error } = await supabase
      .from("supports")
      .insert({ stand_id: id, user_id: session.user.id });
    if (error) return;
    await supabase.from("stands").update({ support_count: currentCount + 1 }).eq("id", id);
    loadStands();
    loadMySupports();
  }

  async function handleResolve(id) {
    await supabase.from("stands").delete().eq("id", id);
    loadStands();
  }

  async function toggleComments(standId) {
    const isOpen = openComments[standId];
    setOpenComments({ ...openComments, [standId]: !isOpen });
    if (!isOpen && !comments[standId]) {
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("stand_id", standId)
        .order("created_at", { ascending: true });
      setComments({ ...comments, [standId]: data || [] });
      const ids = [...new Set((data || []).map((c) => c.user_id))];
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", ids);
        const map = { ...commenterNames };
        (profs || []).forEach((p) => {
          map[p.id] = p.username;
        });
        setCommenterNames(map);
      }
    }
  }

  async function handleComment(standId) {
    const txt = commentText[standId];
    if (!txt || !txt.trim()) return;
    await supabase.from("comments").insert({ stand_id: standId, user_id: session.user.id, text: txt });
    setCommentText({ ...commentText, [standId]: "" });
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("stand_id", standId)
      .order("created_at", { ascending: true });
    setComments({ ...comments, [standId]: data || [] });
  }

  const ThemeToggle = (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="w-9 h-9 rounded-full flex items-center justify-center"
      style={{ border: "1.5px solid " + BORDER, color: GOLD, backgroundColor: CARD }}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );

  if (recoveryMode) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG }}>
        <div className="max-w-sm w-full">
          <h1 className="text-2xl font-black uppercase tracking-wide mb-4" style={{ color: WHITE }}>
            Set a new password
          </h1>
          <input
            className="w-full p-3 rounded mb-2"
            style={{ backgroundColor: CARD, border: "1px solid " + BORDER, color: WHITE }}
            placeholder="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          {resetMsg && <p className="text-sm mb-2" style={{ color: RED }}>{resetMsg}</p>}
          <button
            onClick={handleSetNewPassword}
            className="w-full p-3 rounded-full font-bold"
            style={{ backgroundColor: GOLD, color: "#1a1400" }}
          >
            Update password
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    const showSignupHint =
      authMode === "login" && authError.includes("Invalid login credentials");
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG }}>
        <div className="max-w-sm w-full">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-4xl font-black uppercase tracking-tight" style={{ color: WHITE }}>
              Wall of <span style={{ color: RED }}>Stands</span>
            </h1>
            {ThemeToggle}
          </div>
          <p className="text-sm mb-6" style={{ color: MUTED }}>
            Where a stand is filed, not just posted.
          </p>

          <div className="flex mb-4" style={{ borderBottom: "1px solid " + BORDER }}>
            <button
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
              }}
              className="flex-1 pb-2 text-sm font-bold uppercase tracking-wide"
              style={
                authMode === "login"
                  ? { color: GOLD, borderBottom: "2px solid " + GOLD }
                  : { color: MUTED }
              }
            >
              Log In
            </button>
            <button
              onClick={() => {
                setAuthMode("signup");
                setAuthError("");
              }}
              className="flex-1 pb-2 text-sm font-bold uppercase tracking-wide"
              style={
                authMode === "signup"
                  ? { color: GOLD, borderBottom: "2px solid " + GOLD }
                  : { color: MUTED }
              }
            >
              Sign Up
            </button>
          </div>

          <input
            className="w-full p-3 rounded mb-2"
            style={{ backgroundColor: CARD, border: "1px solid " + BORDER, color: WHITE }}
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full p-3 rounded mb-2"
            style={{ backgroundColor: CARD, border: "1px solid " + BORDER, color: WHITE }}
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {authMode === "login" && (
            <button
              onClick={handleForgotPassword}
              className="text-xs underline mb-3 block"
              style={{ color: MUTED }}
            >
              Forgot password?
            </button>
          )}

          {authError && <p className="text-sm mb-1" style={{ color: RED }}>{authError}</p>}
          {showSignupHint && (
            <button
              onClick={() => {
                setAuthMode("signup");
                setAuthError("");
              }}
              className="text-xs underline mb-2 block"
              style={{ color: GOLD }}
            >
              No account with this email yet — tap to sign up instead
            </button>
          )}

          {authMode === "login" ? (
            <button
              onClick={handleLogIn}
              className="w-full p-3 rounded-full font-bold uppercase tracking-wide mt-2"
              style={{ backgroundColor: RED, color: "#fff" }}
            >
              Log In
            </button>
          ) : (
            <button
              onClick={handleSignUp}
              className="w-full p-3 rounded-full font-bold uppercase tracking-wide mt-2"
              style={{ backgroundColor: RED, color: "#fff" }}
            >
              Sign Up
            </button>
          )}
        </div>
      </div>
    );
  }

  const initial = profile ? profile.name.charAt(0).toUpperCase() : "";
  const totalSupporters = stands.reduce((sum, s) => sum + (s.support_count || 0), 0);
  const filteredStands = filter === "All" ? stands : stands.filter((s) => s.category === filter);
  const visibleStands =
    sortMode === "rising"
      ? [...filteredStands].sort((a, b) => (b.support_count || 0) - (a.support_count || 0))
      : filteredStands;
  const dropping = dropPhase !== "idle";
  const composerPx = Math.min(108 + text.length * 5, 250);
  const ringGap = text || dropping ? 9 : 0;
  const composerActive = Boolean(text) || dropping;

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: BG }}>
      <div
        className={
          "max-w-md mx-auto px-4 py-6 transition-all duration-500 " +
          (mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")
        }
      >
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: WHITE }}>
            Wall of <span style={{ color: RED }}>Stands</span>
          </h1>
          <div className="flex items-center gap-2">
            {ThemeToggle}
            {profile && (
              <a
                href={"/profile/" + profile.username}
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: GOLD, color: "#1a1400" }}
              >
                {initial}
              </a>
            )}
          </div>
        </div>

        <div
          className="flex justify-between px-4 py-3 rounded-lg mb-6"
          style={{ backgroundColor: CARD, border: "1px solid " + BORDER }}
        >
          <div className="text-center flex-1">
            <p className="text-lg font-black" style={{ color: GOLD }}>{stands.length}</p>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>Stands filed</p>
          </div>
          <div className="text-center flex-1" style={{ borderLeft: "1px solid " + BORDER }}>
            <p className="text-lg font-black" style={{ color: RED }}>{totalSupporters}</p>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>Total supporters</p>
          </div>
        </div>

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
                transition: "width 320ms cubic-bezier(.34,1.2,.4,1), height 320ms cubic-bezier(.34,1.2,.4,1), background-color 300ms",
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
        <p className="text-center text-[11px] mb-3" style={{ color: text.length >= TEXT_LIMIT ? RED : MUTED }}>
          {text.length}/{TEXT_LIMIT} — keep it short, add the full story below
        </p>

        <div className="flex justify-center gap-3 mb-3">
          <label
            className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
            style={{ border: "1px solid " + BORDER, color: mediaFile ? GOLD : MUTED, backgroundColor: CARD }}
          >
            {mediaType === "video" ? <Video size={15} /> : <ImageIcon size={15} />}
            <input type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaSelect} />
          </label>
          <label
            className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
            style={{ border: "1px solid " + BORDER, color: audioFile ? GOLD : MUTED, backgroundColor: CARD }}
          >
            <Music size={15} />
            <input type="file" accept="audio/*" className="hidden" onChange={handleAudioSelect} />
          </label>
          <button
            onClick={handleUseLocation}
            disabled={locating}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ border: "1px solid " + BORDER, color: locationLabel ? GOLD : MUTED, backgroundColor: CARD }}
          >
            {locating ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
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
            <p className="font-black uppercase mb-1">Upload failed</p>
            <p>{postError}</p>
          </div>
        )}

        {(mediaPreview || audioPreview || locationLabel) && (
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
                <button onClick={clearMedia} style={{ color: RED }}>
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
                <button onClick={clearAudio} style={{ color: RED }}>
                  <X size={13} />
                </button>
              </div>
            )}
            {locationLabel && (
              <div
                className="flex items-center gap-2 pl-3 pr-1 py-1 rounded-full text-xs"
                style={{ border: "1px solid " + BORDER, color: MUTED }}
              >
                <MapPin size={12} />
                {locationLabel}
                <button onClick={() => setLocationLabel("")} style={{ color: RED }}>
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
        )}

        {showTagline ? (
          <div className="mb-3">
            <input
              className="w-full p-2.5 rounded text-sm font-bold"
              style={{ backgroundColor: CARD, border: "1px solid " + GOLD, color: GOLD }}
              placeholder="A catchy one-liner to hook people in..."
              value={tagline}
              maxLength={TAGLINE_LIMIT}
              onChange={(e) => setTagline(e.target.value)}
            />
            <p className="text-right text-[11px] mt-1" style={{ color: MUTED }}>{tagline.length}/{TAGLINE_LIMIT}</p>
          </div>
        ) : (
          <button
            onClick={() => setShowTagline(true)}
            className="text-xs font-bold flex items-center gap-1 mx-auto mb-3"
            style={{ color: GOLD }}
          >
            <Sparkles size={12} />
            + Add a tagline (optional)
          </button>
        )}

        {showDetails ? (
          <div className="mb-4">
            <textarea
              className="w-full p-3 rounded text-sm"
              style={{ backgroundColor: CARD, border: "1px solid " + BORDER, color: WHITE, minHeight: 100 }}
              placeholder="Add the full story — what happened, why it matters..."
              value={details}
              maxLength={DETAILS_LIMIT}
              onChange={(e) => setDetails(e.target.value)}
            />
            <p className="text-right text-[11px] mt-1" style={{ color: MUTED }}>{details.length}/{DETAILS_LIMIT}</p>
          </div>
        ) : (
          <button
            onClick={() => setShowDetails(true)}
            className="text-xs font-bold block mx-auto mb-4"
            style={{ color: GOLD }}
          >
            + Add the full story (optional)
          </button>
        )}

        <div className="flex flex-wrap gap-2 justify-center mb-4">
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
          disabled={dropping || uploading}
          className="w-full p-3 rounded-full font-bold uppercase tracking-wide mb-6 flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ backgroundColor: RED, color: "#fff" }}
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Target size={15} />}
          Drop This Stand
        </button>

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setSortMode("new")}
            className="flex-1 py-2 rounded-full text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-1"
            style={
              sortMode === "new"
                ? { backgroundColor: GOLD, color: "#1a1400" }
                : { border: "1px solid " + BORDER, color: MUTED }
            }
          >
            <Sparkles size={12} />
            New
          </button>
          <button
            onClick={() => setSortMode("rising")}
            className="flex-1 py-2 rounded-full text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-1"
            style={
              sortMode === "rising"
                ? { backgroundColor: RED, color: "#fff" }
                : { border: "1px solid " + BORDER, color: MUTED }
            }
          >
            <TrendingUp size={12} />
            Rising
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
          <button
            onClick={() => setFilter("All")}
            className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold"
            style={
              filter === "All"
                ? { backgroundColor: WHITE, color: BG }
                : { border: "1px solid " + BORDER, color: MUTED }
            }
          >
            All
          </button>
          {CAUSES.map((c) => (
            <button
              key={c.name}
              onClick={() => setFilter(c.name)}
              className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold"
              style={
                filter === c.name
                  ? { backgroundColor: c.color, color: "#0a0a0a" }
                  : { border: "1px solid " + BORDER, color: MUTED }
              }
            >
              {c.name}
            </button>
          ))}
        </div>

        {loadingStands && (
          <p className="text-sm text-center py-10" style={{ color: MUTED }}>
            Loading the wall...
          </p>
        )}

        {!loadingStands && visibleStands.length === 0 && (
          <div className="text-center py-14">
            <Flame size={32} color={BORDER} className="mx-auto mb-3" />
            <p className="text-sm" style={{ color: MUTED }}>No stands here yet.</p>
            <p className="text-xs mt-1" style={{ color: BORDER }}>Be the first.</p>
          </div>
        )}

        {visibleStands.map((s) => {
          const supported = mySupports.includes(s.id);
          const isMine = s.user_id === session.user.id;
          const cause = causeFor(s.category);
          const CIcon = cause.Icon;
          const tier = tierFor(s.support_count);
          const momentumPct = Math.min(s.support_count * 6, 100);
          const glowClass =
            tier === "movement" || tier === "surging"
              ? "animate-surging"
              : tier === "milestone"
              ? "animate-milestone"
              : "";
          return (
            <div
              key={s.id}
              className={
                "rounded-lg p-4 mb-4 " +
                glowClass +
                (justLandedId === s.id ? " animate-impact" : "")
              }
              style={{ backgroundColor: CARD, borderLeft: "4px solid " + cause.color }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full"
                  style={{ border: "1px solid " + cause.color, color: cause.color }}
                >
                  <CIcon size={12} />
                  {s.category || "General"}
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
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase"
                    style={{ color: RED }}
                  >
                    <Flame size={13} /> Surging
                  </span>
                )}
                {tier === "milestone" && <Trophy size={16} color={GOLD} />}
              </div>
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1">
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
                      <Sparkles size={11} />
                      {s.tagline}
                    </p>
                  )}
                </div>
                {s.media_url && (
                  <Link
                    href={`/stand/${s.id}`}
                    className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 relative"
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
              {s.audio_url && (
                <audio src={s.audio_url} controls className="w-full mb-3" />
              )}
              {s.location_label && (
                <p className="text-xs flex items-center gap-1 mb-2" style={{ color: MUTED }}>
                  <MapPin size={12} />
                  {s.location_label}
                </p>
              )}

              <div className="mb-2">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: BORDER }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: momentumPct + "%", background: "linear-gradient(to right, " + RED + ", " + GOLD + ")" }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSupport(s.id, s.support_count)}
                    disabled={supported}
                    className={"w-10 h-10 rounded-full flex items-center justify-center " + (burstId === s.id ? "animate-rally" : "")}
                    style={
                      supported
                        ? { backgroundColor: RED, border: "2px solid " + RED }
                        : { backgroundColor: "transparent", border: "2px solid " + WHITE }
                    }
                  >
                    ✊
                  </button>
                  <span className="text-sm font-bold" style={{ color: GOLD }}>
                    {s.support_count} standing with this
                  </span>
                </div>
                {isMine && (
                  <button
                    onClick={() => handleResolve(s.id)}
                    className="text-xs px-3 py-2 rounded flex items-center gap-1 font-bold"
                    style={{ border: "1px solid " + GOLD, color: GOLD }}
                  >
                    <CheckCircle2 size={13} />
                    Resolved
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => toggleComments(s.id)}
                  className="text-xs flex items-center gap-1"
                  style={{ color: MUTED }}
                >
                  <MessageCircle size={13} />
                  {openComments[s.id] ? "Hide responses" : "View responses"}
                </button>
                <Link
                  href={`/stand/${s.id}`}
                  className="text-xs font-bold flex items-center gap-1"
                  style={{ color: GOLD }}
                >
                  Full story
                  <ChevronRight size={13} />
                </Link>
              </div>
              {openComments[s.id] && (
                <div className="mt-3 pt-3" style={{ borderTop: "1px solid " + BORDER }}>
                  {(comments[s.id] || []).map((c) => (
                    <div key={c.id} className="mb-2">
                      <span className="text-xs font-bold" style={{ color: GOLD }}>
                        @{commenterNames[c.user_id] || "..."}
                      </span>
                      <p
                        className="text-sm"
                        style={{ color: WHITE, wordBreak: "break-word", overflowWrap: "anywhere" }}
                      >
                        {c.text}
                      </p>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input
                      className="flex-1 text-sm p-2 rounded"
                      style={{ backgroundColor: BG, border: "1px solid " + BORDER, color: WHITE }}
                      placeholder="Add a response"
                      value={commentText[s.id] || ""}
                      maxLength={COMMENT_LIMIT}
                      onChange={(e) =>
                        setCommentText({ ...commentText, [s.id]: e.target.value })
                      }
                    />
                    <button
                      onClick={() => handleComment(s.id)}
                      className="text-sm px-3 rounded font-bold"
                      style={{ backgroundColor: RED, color: "#fff" }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 flex justify-around py-3"
        style={{ backgroundColor: CARD, borderTop: "1px solid " + BORDER }}
      >
        <div className="flex flex-col items-center" style={{ color: RED }}>
          <HomeIcon size={20} />
          <span className="text-[10px] mt-1 font-bold">Wall</span>
        </div>
        {profile && (
          <a href={"/profile/" + profile.username} className="flex flex-col items-center" style={{ color: MUTED }}>
            <User size={20} />
            <span className="text-[10px] mt-1 font-bold">Profile</span>
          </a>
        )}
        <button onClick={handleLogOut} className="flex flex-col items-center" style={{ color: MUTED }}>
          <LogOut size={20} />
          <span className="text-[10px] mt-1 font-bold">Log out</span>
        </button>
      </div>
    </div>
  );
}
