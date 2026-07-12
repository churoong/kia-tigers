import { LeagueRow } from "@/lib/types";

/** 순위별 드립 (KIA는 별도 강조) */
function rankDrip(row: LeagueRow, isKia: boolean): string {
  if (isKia) {
    if (row.rank === 1) return "그래 이게 우리 팀이지 씨— 최고다";
    if (row.rank <= 3) return "가을야구 예약석, 방석 깔고 앉음";
    if (row.rank <= 5) return "5강 사수 중. 여기서 밀리면 진짜 화낸다";
    if (row.rank <= 7) return "아직 안 늦었다… 제발 정신차려라";
    return "…팬심 시험하지 마라 진짜";
  }
  if (row.rank === 1) return "1위 독주, 재수없게 잘함";
  if (row.rank === 10) return "꼴찌. 오늘도 평화로운 순리대로";
  if (row.rank >= 8) return "하위권 순찰 중";
  if (row.rank <= 3) return "상위권 텃세 부리는 중";
  return "중위권 눈치게임 참가자";
}

export default function Standings({ rows }: { rows: LeagueRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 text-center text-sm text-white/50">
        순위표를 불러오지 못했어요. 잠시 후 다시! 🙏
      </div>
    );
  }
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-[11px] text-white/40">
            <th className="py-2 pl-3 text-left font-normal">순위</th>
            <th className="py-2 text-left font-normal">팀</th>
            <th className="py-2 text-center font-normal">승-패-무</th>
            <th className="py-2 pr-3 text-right font-normal">승률</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isKia = r.name === "KIA";
            return (
              <tr
                key={r.name}
                className={`border-b border-white/5 last:border-0 ${
                  isKia ? "bg-kia-red/15" : ""
                }`}
              >
                <td className="py-2 pl-3">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-md font-display text-xs ${
                      r.rank <= 5
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {r.rank}
                  </span>
                </td>
                <td className="py-2">
                  <div className={`font-bold ${isKia ? "text-kia-red" : "text-white/85"}`}>
                    {r.name}
                    {isKia && " 🐯"}
                  </div>
                  <div className="text-[10px] leading-tight text-white/40">
                    {rankDrip(r, isKia)}
                  </div>
                </td>
                <td className="py-2 text-center text-white/70 tabular">
                  {r.w}-{r.l}-{r.d}
                </td>
                <td className="py-2 pr-3 text-right font-display text-white tabular">
                  {r.wra.toFixed(3).replace(/^0/, "")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="border-t border-white/10 px-3 py-2 text-[10px] text-white/30">
        5위까지 가을야구 · 순위는 최근 경기 기준
      </div>
    </div>
  );
}
