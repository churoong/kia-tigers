import { NextRequest, NextResponse } from "next/server";
import { getGameDetail, getKiaSchedule } from "@/lib/kbo";
import { buildGameSummaryText } from "@/lib/summary";
import { sendTelegram } from "@/lib/telegram";

export const dynamic = "force-dynamic"; // 항상 실시간 실행
export const maxDuration = 30;

/** KST 기준 오늘 날짜 (YYYY-MM-DD) */
function kstToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/**
 * 경기 종료 알림.
 * Vercel Cron이 매일 밤 호출 → 그날(KST) KIA 경기가 종료됐으면 유머 요약을 텔레그램 발송.
 * 인증: Authorization: Bearer <CRON_SECRET>  (Vercel Cron이 자동 첨부)
 *       또는 수동 테스트용 ?key=<CRON_SECRET>
 * 옵션: ?force=1 → 종료 여부와 무관하게 가장 최근 완료 경기로 발송(테스트)
 *       ?dry=1   → 실제 발송 없이 미리보기 텍스트만 반환
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  if (secret && auth !== `Bearer ${secret}` && key !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const force = req.nextUrl.searchParams.get("force") === "1";
  const dry = req.nextUrl.searchParams.get("dry") === "1";
  const siteUrl = process.env.SITE_URL || "https://kia-tigers1.vercel.app";

  const { games } = await getKiaSchedule();
  const finished = games.filter((g) => g.result && !g.canceled); // 최신순 정렬돼 있음

  const today = kstToday();
  const target = force
    ? finished[0] // 가장 최근 완료 경기
    : finished.find((g) => g.date === today) ?? null;

  if (!target) {
    return NextResponse.json({
      ok: true,
      sent: false,
      reason: `오늘(${today}) 종료된 KIA 경기 없음`,
    });
  }

  const detail = await getGameDetail(target);
  if (!detail) {
    return NextResponse.json(
      { ok: false, sent: false, error: "박스스코어 로드 실패", gameId: target.gameId },
      { status: 502 }
    );
  }

  const text = buildGameSummaryText(detail, siteUrl);

  if (dry) {
    return NextResponse.json({ ok: true, sent: false, dry: true, gameId: target.gameId, text });
  }

  const result = await sendTelegram(text);
  return NextResponse.json(
    { ok: result.ok, sent: result.ok, gameId: target.gameId, error: result.error },
    { status: result.ok ? 200 : 502 }
  );
}
