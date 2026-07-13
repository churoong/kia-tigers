import { analyzeGame } from "./humor";
import { GameDetail } from "./types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * 종료된 KIA 경기를 텔레그램용 HTML 텍스트로 요약.
 * 홈페이지와 같은 유머 톤(analyzeGame) 재사용.
 */
export function buildGameSummaryText(detail: GameDetail, siteUrl?: string): string {
  const a = analyzeGame(detail);
  const s = detail.summary;
  const d = new Date(s.dateTime);
  const dateStr = `${d.getMonth() + 1}월 ${d.getDate()}일(${WEEKDAYS[d.getDay()]})`;
  const place = s.kiaSide === "home" ? "홈" : "원정";
  const resultWord = s.result === "W" ? "승리 🎉" : s.result === "L" ? "패배 😭" : "무승부 🤝";

  const L: string[] = [];
  L.push(`${a.moodEmoji} <b>${esc(a.headline)}</b>`);
  L.push("");
  L.push(
    `🐯 <b>KIA ${s.kiaScore} : ${s.oppScore} ${esc(s.opponent.name)}</b>  (${place}·${resultWord})`
  );
  L.push(`📅 ${dateStr} · ${esc(s.stadium ?? "")}`);
  L.push("");
  L.push(esc(a.summary));

  if (a.best) {
    L.push("");
    L.push(`⭐ <b>오늘의 MVP — ${esc(a.best.name)}</b>`);
    L.push(`   ${esc(a.best.line)}`);
    L.push(`   ${esc(a.best.reason)}`);
  }
  if (a.worst) {
    L.push("");
    L.push(`🥶 <b>오늘의 반성문 — ${esc(a.worst.name)}</b>`);
    L.push(`   ${esc(a.worst.line)}`);
    L.push(`   ${esc(a.worst.reason)}`);
  }
  if (a.funFacts.length) {
    L.push("");
    L.push(a.funFacts.slice(0, 3).map((f) => `• ${esc(f)}`).join("\n"));
  }
  if (siteUrl) {
    L.push("");
    L.push(`👉 이닝별 전광판·평점·육각능력치: ${siteUrl}`);
  }
  return L.join("\n");
}
