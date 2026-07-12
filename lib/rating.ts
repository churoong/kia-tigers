import { Ability, Batter, GameDetail, Pitcher, RatedPlayer } from "./types";

/* ------------------------------------------------------------------ *
 *  축구식 경기 평점 (10점 만점, 기본 6.0에서 가감)
 * ------------------------------------------------------------------ */
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function round1(v: number) {
  return Math.round(v * 10) / 10;
}

function innToNum(inn: string): number {
  const whole = parseInt(inn, 10) || 0;
  let frac = 0;
  if (inn.includes("⅓")) frac = 1 / 3;
  else if (inn.includes("⅔")) frac = 2 / 3;
  return whole + frac;
}

export function rateBatter(b: Batter): number {
  let r = 5.5;
  r += b.hit * 0.7;
  r += b.hr * 1.2;
  r += b.rbi * 0.5;
  r += b.run * 0.3;
  r += b.bb * 0.3;
  r += b.sb * 0.3;
  r -= (b.ab - b.hit) * 0.35;
  r -= b.kk * 0.15;
  return round1(clamp(r, 1.0, 10.0));
}

export function ratePitcher(p: Pitcher): number {
  const ip = innToNum(p.inn);
  let r = 5.5;
  r += ip * 0.45;
  r += p.kk * 0.25;
  r -= p.er * 0.9;
  r -= p.hit * 0.1;
  r -= p.bb * 0.2;
  r -= p.hr * 0.4;
  if (p.wls === "승") r += 1.2;
  else if (p.wls === "세") r += 1.0;
  else if (p.wls === "홀") r += 0.6;
  else if (p.wls === "패") r -= 0.8;
  return round1(clamp(r, 1.0, 10.0));
}

/* ------------------------------------------------------------------ *
 *  위닝일레븐풍 육각 능력치 (0~99)
 * ------------------------------------------------------------------ */
function scale(v: number, max: number): number {
  return Math.round(clamp((v / max) * 99, 15, 99)); // 최소 15 (바닥 방지)
}

export function batterAbilities(b: Batter): Ability[] {
  const avg = b.ab > 0 ? b.hit / b.ab : 0;
  const seasonAvg = parseFloat(b.hra) || 0.25;
  return [
    { label: "컨택", value: scale(avg * 0.7 + seasonAvg * 0.9, 1.0) },
    { label: "파워", value: scale(b.hr * 2.2 + b.rbi * 0.5, 5) },
    { label: "찬스", value: scale(b.rbi * 1.6 + b.run * 0.7, 5) },
    { label: "선구안", value: scale(b.bb * 2 - b.kk * 0.8 + 1.5, 4) },
    { label: "주루", value: scale(b.run * 1.3 + b.sb * 2.2 + 0.5, 4) },
    { label: "폼", value: scale(seasonAvg, 0.36) },
  ];
}

export function pitcherAbilities(p: Pitcher): Ability[] {
  const ip = innToNum(p.inn);
  const bf = Math.max(p.bf, 1);
  const kRate = p.kk / bf; // 탈삼진율
  const bbRate = p.bb / bf;
  const seasonEra = parseFloat(p.era) || 4.5;
  const crisis = 1 - clamp(p.er / Math.max(p.hit + p.bb, 1), 0, 1); // 주자 있어도 실점 억제
  const impact =
    p.wls === "승" ? 1 : p.wls === "세" ? 0.9 : p.wls === "홀" ? 0.7 : p.wls === "패" ? 0.2 : 0.5;
  return [
    { label: "구위", value: scale(kRate * 4 + (1 - p.hit / bf) * 0.8, 1.6) },
    { label: "제구", value: scale(1 - bbRate * 6, 1.0) },
    { label: "체력", value: scale(ip, 7) },
    { label: "위기관리", value: scale(crisis, 1.0) },
    { label: "폼", value: scale(clamp(6.5 - seasonEra, 0, 6), 5.5) },
    { label: "승부사", value: scale(impact, 1.0) },
  ];
}

/* ------------------------------------------------------------------ *
 *  평점 코멘트 (점수대별 드립)
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

function ratingComment(seed: string, rating: number, role: "batter" | "pitcher"): string {
  if (rating >= 9)
    return pick(seed, [
      "미쳤다 이건 게임 캐릭터임",
      "오늘만큼은 리그 최고존엄",
      "연봉협상 자료 1페이지 확정",
    ]);
  if (rating >= 8)
    return pick(seed, [
      "폼 미쳤다, 이대로만 가자",
      "하드캐리 오지게 함",
      "상대 팬들도 박수침",
    ]);
  if (rating >= 7)
    return pick(seed, [
      "밥값 제대로 함 👍",
      "든든하다 든든해",
      "이런 선수 열 명만 있으면 우승",
    ]);
  if (rating >= 6)
    return pick(seed, [
      "무난무난, 나쁘지 않음",
      "1인분은 했다",
      "조용히 할 거 다 함",
    ]);
  if (rating >= 5)
    return pick(seed, [
      "살짝 아쉽지만 봐준다",
      "0.7인분… 내일 만회하자",
      "몸은 나왔는데 방망이는 집에",
    ]);
  if (rating >= 4)
    return pick(
      seed,
      role === "batter"
        ? ["방망이 들고 관광만 하다 감", "오늘 스윙은 선풍기였다", "타석에서 숨쉬기 운동"]
        : ["공이 존나 정직했다", "스트라이크존이 원수였나", "마운드가 가시방석"]
    );
  return pick(seed, [
    "이건 좀 심했다… 반성문 각",
    "팬들 혈압 책임져라 진짜",
    "오늘 기록은 소각 처리하자",
  ]);
}

/* ------------------------------------------------------------------ *
 *  경기 전체 선수 평점 생성
 * ------------------------------------------------------------------ */
export function ratePlayers(detail: GameDetail): RatedPlayer[] {
  const out: RatedPlayer[] = [];
  const gid = detail.summary.gameId;

  for (const b of detail.kiaBatters) {
    if (b.ab === 0 && b.bb === 0 && b.run === 0) continue; // 미출전급 제외
    const rating = rateBatter(b);
    const bits = [`${b.ab}타수 ${b.hit}안타`];
    if (b.hr) bits.push(`${b.hr}홈런`);
    if (b.rbi) bits.push(`${b.rbi}타점`);
    if (b.bb) bits.push(`${b.bb}볼넷`);
    if (b.kk) bits.push(`${b.kk}삼진`);
    out.push({
      name: b.name,
      role: "batter",
      pos: b.pos,
      line: bits.join(" "),
      rating,
      comment: ratingComment(gid + "rc" + b.name, rating, "batter"),
      abilities: batterAbilities(b),
    });
  }
  for (const p of detail.kiaPitchers) {
    const rating = ratePitcher(p);
    const bits = [`${p.inn}이닝 ${p.er}자책`];
    if (p.kk) bits.push(`${p.kk}K`);
    if (p.wls) bits.push(p.wls);
    out.push({
      name: p.name,
      role: "pitcher",
      pos: "투수",
      line: bits.join(" "),
      rating,
      comment: ratingComment(gid + "rc" + p.name, rating, "pitcher"),
      abilities: pitcherAbilities(p),
    });
  }
  // 평점 높은 순
  return out.sort((a, b) => b.rating - a.rating);
}
