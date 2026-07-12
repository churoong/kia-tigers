import { getGameDetail, getKiaSchedule, getLeagueStandings } from "@/lib/kbo";
import {
  analyzeGame,
  analyzeLast10,
  analyzeSeries,
  buildNextGamePreview,
} from "@/lib/humor";
import { ratePlayers } from "@/lib/rating";
import { GameSummary } from "@/lib/types";
import { Gauge, ResultPill, Section } from "@/components/ui";
import TeamLogo from "@/components/TeamLogo";
import PlayerCard from "@/components/PlayerCard";
import ShareCard from "@/components/ShareCard";
import { DotRow, GameRow } from "@/components/GameList";
import InningBoard from "@/components/InningBoard";
import Standings from "@/components/Standings";
import NextGame from "@/components/NextGame";
import PlayerRatings from "@/components/PlayerRatings";

export const revalidate = 600; // 10분 ISR

function mmdd(date: string) {
  const [, m, d] = date.split("-");
  return `${parseInt(m)}월 ${parseInt(d)}일`;
}

function rivalry(games: GameSummary[]) {
  const map = new Map<string, { name: string; w: number; l: number; d: number }>();
  for (const g of games) {
    if (!g.result || g.canceled) continue;
    const key = g.opponent.code;
    const row = map.get(key) ?? { name: g.opponent.name, w: 0, l: 0, d: 0 };
    if (g.result === "W") row.w++;
    else if (g.result === "L") row.l++;
    else row.d++;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.w + b.l + b.d - (a.w + a.l + a.d));
}

export default async function Home() {
  const [{ games, upcoming, live }, league] = await Promise.all([
    getKiaSchedule(),
    getLeagueStandings(),
  ]);
  const recent = games.find((g) => g.result && !g.canceled) ?? null;
  const detail = recent ? await getGameDetail(recent) : null;
  const analysis = detail ? analyzeGame(detail) : null;
  const series = analyzeSeries(games);
  const last10 = analyzeLast10(games);
  const standing = detail?.kiaStanding ?? null;
  const rivals = rivalry(last10.games);
  const rated = detail ? ratePlayers(detail) : [];
  const today = new Date(Date.now() + 9 * 3600 * 1000) // KST
    .toISOString()
    .slice(0, 10);
  const nextPreview = buildNextGamePreview(upcoming, games, today);

  // 직관 승률 (홈경기 기준)
  const homeGames = last10.games.filter((g) => g.kiaSide === "home");
  const homeWins = homeGames.filter((g) => g.result === "W").length;
  const homeRate = homeGames.length
    ? Math.round((homeWins / homeGames.length) * 100)
    : 0;

  // 공유 문구
  const shareLines: string[] = [];
  if (recent && analysis) {
    shareLines.push(
      `${mmdd(recent.date)} ${recent.opponent.name}전 ${recent.kiaScore}:${recent.oppScore} — ${analysis.headline}`
    );
    if (analysis.best)
      shareLines.push(
        `오늘의 MVP는 ${analysis.best.name}! (${analysis.best.line}) ${analysis.moodEmoji}`
      );
  }
  shareLines.push(
    `기아 최근 10경기 ${last10.w}승 ${last10.l}패 ${last10.d}무 · ${last10.streakLabel}`
  );
  if (series)
    shareLines.push(`${series.opponent}전 ${series.outcome} ${series.emoji} — ${series.headline}`);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      {/* 헤더 */}
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <TeamLogo code="HT" name="KIA" emblem="https://sports-phinf.pstatic.net/team/kbo/default/HT.png" size={48} />
          <div>
            <h1 className="font-display text-3xl leading-none text-white">
              기아 타이거즈 <span className="text-kia-red">오늘 어땠어?</span>
            </h1>
            <p className="mt-1 text-xs text-white/50">
              최근 경기를 유머로 요약해주는 팬 심심풀이 🐯
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${
              live
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-amber-500/15 text-amber-300"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            {live ? "실시간 데이터" : "스냅샷(연결 실패 시 대체)"}
          </span>
          {standing && (
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-white/70 tabular">
              리그 {standing.rank}위 · {standing.w}승 {standing.l}패 {standing.d}무
            </span>
          )}
        </div>
      </header>

      {/* 최근 1경기 */}
      <Section title="가장 최근 경기" emoji="⚾" subtitle={recent ? mmdd(recent.date) : ""}>
        {recent && analysis ? (
          <div className="glass rounded-3xl p-5 animate-slide-up">
            {/* 스코어보드 */}
            <div className="flex items-center justify-between">
              <TeamSide summary={recent} which="kia" />
              <div className="flex flex-col items-center px-2">
                {recent.result && <ResultPill result={recent.result} size="lg" />}
                <span className="mt-1 text-[11px] text-white/40">
                  {recent.stadium} {recent.kiaSide === "home" ? "홈" : "원정"}
                </span>
              </div>
              <TeamSide summary={recent} which="opp" />
            </div>

            {/* 헤드라인 + 무드 */}
            <div className="mt-5 text-center">
              <div className="text-4xl">{analysis.moodEmoji}</div>
              <h3 className="mt-1 font-display text-2xl text-white">
                {analysis.headline}
              </h3>
              <p className="mt-1 text-sm text-kia-red">{analysis.moodLabel}</p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/75">
                {analysis.summary}
              </p>
            </div>

            {/* 이닝별 전광판 */}
            <div className="mt-4">
              <InningBoard detail={detail!} />
            </div>

            {/* 베스트/워스트 */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {analysis.best && <PlayerCard pick={analysis.best} kind="best" />}
              {analysis.worst && <PlayerCard pick={analysis.worst} kind="worst" />}
            </div>

            {/* 재미 포인트 */}
            {analysis.funFacts.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {analysis.funFacts.map((f, i) => (
                  <li key={i} className="flex gap-2 text-[13px] text-white/70">
                    <span className="text-kia-red">›</span>
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <EmptyCard text="아직 분석할 최근 경기 데이터가 없어요. 곧 다시 확인해주세요!" />
        )}
      </Section>

      {/* 선수별 평점 */}
      {rated.length > 0 && (
        <Section
          title="선수별 평점"
          emoji="🎯"
          subtitle="선수를 누르면 능력치가 나와요"
        >
          <div className="glass rounded-3xl p-4">
            <PlayerRatings players={rated} />
          </div>
        </Section>
      )}

      {/* 다음 경기 프리뷰 */}
      {nextPreview && (
        <Section title="다음 경기" emoji="🔮">
          <NextGame preview={nextPreview} />
        </Section>
      )}

      {/* 최근 시리즈 */}
      <Section title="최근 시리즈" emoji="🎬">
        {series ? (
          <div className="glass rounded-3xl p-5">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{series.emoji}</span>
              <div>
                <div className="font-display text-xl text-white">
                  vs {series.opponent} · {series.outcome}
                </div>
                <div className="text-sm text-white/60 tabular">
                  {series.w}승 {series.l}패 {series.d}무
                </div>
              </div>
              <div className="ml-auto flex gap-1.5">
                {series.games.map((g) =>
                  g.result ? <ResultPill key={g.gameId} result={g.result} size="sm" /> : null
                )}
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              {series.comment}
            </p>
            <div className="mt-4 space-y-1.5">
              {series.games.map((g) => (
                <GameRow key={g.gameId} game={g} />
              ))}
            </div>
          </div>
        ) : (
          <EmptyCard text="시리즈 데이터를 불러오는 중이에요." />
        )}
      </Section>

      {/* 최근 10경기 */}
      <Section title="최근 10경기" emoji="📊">
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{last10.moodEmoji}</span>
            <div>
              <div className="font-display text-xl text-white">
                {last10.headline}
              </div>
              <div className="text-sm text-white/60 tabular">
                {last10.w}승 {last10.l}패 {last10.d}무 · {last10.streakLabel}
              </div>
            </div>
          </div>

          <div className="my-4">
            <DotRow games={last10.games} />
          </div>

          <p className="text-sm leading-relaxed text-white/80">{last10.comment}</p>

          {/* 팬 기분지수 */}
          <div className="mt-5 rounded-2xl bg-black/30 p-4">
            <div className="mb-2 text-xs font-bold text-white/60">
              🌡️ 팬 기분지수
            </div>
            <Gauge value={last10.gauge} />
          </div>
        </div>
      </Section>

      {/* 시즌 순위표 */}
      <Section title="시즌 순위표" emoji="🏆" subtitle="드립은 서비스">
        <Standings rows={league} />
      </Section>

      {/* 재미 기능 존 */}
      <Section title="더 재밌게 즐기기" emoji="🎁">
        <div className="grid gap-3">
          {/* 공유 문구 생성기 */}
          <div>
            <div className="mb-2 text-xs font-bold text-white/60">
              📢 오늘의 자랑용 짤 문구 (탭해서 복사)
            </div>
            <ShareCard lines={shareLines} />
          </div>

          {/* 라이벌 트래커 */}
          <div className="glass rounded-2xl p-4">
            <div className="mb-3 text-xs font-bold text-white/60">
              🥊 최근 상대별 전적
            </div>
            <div className="space-y-2">
              {rivals.map((r) => {
                const total = r.w + r.l + r.d;
                const wpct = total ? (r.w / total) * 100 : 0;
                return (
                  <div key={r.name} className="flex items-center gap-3">
                    <span className="w-12 text-sm text-white/80">{r.name}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${wpct}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-xs text-white/60 tabular">
                      {r.w}승 {r.l}패{r.d ? ` ${r.d}무` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 직관 승률 */}
          <div className="glass flex items-center gap-4 rounded-2xl p-4">
            <div className="text-4xl">🏟️</div>
            <div className="flex-1">
              <div className="text-xs font-bold text-white/60">
                직관 가면 이길 확률? (최근 홈경기 승률)
              </div>
              <div className="font-display text-2xl text-white tabular">
                {homeRate}%
              </div>
            </div>
            <div className="max-w-[45%] text-right text-xs text-white/60">
              {homeRate >= 60
                ? "지금이 직관 타이밍! 표 값 함.😎"
                : homeRate >= 40
                ? "반반의 확률, 그래도 직관은 사랑이지.🧡"
                : "집관이 마음 편할 수도… 그래도 응원은 크게!📣"}
            </div>
          </div>
        </div>
      </Section>

      <footer className="mt-10 text-center text-[11px] leading-relaxed text-white/30">
        데이터: Naver Sports · 이 앱은 팬심으로 만든 비공식 재미용 서비스입니다.
        <br />
        모든 분석과 드립은 유머일 뿐, 선수분들 사랑합니다 🐯❤️
      </footer>
    </main>
  );
}

function TeamSide({
  summary,
  which,
}: {
  summary: GameSummary;
  which: "kia" | "opp";
}) {
  const isKia = which === "kia";
  const team = isKia
    ? { code: "HT", name: "KIA", emblem: "https://sports-phinf.pstatic.net/team/kbo/default/HT.png" }
    : summary.opponent;
  const score = isKia ? summary.kiaScore : summary.oppScore;
  return (
    <div className="flex w-24 flex-col items-center gap-2">
      <TeamLogo code={team.code} name={team.name} emblem={team.emblem} size={56} />
      <span className="text-sm text-white/70">{team.name}</span>
      <span className="font-display text-4xl text-white tabular">{score}</span>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="glass rounded-3xl p-8 text-center text-sm text-white/60">
      {text}
    </div>
  );
}
