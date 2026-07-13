import {
  Ability,
  GamePreview,
  PreviewAnalysis,
  StarterCard,
  StarterInfo,
} from "./types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
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
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
/** 0~1 비율을 15~99 능력치로 */
function scale01(v: number): number {
  return Math.round(clamp(v, 0, 1) * 84) + 15;
}

/* ------------------------------------------------------------------ *
 *  선발 육각 능력치 (구위/제구/체력/안정감/상대공략/승운)
 * ------------------------------------------------------------------ */
export function starterAbilities(s: StarterInfo): Ability[] {
  const era = parseFloat(s.era);
  const whip = parseFloat(s.whip);
  const inn = parseFloat(s.inn || "0") || 0;
  const kk = s.kk;
  const k9 = inn > 0 ? (kk / inn) * 9 : 0;
  const vsEra = s.vsOpp ? parseFloat(s.vsOpp.era) : NaN;
  const decisions = s.w + s.l;
  return [
    { label: "구위", value: scale01(k9 / 11) },
    { label: "제구", value: scale01((1.6 - (isNaN(whip) ? 1.4 : whip)) / 0.9) },
    { label: "체력", value: scale01(inn / 110) },
    { label: "안정감", value: scale01((6.0 - (isNaN(era) ? 4.8 : era)) / 5.5) },
    {
      label: "상대공략",
      value: isNaN(vsEra) ? 48 : scale01((6.0 - vsEra) / 5.5),
    },
    { label: "승운", value: decisions > 0 ? scale01(s.w / decisions) : 45 },
  ];
}

function starterComment(seed: string, s: StarterInfo): string {
  if (!s.announced) return pick(seed, ["뚜껑 열어봐야 아는 미발표 카드", "누가 나올까… 감독 마음"]);
  const era = parseFloat(s.era);
  if (isNaN(era)) return "정보가 부족하다, 실력으로 증명해라";
  if (era < 2.5)
    return pick(seed, ["폼 미쳤다. 상대 타선 오늘 밥 굶을 예정 😈", "이 정도면 사기캐. 믿고 본다"]);
  if (era < 3.5)
    return pick(seed, ["믿음직한 에이스, 든든하다 든든해", "이 형 나오면 반은 먹고 들어감"]);
  if (era < 4.5)
    return pick(seed, ["기복은 있는데 할 땐 함. 오늘 제발", "복불복 카드지만 믿어본다"]);
  if (era < 5.5)
    return pick(seed, ["솔직히 불안하다… 오늘만 잘하자 제발 🙏", "초반만 버텨줘라 진짜"]);
  return pick(seed, ["ERA가 좀 아찔한데… 타선아 도와줘", "오늘은 대량득점 각오하고 봐야 하나"]);
}

function buildStarterCard(
  team: string,
  side: "kia" | "opp",
  s: StarterInfo,
  seed: string
): StarterCard {
  const abilities = starterAbilities(s);
  const overall = Math.round(
    abilities.reduce((a, b) => a + b.value, 0) / abilities.length
  );
  return { team, side, info: s, abilities, overall, comment: starterComment(seed, s) };
}

/* ------------------------------------------------------------------ *
 *  종합 우세 점수 → 예상 스코어
 * ------------------------------------------------------------------ */
function edgeScore(p: GamePreview): number {
  let score = 0;
  if (p.kiaStanding && p.oppStanding) score += p.oppStanding.rank - p.kiaStanding.rank;
  score += (p.seasonVs.w - p.seasonVs.l) * 0.7;
  if (p.kiaStarter.announced && p.oppStarter.announced) {
    const ke = parseFloat(p.kiaStarter.era);
    const oe = parseFloat(p.oppStarter.era);
    if (!isNaN(ke) && !isNaN(oe)) score += (oe - ke) * 1.2;
  }
  return score;
}

function predictedScore(
  p: GamePreview,
  oppName: string
): { kia: number; opp: number; winner: string; line: string } {
  const seed = p.game.gameId + "score";
  const m = clamp(Math.round(edgeScore(p) * 0.6), -5, 5);
  let kia: number, opp: number, winner: string;
  if (m === 0) {
    kia = 4 + (hash(seed) % 3); // 4~6
    opp = kia; // 예측 무승부
    winner = "무";
  } else if (m > 0) {
    opp = 2 + (hash(seed + "o") % 3); // 2~4
    kia = opp + Math.max(1, m);
    winner = "KIA";
  } else {
    kia = 2 + (hash(seed + "k") % 3);
    opp = kia + Math.max(1, -m);
    winner = oppName;
  }
  kia = clamp(kia, 0, 13);
  opp = clamp(opp, 0, 13);
  const diff = Math.abs(kia - opp);
  let line: string;
  if (winner === "무") line = pick(seed + "l", ["난타전 끝에 사이좋게 나눠먹기 예상 🤝", "쫄깃한 무승부 냄새가 난다"]);
  else if (winner === "KIA")
    line =
      diff >= 4
        ? pick(seed + "l", [`${esc(oppName)} 상대로 大파티 예상 🎉`, "이 정도면 콜드 각… 은 아니고 시원한 승리"])
        : pick(seed + "l", ["한 점 차 승부라도 이기면 장땡 😤", "쫄깃하게 이기는 그림"]);
  else
    line = pick(seed + "l", ["객관적으론 열세… 근데 뒤집으면 개꿀 🔥", "빡세다. 그래도 야구는 몰라요~"]);
  return { kia, opp, winner, line };
}

/* ------------------------------------------------------------------ *
 *  헤드라인 / 예상 코멘트 / 재미요소
 * ------------------------------------------------------------------ */
function headlineFor(seed: string, winner: string, oppName: string): { head: string; emoji: string } {
  if (winner === "KIA")
    return {
      emoji: "😎",
      head: pick(seed, [`${esc(oppName)} 잡고 순위 올릴 시간`, `오늘은 이겨야 정상, ${esc(oppName)} 조지자`]),
    };
  if (winner === "무")
    return { emoji: "⚔️", head: pick(seed, [`${esc(oppName)}와 피 튀기는 접전 예고`, "누가 이겨도 안 이상한 매치업"]) };
  return {
    emoji: "🔥",
    head: pick(seed, [`객관적 열세? 뒤집으면 더 짜릿하지`, `${esc(oppName)} 상대 언더독 반란 노린다`]),
  };
}

function predictionText(seed: string, p: GamePreview, oppName: string): string {
  const s = edgeScore(p);
  if (s >= 2.5)
    return pick(seed, [
      `전력·상대전적 다 우위. ${esc(oppName)}? 오늘은 밥상이다. 못 이기면 우리가 말아먹은 거임 😤`,
      `데이터가 KIA 손 들어줌. 방심만 안 하면 개꿀각. 그래도 야구는 끝까지 봐야 안다.`,
    ]);
  if (s <= -2.5)
    return pick(seed, [
      `솔직히 ${esc(oppName)}가 종이 위에선 더 세다. 근데 그거 뒤집는 맛에 야구 보는 거 아니겠냐 🔥`,
      `빡센 경기다. 그래도 우리가 누구냐. 정신 바짝 차리고 물어뜯자.`,
    ]);
  return pick(seed, [
    `딱 반반 접전. ${esc(oppName)}랑은 이런 경기 잡는 팀이 가을에 웃는다. 총력전 가즈아 ⚔️`,
    `한 끗 싸움 예상. 오늘은 집중력과 불펜 싸움이다.`,
  ]);
}

function funFacts(p: GamePreview, oppName: string): string[] {
  const f: string[] = [];
  const vs = p.seasonVs;
  f.push(`시즌 ${esc(oppName)}전 상대전적 ${vs.w}승 ${vs.l}패${vs.d ? ` ${vs.d}무` : ""}`);
  if (p.kiaStanding && p.oppStanding) {
    const gap = p.oppStanding.rank - p.kiaStanding.rank;
    f.push(
      gap > 0
        ? `순위는 KIA(${p.kiaStanding.rank}위)가 ${esc(oppName)}(${p.oppStanding.rank}위)보다 ${gap}칸 위`
        : gap < 0
        ? `순위는 ${esc(oppName)}(${p.oppStanding.rank}위)가 ${-gap}칸 위 — 하극상 가자`
        : `공교롭게 두 팀 순위가 붙어있는 라이벌 매치`
    );
  }
  if (p.kiaStarter.vsOpp && p.kiaStarter.vsOpp.games > 0) {
    const v = p.kiaStarter.vsOpp;
    f.push(`우리 선발 ${esc(p.kiaStarter.name ?? "")}, ${esc(oppName)} 상대 통산 ${v.games}G ${v.w}승 ${v.l}패 ERA ${v.era}`);
  }
  f.push(p.game.kiaSide === "home" ? "오늘은 홈경기 — 홈팬의 함성이 12번째 선수다" : `오늘은 ${esc(p.stadium)} 원정 — 적진에서 찬물 끼얹자`);
  return f;
}

function watchReminder(seed: string, p: GamePreview): string {
  if (p.game.kiaSide === "home")
    return pick(seed, [
      "🏟️ 오늘 홈경기! 광주 챔피언스필드 직관 각. 유니폼 챙기고 목 풀어놔라 📣",
      "🏟️ 홈이다! 직관 가능하면 무조건 가자. 못 가면 TV 앞 사수, 치킨은 국룰 🍗",
    ]);
  return pick(seed, [
    `📺 ${esc(p.stadium)} 원정. 직관은 힘들어도 TV 앞은 사수. 맥주+치킨 준비 완료? 🍗🍺`,
    `📺 ${esc(p.stadium)} 원정경기. 중계 채널 미리 찾아두고 소리 지를 준비만 하면 됨 🔥`,
  ]);
}

/* ------------------------------------------------------------------ *
 *  공용 분석
 * ------------------------------------------------------------------ */
export function analyzePreview(p: GamePreview): PreviewAnalysis {
  const oppName = p.game.opponent.name;
  const seed = p.game.gameId;
  const predicted = predictedScore(p, oppName);
  const hl = headlineFor(seed + "h", predicted.winner, oppName);
  return {
    game: p.game,
    gtime: p.gtime,
    stadium: p.stadium,
    kiaRank: p.kiaStanding?.rank ?? null,
    oppRank: p.oppStanding?.rank ?? null,
    oppName,
    seasonVs: p.seasonVs,
    headline: hl.head,
    moodEmoji: hl.emoji,
    predicted,
    predictionText: predictionText(seed + "p", p, oppName),
    funFacts: funFacts(p, oppName),
    watch: watchReminder(seed + "w", p),
    kiaStarter: buildStarterCard("KIA", "kia", p.kiaStarter, seed + "ks"),
    oppStarter: buildStarterCard(oppName, "opp", p.oppStarter, seed + "os"),
  };
}

/* ------------------------------------------------------------------ *
 *  텔레그램 텍스트
 * ------------------------------------------------------------------ */
function abilityBar(a: Ability[]): string {
  return a.map((x) => `${x.label} ${x.value}`).join(" · ");
}
function starterBlock(label: string, c: StarterCard): string {
  const s = c.info;
  if (!s.announced || !s.name) return `${label}: <b>선발 미발표</b> 🤔`;
  const meta = [s.hitType, s.backnum ? `${s.backnum}번` : null].filter(Boolean).join("·");
  let out = `${label}: <b>${esc(s.name)}</b>${meta ? ` (${esc(meta)})` : ""} — 종합 ${c.overall}\n`;
  out += `   시즌 ${s.w}승 ${s.l}패 · ERA ${s.era} · WHIP ${s.whip}\n`;
  out += `   ${abilityBar(c.abilities)}\n`;
  out += `   💬 ${esc(c.comment)}`;
  return out;
}

export function buildPreviewText(a: PreviewAnalysis, siteUrl?: string): string {
  const g = a.game;
  const d = new Date(g.dateTime);
  const dateStr = `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
  const place = g.kiaSide === "home" ? "홈" : "원정";
  const kR = a.kiaRank ? `(${a.kiaRank}위)` : "";
  const oR = a.oppRank ? `(${a.oppRank}위)` : "";

  const L: string[] = [];
  L.push(`${a.moodEmoji} <b>${esc(a.headline)}</b>`);
  L.push("");
  L.push(`🐯 <b>KIA${kR} vs ${esc(a.oppName)}${oR}</b>`);
  L.push(`📅 ${dateStr} ${a.gtime} · ${esc(a.stadium)} (${place})`);
  L.push("");
  L.push(`⚾ <b>선발 매치업</b>`);
  L.push(starterBlock("🐯 KIA", a.kiaStarter));
  L.push(starterBlock(`🆚 ${esc(a.oppName)}`, a.oppStarter));
  L.push("");
  L.push(`🎯 <b>클로드 예상 스코어</b>: KIA ${a.predicted.kia} : ${a.predicted.opp} ${esc(a.oppName)}`);
  L.push(`   ${esc(a.predicted.line)}`);
  L.push("");
  L.push(`🔮 <b>승부예상</b>\n${esc(a.predictionText)}`);
  L.push("");
  L.push(a.funFacts.map((f) => `• ${f}`).join("\n"));
  L.push("");
  L.push(a.watch);
  if (siteUrl) {
    L.push("");
    L.push(`👉 선발 육각능력치·순위·평점: ${siteUrl}`);
  }
  return L.join("\n");
}
