import { GameDetail } from "@/lib/types";

/** 이닝별 스코어보드 — 전광판 스타일 */
export default function InningBoard({ detail }: { detail: GameDetail }) {
  const n = Math.max(detail.innings.kia.length, detail.innings.opp.length, 9);
  const innings = Array.from({ length: n }, (_, i) => i);
  const kiaName = "KIA";
  const oppName = detail.summary.opponent.name;

  // 빅이닝(2점 이상) 하이라이트
  const cell = (v: number | undefined, mine: boolean) => {
    const val = v ?? 0;
    const hot = val >= 2;
    return (
      <td
        className={`px-1.5 py-1 text-center tabular ${
          hot
            ? mine
              ? "font-bold text-emerald-300"
              : "font-bold text-rose-300"
            : val > 0
            ? "text-white/90"
            : "text-white/30"
        }`}
      >
        {val}
      </td>
    );
  };

  return (
    <div className="overflow-x-auto no-scrollbar rounded-2xl bg-black/40 p-3">
      <table className="w-full min-w-[420px] text-xs">
        <thead>
          <tr className="text-white/40">
            <th className="px-1.5 py-1 text-left font-normal">팀</th>
            {innings.map((i) => (
              <th key={i} className="px-1.5 py-1 font-normal tabular">
                {i + 1}
              </th>
            ))}
            <th className="px-1.5 py-1 font-bold text-white/70">R</th>
            <th className="px-1.5 py-1 font-normal">H</th>
            <th className="px-1.5 py-1 font-normal">E</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-white/5">
            <td className="px-1.5 py-1 font-display text-kia-red">{kiaName}</td>
            {innings.map((i) => cell(detail.innings.kia[i], true))}
            <td className="px-1.5 py-1 text-center font-display text-base text-white tabular">
              {detail.rhe.kia.r}
            </td>
            <td className="px-1.5 py-1 text-center text-white/60 tabular">{detail.rhe.kia.h}</td>
            <td className="px-1.5 py-1 text-center text-white/60 tabular">{detail.rhe.kia.e}</td>
          </tr>
          <tr className="border-t border-white/5">
            <td className="px-1.5 py-1 font-display text-white/70">{oppName}</td>
            {innings.map((i) => cell(detail.innings.opp[i], false))}
            <td className="px-1.5 py-1 text-center font-display text-base text-white tabular">
              {detail.rhe.opp.r}
            </td>
            <td className="px-1.5 py-1 text-center text-white/60 tabular">{detail.rhe.opp.h}</td>
            <td className="px-1.5 py-1 text-center text-white/60 tabular">{detail.rhe.opp.e}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
