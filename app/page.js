"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabase";

const CAUSES = ["Environment", "Education", "Health", "Justice", "Housing", "Labor", "Democracy", "Climate"];

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [stands, setStands] = useState([]);
  const [mySupports, setMySupports] = useState([]);
  const [text, setText] = useState("");
  const [category, setCategory] = useState(CAUSES[0]);

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
    const { data } = await supabase
      .from("stands")
      .select("*")
      .order("created_at", { ascending: false });
    setStands(data || []);
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
              onClick={() => setAuthMode("login")}
              className={
                authMode === "login"
                  ? "flex-1 pb-2 text-sm font-medium text-[#d9a668] border-b-2 border-[#d9a668]"
                  : "flex-1 pb-2 text-sm text-[#9b7fa3]"
              }
            >
              Log In
            </button>
            <button
              onClick={() => setAuthMode("signup")}
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

          {authError && <p className="text-red-400 text-sm mb-2">{authError}</p>}

          {authMode === "login" ? (
            <button
              onClick={handleLogIn}
              className="w-full bg-[#d9a668] text-[#2b1f0f] p-3 rounded-full font-medium"
            >
              Log In
            </button>
          ) : (
            <button
              onClick={handleSignUp}
              className="w-full bg-[#d9a668] text-[#2b1f0f] p-3 rounded-full font-medium"
            >
              Sign Up
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#150f18]">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)}>
          <div className="bg-[#1c1521] w-64 h-full p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-[#f0e8d8] font-medium mb-1">{profile ? profile.name : ""}</p>
            <p className="text-[#9b7fa3] text-sm mb-6">@{profile ? profile.username : ""}</p>
            {profile && (
              <a href={"/profile/" + profile.username} className="block text-[#c9a5d1] mb-3">
                My profile
              </a>
            )}
            <button onClick={handleLogOut} className="text-[#c23b32] text-sm">
              Log out
            </button>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setSidebarOpen(true)} className="text-[#f0e8d8]" aria-label="Menu">
            ☰
          </button>
          <h1
            className="text-xl italic font-bold text-[#f0e8d8]"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Wall of Stands
          </h1>
          <div className="w-6" />
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

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-[#241b28] border border-[#3a2c40] text-[#c9a5d1] p-2 rounded mb-3 text-sm"
        >
          {CAUSES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button
          onClick={handlePost}
          className="w-full bg-[#d9a668] text-[#2b1f0f] p-3 rounded-full font-medium mb-8"
        >
          File this stand
        </button>

        {stands.map((s) => {
          const supported = mySupports.includes(s.id);
          const isMine = s.user_id === session.user.id;
          return (
            <div
              key={s.id}
              className="bg-[#241b28] border border-[#3a2c40] border-l-4 border-l-[#d9a668] p-4 mb-4"
            >
              <span className="inline-flex items-center gap-1 bg-[#4a3620] text-[#d9a668] text-xs px-3 py-1 rounded-full mb-2">
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
                    className="bg-[#2e4535] text-[#a8d9bf] text-xs px-3 py-2 rounded"
                  >
                    Resolved
                  </button>
                )}
              </div>
              <button onClick={() => toggleComments(s.id)} className="text-[#9b7fa3] text-xs">
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
    </div>
  );
}