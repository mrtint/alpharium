/**
 * 한국어 카탈로그 — 홈 (062).
 *
 * 원래 자리: `src/ui/home-text.ts`(048~054 — 보드 `1d`·`2b`·`2c`·`2d`·`2g`·`2j`·`2l`~`2f` KO 원문), `src/app/failure-toast.ts`(054),
 * `src/ui/DiaryHomeScreen.tsx`·`DiaryListScreen.tsx`의 리터럴. 원문을 글자 그대로 옮겼다 — 보드 원문 대조 테스트(047)가 잠근다.
 *
 * **판정하지 않는다**(K4) — 오늘인가·읽을 수 있는가·몇 분 지났는가는 `home-text.ts` 등 부르는 쪽이 정한다. 해요체다(048 FR-037).
 * 조사는 이 카탈로그 안에서만 고른다(FR-005) — 화면 쪽은 `particle`을 부르지 않는다.
 */

import { particleFor } from "../../../diary/particle";

export const home = {
  /** 헤더 상태 줄 (049 H4, 보드 `t.dayState`·`m.dayStatePast`) */
  dayState: {
    today: "오늘 일기를 쓸 수 있어요",
    past: "이 날 일기를 쓸 수 있어요",
    /** 006 FR-017a — 목록 카드와 같은 말 */
    unreadable: "읽을 수 없어요",
    /** 제목이 없는 쓴 날 — 사람이 정한 값(014 `title: undefined`) */
    writtenNoTitle: "이 날 일기를 썼어요",
  },

  /** 덮어쓰기 확인 (`2d`, 보드 `h2.confirm*`). `todayNote`는 사람이 정한 문장(050 Clarification Q5) */
  overwriteConfirm: {
    title: "일기를 다시 쓸까요?",
    body: "다 쓰면 지금 일기가 새 글로 바뀌어요.",
    todayNote: "지금까지의 하루로 써요.",
    confirm: "다시 쓰기",
    cancel: "취소",
  },

  /** 날짜로 이동 (`2j`, 보드 `cal.title`·`cal.cancel`) */
  dateJump: { title: "날짜로 이동", cancel: "취소" },

  /** 쓴 날 읽기 (051, 보드 `2c`·`2g`) */
  writtenDay: {
    /** 쓴 날의 하단 바 (보드 `h2.rewrite`) */
    rewrite: "다시 쓰기",
    /** 읽을 수 없는 일기의 지면 두 줄 (006 FR-017a) */
    unreadableLines: [
      "이 날의 일기 파일이 손상됐어요.",
      "다시 쓰면 새로 남아요.",
    ] as readonly string[],
    /** 사진 사본을 못 불러온 슬라이드 (017 FR-002) */
    photoMissing: "이 사진은 이제 없어요",
    /** 쓰기 시작 전 실패 화면에서 홈으로 */
    backToHome: "← 일기",
  },

  /** 오늘 일기의 작성 시각 (보드 `2g` `m.writtenAt13`). 몇 분인가는 `writtenAtText()`가 센다 */
  writtenAt: {
    justNow: "방금 작성",
    minutesAgo: (minutes: number): string => `${minutes}분 전에 작성`,
    hoursAgo: (hours: number, minutes: number): string => `${hours}시간 ${minutes}분 전에 작성`,
  },

  /** 쓰는 중 (054, 보드 `2b` `t.writingKicker`·`t.writingBy`·`t.stop`) */
  writing: {
    kicker: "쓰는 중",
    stop: "그만두기",
    /** 첫 진행 신호가 오기 전의 자리 문구(039) */
    fallback: "쓰고 있다",
    /** 「{이름}{이/가} 쓰고 있어요. 진행률은 세지 않아요.」 — 진행률·시간을 말하지 않는다는 안내 */
    byline: (name: string): string =>
      `${name}${particleFor(name)} 쓰고 있어요. 진행률은 세지 않아요.`,
  },

  /** 쓸 재료 (053, 보드 `1d` ④·`2l`·`2m`·`2e`·`2f`). `confirmTitleUnseen`·`madeUpDay`는 사람이 정한 문장 */
  material: {
    photos: "사진",
    places: "장소",
    unitPhoto: "장",
    unitPlace: "곳",
    noPermission: "권한이 없어요",
    caret: "›",
    unknown: "모름",
    loading: "…",
    emptyNote: "기록 대신 상상으로 하루를 채워요.",
    confirmTitleZero: "😢 아무 기록도 없어요",
    confirmTitleUnseen: "😢 기록을 볼 수 없어요",
    confirmBody: "이렇게 작성하면 하루를 상상해서 적어요.",
    confirmYes: "확인",
    confirmNo: "취소",
    settingsTitle: "설정에서 사진 접근을 허용해 주세요",
    settingsOpen: "설정 열기",
    settingsCancel: "취소",
    madeUpDay: "지어낸 하루",
  },

  /** 쓰기 실패 토스트 — 다섯 갈래 모두 이 한 줄(054, 2026-09-30 저장소 소유자 결정) */
  failToast: "일기를 쓰지 못했어요.",

  /** 안 쓴 날의 하단 바 */
  writeButton: "일기 쓰기",

  /** 쓰기 시작 전 — 준비된 작성자가 없다(029·055). 이 문구가 보이면 「모듈 다시 받기」 버튼이 함께 보인다 */
  needsAuthor: "일기 작성자를 준비해야 한다",

  /** 고른 캐릭터를 쓸 수 없어 다른 캐릭터로 옮겼다(007·029 FR-014). 조사는 「을(를)」·「(으)로」 그대로다 */
  movedNotice: (from: string, to: string): string =>
    `${from}을(를) 쓸 수 없어 ${to}(으)로 바꿨어요`,
};
