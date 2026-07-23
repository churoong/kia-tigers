"use client";

import { useState } from "react";
import { RatedPlayer } from "@/lib/types";

/* ---------- 평점 색상 (축구 앱 스타일) ---------- */
function ratingColor(r: number): string {
  if (r >= 8.5) return "bg-sky-400 text-sky-950"; // 최고
  if (r >= 7.5) return "bg-emerald-500 text-emerald-950";
  if (r >= 6.5) return "bg-lime-500 text-lime-950";
  if (r >= 5.5) return "bg-amber-400 text-amber-950";
  if (r >= 4.5) return "bg-orange-500 text-orange-950";
  return "bg-rose-500 text-rose-50";
}

/* ---------- 위닝풍 육각 레이더 (순수 SVG) ---------- */
function RadarChart({ player }: { player: RatedPlayer }) {
  const size = 260;
  const cx = size / 2;
  const cy = size / 2 + 6;
  const R = 88;
  const N = player.abilities.length; // 6

  const point = (i: number, ratio: number): [number, number] => {
    const ang = (Math.PI * 2 * i) / N - Math.PI / 2;
    return [cx + Math.cos(ang) * R * ratio, cy + Math.sin(ang) * R * ratio];
  };
  const ring = (ratio: number) =>
    Array.from({ length: N }, (_, i) => point(i, ratio).join(",")).join(" ");

  const values = player.abilities.map((a) => Math.max(a.value, 8) / 99);
  const shape = values.map((v, i) => point(i, v).join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[300px]">
      {/* 배경 링 */}
      {[1, 0.75, 0.5, 0.25].map((r) => (
        <polygon
          key={r}
          points={ring(r)}
          fill={r === 1 ? "rgba(255,255,255,0.04)" : "none"}
          stroke="rgba(255,255,255,0.14)"
          strokeWidth={1}
        />
      ))}
      {/* 축선 */}
      {Array.from({ length: N }, (_, i) => {
        const [x, y] = point(i, 1);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={1}
          />
        );
      })}
      {/* 능력치 폴리곤 */}
      <polygon
        points={shape}
        fill="rgba(234,0,41,0.35)"
        stroke="#EA0029"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {values.map((v, i) => {
        const [x, y] = point(i, v);
        return <circle key={i} cx={x} cy={y} r={3.5} fill="#EA0029" stroke="#fff" strokeWidth={1.2} />;
      })}
      {/* 라벨 + 수치 */}
      {player.abilities.map((a, i) => {
        const [x, y] = point(i, 1.24);
        return (
          <g key={a.label} textAnchor="middle">
            <text x={x} y={y - 4} fontSize={12} fill="rgba(255,255,255,0.75)" fontWeight={700}>
              {a.label}
            </text>
            <text x={x} y={y + 12} fontSize={13} fill="#ffd166" fontWeight={900}>
              {a.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- 선수 모달 ---------- */
function PlayerModal({
  player,
  onClose,
}: {
  player: RatedPlayer;
  onClose: () => void;
}) {
  const overall = Math.round(
    player.abilities.reduce((s, a) => s + a.value, 0) / player.abilities.length
  );
  return (
    <div
      data-modal-backdrop
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm animate-pop-in rounded-3xl border border-white/10 bg-[#14141c] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl text-white">{player.name}</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
                {player.pos}
              </span>
            </div>
            <div className="mt-1 text-xs text-white/60 tabular">{player.line}</div>
          </div>
          <div className="flex flex-col items-center">
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-xl font-display text-xl ${ratingColor(player.rating)}`}
            >
              {player.rating.toFixed(1)}
            </span>
            <span className="mt-1 text-[10px] text-white/50">경기 평점</span>
          </div>
        </div>

        <RadarChart player={player} />

        <div className="mt-1 flex items-center justify-center gap-2 text-sm">
          <span className="text-white/50">종합 능력치</span>
          <span className="font-display text-xl text-amber-300 tabular">{overall}</span>
        </div>

        <p className="mt-3 rounded-xl bg-white/5 p-3 text-center text-[13px] text-white/85">
          “{player.comment}”
        </p>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-kia-red py-2.5 font-bold text-white transition hover:brightness-110 active:scale-95"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

/* ---------- 평점 리스트 ---------- */
export default function PlayerRatings({ players }: { players: RatedPlayer[] }) {
  const [selected, setSelected] = useState<RatedPlayer | null>(null);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? players : players.slice(0, 6);

  return (
    <div>
      <div className="space-y-1.5">
        {visible.map((p, i) => (
          <button
            key={p.name + p.role}
            onClick={() => setSelected(p)}
            className="flex w-full items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 text-left transition hover:bg-white/10 active:scale-[0.99]"
          >
            <span className="w-5 text-center text-xs text-white/40 tabular">{i + 1}</span>
            <span
              className={`flex h-8 w-11 items-center justify-center rounded-lg font-display text-sm ${ratingColor(p.rating)}`}
            >
              {p.rating.toFixed(1)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-bold text-white">{p.name}</span>
                <span className="shrink-0 rounded bg-white/10 px-1.5 py-px text-[10px] text-white/60">
                  {p.role === "pitcher" ? "투" : p.pos}
                </span>
              </div>
              <div className="truncate text-[11px] text-white/50 tabular">{p.line}</div>
            </div>
            <span className="shrink-0 text-xs text-white/30">능력치 ▶</span>
          </button>
        ))}
      </div>
      {players.length > 6 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 w-full rounded-xl bg-white/5 py-2 text-xs font-bold text-white/60 transition hover:bg-white/10"
        >
          {showAll ? "접기 ▲" : `전체 ${players.length}명 보기 ▼`}
        </button>
      )}
      {selected && <PlayerModal player={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
