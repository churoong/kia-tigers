import { PlayerPick } from "@/lib/types";

export default function PlayerCard({
  pick,
  kind,
}: {
  pick: PlayerPick;
  kind: "best" | "worst";
}) {
  const isBest = kind === "best";
  const accent = isBest
    ? "from-emerald-500/20 to-emerald-500/5 border-emerald-400/30"
    : "from-rose-500/20 to-rose-500/5 border-rose-400/30";
  const tag = isBest ? "오늘의 MVP" : "오늘의 반성문";
  const tagColor = isBest ? "text-emerald-300" : "text-rose-300";
  const stamp = isBest ? "🏅" : "🫥";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-b p-4 ${accent}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className={`text-xs font-bold ${tagColor}`}>{tag}</span>
        <span className="text-2xl" aria-hidden>
          {pick.badge}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-display text-2xl text-white">{pick.name}</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
          {pick.role === "batter" ? "타자" : "투수"}
        </span>
      </div>
      <div className="mt-1 text-sm text-white/70 tabular">{pick.line}</div>
      <p className="mt-3 text-[13px] leading-relaxed text-white/85">
        {pick.reason}
      </p>
      <span className="pointer-events-none absolute -bottom-3 -right-2 text-6xl opacity-10">
        {stamp}
      </span>
    </div>
  );
}
