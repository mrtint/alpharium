/**
 * 한국어 카탈로그 — 필수 모듈 내려받기 동의·진행 (062).
 *
 * 원래 자리: `src/ui/DownloadConsentDialog.tsx`(045 FR-003), `src/ui/DownloadProgressScreen.tsx`(045·046 — 사람이 쓴 고정 헤드라인·본문).
 * **진행 문구에 바이트·퍼센트·시간을 넣지 않는다**(045, 원칙 IV는 측정 장치만 막지만 이 화면은 고정 문구로 정했다).
 */

export const download = {
  consent: {
    title: "받을 것이 있어요",
    body: "일기를 쓰려면 사진을 읽는 모델과 글을 쓰는 모델을 내려받아야 해요. 한 번만 받으면 이후로는 필요 없어요.",
    confirm: "받을게요",
  },
  /** 실패 시 진행 바 하단 — 오류 원문을 담지 않는다(원칙 III) */
  failedProgress: "받다가 멈췄어요",
  /** 슬라이드 1~4 (045 FR-005) */
  slides: [
    {
      title: "쓰지 않아도 남는 하루",
      body: "따로 적을 일이 없어요. 그날의 사진과 다닌 자리만으로 하루가 한 편 남습니다.",
    },
    {
      title: "나중에 다시 읽고 싶은 기록",
      body: "그날 무엇을 보고 어디를 다녔는지, 나중에 펼쳐 보면 그때가 다시 떠올라요.",
    },
    {
      title: "잠들기 전에 도착해요",
      body: "하루가 끝나갈 무렵, 오늘의 이야기가 조용히 완성돼 있어요.",
    },
    {
      title: "휴대폰 안에서만 남아요",
      body: "사진도 위치도 밖으로 나가지 않아요. 전부 이 안에서만 일어나요.",
    },
  ] as readonly { title: string; body: string }[],
  /** 정상 진행 중 (045 Clarifications, FR-006) */
  progress: "받는 중이에요",
  kicker: "준비하는 중",
  completeTitle: "준비됐어요",
  completeBody: "이제 시작할 수 있어요.",
  completeProceed: "시작할게요",
};
