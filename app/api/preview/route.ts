import { NextRequest, NextResponse } from "next/server";
import { getGamePreview, getKiaSchedule } from "@/lib/kbo";
import { analyzePreview, buildPreviewText } from "@/lib/preview";
import { sendTelegram } from "@/lib/telegram";
import { GameSummary } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/**
 * 경기 전 프리뷰 알림 (유머 헤드라인 + 선발 육각능력치 + 클로드 예상 스코어 + 승부예상 + 직관 리마인더).
 * GitHub Actions가 경기 당일 18:00 KST 에 호출.
 *
 * 발송 대상: KST 오늘 열리는, 아직 시작 전(BEFORE)인 KIA 경기.
 * 중복 방지(하루 1회)는 호출측(Actions)이 gameId 캐시로 처리.
 *
 * 인증: Bearer <CRON_SECRET> 또는 ?key=. 옵션: ?dry=1 ?force=1 ?gameId=
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

  const { upcoming } = await getKiaSchedule();
  const before = upcoming
    .filter((g) => g.statusCode === "BEFORE" && !g.canceled)
    .sort((a, b) => (a.dateTime > b.dateTime ? 1 : -1)); // 가까운 순

  const today = kstToday();
  const target: GameSummary | null = force
    ? before[0] ?? null
    : before.find((g) => g.date === today) ?? null;

  if (!target) {
    return NextResponse.json({
      ok: true,
      sendable: false,
      reason: `오늘(${today}) 시작 전 KIA 경기 없음`,
    });
  }
  if (wantGameId && wantGameId !== target.gameId) {
    return NextResponse.json({
      ok: true,
      sendable: false,
      reason: `gameId 불일치(기대 ${wantGameId} / 현재 ${target.gameId})`,
    });
  }

  const preview = await getGamePreview(target);
  if (!preview) {
    return NextResponse.json(
      { ok: false, sendable: false, error: "프리뷰 로드 실패", gameId: target.gameId },
      { status: 502 }
    );
  }

  const analysis = analyzePreview(preview);
  const text = buildPreviewText(analysis, siteUrl);

  if (dry) {
    return NextResponse.json({
      ok: true,
      sendable: true,
      sent: false,
      dry: true,
      gameId: target.gameId,
      predicted: analysis.predicted,
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
      error: result.error,
    },
    { status: result.ok ? 200 : 502 }
  );
}
