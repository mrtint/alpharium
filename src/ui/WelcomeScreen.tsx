/**
 * 첫 만남 — 모델이 준비됐을 때의 환영 연출과 작명 (035, ★ 044 — Modernist
 * 재작성).
 *
 * 계약: specs/035-model-ready-welcome-naming/contracts/welcome-gate.md W11~W16
 *       liveness.md L15·L16
 *       spec.md FR-004·FR-005·FR-006·FR-007·FR-011~FR-014·FR-027
 *       specs/044-welcome-naming-modernist/spec.md FR-001~FR-009
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **화면은 문자열과 콜백만 받는다**(W12·W13, 원칙 III).
 *
 * `Character` 심볼도, 모델 식별자도, `RunResult`·`LivenessOutcome`도 받지 않는다.
 * 확인의 결과는 조립부가 `phase` 갈래 하나로 접어 넘긴다 — 화면이 응답 텍스트에
 * 닿을 경로가 **코드에 존재하지 않는 것**이 방어다(005 FR-028b가 토큰 콜백을 아예
 * 넘기지 않은 것과 같은 판단: 조심해서 안 쓰는 것보다 못 쓰게 하는 쪽이 낫다).
 *
 * **`src/welcome/`를 import하지 않는다**(W14) — `checkSourceFile`의
 * `UI_TOUCHES_WELCOME`이 막는다. 022가 화면→`diary/prompt`를 막은 것과 같은 자리다.
 *
 * **문구는 전부 사람이 쓴 고정 상수다**(L16, FR-004·FR-005). 추론이 생성한
 * 텍스트를 섞지 않으며, 캐릭터 이름만 보간된다. 캐릭터별로 다르지 않다.
 *
 * **막다른 길을 만들지 않는다**(W11, 원칙 I·II). 세 단계 전부에 빠져나갈 길이
 * 있고, 확인이 실패해도 [다시 시도]와 [건너뛰기]가 함께 있다.
 *
 * **★ 044 — 두 가지 레이아웃 언어로 나뉜다**(spec.md FR-001·FR-002, 클래리파이
 * 2026-09-19). `welcome`(작명) 단계는 리뷰 보드 `1a` 마크업처럼 좌측 정렬
 * 카드형(제목→본문→구분선→입력→힌트→버튼 가로 배치)이고, `checking`/`failed`
 * 단계는 043 `LogoScreen`과 같은 중앙 정렬 미니멀(카드·테두리 없음)이다 — 두
 * 스타일이 다른 것 자체가 "지금은 입력할 차례" vs "지금은 시스템이 처리 중"을
 * 시각으로 구분해 전달한다(research.md R2·R3). 색은 043이 이미 이관한
 * `COLORS.*` 9개 역할만 쓴다(FR-001, 새 토큰 추가 없음).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { ActivityIndicator, TextInput, View } from "react-native";

import { Button } from "./components/Button";
import { AppText } from "./components/Text";
import { COLORS } from "./theme/tokens";

/**
 * 지금 어느 단계인가.
 *
 * **`LivenessOutcome`이 아니다**(L15) — 조립부가 확인 결과를 이 갈래로 접어
 * 넘긴다. 값을 갖지 않으므로 시간·응답 텍스트가 실릴 자리가 없다.
 */
export type WelcomePhase = "checking" | "welcome" | "failed";

export type WelcomeScreenProps = {
  phase: WelcomePhase;
  /**
   * 지금 이 캐릭터를 뭐라 부르는가 — 조립부가 `displayNameOf()`로 만든 문자열.
   * 모델 식별자가 아니다(원칙 III).
   */
  characterName: string;
  /** 사용자가 지은 이름으로 확정한다. 검증은 조립부가 한다. */
  onSubmitName: (name: string) => void;
  /** 작명을 건너뛰거나, 실패 화면에서 홈으로 간다. */
  onSkip: () => void;
  /** 확인을 다시 시도한다. **연출 완료 플래그를 쓰지 않는다**(W9). */
  onRetry: () => void;
};

/**
 * 이름 입력 상한 (FR-013, 044 FR-004로 무변경 확인).
 *
 * `src/welcome/naming.ts`의 `NAME_MAX_LENGTH`와 같은 값이어야 하지만, 화면이
 * 그 모듈을 import할 수 없으므로(W14) 여기 둔다. 어긋나면 계약 테스트가 잡는다.
 */
const NAME_INPUT_MAX_LENGTH = 12;

/** 문구는 전부 사람이 쓴 고정 상수다 (L16). */
const TEXT = {
  checkingTitle: "잠깐만요",
  checkingBody: "새로 온 친구가 깨어나는 중이에요.",
  welcomeTitle: "오! 주인님, 반가워요",
  welcomeBody: "이제부터 제가 주인님의 하루를 일기로 적을게요.",
  namePrompt: "제 이름을 지어주세요.",
  namePlaceholder: "이름을 입력하세요",
  nameHint: "나중에 설정에서 바꿀 수 있어요.",
  submit: "이 이름으로 할래요",
  skip: "나중에 할래요",
  failedTitle: "아직 준비 중이에요",
  failedBody: "친구를 깨우지 못했어요. 잠시 후 다시 시도해 주세요.",
  retry: "다시 시도",
  goHome: "그냥 시작하기",
} as const;

export function WelcomeScreen({
  phase,
  characterName,
  onSubmitName,
  onSkip,
  onRetry,
}: WelcomeScreenProps) {
  const [draft, setDraft] = useState("");

  // 빈 입력·공백만은 확정할 수 없다(FR-012). 조립부가 다시 검증하지만
  // 화면에서도 버튼을 잠가 사용자가 헛되이 누르지 않게 한다.
  const canSubmit = draft.trim() !== "";

  return (
    <View style={CONTAINER} testID="welcome-screen">
      {/*
       * ★ 044 — checking/failed는 043 LogoScreen과 같은 중앙 정렬 미니멀
       * (research.md R3). 카드·테두리 없이 로딩 표시/안내 문구가 화면 중앙에
       * 홀로 배치된다 — 좌측 정렬 카드형인 welcome과 시각적으로 구분된다.
       */}
      {phase === "checking" && (
        <View style={CENTERED} testID="welcome-checking">
          {/*
           * 진행률 파라미터가 없는 것이 원칙 IV의 방어다(007에서 확립).
           * 몇 퍼센트인지·몇 초 걸렸는지 보여줄 방법이 애초에 없다.
           */}
          <ActivityIndicator color={COLORS.accent} size="large" />
          <AppText style={CENTER_TEXT} variant="title">
            {TEXT.checkingTitle}
          </AppText>
          <AppText style={CENTER_TEXT} variant="body">
            {TEXT.checkingBody}
          </AppText>
        </View>
      )}

      {/*
       * ★ 044 — welcome은 리뷰 보드 1a 레이아웃(research.md R2): 좌측 정렬
       * 세로 스택 — 제목 → 본문 → 구분선 → 이름 프롬프트 → 입력줄(밑줄
       * 스타일) → 힌트 → 버튼 2개 가로 배치.
       */}
      {phase === "welcome" && (
        <View style={WELCOME_SECTION} testID="welcome-greeting">
          <AppText style={WELCOME_TITLE} variant="title">
            {TEXT.welcomeTitle}
          </AppText>
          <AppText variant="body">{TEXT.welcomeBody}</AppText>

          <View style={DIVIDER} />

          <AppText variant="bodyStrong">{TEXT.namePrompt}</AppText>

          {/*
           * 025 실측 — 여러 텍스트 조각이 한 `<Text>`에 있으면 `testID`가
           * 접근성 트리에 노출되지 않는다. 입력창은 조각이 하나지만 Maestro가
           * 확실히 찾도록 `accessibilityLabel`을 함께 준다.
           */}
          <TextInput
            accessibilityLabel={TEXT.namePlaceholder}
            maxLength={NAME_INPUT_MAX_LENGTH}
            onChangeText={setDraft}
            placeholder={TEXT.namePlaceholder}
            placeholderTextColor={COLORS.textMuted}
            style={INPUT}
            testID="welcome-name-input"
            value={draft}
          />
          <AppText variant="caption">{TEXT.nameHint}</AppText>

          <View style={BUTTON_ROW}>
            {/* 건너뛸 수 있다(FR-014, 원칙 I) — 기본 이름으로 홈에 간다. */}
            <View style={BUTTON_ROW_ITEM}>
              <Button onPress={onSkip} testID="welcome-name-skip" variant="secondary">
                {TEXT.skip}
              </Button>
            </View>
            <View style={BUTTON_ROW_ITEM}>
              <Button
                disabled={!canSubmit}
                onPress={() => onSubmitName(draft)}
                testID="welcome-name-submit"
              >
                {TEXT.submit}
              </Button>
            </View>
          </View>
        </View>
      )}

      {phase === "failed" && (
        <View style={CENTERED} testID="welcome-failed">
          {/*
           * **오류 사유를 표시하지 않는다**(W16, 원칙 III). 모델 오류 메시지에는
           * 파일 경로가, 경로에는 자산 키가 들어 있다 — 003의 `readiness.ts`가
           * 같은 이유로 사람이 쓴 고정 문구만 쓴다.
           */}
          <AppText style={CENTER_TEXT} variant="title">
            {TEXT.failedTitle}
          </AppText>
          <AppText style={CENTER_TEXT} variant="body">
            {TEXT.failedBody}
          </AppText>

          {/* 막다른 길을 만들지 않는다(W11) — 두 길이 다 있다. */}
          <View style={FAILED_BUTTONS}>
            <Button onPress={onRetry} testID="welcome-retry">
              {TEXT.retry}
            </Button>
            <Button onPress={onSkip} testID="welcome-failed-skip" variant="secondary">
              {TEXT.goHome}
            </Button>
          </View>
        </View>
      )}

      {/*
       * 화면 어디에도 캐릭터 이름 말고는 나오지 않는다. 이름은 조립부가
       * `displayNameOf()`로 만든 문자열이며 모델 식별자가 아니다(FR-027).
       */}
      {phase !== "checking" && (
        <AppText
          accessibilityLabel={characterName}
          style={CENTER_TEXT}
          testID="welcome-character-name"
          variant="caption"
        >
          {characterName}
        </AppText>
      )}
    </View>
  );
}

/*
 * 032/034/043/044 — 색·모서리를 토큰에서 가져온다. NativeWind 변환은 Metro
 * 시점이라 jest에 없으므로 인라인 `style`을 쓴다. 숫자는 레이아웃 관용값만,
 * 색은 반드시 `COLORS.*`다(FR-001, 새 하드코딩 hex 없음).
 */
const CONTAINER = {
  flex: 1,
  paddingHorizontal: 24,
  paddingVertical: 24,
  justifyContent: "center",
  gap: 24,
  backgroundColor: COLORS.bg,
} as const;

/** checking/failed — 043 LogoScreen과 같은 중앙 정렬 미니멀(research.md R3). */
const CENTERED = { alignItems: "center", justifyContent: "center", gap: 16 } as const;

const CENTER_TEXT = { textAlign: "center" } as const;

/** welcome — 리뷰 보드 1a 좌측 정렬 카드형(research.md R2). */
const WELCOME_SECTION = { alignItems: "flex-start", gap: 20 } as const;

const WELCOME_TITLE = { fontSize: 24, fontWeight: "800" } as const;

/** 1a 레이아웃의 구분선 — COLORS.border 2px. */
const DIVIDER = {
  height: 2,
  width: "100%",
  backgroundColor: COLORS.border,
} as const;

/** 이름 입력줄 — 전체 테두리 대신 밑줄만(1a 마크업 스타일). */
const INPUT = {
  width: "100%",
  borderBottomWidth: 2,
  borderBottomColor: COLORS.text,
  paddingVertical: 8,
  fontSize: 20,
  fontWeight: "700",
  color: COLORS.text,
} as const;

/** 하단 버튼 2개 가로 배치 — 건너뛰기 좌측·확정 우측(1a 마크업). */
const BUTTON_ROW = {
  flexDirection: "row",
  gap: 8,
  width: "100%",
  justifyContent: "flex-end",
} as const;

const BUTTON_ROW_ITEM = { flexShrink: 0 } as const;

/** 실패 화면 — [다시 시도]/[그냥 시작하기]를 세로로 쌓는다(막다른 길 없음). */
const FAILED_BUTTONS = { gap: 12, width: "100%", maxWidth: 280 } as const;
