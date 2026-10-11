/**
 * 한국어 카탈로그 — 첫 실행 다운로드의 모바일 데이터 동의와 대기 화면 (074).
 *
 * 원래 자리: `src/ui/CellularConsentDialog.tsx`·`src/ui/DownloadDeferredScreen.tsx`.
 * 기존 `download` 영역(045 표준 동의·진행)은 건드리지 않는다 — 062 골든이 그 문구를 바이트 단위로 잠근다.
 * **받을 양은 모바일 갈래의 이 본문에만 나온다**(표준 동의에는 용량을 노출하지 않는다, 045 FR-003).
 */

export const consentGate = {
  cellular: {
    title: "모바일 데이터로 연결돼 있어요",
    /** `size`는 「2.0GB」꼴 문자열, 읽지 못했으면 `null`(양을 지어내지 않는다) */
    body: (size: string | null): string =>
      size === null
        ? "일기를 쓰려면 모델을 내려받아야 해요. 지금은 모바일 데이터라 데이터를 꽤 쓰게 돼요. Wi-Fi에서 받는 걸 권해요."
        : `일기를 쓰려면 모델을 내려받아야 해요. 지금은 모바일 데이터라 약 ${size}를 쓰게 돼요. Wi-Fi에서 받는 걸 권해요.`,
    confirm: "모바일 데이터로 받기",
    defer: "나중에 받기",
  },
  deferred: {
    title: "Wi-Fi에서 받는 게 좋아요",
    body: "아무것도 받지 않았어요. Wi-Fi에 연결한 뒤 다시 확인하면 받을 수 있어요.",
    recheck: "다시 확인하기",
  },
};
