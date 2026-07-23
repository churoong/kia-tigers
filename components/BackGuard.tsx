"use client";

import { useEffect } from "react";

/**
 * 뒤로가기(모바일 스와이프 포함) 시:
 *  1) 열린 모달(육각 능력치 등)이 있으면 → 모달만 닫고 페이지 유지
 *  2) 없으면 → "페이지를 나가시겠어요?" 확인. 취소하면 머무름.
 *
 * history 센티넬을 심어 뒤로가기를 가로챈다.
 */
export default function BackGuard() {
  useEffect(() => {
    const pushSentinel = () => window.history.pushState({ __guard: true }, "");
    pushSentinel();

    const onPop = () => {
      // 1) 열린 모달이 있으면 모달만 닫기 (백드롭 클릭 = onClose)
      const modal = document.querySelector<HTMLElement>("[data-modal-backdrop]");
      if (modal) {
        modal.click();
        pushSentinel(); // 다음 뒤로가기도 계속 가드
        return;
      }
      // 2) 페이지를 나갈지 확인
      const leave = window.confirm("페이지를 나가시겠어요?");
      if (leave) {
        window.removeEventListener("popstate", onPop);
        window.history.back();
      } else {
        pushSentinel(); // 머무름
      }
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return null;
}
