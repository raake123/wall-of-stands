"use client";

import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function Home() {
  const [stands, setStands] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    loadStands();
  }, []);

  async function loadStands() {
    const { data } = await supabase
      .from("stands")
      .select("*")
      .order("created_at", { ascending: false });
    setStands(data || []);
  }

  async function handlePost() {
    if (!text.trim()) return;
    await supabase.from("stands").insert({ text });
    setText("");
    loadStands();
  }

  async function handleSupport(id, currentCount) {
    await supabase
      .from("stands")
      .update({ support_count: currentCount + 1 })
      .eq("id", id);
    loadStands();
  }

  return (
    <div className="max-w-md mx-auto py-16 px-4">
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

      {stands.map((s) => (
        <div
          key={s.id}
          className="flex justify-between items-center border rounded p-3 mb-2"
        >
          <span>{s.text}</span>
          <button onClick={() => handleSupport(s.id, s.support_count)}>
            ❤️ {s.support_count}
          </button>
        </div>
      ))}
    </div>
  );
}