/**
 * 한국어 카탈로그 — 필수 모듈 내려받기 동의·진행 (062).
 *
 * 원래 자리: `src/ui/DownloadConsentDialog.tsx`(045 FR-003 — 095에서 받을 양을 더함), `src/ui/DownloadProgressScreen.tsx`(045·046 — 사람이 쓴 고정 헤드라인·본문).
 * **진행 문구에 바이트·퍼센트·시간을 넣지 않는다**(045, 원칙 IV는 측정 장치만 막지만 이 화면은 고정 문구로 정했다).
 * 동의 본문만은 받을 양을 싣는다(095 — App Store 4.2.3(ii)). 못 읽었으면 양 없는 원래 문장이다.
 * 슬라이드 3은 자동 쓰기가 기본 꺼짐이라(`schedule/settings.ts`) 알림·먼저 써 둠을 「켜 두면」 조건으로만 말한다(098).
 */

export const download = {
  consent: {
    title: "AI를 위한 다운로드가 필요해요",
    /** `size`는 「2.0GB」꼴 문자열, 읽지 못했으면 `null`(양을 지어내지 않는다, 095) */
    body: (size: string | null): string =>
      size === null
        ? "일기를 쓰려면 사진을 읽는 AI 모듈과 글을 쓰는 AI 모듈을 다운로드해야 해요. 한 번만 다운로드하면 이후로는 필요 없어요."
        : `일기를 쓰려면 사진을 읽는 AI 모듈과 글을 쓰는 AI 모듈을 약 ${size} 다운로드해야 해요. 한 번만 다운로드하면 이후로는 필요 없어요.`,
    confirm: "다운로드",
  },
  /** 실패 시 진행 바 하단 — 오류 원문을 담지 않는다(원칙 III) */
  failedProgress: "다운로드 실패",
  /** 슬라이드 1~4 (045 FR-005) */
  slides: [
    {
      title: "포켓로그, 하루를 정리하는 AI",
      body: "AI가 그날의 사진으로 주인님의 하루를 정리해요.",
    },
    {
      title: "나중에 다시 읽고 싶은 기록",
      body: "그날 무엇을 보고 어디를 다녔는지, 나중에 펼쳐 보면 그때가 다시 떠올라요.",
    },
    {
      title: "열면 바로 그날 일기를 써요",
      body: "자동으로 쓰기를 켜 두면 쓸 차례에 알림이 오고, 먼저 써 두기도 해요.",
    },
    {
      title: "사진과 일기는 휴대폰 밖으로 나가지 않아요",
      body: "일기를 쓰는 일은 전부 이 휴대폰 안에서 해요.",
    },
  ] as readonly { title: string; body: string }[],
  /** 정상 진행 중 (045 Clarifications, FR-006) */
  progress: "다운로드 중이에요",
  kicker: "준비하는 중",
  completeTitle: "준비됐어요",
  completeBody: "이제 시작할 수 있어요.",
  completeProceed: "시작할게요",
};
