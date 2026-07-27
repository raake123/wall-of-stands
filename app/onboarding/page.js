"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Leaf,
  GraduationCap,
  Heart,
  Scale,
  Home as HomeIcon,
  Hammer,
  Landmark,
  Cloud,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/theme-context";

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

export default function Onboarding() {
  const router = useRouter();
  const { colors } = useTheme();
  const { RED, GOLD, WHITE, BG, CARD, BORDER, MUTED } = colors;

  const [session, setSession] = useState(null);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [causes, setCauses] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  function toggleCause(c) {
    setCauses((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  async function finish() {
    setError("");
    const { error } = await supabase.from("profiles").insert({
      id: session.user.id,
      name,
      username,
      causes,
    });
    if (error) {
      setError(
        error.code === "23505"
          ? "That username is already taken — try another."
          : error.message
      );
      return;
    }
    router.push("/");
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BG }}>
        <p style={{ color: MUTED }}>Log in first to continue.</p>
      </div>
    );
  }

  const inputStyle = {
    backgroundColor: CARD,
    border: "1px solid " + BORDER,
    color: WHITE,
  };

  const StepDots = (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: n === step ? 32 : 10,
            backgroundColor: n <= step ? GOLD : BORDER,
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: BG }}>
      <div className="max-w-sm w-full">
        {StepDots}

        {step === 1 && (
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight mb-1" style={{ color: WHITE }}>
              What's your <span style={{ color: RED }}>name</span>?
            </h1>
            <p className="text-sm mb-6" style={{ color: MUTED }}>
              This is how you'll show up on the wall.
            </p>
            <input
              className="w-full p-3 rounded mb-4"
              style={inputStyle}
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              disabled={!name.trim()}
              onClick={() => setStep(2)}
              className="w-full p-3 rounded-full font-bold uppercase tracking-wide disabled:opacity-30"
              style={{ backgroundColor: RED, color: "#fff" }}
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight mb-1" style={{ color: WHITE }}>
              Choose a <span style={{ color: RED }}>username</span>
            </h1>
            <p className="text-sm mb-6" style={{ color: MUTED }}>
              Lowercase letters, numbers, and underscores only.
            </p>
            <input
              className="w-full p-3 rounded mb-4"
              style={inputStyle}
              placeholder="username"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
              }
            />
            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="px-5 p-3 rounded-full font-bold uppercase tracking-wide"
                style={{ border: "1px solid " + BORDER, color: MUTED }}
              >
                Back
              </button>
              <button
                disabled={!username.trim()}
                onClick={() => setStep(3)}
                className="flex-1 p-3 rounded-full font-bold uppercase tracking-wide disabled:opacity-30"
                style={{ backgroundColor: RED, color: "#fff" }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight mb-1" style={{ color: WHITE }}>
              What do you <span style={{ color: RED }}>stand for</span>?
            </h1>
            <p className="text-sm mb-4" style={{ color: MUTED }}>Pick at least one cause</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {CAUSES.map((c) => {
                const CIcon = c.Icon;
                const active = causes.includes(c.name);
                return (
                  <button
                    key={c.name}
                    onClick={() => toggleCause(c.name)}
                    className="flex items-center gap-1 px-3 py-2 rounded-full text-sm font-bold"
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
            {error && <p className="text-sm mb-2" style={{ color: RED }}>{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setStep(2)}
                className="px-5 p-3 rounded-full font-bold uppercase tracking-wide"
                style={{ border: "1px solid " + BORDER, color: MUTED }}
              >
                Back
              </button>
              <button
                disabled={causes.length === 0}
                onClick={finish}
                className="flex-1 p-3 rounded-full font-bold uppercase tracking-wide disabled:opacity-30"
                style={{ backgroundColor: GOLD, color: "#1a1400" }}
              >
                Enter Wall of Stands
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
