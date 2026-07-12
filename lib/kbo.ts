import {
  Batter,
  GameDetail,
  GameSummary,
  KIA_CODE,
  LeagueRow,
  Pitcher,
  Side,
  Standing,
  TeamRef,
} from "./types";
import { SNAPSHOT_DETAIL, SNAPSHOT_SCHEDULE } from "./snapshot";

const API = "https://api-gw.sports.naver.com";
const REVALIDATE = 600; // 10분마다 갱신 (실시간에 가깝게)

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
  Referer: "https://m.sports.naver.com/",
  Accept: "application/json",
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: HEADERS,
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) throw new Error(`Naver API ${res.status} @ ${url}`);
  const json = await res.json();
  if (json?.success === false) throw new Error(`Naver API not success @ ${url}`);
  return json;
}

function toResult(
  side: Side,
  winner: string
): "W" | "L" | "D" | null {
  if (winner === "DRAW") return "D";
  if (!winner) return null;
  const kiaWon =
    (side === "home" && winner === "HOME") ||
    (side === "away" && winner === "AWAY");
  return kiaWon ? "W" : "L";
}

function mapSummary(g: any): GameSummary | null {
  const homeCode = g.homeTeamCode;
  const awayCode = g.awayTeamCode;
  if (homeCode !== KIA_CODE && awayCode !== KIA_CODE) return null;

  const home: TeamRef & { score: number | null } = {
    code: homeCode,
    name: g.homeTeamName,
    emblem: g.homeTeamEmblemUrl,
    score: g.statusCode === "RESULT" ? g.homeTeamScore : null,
  };
  const away: TeamRef & { score: number | null } = {
    code: awayCode,
    name: g.awayTeamName,
    emblem: g.awayTeamEmblemUrl,
    score: g.statusCode === "RESULT" ? g.awayTeamScore : null,
  };

  const kiaSide: Side = homeCode === KIA_CODE ? "home" : "away";
  const opponent = kiaSide === "home" ? away : home;
  const kiaScore = kiaSide === "home" ? home.score : away.score;
  const oppScore = kiaSide === "home" ? away.score : home.score;
  const result =
    g.statusCode === "RESULT" ? toResult(kiaSide, g.winner) : null;

  return {
    gameId: g.gameId,
    date: g.gameDate,
    dateTime: g.gameDateTime,
    stadium: g.stadium,
    statusCode: g.statusCode,
    canceled: !!g.cancel,
    home,
    away,
    kiaSide,
    opponent,
    kiaScore,
    oppScore,
    result,
  };
}

async function fetchAllGames(): Promise<any[]> {
  const now = new Date();
  const from = new Date(now.getTime() - 45 * 24 * 3600 * 1000);
  const to = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
  const url =
    `${API}/schedule/games?fields=basic,gameId,gameDate,gameDateTime,` +
    `stadium,statusCode,statusInfo,cancel,winner,` +
    `homeTeamCode,homeTeamName,homeTeamScore,homeTeamEmblemUrl,` +
    `awayTeamCode,awayTeamName,awayTeamScore,awayTeamEmblemUrl` +
    `&upperCategoryId=kbaseball&categoryId=kbo&size=800` +
    `&fromDate=${ymd(from)}&toDate=${ymd(to)}`;
  const json = await getJson(url);
  return json?.result?.games ?? [];
}

/** 최근 KIA 경기 스케줄 (완료 경기 최신순 + 예정 경기). 실패 시 스냅샷. */
export async function getKiaSchedule(): Promise<{
  games: GameSummary[];
  upcoming: GameSummary[];
  live: boolean;
}> {
  try {
    const raw = await fetchAllGames();
    const all = raw
      .map(mapSummary)
      .filter((g): g is GameSummary => g !== null);
    const games = all
      .filter((g) => g.statusCode === "RESULT" || g.canceled)
      .sort((a, b) => (a.dateTime < b.dateTime ? 1 : -1)); // 최신순
    const upcoming = all
      .filter((g) => g.statusCode !== "RESULT" && !g.canceled)
      .sort((a, b) => (a.dateTime > b.dateTime ? 1 : -1)); // 가까운 순
    if (games.length === 0) throw new Error("빈 스케줄");
    return { games, upcoming, live: true };
  } catch (err) {
    console.error("[kbo] schedule fallback:", err);
    return { games: SNAPSHOT_SCHEDULE, upcoming: [], live: false };
  }
}

/**
 * 리그 순위표 — 전용 API가 막혀 있어(403) 최근 완료 경기들의 record에 실려오는
 * 양 팀 standings를 이어붙여 10팀을 채운다. 최근 날짜부터 최대 5일 거슬러 감.
 */
export async function getLeagueStandings(): Promise<LeagueRow[]> {
  try {
    const raw = await fetchAllGames();
    const finished = raw
      .filter((g: any) => g.statusCode === "RESULT" && !g.cancel)
      .sort((a: any, b: any) => (a.gameDate < b.gameDate ? 1 : -1));

    const byDate = new Map<string, any[]>();
    for (const g of finished) {
      const list = byDate.get(g.gameDate) ?? [];
      list.push(g);
      byDate.set(g.gameDate, list);
    }

    const rows = new Map<string, LeagueRow>();
    let daysUsed = 0;
    for (const [, games] of byDate) {
      if (rows.size >= 10 || daysUsed >= 5) break;
      daysUsed++;
      const details = await Promise.all(
        games.map(async (g: any) => {
          try {
            const json = await getJson(`${API}/schedule/games/${g.gameId}/record`);
            return json?.result?.recordData ?? null;
          } catch {
            return null;
          }
        })
      );
      for (const r of details) {
        if (!r) continue;
        for (const s of [r.homeStandings, r.awayStandings]) {
          if (!s?.name || rows.has(s.name)) continue;
          rows.set(s.name, {
            name: s.name,
            rank: s.rank,
            w: s.w,
            l: s.l,
            d: s.d,
            wra: s.wra,
            era: s.era,
            hra: s.hra,
            hr: s.hr,
          });
        }
      }
    }
    return [...rows.values()].sort((a, b) => a.rank - b.rank);
  } catch (err) {
    console.error("[kbo] standings fail:", err);
    return [];
  }
}

function mapBatter(b: any): Batter {
  const innings: string[] = [];
  for (let i = 1; i <= 25; i++) {
    const v = b[`inn${i}`];
    if (v) innings.push(v);
  }
  return {
    name: b.name,
    batOrder: b.batOrder ?? 0,
    pos: b.pos ?? "",
    ab: b.ab ?? 0,
    run: b.run ?? 0,
    hit: b.hit ?? 0,
    hr: b.hr ?? 0,
    rbi: b.rbi ?? 0,
    bb: b.bb ?? 0,
    kk: b.kk ?? 0,
    sb: b.sb ?? 0,
    hra: b.hra ?? "",
    innings,
  };
}

function mapPitcher(p: any): Pitcher {
  return {
    name: p.name,
    inn: String(p.inn ?? ""),
    er: p.er ?? 0,
    r: p.r ?? 0,
    hit: p.hit ?? 0,
    bb: p.bb ?? 0,
    kk: p.kk ?? 0,
    hr: p.hr ?? 0,
    bf: p.bf ?? 0,
    era: p.era ?? "",
    wls: p.wls ?? "",
    seasonWin: p.seasonWin ?? p.w ?? 0,
    seasonLose: p.seasonLose ?? p.l ?? 0,
  };
}

function mapStanding(s: any): Standing | null {
  if (!s) return null;
  return {
    rank: s.rank,
    w: s.w,
    l: s.l,
    d: s.d,
    era: s.era,
    hra: s.hra,
    hr: s.hr,
  };
}

/** 특정 경기 박스스코어 상세. 실패 시 스냅샷(해당 경기면). */
export async function getGameDetail(
  summary: GameSummary
): Promise<GameDetail | null> {
  try {
    const url = `${API}/schedule/games/${summary.gameId}/record`;
    const json = await getJson(url);
    const r = json?.result?.recordData;
    if (!r) throw new Error("no recordData");

    const side = summary.kiaSide ?? "away";
    const opp: Side = side === "home" ? "away" : "home";

    const kiaBatters = (r.battersBoxscore?.[side] ?? []).map(mapBatter);
    const oppBatters = (r.battersBoxscore?.[opp] ?? []).map(mapBatter);
    const kiaPitchers = (r.pitchersBoxscore?.[side] ?? []).map(mapPitcher);
    const oppPitchers = (r.pitchersBoxscore?.[opp] ?? []).map(mapPitcher);

    const rheb = r.scoreBoard?.rheb ?? {};
    const rhe = {
      kia: rheb[side] ?? { r: 0, h: 0, e: 0, b: 0 },
      opp: rheb[opp] ?? { r: 0, h: 0, e: 0, b: 0 },
    };
    const innRaw = r.scoreBoard?.inn ?? {};
    const innings = {
      kia: (innRaw[side] ?? []).map((v: any) => Number(v) || 0),
      opp: (innRaw[opp] ?? []).map((v: any) => Number(v) || 0),
    };

    const kiaStanding = mapStanding(
      side === "home" ? r.homeStandings : r.awayStandings
    );

    return {
      summary,
      kiaBatters,
      kiaPitchers,
      oppBatters,
      oppPitchers,
      rhe,
      innings,
      etc: (r.etcRecords ?? []).filter((e: any) => e?.how && e?.result),
      kiaStanding,
    };
  } catch (err) {
    console.error("[kbo] detail fallback:", err);
    if (SNAPSHOT_DETAIL && SNAPSHOT_DETAIL.summary.gameId === summary.gameId) {
      return SNAPSHOT_DETAIL;
    }
    return null;
  }
}
