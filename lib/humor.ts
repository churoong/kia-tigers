import {
  Batter,
  GameAnalysis,
  GameDetail,
  GameSummary,
  NextGamePreview,
  Pitcher,
  PlayerPick,
} from "./types";

/* ------------------------------------------------------------------ *
 *  결정론적 랜덤 (게임ID+키로 시드) — SSR 하이드레이션 안정성 확보
 * ------------------------------------------------------------------ */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function pick<T>(seed: string, arr: T[]): T {
  return arr[hash(seed) % arr.length];
}

/* ------------------------------------------------------------------ *
 *  한국어 조사 처리 (받침 유무)
 * ------------------------------------------------------------------ */
function hasBatchim(word: string): boolean {
  const ch = word.trim().slice(-1);
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  // 영문/숫자는 발음상 받침 없는 것으로 처리 (NC, LG, KT 등)
  return false;
}
// 이/가 (주격)
function iga(word: string): string {
  return word + (hasBatchim(word) ? "이" : "가");
}
// 을/를 (목적격)
function eulReul(word: string): string {
  return word + (hasBatchim(word) ? "을" : "를");
}
// 와/과
function waGwa(word: string): string {
  return word + (hasBatchim(word) ? "과" : "와");
}

/* ------------------------------------------------------------------ *
 *  헬퍼
 * ------------------------------------------------------------------ */
function innToNum(inn: string): number {
  if (!inn) return 0;
  const whole = parseInt(inn, 10) || 0; // "1 ⅓" -> 1, "0 ⅔" -> 0, "5" -> 5
  let frac = 0;
  if (inn.includes("⅓")) frac = 1 / 3;
  else if (inn.includes("⅔")) frac = 2 / 3;
  return whole + frac;
}

function batterLine(b: Batter): string {
  const bits = [`${b.ab}타수 ${b.hit}안타`];
  if (b.hr) bits.push(`${b.hr}홈런`);
  if (b.rbi) bits.push(`${b.rbi}타점`);
  if (b.run) bits.push(`${b.run}득점`);
  if (b.bb) bits.push(`${b.bb}볼넷`);
  if (b.kk) bits.push(`${b.kk}삼진`);
  return bits.join(" ");
}

function pitcherLine(p: Pitcher): string {
  const bits = [`${p.inn}이닝 ${p.er}자책`];
  if (p.hit) bits.push(`${p.hit}피안타`);
  if (p.hr) bits.push(`${p.hr}피홈런`);
  if (p.kk) bits.push(`${p.kk}탈삼진`);
  if (p.bb) bits.push(`${p.bb}볼넷`);
  return bits.join(" ");
}

function batterScore(b: Batter): number {
  return (
    b.hit * 2 +
    b.hr * 4 +
    b.rbi * 2 +
    b.run * 1 +
    b.bb * 0.7 -
    (b.ab - b.hit) * 0.6 -
    b.kk * 0.4
  );
}
function pitcherScore(p: Pitcher): number {
  const ip = innToNum(p.inn);
  let s = ip * 2 + p.kk * 0.7 - p.er * 2.5 - p.hit * 0.3 - p.hr * 1.5 - p.bb * 0.4;
  if (p.wls === "승") s += 3;
  if (p.wls === "세") s += 2;
  if (p.wls === "홀") s += 1;
  if (p.wls === "패") s -= 3;
  return s;
}

/* ------------------------------------------------------------------ *
 *  베스트 선수
 * ------------------------------------------------------------------ */
function bestBatterReason(seed: string, b: Batter): string {
  if (b.hr >= 2)
    return pick(seed, [
      `혼자 홈런 ${b.hr}방. 이건 야구가 아니라 학살이다. 상대 투수 오늘 잠 못 잔다.`,
      `방망이가 아니라 대포를 들고 나왔네 미친놈(칭찬임). ${b.hr}홈런으로 경기 찢어버림.`,
    ]);
  if (b.hr === 1 && b.rbi >= 2)
    return pick(seed, [
      `${b.hr}홈런 ${b.rbi}타점. 상대 투수 꿈에 나올 얼굴 확정. 존나 잘했다.`,
      `담장 밖으로 ${b.rbi}점 배달 완료. 쿠팡도 이렇게 빠르진 않다.`,
      `한 방으로 분위기 싹 바꿔버림. 이게 바로 밥값 하는 4번의 품격.`,
    ]);
  if (b.hit >= 3)
    return pick(seed, [
      `${b.ab}타수 ${b.hit}안타 미쳐버림. 상대 투수는 이 이름만 봐도 PTSD 온다.`,
      `방망이에 자석 달았냐? 공이 알아서 배트로 기어들어옴 (${b.hit}안타).`,
    ]);
  if (b.rbi >= 3)
    return `타점 ${b.rbi}개 혼자 싹쓸이. 밥값이 아니라 팀 전체 회식비를 벌어옴.`;
  return pick(seed, [
    `조용히 할 거 다 하고 감. ${batterLine(b)}, 오늘의 개근상 일꾼.`,
    `화려하진 않은데 필요할 때 딱딱 침. ${batterLine(b)}. 이런 놈이 무섭다.`,
  ]);
}

function bestPitcherReason(seed: string, p: Pitcher): string {
  const ip = innToNum(p.inn);
  if (p.wls === "승" && p.er <= 1)
    return pick(seed, [
      `${p.inn}이닝 ${p.er}자책 승리. 혼자 다른 리그에서 야구하다 옴. 개지렸다.`,
      `상대 방망이 전부 재워버림. ${pitcherLine(p)}, 이게 에이스지 ㅅㅂ 눈물난다.`,
    ]);
  if (p.wls === "세")
    return `9회 문 걸어잠그고 세이브. 팬들 심장 몇 개 태웠지만 어쨌든 불은 껐다 (${pitcherLine(p)}).`;
  if (ip >= 6 && p.er <= 2)
    return `${p.inn}이닝 먹어주면서 불펜 전원 유급휴가 보냄. 감독이 제일 사랑하는 유형.`;
  if (p.kk >= 5)
    return `삼진 ${p.kk}개. 상대 타자들 헛스윙 유산소만 존나 시키고 유유히 퇴근.`;
  return `${pitcherLine(p)}. 마운드에서 1인분 이상 확실하게 함.`;
}

function selectBest(detail: GameDetail): PlayerPick | null {
  const cands: PlayerPick[] = [];
  for (const b of detail.kiaBatters) {
    if (b.ab === 0 && b.bb === 0) continue;
    const seed = detail.summary.gameId + "B" + b.name;
    cands.push({
      name: b.name,
      role: "batter",
      line: batterLine(b),
      reason: bestBatterReason(seed, b),
      badge: b.hr >= 1 ? "🚀" : b.hit >= 2 ? "🔥" : "🙂",
      score: batterScore(b),
    });
  }
  for (const p of detail.kiaPitchers) {
    if (innToNum(p.inn) < 0.9 && p.wls === "") continue;
    const seed = detail.summary.gameId + "P" + p.name;
    cands.push({
      name: p.name,
      role: "pitcher",
      line: pitcherLine(p),
      reason: bestPitcherReason(seed, p),
      badge: p.wls === "승" ? "🏆" : p.wls === "세" ? "🔒" : "⚾",
      score: pitcherScore(p),
    });
  }
  if (cands.length === 0) return null;
  cands.sort((a, b) => b.score - a.score);
  return cands[0];
}

/* ------------------------------------------------------------------ *
 *  워스트 선수 (놀리되 선은 지키는 유머)
 * ------------------------------------------------------------------ */
function worstBatterReason(seed: string, b: Batter): string {
  if (b.ab >= 4 && b.hit === 0 && b.kk >= 2)
    return pick(seed, [
      `${b.ab}타수 무안타 삼진 ${b.kk}개. 방망이 집에 두고 왔냐? 선풍기 소리만 존나 남.`,
      `헛스윙으로 관중석에 바람 서비스만 제공. ${b.ab}타수 0안타 삼진 ${b.kk}개, 에어컨이냐.`,
    ]);
  if (b.ab >= 4 && b.hit === 0)
    return pick(seed, [
      `${b.ab}번 나가서 ${b.ab}번 걸어들어옴. 오늘 방망이는 그냥 인테리어 소품.`,
      `타율 계산기도 오늘은 계산 거부함. ${b.ab}타수 무안타 실화냐.`,
    ]);
  if (b.hit === 0 && b.ab >= 3)
    return `${b.ab}타수 무안타. 내일은 다르겠지… 다르겠지? 제발 좀.`;
  return `${batterLine(b)}. 방망이 예열만 하다가 경기 끝남. 아 진짜.`;
}

function worstPitcherReason(seed: string, p: Pitcher): string {
  if (p.wls === "패")
    return pick(seed, [
      `${p.inn}이닝 ${p.er}자책 패전. 오늘 마운드는 지옥이었다. 팬들 혈압 책임져라.`,
      `상대 방망이에 개처럼 두들겨 맞음. ${pitcherLine(p)}, 오늘 기록은 파쇄기로.`,
    ]);
  if (p.hr >= 1 && p.er >= 2)
    return `피홈런 ${p.hr}방 포함 ${p.er}자책. 공이 담장 밖으로 존나 여행 다녀옴.`;
  if (p.er >= 3)
    return `${p.inn}이닝 ${p.er}자책. 불났는데 소화기 대신 기름 들고 서있었다.`;
  return `${pitcherLine(p)}. 오늘은 공이 손에서 좀 샜다. 그럴 수 있지 뭐… (없어).`;
}

function selectWorst(detail: GameDetail, best: PlayerPick | null): PlayerPick | null {
  const cands: PlayerPick[] = [];
  for (const b of detail.kiaBatters) {
    if (b.ab < 3) continue;
    if (best && best.name === b.name && best.role === "batter") continue;
    const seed = detail.summary.gameId + "WB" + b.name;
    cands.push({
      name: b.name,
      role: "batter",
      line: batterLine(b),
      reason: worstBatterReason(seed, b),
      badge: b.kk >= 2 ? "🌪️" : "😵",
      score: batterScore(b),
    });
  }
  for (const p of detail.kiaPitchers) {
    if (p.er < 2 && p.wls !== "패") continue;
    if (best && best.name === p.name && best.role === "pitcher") continue;
    const seed = detail.summary.gameId + "WP" + p.name;
    cands.push({
      name: p.name,
      role: "pitcher",
      line: pitcherLine(p),
      reason: worstPitcherReason(seed, p),
      badge: p.wls === "패" ? "💀" : "🔥",
      score: pitcherScore(p) - 3,
    });
  }
  if (cands.length === 0) return null;
  cands.sort((a, b) => a.score - b.score);
  return cands[0];
}

/* ------------------------------------------------------------------ *
 *  경기 무드 / 헤드라인 / 요약
 * ------------------------------------------------------------------ */
function mood(detail: GameDetail): { emoji: string; label: string } {
  const s = detail.summary;
  if (s.result === "D") return { emoji: "🤝", label: "4시간 봤는데 무승부 실화냐" };
  const margin = Math.abs((s.kiaScore ?? 0) - (s.oppScore ?? 0));
  if (s.result === "W") {
    if (margin >= 7) return { emoji: "😎", label: "개압살 완료. 오늘 밤 치킨에 맥주다" };
    if (margin <= 2) return { emoji: "😮‍💨", label: "심장 쫄깃한 신승. 수명 3년 헌납" };
    return { emoji: "😆", label: "기분 좋~은 승리, 발 뻗고 잔다" };
  }
  if (margin >= 7) return { emoji: "🫠", label: "개털렸다. 오늘 경기는 없던 걸로" };
  if (margin <= 2) return { emoji: "😩", label: "한 끗 차이… 아 진짜 빡친다" };
  return { emoji: "😔", label: "야구의 신이 오늘 우릴 버림" };
}

function headline(seed: string, detail: GameDetail): string {
  const s = detail.summary;
  const opp = s.opponent.name;
  const margin = Math.abs((s.kiaScore ?? 0) - (s.oppScore ?? 0));
  if (s.result === "D")
    return pick(seed, [
      `${opp}와 나눠먹은 무승부, 반반무마니 실화냐`,
      `밤새 싸우고 결론 없음, ${opp}와 무승부`,
    ]);
  if (s.result === "W") {
    if (margin >= 7)
      return pick(seed, [`${opp} 상대로 개파티, 스코어보드가 민망함`, `${eulReul(opp)} 그냥 짓밟아버림 ㅋㅋ`]);
    if (margin <= 2)
      return pick(seed, [`${opp} 상대 심장 쫄깃 진땀승, 아 수명`, `끝까지 쥐어짜서 ${opp}전 신승. 후…`]);
    return pick(seed, [`${opp} 꺾고 기분 좋은 승리 개이득`, `${opp} 상대로 야무지게 조져버림`]);
  }
  if (margin >= 7)
    return pick(seed, [`${opp}한테 개털림… 오늘 경기 기억에서 삭제`, `${opp}전 대참사, 소주 각이다`]);
  if (margin <= 2)
    return pick(seed, [`${opp}한테 한 끗 차이로 뺏김, 아 빡쳐`, `${opp}전, 다 이긴 경기 갖다바침의 정석`]);
  return pick(seed, [`${opp}전 패배… 오늘은 조용히 자자`, `${opp}한테 내준 하루, 내일 두고보자`]);
}

function summaryText(seed: string, detail: GameDetail): string {
  const s = detail.summary;
  const opp = s.opponent.name;
  const place = s.kiaSide === "home" ? "홈에서" : `원정 ${s.stadium ?? ""}에서`.trim();
  const scoreStr = `${s.kiaScore}-${s.oppScore}`;
  const hrRow = detail.etc.find((e) => e.how === "홈런");
  const winP = detail.kiaPitchers.find((p) => p.wls === "승");
  const parts: string[] = [];
  if (s.result === "W")
    parts.push(`KIA가 ${place} ${eulReul(opp)} ${scoreStr}로 눌렀다.`);
  else if (s.result === "L")
    parts.push(`KIA가 ${place} ${opp}에게 ${scoreStr}로 무릎을 꿇었다.`);
  else parts.push(`KIA가 ${place} ${waGwa(opp)} ${scoreStr} 무승부를 기록했다.`);

  if (hrRow) {
    const names = hrRow.result.match(/[가-힣]+(?=\d*호)/g);
    if (names && names.length) {
      const uniq = Array.from(new Set(names));
      const last = uniq[uniq.length - 1];
      const head = uniq.slice(0, -1);
      const joined = head.length ? head.join(", ") + ", " + iga(last) : iga(last);
      parts.push(`홈런포는 ${joined} 담당.`);
    }
  }
  if (winP && s.result === "W")
    parts.push(`${iga(winP.name)} ${winP.inn}이닝을 책임지며 승리를 지켰다.`);
  return parts.join(" ");
}

function funFacts(detail: GameDetail): string[] {
  const facts: string[] = [];
  const r = detail.rhe;
  facts.push(`오늘 팀 안타 ${r.kia.h}개, 상대는 ${r.opp.h}개.`);
  const hrCount = (detail.etc.find((e) => e.how === "홈런")?.result.match(/호/g) || []).length;
  if (hrCount) facts.push(`팀 홈런 ${hrCount}방으로 담장을 두드렸다.`);
  const gw = detail.etc.find((e) => e.how === "결승타");
  if (gw) {
    const who = gw.result.match(/^[가-힣]+/);
    if (who) facts.push(`결승타의 주인공은 ${who[0]}.`);
  }
  const multi = detail.kiaBatters.filter((b) => b.hit >= 2).map((b) => b.name);
  if (multi.length) facts.push(`멀티히트: ${multi.join(", ")}.`);
  if (detail.kiaStanding)
    facts.push(
      `현재 KIA는 리그 ${detail.kiaStanding.rank}위 (${detail.kiaStanding.w}승 ${detail.kiaStanding.l}패 ${detail.kiaStanding.d}무).`
    );
  return facts;
}

export function analyzeGame(detail: GameDetail): GameAnalysis {
  const seed = detail.summary.gameId;
  const best = selectBest(detail);
  const worst = selectWorst(detail, best);
  const m = mood(detail);
  return {
    headline: headline(seed + "H", detail),
    summary: summaryText(seed + "S", detail),
    moodEmoji: m.emoji,
    moodLabel: m.label,
    best,
    worst,
    funFacts: funFacts(detail),
  };
}

/* ------------------------------------------------------------------ *
 *  시리즈 분석
 * ------------------------------------------------------------------ */
export interface SeriesAnalysis {
  opponent: string;
  games: GameSummary[];
  w: number;
  l: number;
  d: number;
  outcome: "위닝시리즈" | "루징시리즈" | "스플릿" | "스윕승" | "스윕패";
  headline: string;
  comment: string;
  emoji: string;
}

export function analyzeSeries(games: GameSummary[]): SeriesAnalysis | null {
  // 최신 완료 경기부터, 같은 상대 연속 묶음 = 최근 시리즈
  const played = games.filter((g) => g.result && !g.canceled);
  if (played.length === 0) return null;
  const opp = played[0].opponent.code;
  const series: GameSummary[] = [];
  for (const g of played) {
    if (g.opponent.code === opp) series.push(g);
    else break;
  }
  series.reverse(); // 시간순
  let w = 0,
    l = 0,
    d = 0;
  for (const g of series) {
    if (g.result === "W") w++;
    else if (g.result === "L") l++;
    else d++;
  }
  const oppName = series[0].opponent.name;
  let outcome: SeriesAnalysis["outcome"];
  if (l === 0 && w >= 2) outcome = "스윕승";
  else if (w === 0 && l >= 2) outcome = "스윕패";
  else if (w > l) outcome = "위닝시리즈";
  else if (l > w) outcome = "루징시리즈";
  else outcome = "스플릿";

  const seed = series.map((g) => g.gameId).join("");
  const map: Record<
    SeriesAnalysis["outcome"],
    { emoji: string; head: string[]; comment: string[] }
  > = {
    스윕승: {
      emoji: "🧹",
      head: [`${oppName} 상대 스윕! 빗자루로 싹 쓸어버림`],
      comment: [`${oppName}한테 숨 쉴 틈도 안 줌. 시리즈 싹쓸이 개꿀맛, 어깨 피고 퇴근하자.`],
    },
    스윕패: {
      emoji: "🧺",
      head: [`${oppName}한테 스윕패… 아 개빡치네`],
      comment: [`${oppName}한테 세탁-탈수-건조까지 풀코스로 당함. 다음에 이자까지 쳐서 돌려주자.`],
    },
    위닝시리즈: {
      emoji: "😎",
      head: [`${oppName} 상대 위닝시리즈 개이득`],
      comment: [`${oppName}와의 시리즈 웃으면서 마무리. 이기는 맛에 야구 보는 거지 ㅋㅋ`],
    },
    루징시리즈: {
      emoji: "😮‍💨",
      head: [`${oppName}한테 루징시리즈… 하 진짜`],
      comment: [`${oppName} 상대로 고비 못 넘김. 빡치지만 시즌은 길다. 존버가 답이다.`],
    },
    스플릿: {
      emoji: "🤷",
      head: [`${oppName}와 사이좋게 반반, 노잼 스플릿`],
      comment: [`${oppName}와 주고받기만 하다 끝. 손해도 이득도 없는 그냥 그런 시리즈.`],
    },
  };
  const cfg = map[outcome];
  return {
    opponent: oppName,
    games: series,
    w,
    l,
    d,
    outcome,
    headline: pick(seed, cfg.head),
    comment: pick(seed + "c", cfg.comment),
    emoji: cfg.emoji,
  };
}

/* ------------------------------------------------------------------ *
 *  최근 10경기 분석
 * ------------------------------------------------------------------ */
export interface Last10Analysis {
  games: GameSummary[];
  w: number;
  l: number;
  d: number;
  streakLabel: string;
  moodEmoji: string;
  headline: string;
  comment: string;
  gauge: number; // 0~100 기분지수
}

export function analyzeLast10(games: GameSummary[]): Last10Analysis {
  const played = games.filter((g) => g.result && !g.canceled).slice(0, 10);
  let w = 0,
    l = 0,
    d = 0;
  for (const g of played) {
    if (g.result === "W") w++;
    else if (g.result === "L") l++;
    else d++;
  }
  // 현재 연승/연패 (최신순)
  let streak = 0;
  let streakType: "W" | "L" | null = null;
  for (const g of played) {
    if (g.result === "D") continue;
    if (streakType === null) {
      streakType = g.result as "W" | "L";
      streak = 1;
    } else if (g.result === streakType) streak++;
    else break;
  }
  const streakLabel =
    streakType === "W"
      ? `${streak}연승 질주 중 🔥`
      : streakType === "L"
      ? `${streak}연패 늪 🕳️`
      : "잔잔한 흐름";

  const gauge = played.length
    ? Math.round(((w + d * 0.5) / played.length) * 100)
    : 50;

  const seed = played.map((g) => g.gameId).join("");
  let moodEmoji = "🙂";
  let headPool: string[] = [];
  let commentPool: string[] = [];
  if (w >= 7) {
    moodEmoji = "🔥";
    headPool = ["최근 10경기 폼 미쳐버림 ㅋㅋ", "요즘 기아 그냥 다 때려잡음"];
    commentPool = [`${w}승 ${l}패 ${d}무. 이 기세 뭐냐 무섭다. 직관 예매 서둘러라 표 없어진다.`];
  } else if (w >= 5) {
    moodEmoji = "😊";
    headPool = ["최근 10경기 나쁘지 않아, 오히려 좋아", "슬금슬금 올라가는 중"];
    commentPool = [`${w}승 ${l}패 ${d}무로 반타작 이상. 롤러코스터긴 한데 방향은 위쪽이다.`];
  } else if (w >= 3) {
    moodEmoji = "😐";
    headPool = ["최근 10경기 애매~한 중립기어", "이겼다 졌다 청개구리 야구 중"];
    commentPool = [`${w}승 ${l}패 ${d}무. 승수 셀 때마다 한숨 나오는 딱 그 성적. 한 방이 필요하다.`];
  } else {
    moodEmoji = "🫠";
    headPool = ["최근 10경기 폼 어디다 팔았냐", "겨울잠 모드… 시즌 중인데요?"];
    commentPool = [`${w}승 ${l}패 ${d}무. 하… 그래도 팬심은 무패다. 반등해라 제발 좀.`];
  }
  return {
    games: played,
    w,
    l,
    d,
    streakLabel,
    moodEmoji,
    headline: pick(seed, headPool),
    comment: pick(seed + "c", commentPool),
    gauge,
  };
}

/* ------------------------------------------------------------------ *
 *  다음 경기 프리뷰 (유머 하이프)
 * ------------------------------------------------------------------ */
export function buildNextGamePreview(
  upcoming: GameSummary[],
  recentGames: GameSummary[],
  today: string // YYYY-MM-DD (서버에서 주입)
): NextGamePreview | null {
  const game = upcoming[0];
  if (!game) return null;

  // D-day
  const diff = Math.round(
    (new Date(game.date + "T00:00:00").getTime() -
      new Date(today + "T00:00:00").getTime()) /
      86400000
  );
  const dday = diff <= 0 ? "오늘!" : diff === 1 ? "내일" : `D-${diff}`;

  // 최근 그 팀 상대 전적
  const vs = recentGames.filter(
    (g) => g.opponent.code === game.opponent.code && g.result && !g.canceled
  );
  let w = 0,
    l = 0;
  for (const g of vs.slice(0, 6)) {
    if (g.result === "W") w++;
    else if (g.result === "L") l++;
  }
  const h2hLine =
    vs.length > 0
      ? `최근 ${game.opponent.name}전 ${w}승 ${l}패${
          w > l ? " — 밥상이다 밥상" : l > w ? " — 이번엔 갚아줄 차례" : ""
        }`
      : null;

  const opp = game.opponent.name;
  const seed = game.gameId;
  const place = game.kiaSide === "home" ? "홈" : "원정";

  let hype: string;
  if (l > w && l >= 2) {
    hype = pick(seed, [
      `요즘 ${opp}한테 좀 맞았다. 근데 야구는 갚는 맛이지. 이번엔 이자 쳐서 돌려받자. 배트 갈아끼우고 가즈아 🔥`,
      `${opp}… 최근에 당한 거 잊지 않았다. 오늘은 복수혈전이다. 다들 목 풀어놔라, 소리 지를 준비 하고.`,
    ]);
  } else if (w > l && w >= 2) {
    hype = pick(seed, [
      `최근 ${opp}전 전적 보니까 완전 밥상임 ㅋㅋ 차려진 김에 또 먹자. 방심만 안 하면 개꿀경기 예약.`,
      `${opp}? 최근에 우리가 재미 좀 봤지. 오늘도 맛있게 먹고 순위 한 칸 더 올리자.`,
    ]);
  } else {
    hype = pick(seed, [
      `${place}에서 붙는 ${opp}전. 딱 반반 싸움인데, 이런 경기 잡는 팀이 가을에 웃는다. 총력전 가자.`,
      `${opp}와 ${place} 맞대결. 어차피 야구는 해봐야 안다. 우리가 이기면 개꿀, 지면… 아니 이긴다.`,
    ]);
  }

  return { game, dday, hype, h2hLine };
}
