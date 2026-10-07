/**
 * 한국어 카탈로그 — 첫 만남·작명·로고·빌드 오류 (062).
 *
 * 원래 자리: `src/ui/WelcomeScreen.tsx`의 `TEXT`(035·047 — welcome 단계 문구는 보드 `1a` KO 문자열 테이블 원문),
 * `src/ui/LogoScreen.tsx`(043), `src/ui/BuildErrorScreen.tsx`(001).
 */

export const welcome = {
  checkingTitle: "잠깐만요",
  checkingBody: "새로 온 친구가 깨어나는 중이에요.",
  /** 마크업은 "Pocketlog" + CSS uppercase — RN에는 그 속성이 없어 대문자 원문으로 둔다 */
  kicker: "POCKETLOG",
  /** 얼굴 타일 — 047 Clarification Q2. 캐릭터 심볼을 읽어 고르지 않는다(원칙 III) */
  face: "🤖",
  welcomeTitle: "깨어났어요. 처음 뵙겠습니다.",
  welcomeBody:
    "이제부터 제가 주인님의 하루를 사진과 다닌 자리로 읽고, 일기로 적을게요. 모든 일은 이 휴대폰 안에서만 일어나요.",
  namePrompt: "제 이름을 지어주세요.",
  namePlaceholder: "이름을 입력하세요",
  /** 상한 숫자는 부르는 쪽이 `NAME_INPUT_MAX_LENGTH`에서 준다 — 상한이 바뀌면 문구도 함께 바뀐다(047 A5) */
  nameHint: (maxLength: number): string => `${maxLength}자까지. 나중에 설정에서 바꿀 수 있어요.`,
  submit: "이 이름으로 할래요",
  /** 1a의 화살표 아이콘 자리 */
  submitArrow: "→",
  skip: "나중에 할래요",
  failedTitle: "아직 준비 중이에요",
  failedBody: "친구를 깨우지 못했어요. 잠시 후 다시 시도해 주세요.",
  retry: "다시 시도",
  goHome: "그냥 시작하기",

  /** 로고 화면 아래 한 줄 (043) */
  logoCaption: "휴대폰 안에서만",

  /** 환경을 판정하지 못한 빌드 (001 — 사람에게 알리는 화면) */
  buildErrorTitle: "이 빌드는 잘못 만들어졌다",
  buildErrorBody:
    "앱이 어떤 환경으로 만들어졌는지 알 수 없어 일기를 쓸 수 없다. 이 앱을 만든 사람에게 알려야 고쳐진다.",
};
