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
} from "lucide-react";
import { supabase } from "./lib/supabase";

const CAUSES = [
  { name: "Environment", color: "#5a8a6b", Icon: Leaf },
  { name: "Education", color: "#4a6fa5", Icon: GraduationCap },
  { name: "Health", color: "#c2645a", Icon: Heart },
  { name: "Justice", color: "#d9a668", Icon: Scale },
  { name: "Housing", color: "#b56b45", Icon: HomeIcon },
  { name: "Labor", color: "#6b7a8f", Icon: Hammer },
  { name: "Democracy", color: "#7a5a94", Icon: Landmark },
  { name: "Climate", color: "#4a9187", Icon: Cloud },
];

function causeFor(name) {
  return CAUSES.find((c) => c.name === name) || CAUSES[0];
}

export default function Home() {
  const router = useRouter();
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

  const [openComments, setOpenComments] = useState({});
  const [comments, setComments] = useState({});
  const [commentText, setCommentText] = useState({});
  const [commenterNames, setCommenterNames] = useState({});

  useEffect(() => {
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
    if (!text.trim()) return;
    await supabase.from("stands").insert({ text, user_id: session.user.id, category });
    setText("");
    loadStands();
  }

  async function handleSupport(id, currentCount) {
    if (mySupports.includes(id)) return;
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

  if (recoveryMode) {
    return (
      <div className="min-h-screen bg-[#150f18] flex items-center justify-center px-4">
        <div className="max-w-sm w-full">
          <h1
            className="text-2xl italic font-bold text-[#f0e8d8] mb-4"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Set a new password
          </h1>
          <input
            className="w-full bg-[#241b28] border border-[#3a2c40] text-[#f0e8d8] p-3 rounded mb-2"
            placeholder="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          {resetMsg && <p className="text-red-400 text-sm mb-2">{resetMsg}</p>}
          <button
            onClick={handleSetNewPassword}
            className="w-full bg-[#d9a668] text-[#2b1f0f] p-3 rounded-full font-medium"
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
      <div className="min-h-screen bg-[#150f18] flex items-center justify-center px-4">
        <div className="max-w-sm w-full">
          <h1
            className="text-3xl italic font-bold text-[#f0e8d8] mb-1"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Wall of Stands
          </h1>
          <p className="text-[#9b7fa3] text-sm mb-6">
            Where a stand is filed, not just posted.
          </p>

          <div className="flex mb-4 border-b border-[#3a2c40]">
            <button
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
              }}
              className={
                authMode === "login"
                  ? "flex-1 pb-2 text-sm font-medium text-[#d9a668] border-b-2 border-[#d9a668]"
                  : "flex-1 pb-2 text-sm text-[#9b7fa3]"
              }
            >
              Log In
            </button>
            <button
              onClick={() => {
                setAuthMode("signup");
                setAuthError("");
              }}
              className={
                authMode === "signup"
                  ? "flex-1 pb-2 text-sm font-medium text-[#d9a668] border-b-2 border-[#d9a668]"
                  : "flex-1 pb-2 text-sm text-[#9b7fa3]"
              }
            >
              Sign Up
            </button>
          </div>

          <input
            className="w-full bg-[#241b28] border border-[#3a2c40] text-[#f0e8d8] p-3 rounded mb-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full bg-[#241b28] border border-[#3a2c40] text-[#f0e8d8] p-3 rounded mb-2"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {authMode === "login" && (
            <button
              onClick={handleForgotPassword}
              className="text-[#9b7fa3] text-xs underline mb-3 block"
            >
              Forgot password?
            </button>
          )}

          {authError && <p className="text-red-400 text-sm mb-1">{authError}</p>}
          {showSignupHint && (
            <button
              onClick={() => {
                setAuthMode("signup");
                setAuthError("");
              }}
              className="text-[#d9a668] text-xs underline mb-2 block"
            >
              No account with this email yet — tap to sign up instead
            </button>
          )}

          {authMode === "login" ? (
            <button
              onClick={handleLogIn}
              className="w-full bg-[#d9a668] text-[#2b1f0f] p-3 rounded-full font-medium mt-2"
            >
              Log In
            </button>
          ) : (
            <button
              onClick={handleSignUp}
              className="w-full bg-[#d9a668] text-[#2b1f0f] p-3 rounded-full font-medium mt-2"
            >
              Sign Up
            </button>
          )}
        </div>
      </div>
    );
  }

  const initial = profile ? profile.name.charAt(0).toUpperCase() : "";

  return (
    <div className="min-h-screen bg-[#150f18] pb-20">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-xl italic font-bold text-[#f0e8d8]"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Wall of Stands
          </h1>
          {profile && (
            <a href={"/profile/" + profile.username} className="w-9 h-9 rounded-full bg-[#4a3620] text-[#d9a668] flex items-center justify-center text-sm font-medium">{initial}</a>
          )}
        </div>

        <p className="text-[#9b7fa3] text-xs text-center mb-2">
          Tap the circle, declare your stand
        </p>
        <div className="flex justify-center mb-3">
          <div
            className={
              text
                ? "rounded-full bg-[#332538] border border-[#d9a668] flex items-center justify-center transition-all duration-200 p-4 w-56 h-56"
                : "rounded-full bg-[#2c2032] border border-[#4a3650] flex items-center justify-center transition-all duration-200 p-4 w-28 h-28"
            }
          >
            <textarea
              className="bg-transparent text-center text-[#f0e8d8] w-full h-full outline-none resize-none text-sm"
              style={{ fontFamily: "Georgia, serif" }}
              placeholder="I stand for..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
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
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border transition-colors"
                style={
                  active
                    ? { borderColor: c.color, color: c.color, backgroundColor: "#20232e" }
                    : { borderColor: "#3a2c40", color: "#9b7fa3", backgroundColor: "transparent" }
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
          className="w-full bg-[#d9a668] text-[#2b1f0f] p-3 rounded-full font-medium mb-8 flex items-center justify-center gap-2"
        >
          <Send size={15} />
          File this stand
        </button>

        {loadingStands && (
          <p className="text-[#6b6f80] text-sm text-center py-10">
            Loading the wall...
          </p>
        )}

        {!loadingStands && stands.length === 0 && (
          <div className="text-center py-14">
            <Landmark size={32} color="#4a3650" className="mx-auto mb-3" />
            <p className="text-[#9b7fa3] text-sm">
              No one has filed a stand yet.
            </p>
            <p className="text-[#6b6f80] text-xs mt-1">Be the first.</p>
          </div>
        )}

        {stands.map((s) => {
          const supported = mySupports.includes(s.id);
          const isMine = s.user_id === session.user.id;
          const cause = causeFor(s.category);
          const CIcon = cause.Icon;
          return (
            <div
              key={s.id}
              className="bg-[#241b28] border border-[#3a2c40] p-4 mb-4"
              style={{ borderLeft: "4px solid " + cause.color }}
            >
              <span
                className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full mb-2 border"
                style={{ borderColor: cause.color, color: cause.color }}
              >
                <CIcon size={12} />
                {s.category || "General"}
              </span>
              <p className="text-[#f0e8d8] mb-3" style={{ fontFamily: "Georgia, serif" }}>
                {s.text}
              </p>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSupport(s.id, s.support_count)}
                    disabled={supported}
                    className={
                      supported
                        ? "w-10 h-10 rounded-full flex items-center justify-center border transition-colors bg-[#c23b32] border-[#e0574c] text-[#2b0e0b]"
                        : "w-10 h-10 rounded-full flex items-center justify-center border transition-colors bg-[#2a2534] border-[#4a3650] text-[#b09bb8]"
                    }
                    aria-label="Stand with this"
                  >
                    ✊
                  </button>
                  <span className="text-[#c9a5d1] text-sm">
                    {s.support_count} standing with this
                  </span>
                </div>
                {isMine && (
                  <button
                    onClick={() => handleResolve(s.id)}
                    className="bg-[#2e4535] text-[#a8d9bf] text-xs px-3 py-2 rounded flex items-center gap-1"
                  >
                    <CheckCircle2 size={13} />
                    Resolved
                  </button>
                )}
              </div>
              <button
                onClick={() => toggleComments(s.id)}
                className="text-[#9b7fa3] text-xs flex items-center gap-1"
              >
                <MessageCircle size={13} />
                {openComments[s.id] ? "Hide responses" : "View responses"}
              </button>
              {openComments[s.id] && (
                <div className="mt-3 pt-3 border-t border-[#3a2c40]">
                  {(comments[s.id] || []).map((c) => (
                    <div key={c.id} className="mb-2">
                      <span className="text-[#d9a668] text-xs">
                        @{commenterNames[c.user_id] || "..."}
                      </span>
                      <p className="text-[#e8e4da] text-sm">{c.text}</p>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input
                      className="flex-1 bg-[#1c1521] border border-[#3a2c40] text-[#f0e8d8] text-sm p-2 rounded"
                      placeholder="Add a response"
                      value={commentText[s.id] || ""}
                      onChange={(e) =>
                        setCommentText({ ...commentText, [s.id]: e.target.value })
                      }
                    />
                    <button
                      onClick={() => handleComment(s.id)}
                      className="bg-[#d9a668] text-[#2b1f0f] text-sm px-3 rounded"
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

      <div className="fixed bottom-0 left-0 right-0 bg-[#1c1521] border-t border-[#3a2c40] flex justify-around py-3">
        <div className="flex flex-col items-center text-[#d9a668]">
          <HomeIcon size={20} />
          <span className="text-[10px] mt-1">Wall</span>
        </div>
        {profile && (
          <a href={"/profile/" + profile.username} className="flex flex-col items-center text-[#9b7fa3]">
            <User size={20} />
            <span className="text-[10px] mt-1">Profile</span>
          </a>
        )}
        <button onClick={handleLogOut} className="flex flex-col items-center text-[#9b7fa3]">
          <LogOut size={20} />
          <span className="text-[10px] mt-1">Log out</span>
        </button>
      </div>
    </div>
  );
}