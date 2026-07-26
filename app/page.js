"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  User,
  Send,
  MessageCircle,
  CheckCircle2,
  Leaf,
  GraduationCap,
  Heart,
  Scale,
  Home as HomeIcon,
  Hammer,
  Landmark,
  Cloud,
  Trophy,
  Flame,
  Sun,
  Moon,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { useTheme } from "./lib/theme-context";

const CAUSES = [
  { name: "Environment", color: "#2ecc71", Icon: Leaf },
  { name: "Education", color: "#4cc9f0", Icon: GraduationCap },
  { name: "Health", color: "#ff4d6d", Icon: Heart },
  { name: "Justice", color: "#ffd60a", Icon: Scale },
  { name: "Housing", color: "#f77f00", Icon: HomeIcon },
  { name: "Labor", color: "#adb5bd", Icon: Hammer },
  { name: "Democracy", color: "#9d4edd", Icon: Landmark },
  { name: "Climate", color: "#06d6a0", Icon: Cloud },
];

function causeFor(name) {
  return CAUSES.find((c) => c.name === name) || CAUSES[0];
}

function tierFor(count) {
  if (count >= 50) return "movement";
  if (count >= 25) return "surging";
  if (count >= 10) return "milestone";
  return null;
}

export default function Home() {
  const router = useRouter();
  const { colors, theme, toggleTheme } = useTheme();
  const { RED, GOLD, WHITE, BG, CARD, BORDER, MUTED } = colors;

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
  const [dropping, setDropping] = useState(false);
  const [filter, setFilter] = useState("All");
  const [sortMode, setSortMode] = useState("new");
  const [justLandedId, setJustLandedId] = useState(null);
  const [burstId, setBurstId] = useState(null);

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

  async function handlePost() {
    if (!text.trim() || dropping) return;
    setDropping(true);
    setTimeout(async () => {
      const { data } = await supabase
        .from("stands")
        .insert({ text, user_id: session.user.id, category })
        .select()
        .maybeSingle();
      setText("");
      setDropping(false);
      await loadStands();
      if (data) {
        setJustLandedId(data.id);
        setTimeout(() => setJustLandedId(null), 600);
      }
    }, 550);
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
  const composerPx = text ? 260 : 104;
  const ringGap = text ? 9 : 0;

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
            className={dropping ? "animate-drop" : ""}
            style={{
              position: "relative",
              width: composerPx,
              height: composerPx,
              transition: "width 420ms cubic-bezier(.34,1.2,.4,1), height 420ms cubic-bezier(.34,1.2,.4,1)",
            }}
          >
            {text && (
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
                backgroundColor: text ? "#1a1400" : CARD,
                border: text ? "none" : "2px solid " + BORDER,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "width 420ms cubic-bezier(.34,1.2,.4,1), height 420ms cubic-bezier(.34,1.2,.4,1), background-color 300ms",
              }}
            >
              <textarea
                className="bg-transparent text-center w-full h-full outline-none resize-none text-sm font-bold p-5"
                style={{ color: text ? GOLD : WHITE }}
                placeholder="I stand for..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
          </div>
        </div>

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
          className="w-full p-3 rounded-full font-bold uppercase tracking-wide mb-6 flex items-center justify-center gap-2"
          style={{ backgroundColor: RED, color: "#fff" }}
        >
          <Send size={15} />
          File this stand
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
                (justLandedId === s.id ? " animate-landed" : "")
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
              <p className="mb-3 font-medium" style={{ color: WHITE }}>{s.text}</p>

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
              <button
                onClick={() => toggleComments(s.id)}
                className="text-xs flex items-center gap-1"
                style={{ color: MUTED }}
              >
                <MessageCircle size={13} />
                {openComments[s.id] ? "Hide responses" : "View responses"}
              </button>
              {openComments[s.id] && (
                <div className="mt-3 pt-3" style={{ borderTop: "1px solid " + BORDER }}>
                  {(comments[s.id] || []).map((c) => (
                    <div key={c.id} className="mb-2">
                      <span className="text-xs font-bold" style={{ color: GOLD }}>
                        @{commenterNames[c.user_id] || "..."}
                      </span>
                      <p className="text-sm" style={{ color: WHITE }}>{c.text}</p>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input
                      className="flex-1 text-sm p-2 rounded"
                      style={{ backgroundColor: BG, border: "1px solid " + BORDER, color: WHITE }}
                      placeholder="Add a response"
                      value={commentText[s.id] || ""}
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
