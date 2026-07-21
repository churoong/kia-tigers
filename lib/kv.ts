/**
 * Upstash Redis REST 기반 초경량 KV — 알림 중복 발송 방지(멱등 클레임)용.
 * 무료(카드 불필요). 환경변수: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN.
 * 미설정이면 claim이 항상 성공(=중복방지 없음)하므로, cron 폴링 전에 반드시 설정할 것.
 */
const URL_ = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export function kvConfigured(): boolean {
  return !!(URL_ && TOKEN);
}

async function kvFetch(path: string): Promise<any> {
  const res = await fetch(`${URL_}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: "no-store",
  });
  return res.json();
}

/**
 * 원자적 "발송 클레임". 처음 호출이면 true(=내가 발송 담당), 이미 있으면 false(=이미 발송됨).
 * SET key 1 NX EX ttl. KV 미설정 시 true(중복방지 없이 진행).
 */
export async function claimOnce(key: string, ttlSec: number): Promise<boolean> {
  if (!kvConfigured()) return true;
  try {
    const j = await kvFetch(`/set/${encodeURIComponent(key)}/1/NX/EX/${ttlSec}`);
    return j?.result === "OK";
  } catch {
    return true; // KV 장애 시 발송은 되게 (중복 위험 감수)
  }
}

/** 클레임 해제(발송 실패 시 재시도 가능하도록). */
export async function releaseClaim(key: string): Promise<void> {
  if (!kvConfigured()) return;
  try {
    await kvFetch(`/del/${encodeURIComponent(key)}`);
  } catch {
    /* noop */
  }
}
