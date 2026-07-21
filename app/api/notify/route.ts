import { NextRequest, NextResponse } from "next/server";
import { getGameDetail, getKiaSchedule } from "@/lib/kbo";
import { buildGameSummaryText } from "@/lib/summary";
import { sendTelegram } from "@/lib/telegram";
import { claimOnce, releaseClaim } from "@/lib/kv";
import { kstDateStr, kstHour } from "@/lib/time";
import { GameSummary } from "@/lib/types";

export const dynamic = "force-dynamic"; // 항상 실시간 실행
export const maxDuration = 30;

/**
 * 경기 종료 알림 엔드포인트. 외부 크론(cron-job.org)이 오후~밤에 10분마다 호출.
 *
 * "발송 대상(sendable)" 판정 — 가장 최근 완료 경기가:
 *   · KST 오늘 날짜 && 22시 이전  → 그날 밤 발송(끝나면 폴링이 곧 잡음)
 *   · KST 어제 && 정오 이전       → 아침 발송(22시 이후 종료분)
 * 중복 발송 방지는 Upstash KV 멱등 클레임(`sent:result:<gameId>`)으로 서버에서 처리.
 *
 * 인증: Authorization: Bearer <CRON_SECRET> 또는 ?key=<CRON_SECRET>
 * 옵션: ?dry=1     발송 없이 sendable/gameId/text 반환(미리보기)
 *       ?force=1   타이밍·중복 무시하고 가장 최근 완료 경기로(수동 테스트)
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
  const siteUrl = process.env.SITE_URL || "https://kia-tigers.vercel.app";

  const { games } = await getKiaSchedule();
  const finished = games.filter((g) => g.result && !g.canceled); // 최신순
  const latest = finished[0] ?? null;

  // 발송 대상 판정 (KST 기준)
  let target: GameSummary | null = null;
  if (force) {
    target = latest;
  } else if (latest) {
    const hour = kstHour();
    const today = kstDateStr(0);
    const yesterday = kstDateStr(-1);
    if (latest.date === today && hour < 22) target = latest; // 그날 밤(22시 전)
    else if (hour < 12 && latest.date === yesterday) target = latest; // 익일 아침
  }

  if (!target) {
    return NextResponse.json({
      ok: true,
      sendable: false,
      reason: `발송할 종료 경기 없음 (KST ${kstDateStr(0)} ${kstHour()}시)`,
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

  // 멱등 클레임: 이 경기 결과를 이미 보냈으면 skip
  const claimKey = `sent:result:${target.gameId}`;
  const claimed = force || (await claimOnce(claimKey, 2 * 86400));
  if (!claimed) {
    return NextResponse.json({ ok: true, sendable: true, sent: false, deduped: true, gameId: target.gameId });
  }

  const result = await sendTelegram(text);
  if (!result.ok && !force) await releaseClaim(claimKey); // 실패 시 재시도 가능하게
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
