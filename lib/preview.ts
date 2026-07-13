import { GamePreview, StarterInfo } from "./types";

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

/** 선발 한 줄 */
function starterLine(label: string, s: StarterInfo): string {
  if (!s.announced || !s.name) {
    return `${label}: <b>선발 미발표</b> 🤔 (곧 발표)`;
  }
  const meta = [s.hitType, s.backnum ? `${s.backnum}번` : null]
    .filter(Boolean)
    .join("·");
  let line = `${label}: <b>${esc(s.name)}</b>${meta ? ` (${esc(meta)})` : ""}\n`;
  line += `   시즌 ${s.w}승 ${s.l}패 · ERA ${s.era} · WHIP ${s.whip}`;
  if (s.vsOpp && s.vsOpp.games > 0) {
    line += `\n   └ 상대전적 ${s.vsOpp.games}G ${s.vsOpp.w}승 ${s.vsOpp.l}패 · ERA ${s.vsOpp.era}`;
  }
  return line;
}

/** 유머 승부예상 */
function prediction(preview: GamePreview): string {
  const seed = preview.game.gameId + "pred";
  const k = preview.kiaStanding;
  const o = preview.oppStanding;
  let score = 0;
  if (k && o) score += o.rank - k.rank; // KIA 순위가 높을수록(숫자 작을수록) +
  score += (preview.seasonVs.w - preview.seasonVs.l) * 0.7;
  if (preview.kiaStarter.announced && preview.oppStarter.announced) {
    const ke = parseFloat(preview.kiaStarter.era);
    const oe = parseFloat(preview.oppStarter.era);
    if (!isNaN(ke) && !isNaN(oe)) score += (oe - ke) * 1.2; // KIA 선발 ERA 낮으면 +
  }
  const opp = preview.game.opponent.name;

  if (score >= 2.5)
    return pick(seed, [
      `솔직히 이건 이겨야 하는 경기다. ${opp} 상대로 전력·상대전적 다 우위. 방심만 안 하면 개꿀각 😎`,
      `데이터가 KIA 손 들어줌. ${opp}? 오늘은 밥상이다. 못 이기면 그건 우리가 말아먹은 거임.`,
    ]);
  if (score <= -2.5)
    return pick(seed, [
      `객관적 전력은 ${opp}가 위. 근데 야구 몰라요~ 이런 날 뒤집으면 그게 찐팬 도파민이지 🔥`,
      `솔직히 빡센 경기다. ${opp} 만만치 않음. 그래도 우리가 누구냐, 정신 바짝 차리고 물어뜯자.`,
    ]);
  return pick(seed, [
    `딱 반반 접전 예상. ${opp}랑은 이런 경기 잡는 팀이 가을에 웃는다. 총력전 가즈아 ⚔️`,
    `누가 이겨도 안 이상한 매치업. ${opp} 상대 한 끗 싸움, 오늘 집중력 싸움이다.`,
  ]);
}

/** 직관/시청 리마인더 */
function watchReminder(seed: string, preview: GamePreview): string {
  const home = preview.game.kiaSide === "home";
  if (home)
    return pick(seed, [
      `🏟️ <b>오늘 홈경기!</b> 광주 챔피언스필드 직관 가는 날. 유니폼 챙기고 목 풀어놔라 📣`,
      `🏟️ <b>홈 경기다!</b> 직관 가능하면 무조건 가자. 못 가면 TV 앞 사수, 치킨은 국룰 🍗`,
    ]);
  return pick(seed, [
    `📺 오늘은 ${esc(preview.stadium)} 원정. 직관은 힘들어도 TV 앞은 사수하자. 맥주랑 치킨 준비 완료? 🍗🍺`,
    `📺 ${esc(preview.stadium)} 원정경기. 중계 채널 미리 찾아두고, 소리 지를 준비만 하면 됨 🔥`,
  ]);
}

/**
 * 경기 전 프리뷰를 텔레그램 HTML 텍스트로.
 */
export function buildPreviewText(preview: GamePreview, siteUrl?: string): string {
  const g = preview.game;
  const d = new Date(g.dateTime);
  const dateStr = `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
  const place = g.kiaSide === "home" ? "홈" : "원정";
  const opp = g.opponent.name;
  const kRank = preview.kiaStanding ? `${preview.kiaStanding.rank}위` : "";
  const oRank = preview.oppStanding ? `${preview.oppStanding.rank}위` : "";
  const seed = g.gameId;

  const L: string[] = [];
  L.push(`🔮 <b>오늘의 경기 예고</b>`);
  L.push("");
  L.push(`🐯 <b>KIA${kRank ? `(${kRank})` : ""} vs ${esc(opp)}${oRank ? `(${oRank})` : ""}</b>`);
  L.push(`📅 ${dateStr} ${preview.gtime} · ${esc(preview.stadium)} (${place})`);
  L.push("");
  L.push(`⚾ <b>선발 매치업</b>`);
  L.push(starterLine("🐯 KIA", preview.kiaStarter));
  L.push(starterLine(`🆚 ${esc(opp)}`, preview.oppStarter));
  L.push("");
  const vs = preview.seasonVs;
  L.push(`📊 <b>시즌 상대전적</b>: KIA ${vs.w}승 ${vs.l}패${vs.d ? ` ${vs.d}무` : ""}`);
  L.push("");
  L.push(`🔮 <b>승부예상</b>`);
  L.push(prediction(preview));
  L.push("");
  L.push(watchReminder(seed + "w", preview));
  if (siteUrl) {
    L.push("");
    L.push(`👉 상세 프리뷰·순위·평점: ${siteUrl}`);
  }
  return L.join("\n");
}
