import { ReactNode } from "react";
import { GameResult } from "@/lib/types";

export function Section({
  title,
  emoji,
  subtitle,
  children,
}: {
  title: string;
  emoji: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-xl">{emoji}</span>
        <h2 className="font-display text-2xl text-white">{title}</h2>
        {subtitle && (
          <span className="ml-auto text-xs text-white/50">{subtitle}</span>
        )}
      </div>
      {children}
    </section>
  );
}

const RESULT_STYLE: Record<GameResult, { bg: string; label: string }> = {
  W: { bg: "bg-emerald-500 text-emerald-950", label: "승" },
  L: { bg: "bg-rose-500 text-rose-950", label: "패" },
  D: { bg: "bg-amber-400 text-amber-950", label: "무" },
};

export function ResultPill({
  result,
  size = "md",
}: {
  result: GameResult;
  size?: "sm" | "md" | "lg";
}) {
  const s = RESULT_STYLE[result];
  const sizeCls =
    size === "lg"
      ? "h-9 px-4 text-lg"
      : size === "sm"
      ? "h-5 w-5 text-[11px]"
      : "h-7 px-3 text-sm";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-display ${s.bg} ${sizeCls}`}
    >
      {s.label}
    </span>
  );
}

export function Gauge({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const hue = Math.round((clamped / 100) * 130); // 0=빨강, 130=초록
  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-xs text-white/60">
        <span>😭 멘붕</span>
        <span className="font-display text-white tabular">{clamped}점</span>
        <span>🤩 축제</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${clamped}%`,
            background: `linear-gradient(90deg, hsl(0 80% 55%), hsl(${hue} 80% 50%))`,
          }}
        />
      </div>
    </div>
  );
}
