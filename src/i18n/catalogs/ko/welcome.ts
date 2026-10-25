/**
 * 한국어 카탈로그 — 첫 만남·작명·로고·빌드 오류 (062).
 *
 * 원래 자리: `src/ui/WelcomeScreen.tsx`의 `TEXT`(035·047 — welcome 단계 문구는 보드 `1a` KO 문자열 테이블 원문),
 * `src/ui/LogoScreen.tsx`(043), `src/ui/BuildErrorScreen.tsx`(001).
 */

export const welcome = {
  checkingTitle: "잠시만요",
  checkingBody: "새 친구가 왔어요.",
  /** 마크업은 "Pocketlog" + CSS uppercase — RN에는 그 속성이 없어 대문자 원문으로 둔다 */
  kicker: "POCKETLOG",
  /** 얼굴 타일 — 047 Clarification Q2. 캐릭터 심볼을 읽어 고르지 않는다(원칙 III) */
  face: "🤖",
  welcomeTitle: "안녕하세요. 저는 누구일까요?",
  welcomeBody: "이제부터 제가 주인님의 하루를 살펴보고, 일기로 적을게요. 잘 기록하도록 해볼게요.",
  namePrompt: "제 이름을 지어 주실래요?",
  namePlaceholder: "이름을 적어 주세요",
  /** 상한 숫자는 부르는 쪽이 `NAME_INPUT_MAX_LENGTH`에서 준다 — 상한이 바뀌면 문구도 함께 바뀐다(047 A5) */
  nameHint: (maxLength: number): string => `${maxLength}자까지. 나중에 설정에서 바꿀 수 있어요.`,
  submit: "확정",
  /** 1a의 화살표 아이콘 자리 */
  submitArrow: "→",
  skip: "나중에",
  failedTitle: "아직 준비 중이에요",
  failedBody: "잠시 후 다시 시도해 주세요.",
  retry: "다시 시도",
  goHome: "그냥 시작하기",

  /** 로고 화면 아래 한 줄 (043) */
  logoCaption: "하루를 정리하는 AI",

  /** 환경을 판정하지 못한 빌드 (001 — 사람에게 알리는 화면) */
  buildErrorTitle: "이 빌드는 잘못 만들어졌다",
  buildErrorBody:
    "앱이 어떤 환경으로 만들어졌는지 알 수 없어 일기를 쓸 수 없다. 이 앱을 만든 사람에게 알려야 고쳐진다.",
};
