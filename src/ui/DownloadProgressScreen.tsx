/**
 * 다운로드 진행 캐러셀 + 프로그레스 바 + 완료 화면 (045, ★ 046이 캐러셀·
 * 진행 바·실패 처리를 재작성).
 *
 * 계약: specs/045-onboarding-download-consent/contracts/download-consent-gate.md
 *       C6·C7·C9 (완료 게이트 D5는 그대로 유지)
 *       specs/046-download-progress-carousel/contracts/download-progress-carousel.md
 *       D1~D9
 *       spec.md(046) FR-002~FR-014
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 리뷰 보드 dv-row "Onboarding — four feature slides while the modules
 * download" 섹션(화면 ID `1o`~`1s` 슬라이드, `1q` 완료)을 이관한다. **040
 * `WaitingForDownloadScreen`을 045가 이미 대체했고, 046은 045가 만든 정적
 * 슬라이드를 실제로 움직이는 캐러셀로 완성한다.**
 *
 * **★ 046 — 카드 전환은 이제 `react-native-reanimated-carousel`이 맡는다**
 * (research R1). `loop`+`autoPlay`+`autoPlayInterval`로 무한 순환·손
 * 스와이프·자동 전환을 라이브러리에 위임한다 — 045의 `resolveSlideStage()`
 * (elapsedMs 기반 인덱스 계산)는 더 이상 이 화면에서 호출하지 않는다(그
 * 함수 자체와 045 계약 테스트는 역사적 기록으로 남는다).
 *
 * **★ 046 — 프로그레스 바는 이제 실제 진행률(`downloadFraction` prop)을
 * 반영한다**(contracts D4~D7). `progressSegments()`(046,
 * `src/firstrun/consent.ts`)로 4개 구간의 채움 비율을 계산하고, 캐러셀의
 * 카드 전환(`carouselIndex` state)과는 완전히 독립된 값이다 — 하나가
 * 바뀌어도 다른 하나는 영향받지 않는다.
 *
 * **그림 자리는 빈 사각형이다**(045 research.md R6, 046도 유지) — 실제
 * 이미지 에셋은 이 스펙의 범위 밖이다.
 *
 * **★ 046 — 실패 처리 방식이 바뀌었다**(contracts D6·D7, spec FR-011).
 * 045의 전용 실패 뷰(`download-progress-failed`, [다시 시도] 버튼)를
 * 제거했다 — 실패해도 캐러셀·프로그레스 바 레이아웃은 그대로 있고, 진행
 * 바 하단 안내 문구만 실패 문구로 바뀐다. 재시도는 화면이 아니라 조립
 * 계층(`App.tsx`)이 자동으로(10초 간격) 담당한다(research R6, contracts
 * D8) — 이 화면은 더 이상 `onRetry` prop을 받지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { Carousel } from "react-native-reanimated-carousel";

import { progressSegments } from "../firstrun/consent";
import { Button } from "./components/Button";
import { AppText } from "./components/Text";
import { COLORS } from "./theme/tokens";

export type DownloadProgressScreenProps = {
  /** 029 `essentialAssetsReady()`의 결과 — 완료 여부 판정에만 쓴다(C6). */
  downloadReady: boolean;
  /**
   * 필수 자산의 합산 다운로드 진행률(0~1, 041/029
   * `essentialDownloadFraction()`이 계산한 값을 그대로 전달받는다, 046
   * FR-005). 이 화면은 계산하지 않고 받은 값을 `progressSegments()`로
   * 펼치기만 한다(원칙 IV 경계 — 자산 개수·식별자를 모른다).
   */
  downloadFraction: number;
  /** 완료 화면의 "시작할게요"를 눌렀다. */
  onProceed: () => void;
  /**
   * 다운로드가 실패한 상태다(046 FR-011) — `true`면 캐러셀·프로그레스
   * 바는 그대로 두고 하단 안내 문구만 바뀐다. 오류 원문은 받지 않는다
   * (원칙 III). 재시도는 이 화면의 책임이 아니다(contracts D8).
   */
  failed: boolean;
};

/** 실패 시 진행 바 하단에 보일 고정 문구 — 오류 원문을 담지 않는다(원칙 III). */
const FAILED_PROGRESS_TEXT = "받다가 멈췄어요";

/** 슬라이드 1~4의 사람이 쓴 고정 헤드라인·본문(FR-005, 045 그대로 유지). */
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

/** 캐러셀 자동 전환 간격 — 045가 정한 값 그대로 유지(사람이 정한 고정값). */
const SLIDE_INTERVAL_MS = 4000;

/** 진행 문구 — 정상 진행 중 고정 상수(045 Clarifications, FR-006). */
const PROGRESS_TEXT = "받는 중이에요";

const KICKER = "준비하는 중";

export function DownloadProgressScreen({
  downloadReady,
  downloadFraction,
  onProceed,
  failed,
}: DownloadProgressScreenProps) {
  const { width } = useWindowDimensions();
  // 캐러셀이 지금 보여주고 있는 카드 — `onSnapToItem`이 낸 값을 그대로
  // 신뢰한다(contracts D9, 앱이 인덱스 산술을 직접 하지 않는다).
  const [carouselIndex, setCarouselIndex] = useState(0);

  if (downloadReady) {
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

  // 4개 구간의 채움 비율 — 캐러셀 인덱스(carouselIndex)와 완전히 독립된
  // 값(downloadFraction)에서만 파생된다(contracts D4).
  const segments = progressSegments(downloadFraction);

  return (
    <View style={CONTAINER} testID="download-progress-screen">
      <View style={HEADER_ROW}>
        <AppText style={KICKER_TEXT}>{String(carouselIndex + 1).padStart(2, "0")} / 04</AppText>
        <AppText style={KICKER_TEXT}>{KICKER}</AppText>
      </View>

      <Carousel<(typeof SLIDES)[number]>
        testID="download-progress-carousel"
        style={CAROUSEL_STYLE(width)}
        data={[...SLIDES]}
        loop
        autoplay
        autoplayInterval={SLIDE_INTERVAL_MS}
        onSnapToItem={setCarouselIndex}
        renderItem={({ item }) => (
          <View style={CARD}>
            {/* 그림 자리 — 실제 이미지 에셋은 후속 스펙(045 research.md R6). */}
            <View style={IMAGE_SLOT} testID="download-progress-image-slot" />
            <View style={TEXT_BLOCK}>
              <AppText variant="title">{item.title}</AppText>
              <AppText variant="body">{item.body}</AppText>
            </View>
          </View>
        )}
      />

      <View style={PROGRESS_BLOCK}>
        <View style={PROGRESS_BAR_ROW} testID="download-progress-bar">
          {segments.map((fillRatio, i) => (
            <ProgressSegmentBar key={i} fillRatio={fillRatio} />
          ))}
        </View>
        <AppText variant="caption">{failed ? FAILED_PROGRESS_TEXT : PROGRESS_TEXT}</AppText>
      </View>
    </View>
  );
}

/**
 * 프로그레스 바 한 구간 — `fillRatio`(0~1)만큼 채워지며, 채워지는 중인
 * 구간(0과 1 사이)은 폭 변화에 애니메이션이 붙는다(research R5, contracts
 * D1~D3의 `progressSegments()` 출력을 그대로 시각화).
 */
function ProgressSegmentBar({ fillRatio }: { fillRatio: number }) {
  const animatedStyle = useAnimatedStyle(() => ({
    width: withTiming(`${fillRatio * 100}%`),
  }));

  return (
    <View style={BAR_SEGMENT_TRACK}>
      <Animated.View style={[BAR_SEGMENT_FILL, animatedStyle]} />
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

/** 캐러셀 루트 스타일 — `width`는 `useWindowDimensions()`로 매 렌더 계산. */
function CAROUSEL_STYLE(width: number) {
  return { width, flex: 1, marginTop: 16 } as const;
}

/** 캐러셀 각 카드(슬라이드) 내부 레이아웃 — 045의 카드 내부 구조 그대로. */
const CARD = {
  flex: 1,
  gap: 12,
} as const;

const IMAGE_SLOT = {
  flex: 1,
  minHeight: 280,
  backgroundColor: COLORS.surface,
} as const;

const TEXT_BLOCK = { gap: 10 } as const;

const PROGRESS_BLOCK = { gap: 10 } as const;

const PROGRESS_BAR_ROW = { flexDirection: "row", gap: 4 } as const;

/** 구간 트랙(빈 배경) — 채워지는 부분(`BAR_SEGMENT_FILL`)이 그 위에 겹친다. */
const BAR_SEGMENT_TRACK = {
  flex: 1,
  height: 4,
  backgroundColor: COLORS.surface,
  overflow: "hidden",
} as const;

const BAR_SEGMENT_FILL = {
  height: 4,
  backgroundColor: COLORS.accent,
} as const;
