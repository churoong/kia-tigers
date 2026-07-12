import { Batter, GameDetail, GameSummary, Pitcher, Side, TeamRef } from "./types";

// 실시간 API 연결 실패 시 사용하는 폴백 데이터.
// 2026-07-09 KIA vs 롯데 실제 박스스코어 + 최근 경기 결과 (Naver Sports 기반).

const emblem = (code: string) =>
  `https://sports-phinf.pstatic.net/team/kbo/default/${code}.png`;

function team(code: string, name: string, score: number | null): TeamRef & {
  score: number | null;
} {
  return { code, name, emblem: emblem(code), score };
}

interface Row {
  gameId: string;
  date: string;
  time: string;
  stadium: string;
  kiaSide: Side;
  oppCode: string;
  oppName: string;
  kiaScore: number | null;
  oppScore: number | null;
  canceled?: boolean;
}

function build(row: Row): GameSummary {
  const kia = team("HT", "KIA", row.kiaScore);
  const opp = team(row.oppCode, row.oppName, row.oppScore);
  const home = row.kiaSide === "home" ? kia : opp;
  const away = row.kiaSide === "home" ? opp : kia;
  let result: GameSummary["result"] = null;
  if (!row.canceled && row.kiaScore !== null && row.oppScore !== null) {
    result =
      row.kiaScore > row.oppScore
        ? "W"
        : row.kiaScore < row.oppScore
        ? "L"
        : "D";
  }
  return {
    gameId: row.gameId,
    date: row.date,
    dateTime: `${row.date}T${row.time}:00`,
    stadium: row.stadium,
    statusCode: row.canceled ? "CANCEL" : "RESULT",
    canceled: !!row.canceled,
    home,
    away,
    kiaSide: row.kiaSide,
    opponent: opp,
    kiaScore: row.kiaScore,
    oppScore: row.oppScore,
    result,
  };
}

export const SNAPSHOT_SCHEDULE: GameSummary[] = [
  build({ gameId: "20260709HTLT02026", date: "2026-07-09", time: "18:30", stadium: "사직", kiaSide: "away", oppCode: "LT", oppName: "롯데", kiaScore: 5, oppScore: 2 }),
  build({ gameId: "20260708HTLT02026", date: "2026-07-08", time: "18:30", stadium: "사직", kiaSide: "away", oppCode: "LT", oppName: "롯데", kiaScore: 3, oppScore: 11 }),
  build({ gameId: "20260707HTLT02026", date: "2026-07-07", time: "18:30", stadium: "사직", kiaSide: "away", oppCode: "LT", oppName: "롯데", kiaScore: 2, oppScore: 10 }),
  build({ gameId: "20260705NCHT02026", date: "2026-07-05", time: "18:00", stadium: "광주", kiaSide: "home", oppCode: "NC", oppName: "NC", kiaScore: null, oppScore: null, canceled: true }),
  build({ gameId: "20260704NCHT02026", date: "2026-07-04", time: "18:00", stadium: "광주", kiaSide: "home", oppCode: "NC", oppName: "NC", kiaScore: 4, oppScore: 5 }),
  build({ gameId: "20260703NCHT02026", date: "2026-07-03", time: "18:30", stadium: "광주", kiaSide: "home", oppCode: "NC", oppName: "NC", kiaScore: 3, oppScore: 11 }),
  build({ gameId: "20260702SKHT02026", date: "2026-07-02", time: "18:30", stadium: "광주", kiaSide: "home", oppCode: "SK", oppName: "SSG", kiaScore: 8, oppScore: 7 }),
  build({ gameId: "20260701SKHT02026", date: "2026-07-01", time: "18:30", stadium: "광주", kiaSide: "home", oppCode: "SK", oppName: "SSG", kiaScore: 6, oppScore: 6 }),
  build({ gameId: "20260628OBHT02026", date: "2026-06-28", time: "17:00", stadium: "광주", kiaSide: "home", oppCode: "OB", oppName: "두산", kiaScore: 12, oppScore: 1 }),
];

const b = (
  name: string,
  batOrder: number,
  pos: string,
  ab: number,
  run: number,
  hit: number,
  hr: number,
  rbi: number,
  bb: number,
  kk: number,
  hra: string
): Batter => ({ name, batOrder, pos, ab, run, hit, hr, rbi, bb, kk, sb: 0, hra, innings: [] });

const p = (
  name: string,
  inn: string,
  er: number,
  r: number,
  hit: number,
  bb: number,
  kk: number,
  hr: number,
  bf: number,
  era: string,
  wls: string
): Pitcher => ({ name, inn, er, r, hit, bb, kk, hr, bf, era, wls, seasonWin: 0, seasonLose: 0 });

export const SNAPSHOT_DETAIL: GameDetail = {
  summary: SNAPSHOT_SCHEDULE[0],
  kiaBatters: [
    b("김호령", 1, "중", 4, 0, 0, 0, 0, 0, 0, "0.280"),
    b("박재현", 2, "좌", 4, 2, 2, 0, 0, 0, 0, "0.283"),
    b("김도영", 3, "三", 3, 1, 2, 1, 2, 1, 1, "0.298"),
    b("나성범", 4, "우", 4, 1, 1, 1, 2, 0, 0, "0.295"),
    b("카스트로", 5, "지", 4, 1, 2, 1, 1, 0, 0, "0.314"),
    b("한준수", 6, "포", 4, 0, 1, 0, 0, 0, 2, "0.322"),
    b("김선빈", 7, "二", 3, 0, 0, 0, 0, 0, 0, "0.243"),
    b("변우혁", 8, "一", 2, 0, 0, 0, 0, 0, 1, "0.226"),
    b("박민", 9, "유", 4, 0, 1, 0, 0, 0, 1, "0.200"),
  ],
  kiaPitchers: [
    p("양현종", "5", 1, 1, 5, 1, 1, 0, 69, "3.91", "승"),
    p("전상현", "1", 0, 0, 0, 0, 0, 0, 11, "5.40", "홀"),
    p("조상우", "1", 0, 0, 1, 0, 0, 0, 14, "1.53", "홀"),
    p("곽도규", "1 ⅓", 1, 1, 1, 0, 2, 0, 21, "1.88", ""),
    p("정해영", "0 ⅔", 0, 0, 1, 0, 1, 0, 12, "4.91", "세"),
  ],
  oppBatters: [
    b("황성빈", 1, "중", 5, 0, 0, 0, 0, 0, 0, "0.289"),
    b("레이예스", 3, "좌", 4, 0, 0, 0, 0, 0, 0, "0.348"),
    b("한동희", 4, "지", 4, 0, 1, 0, 0, 0, 0, "0.280"),
    b("한태양", 6, "二", 4, 1, 2, 0, 0, 0, 1, "0.267"),
  ],
  oppPitchers: [
    p("김진욱", "6", 3, 3, 7, 1, 3, 2, 84, "2.95", "패"),
    p("최준용", "1", 2, 2, 2, 0, 1, 1, 18, "3.35", ""),
  ],
  rhe: {
    kia: { r: 5, h: 9, e: 0, b: 1 },
    opp: { r: 2, h: 8, e: 0, b: 2 },
  },
  innings: {
    kia: [0, 1, 1, 0, 0, 1, 0, 2, 0],
    opp: [0, 0, 0, 1, 0, 0, 0, 0, 1],
  },
  etc: [
    { how: "결승타", result: "카스트로(2회 무사서 우월 홈런)" },
    { how: "홈런", result: "카스트로6호(2회1점 김진욱) 김도영27호(6회1점 김진욱) 나성범17호(8회2점 최준용)" },
    { how: "2루타", result: "박재현(3회) 손호영(4회) 한태양(4회) 손성빈(5회) 박건우(9회)" },
    { how: "병살타", result: "김선빈(4회)" },
  ],
  kiaStanding: { rank: 4, w: 45, l: 39, d: 2, era: 4.28, hra: 0.269, hr: 101 },
};
