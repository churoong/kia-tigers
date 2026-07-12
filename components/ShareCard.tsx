"use client";

import { useState } from "react";

export default function ShareCard({ lines }: { lines: string[] }) {
  const [idx, setIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const text = lines[idx];

  async function copy() {
    try {
      await navigator.clipboard.writeText(text + "\n\n#기아타이거즈 #KIA #오늘의야구");
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-4">
      <div className="min-h-[56px] font-display text-lg leading-snug text-white">
        “{text}”
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setIdx((i) => (i + 1) % lines.length)}
          className="flex-1 rounded-xl bg-white/10 py-2 text-sm font-bold text-white/80 transition hover:bg-white/20 active:scale-95"
        >
          🎲 다른 문구
        </button>
        <button
          onClick={copy}
          className="flex-1 rounded-xl bg-kia-red py-2 text-sm font-bold text-white transition hover:brightness-110 active:scale-95"
        >
          {copied ? "복사됨! ✅" : "📋 복사하기"}
        </button>
      </div>
    </div>
  );
}
