/**
 * 텔레그램 봇으로 메시지 전송 (무료 Bot API, 카드/사업자 불필요)
 * 필요한 환경변수: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 */
export async function sendTelegram(
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID 미설정" };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      cache: "no-store",
    });
    const json = await res.json();
    if (!json.ok) return { ok: false, error: json.description ?? "unknown" };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}
