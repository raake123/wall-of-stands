"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Moon, Flame, PlusCircle, CheckCircle2, ShieldCheck, ShieldAlert, Clock } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/theme-context";
import { useAuth } from "../lib/auth-context";

const TABS = [
  { href: "/", label: "Ongoing", Icon: Flame },
  { href: "/create", label: "Create", Icon: PlusCircle },
  { href: "/resolved", label: "Resolved", Icon: CheckCircle2 },
];

function AuthScreen() {
  const { colors, theme, toggleTheme } = useTheme();
  const { RED, GOLD, WHITE, BG, CARD, BORDER, MUTED } = colors;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [agreed, setAgreed] = useState(false);

  async function handleSignUp() {
    setAuthError("");
    if (!email.trim() || !password.trim()) {
      setAuthError("Enter an email and password first.");
      return;
    }
    if (!agreed) {
      setAuthError("Please read and accept the privacy notice and rules first.");
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

  const showSignupHint =
    authMode === "login" && authError.includes("Invalid login credentials");

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG }}>
      <div className="max-w-sm w-full">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-4xl font-black uppercase tracking-tight" style={{ color: WHITE }}>
            Wall of <span style={{ color: RED }}>Stands</span>
          </h1>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ border: "1.5px solid " + BORDER, color: GOLD, backgroundColor: CARD }}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
        <p className="text-sm mb-6" style={{ color: MUTED }}>
          Where a stand is filed, not just posted.
        </p>

        <div className="flex mb-4" style={{ borderBottom: "1px solid " + BORDER }}>
          {["login", "signup"].map((m) => (
            <button
              key={m}
              onClick={() => {
                setAuthMode(m);
                setAuthError("");
              }}
              className="flex-1 pb-2 text-sm font-bold uppercase tracking-wide"
              style={
                authMode === m
                  ? { color: GOLD, borderBottom: "2px solid " + GOLD }
                  : { color: MUTED }
              }
            >
              {m === "login" ? "Log In" : "Sign Up"}
            </button>
          ))}
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

        {authMode === "signup" && (
          <label className="flex items-start gap-2 mb-1 mt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 flex-shrink-0"
              style={{ accentColor: GOLD }}
            />
            <span className="text-[11px]" style={{ color: MUTED }}>
              I've read the{" "}
              <Link href="/privacy" style={{ color: GOLD, fontWeight: 700 }}>
                privacy notice and rules
              </Link>
              , and I agree my name, area and stands are visible to other members. No
              Aadhaar or ID is ever asked for.
            </span>
          </label>
        )}

        <button
          onClick={authMode === "login" ? handleLogIn : handleSignUp}
          className="w-full p-3 rounded-full font-bold uppercase tracking-wide mt-2"
          style={{ backgroundColor: RED, color: "#fff" }}
        >
          {authMode === "login" ? "Log In" : "Sign Up"}
        </button>

        <Link
          href="/privacy"
          className="block text-center text-[11px] font-bold mt-5"
          style={{ color: MUTED }}
        >
          Privacy & rules
        </Link>
      </div>
    </div>
  );
}

function RecoveryScreen() {
  const { colors } = useTheme();
  const { RED, GOLD, WHITE, BG, CARD, BORDER } = colors;
  const { setRecoveryMode } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [resetMsg, setResetMsg] = useState("");

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

export default function AppChrome({ children }) {
  const pathname = usePathname();
  const { colors, theme, toggleTheme } = useTheme();
  const { RED, GOLD, WHITE, BG, CARD, BORDER, MUTED } = colors;
  const { session, profile, approved, recoveryMode } = useAuth();

  if (recoveryMode) return <RecoveryScreen />;
  if (!session) return <AuthScreen />;

  const initial = profile ? profile.name.charAt(0).toUpperCase() : "";
  const status = profile?.verification_status || "unverified";

  const joinBanner =
    !profile || approved
      ? null
      : status === "pending"
      ? { Icon: Clock, color: GOLD, text: "Your request to join is being reviewed. You can read the wall meanwhile." }
      : status === "rejected"
      ? { Icon: ShieldAlert, color: RED, text: "Your request wasn't approved — tap to ask again." }
      : {
          Icon: ShieldCheck,
          color: GOLD,
          text: "Join to file a stand, stand with one, or speak out. An invite code from a neighbour gets you in straight away.",
        };

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG }}>
      <div
        className="sticky top-0 z-20"
        style={{ backgroundColor: BG, borderBottom: "1px solid " + BORDER }}
      >
        <div className="max-w-md mx-auto px-4 pt-4">
          <div className="flex items-center justify-between mb-3">
            <Link href="/" className="text-xl font-black uppercase tracking-tight" style={{ color: WHITE }}>
              Wall of <span style={{ color: RED }}>Stands</span>
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ border: "1.5px solid " + BORDER, color: GOLD, backgroundColor: CARD }}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              {profile && (
                <Link
                  href={"/profile/" + profile.username}
                  aria-label="Your profile"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black"
                  style={{ backgroundColor: GOLD, color: "#1a1400" }}
                >
                  {initial}
                </Link>
              )}
            </div>
          </div>

          <div className="flex gap-2 pb-3">
            {TABS.map((t) => {
              const active = pathname === t.href;
              const TIcon = t.Icon;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className="flex-1 py-2 rounded-full text-[11px] font-black uppercase tracking-wide flex items-center justify-center gap-1"
                  style={
                    active
                      ? { backgroundColor: RED, color: "#fff" }
                      : { border: "1px solid " + BORDER, color: MUTED, backgroundColor: CARD }
                  }
                >
                  <TIcon size={13} />
                  {t.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-5">
        {joinBanner && (
          <Link
            href="/verify"
            className="flex items-start gap-2 rounded-lg p-3 mb-4 text-xs"
            style={{ border: "1px solid " + joinBanner.color, color: joinBanner.color, backgroundColor: CARD }}
          >
            <joinBanner.Icon size={15} className="flex-shrink-0 mt-0.5" />
            <span>{joinBanner.text}</span>
          </Link>
        )}
        {children}
      </div>
    </div>
  );
}
