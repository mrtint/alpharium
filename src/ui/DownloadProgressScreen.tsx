/**
 * 다운로드 진행 슬라이드 + 완료 화면 (045).
 *
 * 계약: specs/045-onboarding-download-consent/contracts/download-consent-gate.md
 *       C6·C7·C9
 *       spec.md FR-004~FR-007
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 리뷰 보드 dv-row "Onboarding — four feature slides while the modules
 * download" 섹션(화면 ID `1o`~`1s` 슬라이드, `1q` 완료)을 이관한다. **040
 * `WaitingForDownloadScreen`(회전 인디케이터 + 진행바 하나뿐)을 완전히
 * 대체한다**(research.md R4) — 그 파일은 이 스펙에서 삭제됐다.
 *
 * **진행률은 `elapsedMs`(경과 시간)만 본다**(원칙 IV, C6) — `essentialDownload
 * Fraction()`(029)의 바이트 진행률을 인자로 받지 않는다. `src/firstrun/
 * consent.ts`의 `resolveSlideStage()`가 순수 판정을 맡고, 이 화면은 4초
 * 타이머로 `elapsedMs`를 추적해 넘길 뿐이다.
 *
 * **그림 자리는 빈 사각형이다**(research.md R6) — 리뷰 보드의 `image-slot`
 * placeholder에 대응하며, 044가 페르소나 아바타를 범위 밖으로 미룬 것과 같은
 * 판단이다. 실제 이미지 에셋은 후속 스펙에서 다룬다.
 *
 * **진행 문구는 슬라이드마다 "받는 중이에요" 고정이다**(Clarifications
 * 2026-09-19, FR-006) — 퍼센트·바이트·속도를 계산하지 않는다.
 *
 * **★ 재시도 경로(`failed`·`onRetry`)는 convergence에서 추가됐다**(FR-011,
 * Edge Cases — 원칙 I "막다른 길을 만들지 않는다"). 초기 구현은 다운로드
 * 실패를 조용히 삼키고 화면이 슬라이드에 영원히 멈춰 있었다 — 사용자가
 * 앱을 완전히 재시작하는 것 외에 취할 조작이 없었다. `failed: true`일 때
 * 별도 실패 뷰(고정 안내 문구 + [다시 시도] 버튼)를 보여 같은 세션에서
 * 재시도할 수 있게 한다. 오류 원문·모델 식별자는 노출하지 않는다(원칙
 * III, C9와 같은 경계) — 화면은 실패했다는 사실과 재시도 조작만 안다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from "react";
import { View } from "react-native";

import { resolveSlideStage, SLIDE_INTERVAL_MS } from "../firstrun/consent";
import { Button } from "./components/Button";
import { AppText } from "./components/Text";
import { COLORS } from "./theme/tokens";

export type DownloadProgressScreenProps = {
  /** 029 `essentialAssetsReady()`의 결과 — 완료 여부 판정에만 쓴다(C6). */
  downloadReady: boolean;
  /** 완료 화면의 "시작할게요"를 눌렀다. */
  onProceed: () => void;
  /**
   * 다운로드가 실패한 상태다(convergence, FR-011) — `true`면 슬라이드
   * 대신 재시도 뷰를 보인다. 오류 원문은 받지 않는다(원칙 III).
   */
  failed: boolean;
  /** 사용자가 [다시 시도]를 눌렀다. */
  onRetry: () => void;
};

/** 실패 안내 문구 — 사람이 쓴 고정 상수, 오류 원문을 담지 않는다(원칙 III). */
const FAILED_TEXT = {
  title: "받다가 멈췄어요",
  body: "네트워크 상태를 확인하고 다시 시도해 주세요.",
  retry: "다시 시도",
} as const;

/** 슬라이드 1~4의 사람이 쓴 고정 헤드라인·본문(FR-005). */
const SLIDES = [
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
] as const;

/** 진행 문구 — 슬라이드마다 동일한 고정 상수(Clarifications, FR-006). */
const PROGRESS_TEXT = "받는 중이에요";

const KICKER = "준비하는 중";

export function DownloadProgressScreen({
  downloadReady,
  onProceed,
  failed,
  onRetry,
}: DownloadProgressScreenProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  // 4초마다 경과 시간을 누적한다 — resolveSlideStage가 그 값만으로 슬라이드
  // 인덱스를 판정한다(C6, 바이트 진행률을 구독하지 않는다). 실패했으면
  // 더 이상 슬라이드를 넘길 필요가 없다 — 재시도 뷰가 대신 보인다.
  useEffect(() => {
    if (downloadReady || failed) return;
    const id = setInterval(() => {
      setElapsedMs((prev) => prev + SLIDE_INTERVAL_MS);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [downloadReady, failed]);

  // 실패는 슬라이드·완료보다 먼저 본다 — 막다른 길을 만들지 않는다(원칙
  // I, FR-011, convergence T022).
  if (failed) {
    return (
      <View style={CONTAINER} testID="download-progress-failed">
        <AppText variant="title">{FAILED_TEXT.title}</AppText>
        <AppText variant="body">{FAILED_TEXT.body}</AppText>
        <Button onPress={onRetry} testID="download-progress-retry">
          {FAILED_TEXT.retry}
        </Button>
      </View>
    );
  }

  const stage = resolveSlideStage({ downloadReady, elapsedMs });

  if (stage.kind === "complete") {
    return (
      <View style={CONTAINER} testID="download-progress-complete">
        <AppText variant="title">준비됐어요</AppText>
        <AppText variant="body">이제 시작할 수 있어요.</AppText>
        <Button onPress={onProceed} testID="download-progress-proceed">
          시작할게요
        </Button>
      </View>
    );
  }

  const slide = SLIDES[stage.index];

  return (
    <View style={CONTAINER} testID="download-progress-screen">
      <View style={HEADER_ROW}>
        <AppText style={KICKER_TEXT}>{String(stage.index + 1).padStart(2, "0")} / 04</AppText>
        <AppText style={KICKER_TEXT}>{KICKER}</AppText>
      </View>

      {/* 그림 자리 — 실제 이미지 에셋은 후속 스펙(research.md R6). */}
      <View style={IMAGE_SLOT} testID="download-progress-image-slot" />

      <View style={TEXT_BLOCK}>
        <AppText variant="title">{slide.title}</AppText>
        <AppText variant="body">{slide.body}</AppText>
      </View>

      <View style={PROGRESS_BLOCK}>
        <View style={PROGRESS_BAR_ROW}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[BAR_SEGMENT, i <= stage.index ? BAR_SEGMENT_ON : BAR_SEGMENT_OFF]}
            />
          ))}
        </View>
        <AppText variant="caption">{PROGRESS_TEXT}</AppText>
      </View>
    </View>
  );
}

const CONTAINER = {
  flex: 1,
  paddingHorizontal: 20,
  paddingTop: 70,
  paddingBottom: 44,
  gap: 16,
  backgroundColor: COLORS.bg,
} as const;

const HEADER_ROW = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "baseline",
} as const;

const KICKER_TEXT = {
  fontSize: 11,
  letterSpacing: 0.1 * 11,
  textTransform: "uppercase",
  fontWeight: "600",
  color: COLORS.textMuted,
} as const;

const IMAGE_SLOT = {
  flex: 1,
  minHeight: 280,
  backgroundColor: COLORS.surface,
} as const;

const TEXT_BLOCK = { gap: 10 } as const;

const PROGRESS_BLOCK = { gap: 10 } as const;

const PROGRESS_BAR_ROW = { flexDirection: "row", gap: 4 } as const;

const BAR_SEGMENT = { flex: 1, height: 4 } as const;

const BAR_SEGMENT_ON = { backgroundColor: COLORS.accent } as const;

const BAR_SEGMENT_OFF = { backgroundColor: COLORS.surface } as const;
