// KIA 타이거즈 팀 코드 (Naver Sports 기준, 해태 시절부터 HT)
export const KIA_CODE = "HT";

export type Side = "home" | "away";
export type GameResult = "W" | "L" | "D";

export interface TeamRef {
  code: string;
  name: string;
  emblem: string;
}

export interface GameSummary {
  gameId: string;
  date: string; // YYYY-MM-DD
  dateTime: string;
  stadium?: string;
  statusCode: string; // RESULT | BEFORE | STARTED | CANCEL ...
  canceled: boolean;
  home: TeamRef & { score: number | null };
  away: TeamRef & { score: number | null };

  // KIA 중심 파생 정보
  kiaSide: Side | null;
  opponent: TeamRef;
  kiaScore: number | null;
  oppScore: number | null;
  result: GameResult | null; // 경기 종료 시에만
}

export interface Batter {
  name: string;
  batOrder: number;
  pos: string;
  ab: number; // 타수
  run: number;
  hit: number;
  hr: number;
  rbi: number;
  bb: number; // 볼넷
  kk: number; // 삼진
  sb: number; // 도루
  hra: string; // 시즌 타율
  innings: string[]; // 이닝별 결과 (예: "유땅", "좌홈")
}

export interface Pitcher {
  name: string;
  inn: string; // 이닝
  er: number; // 자책
  r: number;
  hit: number;
  bb: number;
  kk: number;
  hr: number;
  bf: number; // 상대타자
  era: string; // 시즌 ERA
  wls: string; // 승 | 패 | H | S | ""
  seasonWin: number;
  seasonLose: number;
}

export interface Standing {
  rank: number;
  w: number;
  l: number;
  d: number;
  era: number;
  hra: number; // 팀 타율
  hr: number;
}

export interface EtcRecord {
  how: string; // 결승타 | 홈런 | 2루타 ...
  result: string;
}

export interface GameDetail {
  summary: GameSummary;
  kiaBatters: Batter[];
  kiaPitchers: Pitcher[];
  oppBatters: Batter[];
  oppPitchers: Pitcher[];
  rhe: {
    kia: { r: number; h: number; e: number; b: number };
    opp: { r: number; h: number; e: number; b: number };
  };
  innings: { kia: number[]; opp: number[] }; // 이닝별 득점
  etc: EtcRecord[];
  kiaStanding: Standing | null;
}

// 리그 순위표 한 줄
export interface LeagueRow {
  name: string;
  rank: number;
  w: number;
  l: number;
  d: number;
  wra: number; // 승률
  era: number;
  hra: number;
  hr: number;
}

// 선수 평점 + 육각 능력치
export interface Ability {
  label: string;
  value: number; // 0~99
}

// 다음 경기 프리뷰
export interface NextGamePreview {
  game: GameSummary;
  dday: string;
  hype: string;
  h2hLine: string | null;
}

export interface RatedPlayer {
  name: string;
  role: "batter" | "pitcher";
  pos: string; // 포지션 or 이닝
  line: string;
  rating: number; // 0.0~10.0
  comment: string; // 한 줄 드립
  abilities: Ability[]; // 육각형 6개
}

// 유머 분석 결과
export interface PlayerPick {
  name: string;
  role: "batter" | "pitcher";
  line: string; // 기록 요약 한 줄 (예: "4타수 1안타 1홈런 2타점")
  reason: string; // 유머러스한 이유
  badge: string; // 이모지/칭호
  score: number; // 내부 점수 (표시 안함)
}

export interface GameAnalysis {
  headline: string; // 유머러스 헤드라인
  summary: string; // 경기 요약(유머)
  moodEmoji: string;
  moodLabel: string;
  best: PlayerPick | null;
  worst: PlayerPick | null;
  funFacts: string[];
}
