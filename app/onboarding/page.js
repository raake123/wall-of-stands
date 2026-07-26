"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const CAUSES = ["Environment", "Education", "Health", "Justice", "Housing", "Labor", "Democracy", "Climate"];

export default function Onboarding() {
  const router = useRouter();
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
      setError(error.message);
      return;
    }
    router.push("/");
  }

  if (!session) {
    return (
      <div className="max-w-sm mx-auto py-16 px-4 text-center">
        <p className="text-[#e8e4da]">Log in first to continue.</p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto py-16 px-4 min-h-screen bg-[#150f18]">
      {step === 1 && (
        <div>
          <h1
            className="text-2xl italic font-bold text-[#f0e8d8] mb-2"
            style={{ fontFamily: "Georgia, serif" }}
          >
            What's your name?
          </h1>
          <input
            className="w-full bg-[#241b28] border border-[#3a2c40] text-[#f0e8d8] p-3 rounded mt-4 mb-4"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            disabled={!name.trim()}
            onClick={() => setStep(2)}
            className="w-full bg-[#d9a668] text-[#2b1f0f] p-3 rounded-full font-medium disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h1
            className="text-2xl italic font-bold text-[#f0e8d8] mb-2"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Choose a username
          </h1>
          <input
            className="w-full bg-[#241b28] border border-[#3a2c40] text-[#f0e8d8] p-3 rounded mt-4 mb-4"
            placeholder="username"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
            }
          />
          <button
            disabled={!username.trim()}
            onClick={() => setStep(3)}
            className="w-full bg-[#d9a668] text-[#2b1f0f] p-3 rounded-full font-medium disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      )}

      {step === 3 && (
        <div>
          <h1
            className="text-2xl italic font-bold text-[#f0e8d8] mb-2"
            style={{ fontFamily: "Georgia, serif" }}
          >
            What do you stand for?
          </h1>
          <p className="text-[#9b7fa3] text-sm mb-4">Pick at least one cause</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {CAUSES.map((c) => (
              <button
                key={c}
                onClick={() => toggleCause(c)}
                className={
                  causes.includes(c)
                    ? "px-3 py-2 rounded-full text-sm border bg-[#d9a668] text-[#2b1f0f] border-[#d9a668]"
                    : "px-3 py-2 rounded-full text-sm border bg-[#241b28] text-[#c9a5d1] border-[#3a2c40]"
                }
              >
                {c}
              </button>
            ))}
          </div>
          {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
          <button
            disabled={causes.length === 0}
            onClick={finish}
            className="w-full bg-[#d9a668] text-[#2b1f0f] p-3 rounded-full font-medium disabled:opacity-40"
          >
            Enter Wall of Stands
          </button>
        </div>
      )}
    </div>
  );
}