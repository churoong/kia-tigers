import { NextRequest, NextResponse } from "next/server";
import { getGameDetail, getKiaSchedule } from "@/lib/kbo";
import { buildGameSummaryText } from "@/lib/summary";
import { sendTelegram } from "@/lib/telegram";
import { GameSummary } from "@/lib/types";

export const dynamic = "force-dynamic"; // 항상 실시간 실행
export const maxDuration = 30;

/** KST 기준 날짜 문자열 (offsetDays: -1 = 어제) */
function kstDateStr(offsetDays = 0): string {
  return new Date(Date.now() + 9 * 3600 * 1000 + offsetDays * 86400000)
    .toISOString()
    .slice(0, 10);
}
/** KST 기준 현재 '시' (0~23) */
function kstHour(): number {
  return new Date(Date.now() + 9 * 3600 * 1000).getUTCHours();
}

/**
 * 경기 종료 알림 엔드포인트.
 * GitHub Actions가 저녁(21:00/21:30/22:00 KST)과 다음날 아침(08:00 KST)에 호출.
 *
 * "발송 대상(sendable)" 판정 — 가장 최근 완료 경기가:
 *   · KST 오늘 날짜 경기        → 저녁 폴링에서 잡힘(9~10시 사이 종료 시 그날 밤 발송)
 *   · KST 어제 경기 && 정오 이전 → 아침 08:00 폴링에서 잡힘(10시 이후 종료분 익일 아침 발송)
 * 중복 발송 방지(하룻밤에 한 번)는 호출측(Actions)이 gameId 캐시로 처리.
 *
 * 인증: Authorization: Bearer <CRON_SECRET> 또는 ?key=<CRON_SECRET>
 * 옵션: ?dry=1     발송 없이 sendable/gameId/text 반환(미리보기)
 *       ?force=1   타이밍 무시하고 가장 최근 완료 경기로(수동 테스트)
 *       ?gameId=X  현재 대상이 X와 일치할 때만 발송(레이스 안전장치)
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const sp = req.nextUrl.searchParams;
  const key = sp.get("key");
  if (secret && auth !== `Bearer ${secret}` && key !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const force = sp.get("force") === "1";
  const dry = sp.get("dry") === "1";
  const wantGameId = sp.get("gameId");
  const siteUrl = process.env.SITE_URL || "https://kia-tigers.vercel.app";

  const { games } = await getKiaSchedule();
  const finished = games.filter((g) => g.result && !g.canceled); // 최신순
  const latest = finished[0] ?? null;

  // 발송 대상 판정
  let target: GameSummary | null = null;
  if (force) {
    target = latest;
  } else if (latest) {
    const today = kstDateStr(0);
    const yesterday = kstDateStr(-1);
    if (latest.date === today) target = latest;
    else if (kstHour() < 12 && latest.date === yesterday) target = latest;
  }

  if (!target) {
    return NextResponse.json({
      ok: true,
      sendable: false,
      reason: `발송할 종료 경기 없음 (KST ${kstDateStr(0)} ${kstHour()}시)`,
    });
  }

  // 레이스 안전장치: 기대한 gameId와 현재 대상이 다르면 발송 보류
  if (wantGameId && wantGameId !== target.gameId) {
    return NextResponse.json({
      ok: true,
      sendable: false,
      reason: `gameId 불일치(기대 ${wantGameId} / 현재 ${target.gameId})`,
    });
  }

  const detail = await getGameDetail(target);
  if (!detail) {
    return NextResponse.json(
      { ok: false, sendable: true, error: "박스스코어 로드 실패", gameId: target.gameId },
      { status: 502 }
    );
  }

  const text = buildGameSummaryText(detail, siteUrl);

  if (dry) {
    return NextResponse.json({
      ok: true,
      sendable: true,
      sent: false,
      dry: true,
      gameId: target.gameId,
      date: target.date,
      text,
    });
  }

  const result = await sendTelegram(text);
  return NextResponse.json(
    {
      ok: result.ok,
      sendable: true,
      sent: result.ok,
      gameId: target.gameId,
      date: target.date,
      error: result.error,
    },
    { status: result.ok ? 200 : 502 }
  );
}
