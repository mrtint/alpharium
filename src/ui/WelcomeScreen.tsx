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
 *
 * **★ 047 — welcome 단계를 `1a` 원본과 실제로 맞췄다**(specs/047-welcome-naming-1a,
 * contracts/welcome-1a.md A1~A11). 044 결과물은 실기기에서 표지·얼굴 타일·`1a`
 * 문구·세로 중앙 배치·글자 수 카운터가 빠져 있었다. 확정 버튼은 빈 입력에서도
 * 흐려지지 않는다 — 누를 수 없음은 `onPress`와 `accessibilityState`로만 표현한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, View } from "react-native";

import { lazyText } from "../i18n/current";
import { Button } from "./components/Button";
import { NameField } from "./components/NameField";
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

/**
 * 문구는 전부 사람이 쓴 고정 상수다 (L16).
 *
 * ★ 047 — welcome 단계 문구는 리뷰 보드 `1a`의 KO 문자열 테이블 원문이다
 * (`welcomeTitle`·`welcomeBody`·`namePrompt`·`nameHint`·`submit`·`skip`).
 * 힌트의 상한 숫자는 `NAME_INPUT_MAX_LENGTH`에서 보간한다 — 상한이 바뀌면
 * 문구도 함께 바뀐다(047 A5).
 *
 * 062 — 원문은 한국어 카탈로그(`src/i18n/catalogs/ko/welcome.ts`)로 옮겼다. 읽는 순간 화면 언어의 카탈로그에서 꺼낸다.
 */
const TEXT = lazyText((c) => c.welcome);

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
    <View style={phase !== "welcome" ? CONTAINER : WELCOME_CONTAINER} testID="welcome-screen">
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
       * ★ 047 — welcome은 리뷰 보드 `1a` 마크업 그대로(spec.md FR-001~FR-010):
       * [표지] → [가운데 묶음: 얼굴 타일 → 제목 → 본문 → 구분선 → 프롬프트 →
       * 입력줄+카운터 → 힌트, 세로 중앙] → [버튼 줄, 화면 아래 오른쪽].
       * 044는 같은 1a를 참조했지만 표지·얼굴·문구·세로 중앙·카운터가 빠져 있었다.
       */}
      {phase === "welcome" && (
        // 044 Convergence T016 — 키보드가 화면 대부분을 가리는 좁은 기기에서도
        // 버튼에 스크롤로 닿을 수 있어야 한다(spec.md Edge Cases). `testID`는
        // 기존 계약 테스트·Maestro가 조회하는 자리라 바깥 View에 그대로 둔다.
        // ★ 047 실기기 — 매니페스트의 `adjustResize`만으로는 레이아웃이 줄지 않았다
        // (SM-S901N, Android 16 edge-to-edge). 1a대로 가운데 묶음을 세로 중앙에 두자
        // 입력줄이 키보드 뒤로 숨어 치는 글자가 안 보였다 — `KeyboardAvoidingView`가
        // 키보드 높이만큼 줄여 `ScrollView`가 입력줄을 따라 올리게 한다.
        // 오프셋 없이는 버튼 줄이 키보드 위 경계에 반쯤 걸렸다(모자란 높이 ≈ 하단
        // 내비게이션 바) — `KEYBOARD_OFFSET` 주석 참고.
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={KEYBOARD_OFFSET}
          style={WELCOME_OUTER}
          testID="welcome-greeting"
        >
          <ScrollView contentContainerStyle={WELCOME_SECTION} keyboardShouldPersistTaps="handled">
            <AppText style={KICKER} testID="welcome-kicker">
              {TEXT.kicker}
            </AppText>

            <View style={WELCOME_CENTER} testID="welcome-center">
              <View style={FACE_TILE} testID="welcome-face">
                <AppText style={FACE_TEXT}>{TEXT.face}</AppText>
              </View>

              <AppText style={WELCOME_TITLE} variant="title">
                {TEXT.welcomeTitle}
              </AppText>
              <AppText style={WELCOME_BODY} variant="body">
                {TEXT.welcomeBody}
              </AppText>

              <View style={DIVIDER} />

              <AppText style={NAME_PROMPT} variant="bodyStrong">
                {TEXT.namePrompt}
              </AppText>

              {/* 055 — 입력줄은 설정의 이름 바꾸기와 공유한다(`NameField`). 모양·testID는 그대로다. */}
              <NameField
                counterTestID="welcome-name-counter"
                inputTestID="welcome-name-input"
                maxLength={NAME_INPUT_MAX_LENGTH}
                onChangeText={setDraft}
                placeholder={TEXT.namePlaceholder}
                value={draft}
              />
              <AppText style={HINT} variant="caption">
                {TEXT.nameHint(NAME_INPUT_MAX_LENGTH)}
              </AppText>
            </View>

            <View style={BUTTON_ROW}>
              {/* 건너뛸 수 있다(FR-014, 원칙 I) — 기본 이름으로 홈에 간다. */}
              <View style={BUTTON_ROW_ITEM}>
                <Button onPress={onSkip} testID="welcome-name-skip" variant="secondary">
                  {TEXT.skip}
                </Button>
              </View>
              <View style={BUTTON_ROW_ITEM}>
                {/*
                 * ★ 047 Clarification Q1 — `disabled`를 넘기지 않는다. 넘기면 `Button`이
                 * 반투명(0.5)으로 흐려지는데 1a에는 그런 모양이 없다. 빈 입력은
                 * `onPress`에서 걸러 확정되지 않게 하고(035 FR-012), 스크린리더에는
                 * `accessibilityState`로 여전히 "누를 수 없음"을 알린다(research R2).
                 */}
                <Button
                  accessibilityState={{ disabled: !canSubmit }}
                  onPress={() => {
                    if (canSubmit) onSubmitName(draft);
                  }}
                  testID="welcome-name-submit"
                >
                  {`${TEXT.submit}  ${TEXT.submitArrow}`}
                </Button>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
       *
       * ★ 047 — welcome 단계에서는 그리지 않는다(1a에 없음, FR-011). failed
       * 단계만 예전처럼 그린다(FR-016).
       */}
      {phase === "failed" && (
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

/*
 * ★ 047 — welcome 단계는 리뷰 보드 `1a` 마크업을 옮긴다(research R4·R7).
 * 1a 치수는 402×874 iOS 프레임 기준이고 위 70·아래 44에는 상태바·홈 인디케이터가
 * 들어 있다 — 이 앱은 `App.tsx`의 `SafeAreaView`가 인셋을 이미 빼므로 그만큼 줄였다.
 * 크기·굵기는 `TYPE`에 없는 값이라 인라인으로 두되 색은 전부 `COLORS.*`다(FR-018).
 * 마크업의 neutral-700/600은 토큰에 없어 `textMuted`(대비 5.00:1)로 맞췄다.
 */

/** welcome 전용 바깥 여백 — checking/failed의 `CONTAINER`는 건드리지 않는다(FR-016). */
const WELCOME_CONTAINER = {
  flex: 1,
  paddingHorizontal: 20,
  paddingTop: 20,
  paddingBottom: 24,
  backgroundColor: COLORS.bg,
} as const;

/**
 * 키보드 회피 추가 여백 (dp) — **실기기에서 잰 값이다**(047 T017, SM-S901N, 3버튼
 * 내비게이션). 오프셋 0이면 키보드를 연 채 끝까지 스크롤해도 버튼 줄이 키보드 위
 * 경계에 반쯤 가렸다. 모자란 높이가 하단 내비게이션 바(48dp)와 맞아, edge-to-edge에서
 * 보고되는 키보드 높이가 그 바를 빼고 오는 것으로 본다. 제스처 내비게이션 기기처럼 바가
 * 낮으면 버튼 아래 여백이 조금 더 생길 뿐 가려지지 않는다.
 */
const KEYBOARD_OFFSET = 48;

/** 바깥은 남은 공간을 채우고 안쪽 `ScrollView`가 키보드에 대응한다(044 T016). */
const WELCOME_OUTER = { flex: 1 } as const;

/** 스크롤 내용 — [표지] → [가운데 묶음] → [버튼 줄] 세로 스택, 좌측 정렬. */
const WELCOME_SECTION = { alignItems: "flex-start", flexGrow: 1 } as const;

/** 1a 표지 — 11px / 600 / 자간 .1em / 강조색. */
const KICKER = {
  fontSize: 11,
  lineHeight: 14,
  fontWeight: "600",
  letterSpacing: 1.1,
  color: COLORS.accent,
} as const;

/** 1a 가운데 묶음 — `flex: 1` + 세로 중앙, 간격 18(FR-010). */
const WELCOME_CENTER = {
  flex: 1,
  alignSelf: "stretch",
  justifyContent: "center",
  gap: 18,
  paddingVertical: 24,
} as const;

/** 1a 얼굴 타일 — 56×56, 선택된 페르소나는 강조색 배경. */
const FACE_TILE = {
  width: 56,
  height: 56,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: COLORS.accent,
} as const;

const FACE_TEXT = { fontSize: 28, lineHeight: 34 } as const;

/** 1a 제목 — 38px / 800 / 줄 간격 촘촘하게 / 자간 -.025em. */
const WELCOME_TITLE = {
  fontSize: 38,
  lineHeight: 42,
  fontWeight: "800",
  letterSpacing: -1,
} as const;

/** 1a 본문 — 16px / line-height 1.5. */
const WELCOME_BODY = { fontSize: 16, lineHeight: 24, color: COLORS.textMuted } as const;

/** 1a 구분선 — 2px, 위아래 8. */
const DIVIDER = {
  height: 2,
  width: "100%",
  marginVertical: 8,
  backgroundColor: COLORS.border,
} as const;

/** 1a 이름 프롬프트 — 14px / 600. */
const NAME_PROMPT = { fontSize: 14, lineHeight: 20, fontWeight: "600" } as const;

/** 1a 힌트 — 12px, 흐린 글자. */
const HINT = { fontSize: 12, lineHeight: 16 } as const;

/**
 * 1a 하단 버튼 줄 — 오른쪽 정렬, 간격 8. 건너뛰기 좌측·확정 우측.
 *
 * ★ 047 실기기 — 시스템 글꼴 1.3배에서 두 버튼이 한 줄을 넘쳐 [나중에 할래요]의
 * 앞 글자가 잘렸다. `flexWrap`으로 넘치면 다음 줄로 내린다(기본 글꼴에서는 한 줄 그대로).
 */
const BUTTON_ROW = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
  width: "100%",
  justifyContent: "flex-end",
} as const;

const BUTTON_ROW_ITEM = { flexShrink: 0 } as const;

/** 실패 화면 — [다시 시도]/[그냥 시작하기]를 세로로 쌓는다(막다른 길 없음). */
const FAILED_BUTTONS = { gap: 12, width: "100%", maxWidth: 280 } as const;
