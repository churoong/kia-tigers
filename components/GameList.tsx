import { GameSummary } from "@/lib/types";
import { ResultPill } from "./ui";
import TeamLogo from "./TeamLogo";

function mmdd(date: string) {
  const [, m, d] = date.split("-");
  return `${parseInt(m)}.${parseInt(d)}`;
}

export function GameRow({ game }: { game: GameSummary }) {
  if (game.canceled) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 text-white/40">
        <span className="w-10 text-xs tabular">{mmdd(game.date)}</span>
        <TeamLogo
          code={game.opponent.code}
          name={game.opponent.name}
          emblem={game.opponent.emblem}
          size={28}
        />
        <span className="text-sm">vs {game.opponent.name}</span>
        <span className="ml-auto text-xs">우천취소 ☔</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
      <span className="w-10 text-xs text-white/50 tabular">
        {mmdd(game.date)}
      </span>
      <span className="text-[11px] text-white/40">
        {game.kiaSide === "home" ? "홈" : "원정"}
      </span>
      <TeamLogo
        code={game.opponent.code}
        name={game.opponent.name}
        emblem={game.opponent.emblem}
        size={28}
      />
      <span className="text-sm text-white/85">{game.opponent.name}</span>
      <span className="ml-auto font-display text-lg text-white tabular">
        {game.kiaScore}<span className="mx-1 text-white/30">:</span>{game.oppScore}
      </span>
      {game.result && <ResultPill result={game.result} size="sm" />}
    </div>
  );
}

export function DotRow({ games }: { games: GameSummary[] }) {
  // 오래된 → 최신 순으로 점 표시
  const ordered = [...games].reverse();
  return (
    <div className="flex flex-wrap gap-1.5">
      {ordered.map((g) => {
        const color =
          g.result === "W"
            ? "bg-emerald-500"
            : g.result === "L"
            ? "bg-rose-500"
            : "bg-amber-400";
        const label =
          g.result === "W" ? "승" : g.result === "L" ? "패" : "무";
        return (
          <span
            key={g.gameId}
            title={`${mmdd(g.date)} ${g.opponent.name} ${g.kiaScore}:${g.oppScore}`}
            className={`flex h-7 w-7 items-center justify-center rounded-md font-display text-xs text-white/95 ${color}`}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
