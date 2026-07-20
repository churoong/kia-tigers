import { NextRequest, NextResponse } from "next/server";
import { getGamePreview, getKiaSchedule } from "@/lib/kbo";
import { analyzePreview, buildPreviewText } from "@/lib/preview";
import { sendTelegram } from "@/lib/telegram";
import { minutesUntilStart } from "@/lib/time";
import { GameSummary } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * 경기 전 프리뷰 알림 (유머 헤드라인 + 선발 육각능력치 + 클로드 예상 스코어 + 승부예상 + 직관 리마인더).
 * GitHub Actions가 경기 당일 18:00 KST 에 호출.
 *
 * 발송 대상: 다음 시작 전(BEFORE) KIA 경기가 "시작 약 60분 전"에 들어왔을 때.
 * (경기 시작시간이 매일 달라서, Actions가 오후에 10분마다 폴링 → 여기서 타이밍 판정)
 * 중복 방지(하루 1회)는 호출측(Actions)이 gameId 캐시로 처리.
 *
 * 인증: Bearer <CRON_SECRET> 또는 ?key=. 옵션: ?dry=1 ?force=1(타이밍 무시) ?gameId=
 */
const SEND_WINDOW_MIN = 65; // 시작 65분 전부터(폴링 드리프트 감안) 발송 허용
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

  const target: GameSummary | null = before[0] ?? null; // 다음 예정 경기

  if (!target) {
    return NextResponse.json({
      ok: true,
      sendable: false,
      reason: "예정된 KIA 경기 없음",
    });
  }

  // 시작 약 60분 전 창인지 판정 (force면 무시)
  const mins = minutesUntilStart(target.dateTime);
  const inWindow = mins > 0 && mins <= SEND_WINDOW_MIN;
  if (!force && !inWindow) {
    return NextResponse.json({
      ok: true,
      sendable: false,
      gameId: target.gameId,
      minutesUntilStart: Math.round(mins),
      reason:
        mins <= 0
          ? "이미 시작함/지난 경기"
          : `아직 시작 ${Math.round(mins)}분 전 — 60분 전 대기`,
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
      minutesUntilStart: Math.round(mins),
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
