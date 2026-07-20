/**
 * 모든 날짜/시간 판정과 표시는 한국시간(KST, UTC+9) 기준.
 * - 판정용(kstDateStr/kstHour): Date.now() 에폭 기반이라 서버 TZ(Vercel=UTC)와 무관하게 KST.
 * - 표시용(kstParts): Naver gameDateTime("YYYY-MM-DDTHH:mm:ss", KST 벽시계)을
 *   문자열에서 직접 파싱 → 브라우저/서버 타임존과 완전히 무관하게 항상 KST로 표시.
 */
const KST_OFFSET = 9 * 3600 * 1000;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** KST 기준 날짜 문자열 YYYY-MM-DD (offsetDays: -1 = 어제) */
export function kstDateStr(offsetDays = 0): string {
  return new Date(Date.now() + KST_OFFSET + offsetDays * 86400000)
    .toISOString()
    .slice(0, 10);
}

/** KST 기준 현재 '시' (0~23) */
export function kstHour(): number {
  return new Date(Date.now() + KST_OFFSET).getUTCHours();
}

/**
 * 경기 시작까지 남은 분 (KST 기준, 타임존 무관).
 * dateTime = "YYYY-MM-DDTHH:mm:ss" (KST 벽시계). 지났으면 음수.
 */
export function minutesUntilStart(dateTime: string): number {
  const startUtc = Date.parse(dateTime + "+09:00"); // KST 벽시계로 해석
  if (isNaN(startUtc)) return NaN;
  return (startUtc - Date.now()) / 60000;
}

/** KST 벽시계 문자열을 표시용 파츠로 (타임존 무관) */
export function kstParts(dateTime: string): {
  y: number;
  m: number;
  d: number;
  hh: string;
  mm: string;
  weekday: string;
} {
  const [datePart, timePart = ""] = dateTime.split("T");
  const [y, m, d] = datePart.split("-").map((x) => parseInt(x, 10) || 0);
  const [hh = "00", mm = "00"] = timePart.split(":");
  const weekday =
    WEEKDAYS[new Date(Date.UTC(y, (m || 1) - 1, d || 1)).getUTCDay()];
  return { y, m, d, hh, mm, weekday };
}
