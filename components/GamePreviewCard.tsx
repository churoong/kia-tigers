"use client";

import { useState } from "react";
import { PreviewAnalysis, StarterCard } from "@/lib/types";
import TeamLogo from "./TeamLogo";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/* ---------- 선발 육각 레이더 (위닝풍) ---------- */
function StarterRadar({ card }: { card: StarterCard }) {
  const size = 260,
    cx = size / 2,
    cy = size / 2 + 6,
    R = 88,
    N = card.abilities.length;
  const point = (i: number, ratio: number): [number, number] => {
    const ang = (Math.PI * 2 * i) / N - Math.PI / 2;
    return [cx + Math.cos(ang) * R * ratio, cy + Math.sin(ang) * R * ratio];
  };
  const ring = (r: number) =>
    Array.from({ length: N }, (_, i) => point(i, r).join(",")).join(" ");
  const vals = card.abilities.map((a) => Math.max(a.value, 8) / 99);
  const shape = vals.map((v, i) => point(i, v).join(",")).join(" ");
  const color = card.side === "kia" ? "#EA0029" : "#3b82f6";
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[300px]">
      {[1, 0.75, 0.5, 0.25].map((r) => (
        <polygon
          key={r}
          points={ring(r)}
          fill={r === 1 ? "rgba(255,255,255,0.04)" : "none"}
          stroke="rgba(255,255,255,0.14)"
          strokeWidth={1}
        />
      ))}
      {Array.from({ length: N }, (_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.10)" />;
      })}
      <polygon points={shape} fill={`${color}59`} stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
      {vals.map((v, i) => {
        const [x, y] = point(i, v);
        return <circle key={i} cx={x} cy={y} r={3.5} fill={color} stroke="#fff" strokeWidth={1.2} />;
      })}
      {card.abilities.map((a, i) => {
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

/* ---------- 선발 모달 ---------- */
function StarterModal({ card, onClose }: { card: StarterCard; onClose: () => void }) {
  const s = card.info;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm animate-pop-in rounded-3xl border border-white/10 bg-[#14141c] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] text-white/50">{card.team} 선발</div>
            <div className="font-display text-2xl text-white">{s.name ?? "미발표"}</div>
            <div className="mt-0.5 text-xs text-white/60 tabular">
              {s.hitType ? `${s.hitType} · ` : ""}시즌 {s.w}승 {s.l}패 · ERA {s.era} · WHIP {s.whip}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400 font-display text-xl text-amber-950">
              {card.overall}
            </span>
            <span className="mt-1 text-[10px] text-white/50">종합</span>
          </div>
        </div>
        <StarterRadar card={card} />
        {s.vsOpp && s.vsOpp.games > 0 && (
          <div className="mt-1 rounded-xl bg-white/5 p-2 text-center text-xs text-white/70 tabular">
            상대전적 {s.vsOpp.games}G {s.vsOpp.w}승 {s.vsOpp.l}패 · ERA {s.vsOpp.era}
          </div>
        )}
        <p className="mt-3 rounded-xl bg-white/5 p-3 text-center text-[13px] text-white/85">💬 {card.comment}</p>
        <button onClick={onClose} className="mt-4 w-full rounded-xl bg-kia-red py-2.5 font-bold text-white transition hover:brightness-110 active:scale-95">
          닫기
        </button>
      </div>
    </div>
  );
}

/* ---------- 선발 요약 버튼 ---------- */
function StarterButton({ card, onClick }: { card: StarterCard; onClick: () => void }) {
  const s = card.info;
  return (
    <button onClick={onClick} className="flex-1 rounded-2xl bg-white/5 p-3 text-left transition hover:bg-white/10 active:scale-[0.98]">
      <div className="text-[11px] text-white/50">{card.team}</div>
      <div className="flex items-center gap-1.5">
        <span className="font-display text-lg text-white">{s.name ?? "미발표 🤔"}</span>
      </div>
      <div className="mt-0.5 text-[11px] text-white/55 tabular">
        {s.announced ? `ERA ${s.era} · ${s.w}승 ${s.l}패` : "곧 발표"}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="rounded-lg bg-amber-400/90 px-2 py-0.5 font-display text-sm text-amber-950">{card.overall}</span>
        <span className="text-[11px] text-white/40">능력치 ▶</span>
      </div>
    </button>
  );
}

/* ---------- 메인 프리뷰 카드 ---------- */
export default function GamePreviewCard({ preview }: { preview: PreviewAnalysis }) {
  const [modal, setModal] = useState<StarterCard | null>(null);
  const g = preview.game;
  const d = new Date(g.dateTime);
  const dateStr = `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
  const place = g.kiaSide === "home" ? "홈" : "원정";
  const p = preview.predicted;

  return (
    <div className="glass rounded-3xl p-5">
      {/* 헤드라인 */}
      <div className="text-center">
        <div className="text-3xl">{preview.moodEmoji}</div>
        <div className="mt-1 font-display text-lg text-white">{preview.headline}</div>
      </div>

      {/* 매치업 */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <div className="flex flex-col items-center">
          <TeamLogo code="HT" name="KIA" emblem="https://sports-phinf.pstatic.net/team/kbo/default/HT.png" size={40} />
          <span className="mt-1 text-[11px] text-white/60">KIA {preview.kiaRank ? `${preview.kiaRank}위` : ""}</span>
        </div>
        <span className="font-display text-xl text-white/50">VS</span>
        <div className="flex flex-col items-center">
          <TeamLogo code={g.opponent.code} name={g.opponent.name} emblem={g.opponent.emblem} size={40} />
          <span className="mt-1 text-[11px] text-white/60">{preview.oppName} {preview.oppRank ? `${preview.oppRank}위` : ""}</span>
        </div>
      </div>
      <div className="mt-2 text-center text-xs text-white/50">
        {dateStr} {preview.gtime} · {preview.stadium} ({place})
      </div>

      {/* 클로드 예상 스코어 */}
      <div className="mt-4 rounded-2xl bg-gradient-to-b from-kia-red/25 to-black/20 p-4 text-center">
        <div className="text-[11px] font-bold tracking-wide text-white/60">🎯 클로드 예상 스코어</div>
        <div className="mt-1 flex items-center justify-center gap-3 font-display text-3xl text-white tabular">
          <span>KIA {p.kia}</span>
          <span className="text-white/30">:</span>
          <span>{p.opp} {preview.oppName}</span>
        </div>
        <div className="mt-1 text-xs text-white/70">{p.line}</div>
      </div>

      {/* 선발 매치업 */}
      <div className="mt-4">
        <div className="mb-2 text-xs font-bold text-white/50">⚾ 선발 매치업 (탭하면 육각 능력치)</div>
        <div className="flex gap-2">
          <StarterButton card={preview.kiaStarter} onClick={() => setModal(preview.kiaStarter)} />
          <StarterButton card={preview.oppStarter} onClick={() => setModal(preview.oppStarter)} />
        </div>
      </div>

      {/* 시즌 상대전적 + 승부예상 */}
      <div className="mt-4 rounded-2xl bg-white/5 p-3">
        <div className="text-xs text-white/70">
          📊 시즌 상대전적 <b className="text-white">KIA {preview.seasonVs.w}승 {preview.seasonVs.l}패{preview.seasonVs.d ? ` ${preview.seasonVs.d}무` : ""}</b>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-white/85">🔮 {preview.predictionText}</p>
      </div>

      {/* 재미 팩트 */}
      <ul className="mt-3 space-y-1">
        {preview.funFacts.map((f, i) => (
          <li key={i} className="flex gap-1.5 text-[12px] text-white/60">
            <span className="text-kia-red">›</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* 직관 리마인더 */}
      <p className="mt-3 rounded-2xl bg-black/30 p-3 text-center text-[13px] text-white/85">{preview.watch}</p>

      {modal && <StarterModal card={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
