"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/theme-context";
import { detectLocation, formatLocation, emptyLocation } from "../lib/location";
import { CAUSES } from "../lib/causes";

export default function Onboarding() {
  const router = useRouter();
  const { colors } = useTheme();
  const { RED, GOLD, WHITE, BG, CARD, BORDER, MUTED } = colors;

  const [session, setSession] = useState(null);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [causes, setCauses] = useState([]);
  const [home, setHome] = useState(emptyLocation());
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  function toggleCause(c) {
    setCauses((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  async function handleDetect() {
    setLocationError("");
    setLocating(true);
    try {
      setHome(await detectLocation());
    } catch (e) {
      setLocationError(e.message + " You can type your area below instead.");
    }
    setLocating(false);
  }

  async function finish() {
    setError("");
    const { error } = await supabase.from("profiles").insert({
      id: session.user.id,
      name,
      username,
      causes,
      home_area: home.area.trim() || null,
      home_city: home.city.trim() || null,
      home_state: home.state.trim() || null,
      home_country: home.country.trim() || null,
      home_location: formatLocation(home) || null,
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
      {[1, 2, 3, 4].map((n) => (
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
                onClick={() => setStep(4)}
                className="flex-1 p-3 rounded-full font-bold uppercase tracking-wide disabled:opacity-30"
                style={{ backgroundColor: RED, color: "#fff" }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight mb-1" style={{ color: WHITE }}>
              Where do you <span style={{ color: RED }}>stand from</span>?
            </h1>
            <p className="text-sm mb-4" style={{ color: MUTED }}>
              Your area is shown with your voice, so people know whether an issue is
              being raised by locals or supported from outside.
            </p>
            <button
              onClick={handleDetect}
              disabled={locating}
              className="w-full py-2.5 rounded-full mb-4 flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-wide disabled:opacity-50"
              style={{ border: "1.5px solid " + GOLD, color: GOLD, backgroundColor: CARD }}
            >
              <MapPin size={14} />
              {locating ? "Detecting..." : "Use my current location"}
            </button>
            {locationError && <p className="text-xs mb-3" style={{ color: RED }}>{locationError}</p>}

            {[
              { key: "area", label: "Area / neighbourhood", ph: "e.g. Ayapakkam" },
              { key: "city", label: "City / district", ph: "e.g. Chennai" },
              { key: "state", label: "State", ph: "e.g. Tamil Nadu" },
              { key: "country", label: "Country", ph: "e.g. India" },
            ].map((f) => (
              <div key={f.key} className="mb-2">
                <label className="text-[10px] font-black uppercase tracking-wide" style={{ color: MUTED }}>
                  {f.label}
                </label>
                <input
                  className="w-full p-2.5 rounded mt-1"
                  style={inputStyle}
                  placeholder={f.ph}
                  value={home[f.key]}
                  maxLength={80}
                  onChange={(e) => setHome({ ...home, [f.key]: e.target.value })}
                />
              </div>
            ))}

            {formatLocation(home) && (
              <p className="text-xs mt-3 mb-1" style={{ color: GOLD, wordBreak: "break-word" }}>
                You'll show as: {formatLocation(home)}
              </p>
            )}

            {error && <p className="text-sm mb-2 mt-2" style={{ color: RED }}>{error}</p>}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setStep(3)}
                className="px-5 p-3 rounded-full font-bold uppercase tracking-wide"
                style={{ border: "1px solid " + BORDER, color: MUTED }}
              >
                Back
              </button>
              <button
                disabled={!home.area.trim() && !home.city.trim()}
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
