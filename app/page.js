"use client";

import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function Home() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [stands, setStands] = useState([]);
  const [mySupports, setMySupports] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    loadStands();
  }, []);

  useEffect(() => {
    if (session) loadMySupports();
  }, [session]);

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
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setAuthError(error.message);
  }

  async function handleLogIn() {
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setAuthError(error.message);
  }

  async function handleLogOut() {
    await supabase.auth.signOut();
  }

  async function handlePost() {
    if (!text.trim()) return;
    await supabase
      .from("stands")
      .insert({ text, user_id: session.user.id });
    setText("");
    loadStands();
  }

  async function handleSupport(id, currentCount) {
    if (mySupports.includes(id)) return;

    const { error } = await supabase
      .from("supports")
      .insert({ stand_id: id, user_id: session.user.id });

    if (error) return;

    await supabase
      .from("stands")
      .update({ support_count: currentCount + 1 })
      .eq("id", id);

    loadStands();
    loadMySupports();
  }

  if (!session) {
    return (
      <div className="max-w-sm mx-auto py-16 px-4">
        <h1 className="text-xl font-semibold mb-4">Wall of Stands</h1>
        <input
          className="w-full border rounded p-2 mb-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full border rounded p-2 mb-2"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {authError && (
          <p className="text-red-600 text-sm mb-2">{authError}</p>
        )}
        <button
          className="w-full bg-black text-white rounded p-2 mb-2"
          onClick={handleLogIn}
        >
          Log In
        </button>
        <button
          className="w-full border rounded p-2"
          onClick={handleSignUp}
        >
          Sign Up
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <div className="flex justify-between items-center mb-6">
        <span className="text-sm text-gray-500">{session.user.email}</span>
        <button className="text-sm underline" onClick={handleLogOut}>
          Log Out
        </button>
      </div>

      <input
        className="w-full border rounded p-2 mb-2"
        placeholder="What do you stand for?"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        className="w-full bg-black text-white rounded p-2 mb-6"
        onClick={handlePost}
      >
        Post
      </button>

      {stands.map((s) => {
        const alreadySupported = mySupports.includes(s.id);
        return (
          <div
            key={s.id}
            className="flex justify-between items-center border rounded p-3 mb-2"
          >
            <span>{s.text}</span>
            <button
              disabled={alreadySupported}
              onClick={() => handleSupport(s.id, s.support_count)}
              className={alreadySupported ? "opacity-40" : ""}
            >
              ❤️ {s.support_count}
            </button>
          </div>
        );
      })}
    </div>
  );
}"use client";

import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function Home() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [stands, setStands] = useState([]);
  const [mySupports, setMySupports] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    loadStands();
  }, []);

  useEffect(() => {
    if (session) loadMySupports();
  }, [session]);

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
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setAuthError(error.message);
  }

  async function handleLogIn() {
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setAuthError(error.message);
  }

  async function handleLogOut() {
    await supabase.auth.signOut();
  }

  async function handlePost() {
    if (!text.trim()) return;
    await supabase
      .from("stands")
      .insert({ text, user_id: session.user.id });
    setText("");
    loadStands();
  }

  async function handleSupport(id, currentCount) {
    if (mySupports.includes(id)) return;

    const { error } = await supabase
      .from("supports")
      .insert({ stand_id: id, user_id: session.user.id });

    if (error) return;

    await supabase
      .from("stands")
      .update({ support_count: currentCount + 1 })
      .eq("id", id);

    loadStands();
    loadMySupports();
  }

  if (!session) {
    return (
      <div className="max-w-sm mx-auto py-16 px-4">
        <h1 className="text-xl font-semibold mb-4">Wall of Stands</h1>
        <input
          className="w-full border rounded p-2 mb-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full border rounded p-2 mb-2"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {authError && (
          <p className="text-red-600 text-sm mb-2">{authError}</p>
        )}
        <button
          className="w-full bg-black text-white rounded p-2 mb-2"
          onClick={handleLogIn}
        >
          Log In
        </button>
        <button
          className="w-full border rounded p-2"
          onClick={handleSignUp}
        >
          Sign Up
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <div className="flex justify-between items-center mb-6">
        <span className="text-sm text-gray-500">{session.user.email}</span>
        <button className="text-sm underline" onClick={handleLogOut}>
          Log Out
        </button>
      </div>

      <input
        className="w-full border rounded p-2 mb-2"
        placeholder="What do you stand for?"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        className="w-full bg-black text-white rounded p-2 mb-6"
        onClick={handlePost}
      >
        Post
      </button>

      {stands.map((s) => {
        const alreadySupported = mySupports.includes(s.id);
        return (
          <div
            key={s.id}
            className="flex justify-between items-center border rounded p-3 mb-2"
          >
            <span>{s.text}</span>
            <button
              disabled={alreadySupported}
              onClick={() => handleSupport(s.id, s.support_count)}
              className={alreadySupported ? "opacity-40" : ""}
            >
              ❤️ {s.support_count}
            </button>
          </div>
        );
      })}
    </div>
  );
}