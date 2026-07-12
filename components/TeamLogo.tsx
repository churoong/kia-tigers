"use client";

import { useState } from "react";

const COLORS: Record<string, string> = {
  HT: "#EA0029", // KIA
  LT: "#041E42", // 롯데
  NC: "#315288", // NC
  SK: "#CE0E2D", // SSG
  SS: "#074CA1", // 삼성
  OB: "#131230", // 두산
  WO: "#570514", // 키움
  LG: "#C30452", // LG
  KT: "#000000", // KT
  HH: "#FF6600", // 한화
};

export default function TeamLogo({
  code,
  name,
  emblem,
  size = 56,
}: {
  code: string;
  name: string;
  emblem?: string;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const bg = COLORS[code] ?? "#333";

  if (broken || !emblem) {
    return (
      <div
        className="flex items-center justify-center rounded-full font-display text-white shadow-lg"
        style={{ width: size, height: size, background: bg, fontSize: size * 0.4 }}
        aria-label={name}
      >
        {name.slice(0, 2)}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={emblem}
      alt={name}
      width={size}
      height={size}
      onError={() => setBroken(true)}
      className="rounded-full bg-white/90 object-contain p-1 shadow-lg"
      style={{ width: size, height: size }}
    />
  );
}
