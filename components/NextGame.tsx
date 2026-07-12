import { NextGamePreview } from "@/lib/types";
import TeamLogo from "./TeamLogo";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function NextGame({ preview }: { preview: NextGamePreview }) {
  const g = preview.game;
  const d = new Date(g.dateTime);
  const dateStr = `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]}) ${String(
    d.getHours()
  ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="glass relative overflow-hidden rounded-3xl p-5">
      <div className="absolute right-3 top-3 rounded-full bg-kia-red px-2.5 py-1 font-display text-xs text-white">
        {preview.dday}
      </div>
      <div className="text-xs font-bold text-white/50">다음 상대는…</div>
      <div className="mt-3 flex items-center gap-4">
        <TeamLogo code="HT" name="KIA" emblem="https://sports-phinf.pstatic.net/team/kbo/default/HT.png" size={44} />
        <span className="font-display text-xl text-white/60">VS</span>
        <TeamLogo
          code={g.opponent.code}
          name={g.opponent.name}
          emblem={g.opponent.emblem}
          size={44}
        />
        <div className="ml-1">
          <div className="font-display text-2xl text-white">{g.opponent.name}</div>
          <div className="text-xs text-white/50">
            {dateStr} · {g.stadium} ({g.kiaSide === "home" ? "홈" : "원정"})
          </div>
        </div>
      </div>
      <p className="mt-4 rounded-2xl bg-black/30 p-3.5 text-sm leading-relaxed text-white/85">
        {preview.hype}
      </p>
      {preview.h2hLine && (
        <div className="mt-2 text-xs text-white/50">📊 {preview.h2hLine}</div>
      )}
    </div>
  );
}
