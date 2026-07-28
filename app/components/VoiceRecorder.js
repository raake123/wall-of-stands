"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2, Send, Loader2 } from "lucide-react";
import { useTheme } from "../lib/theme-context";

import { VOICE_SECONDS as MAX_SECONDS, VOICES_PER_STAND } from "../lib/limits";

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || "";
}

export default function VoiceRecorder({ onSubmit, submitting, remaining = VOICES_PER_STAND }) {
  const { colors } = useTheme();
  const { RED, GOLD, WHITE, CARD, BORDER, MUTED } = colors;

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState("");

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function startRecording() {
    setError("");
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Recording isn't supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const recorded = new Blob(chunksRef.current, { type });
        setBlob(recorded);
        setPreviewUrl(URL.createObjectURL(recorded));
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) stopRecording();
          return s + 1;
        });
      }, 1000);
    } catch (e) {
      setError(
        e?.name === "NotAllowedError"
          ? "Mic permission denied. Allow microphone access to speak out."
          : "Couldn't start recording."
      );
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current);
    setRecording(false);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  function discard() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setBlob(null);
    setPreviewUrl(null);
    setSeconds(0);
  }

  async function submit() {
    if (!blob) return;
    await onSubmit(blob);
    discard();
  }

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  if (previewUrl) {
    return (
      <div className="rounded-lg p-3" style={{ backgroundColor: CARD, border: "1px solid " + BORDER }}>
        <audio src={previewUrl} controls className="w-full mb-3" />
        <div className="flex gap-2">
          <button
            onClick={discard}
            disabled={submitting}
            className="px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1 disabled:opacity-50"
            style={{ border: "1px solid " + BORDER, color: MUTED }}
          >
            <Trash2 size={13} />
            Discard
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 py-2 rounded-full text-xs font-black uppercase tracking-wide flex items-center justify-center gap-1 disabled:opacity-50"
            style={{ backgroundColor: RED, color: "#fff" }}
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {submitting ? "Posting..." : "Post my voice"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {recording ? (
        <button
          onClick={stopRecording}
          className="w-full py-3 rounded-full font-black uppercase tracking-wide flex items-center justify-center gap-2 animate-surging"
          style={{ backgroundColor: RED, color: "#fff" }}
        >
          <Square size={14} />
          Stop — {mmss}
        </button>
      ) : remaining <= 0 ? (
        <div
          className="w-full py-3 rounded-full text-[11px] font-bold text-center"
          style={{ border: "1px solid " + BORDER, color: MUTED }}
        >
          You've used both your voices on this stand
        </div>
      ) : (
        <button
          onClick={startRecording}
          className="w-full py-3 rounded-full font-black uppercase tracking-wide flex items-center justify-center gap-2"
          style={{ border: "2px solid " + RED, color: RED, backgroundColor: "transparent" }}
        >
          <Mic size={15} />
          Speak out
        </button>
      )}
      {!recording && remaining > 0 && (
        <p className="text-[11px] text-center mt-1.5" style={{ color: MUTED }}>
          {remaining} of {VOICES_PER_STAND} left on this stand · {MAX_SECONDS} seconds each
        </p>
      )}
      {recording && (
        <p className="text-[11px] text-center mt-1" style={{ color: MUTED }}>
          Max {MAX_SECONDS}s — your name and area are shown with your voice.
        </p>
      )}
      {error && (
        <p className="text-xs text-center mt-2" style={{ color: RED }}>{error}</p>
      )}
    </div>
  );
}
