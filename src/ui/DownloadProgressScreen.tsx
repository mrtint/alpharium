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
 * (research R1). `loop`+`autoplay`+`autoplayInterval`(설치된 v5.1.1
 * 타입 선언은 lowercase, research.md R2)로 무한 순환·손 스와이프·자동
 * 전환을 라이브러리에 위임한다 — 045의 `resolveSlideStage()`
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

import { memo, useMemo, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
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

/**
 * `Carousel`의 `data` prop에 넘길 mutable 배열 — 모듈 스코프에서 딱 한 번만
 * 만든다. `data={[...SLIDES]}`로 렌더마다 새 배열을 만들면 `Carousel`이
 * 매번 "새 데이터"로 인식한다(아래 `CarouselSlides` 분리와 함께 필요 —
 * 실기기 실측, 2026-09-21 참조).
 */
const SLIDE_ITEMS: (typeof SLIDES)[number][] = [...SLIDES];

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

      <CarouselSlides width={width} onSnapToItem={setCarouselIndex} />

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
 * 캐러셀 카드 렌더러 — 모듈 스코프 함수라 매 렌더 새로 만들어지지 않는다
 * (`renderItem` prop이 안정적인 참조를 유지해야 `useAutoPlay`의 콜백 체인이
 * 리셋되지 않는다).
 */
function renderSlide({ item }: { item: (typeof SLIDES)[number] }) {
  return (
    <View style={CARD}>
      {/* 그림 자리 — 실제 이미지 에셋은 후속 스펙(045 research.md R6). */}
      <View style={IMAGE_SLOT} testID="download-progress-image-slot" />
      <View style={TEXT_BLOCK}>
        <AppText variant="title">{item.title}</AppText>
        <AppText variant="body">{item.body}</AppText>
      </View>
    </View>
  );
}

/**
 * 캐러셀 자체를 부모(`DownloadProgressScreen`)의 리렌더로부터 격리한다
 * (`memo`, `width`·`onSnapToItem` 외 다른 값이 바뀌어도 리렌더되지 않음).
 *
 * **★ 실기기 실측(2026-09-21) — 격리 없이는 자동 전환이 한 번도 일어나지
 * 않는 조용한 실패였다.** `essentialDownloadFraction()` 콜백이 다운로드
 * 도중 초당 여러 번 호출돼 `App.tsx` → `DownloadProgressScreen`이 자주
 * 리렌더된다. 캐러셀이 그 부모 트리 안에서 인라인으로 렌더되면
 * `style`(`CAROUSEL_STYLE(width)`가 매번 새 객체)·`renderItem`(인라인
 * 화살표 함수가 매번 새 참조)이 매 렌더 바뀌고, 라이브러리 내부
 * `useAutoPlay`의 `play` 콜백이 그 값들에 (간접적으로) 의존해 매번
 * `clearTimeout` 후 `setTimeout`을 다시 건다 — 타이머가 만료되기 전에
 * 계속 리셋되어 `next()`가 결코 호출되지 않는다(011의 `has_media=0`,
 * 013의 URI 계약 불일치와 같은 계열 — 조용한 실패, 기기 없는 테스트가
 * 구조적으로 못 잡는다: jest 목은 `renderItem`을 1회만 호출하고 autoplay
 * 타이머 자체를 흉내내지 않는다).
 *
 * 격리 후에는 `width`(화면 회전 등으로만 바뀜)·`onSnapToItem`(부모의
 * `useState` setter, 항상 안정적)만 이 컴포넌트를 리렌더시키므로 라이브러리
 * 내부 참조가 안정적으로 유지된다.
 */
const CarouselSlides = memo(function CarouselSlides({
  width,
  onSnapToItem,
}: {
  width: number;
  onSnapToItem: (index: number) => void;
}) {
  const style = useMemo(() => CAROUSEL_STYLE(width), [width]);

  return (
    <Carousel<(typeof SLIDES)[number]>
      testID="download-progress-carousel"
      style={style}
      data={SLIDE_ITEMS}
      loop
      autoplay
      autoplayInterval={SLIDE_INTERVAL_MS}
      onSnapToItem={onSnapToItem}
      renderItem={renderSlide}
    />
  );
});

/** 깜빡임 한 사이클의 길이 — 045 원본 마크업의 `barblink 1.4s`와 동일. */
const BLINK_CYCLE_MS = 1400;

/**
 * 프로그레스 바 한 구간 — `fillRatio`(0~1)만큼 채워지며, 채워지는 중인
 * 구간(0과 1 사이)은 폭 변화에 애니메이션이 붙는다(research R5, contracts
 * D1~D3의 `progressSegments()` 출력을 그대로 시각화).
 *
 * **★ 지금 채워지고 있는 구간에는 은은한 깜빡임(opacity)도 함께 준다**
 * (045 원본 마크업의 `barblink` 재현, 사용자 피드백 2026-09-21) — "지금도
 * 받고 있다"는 인상을 폭 변화만으로는 놓치기 쉽다. 완전히 채워졌거나
 * (`fillRatio === 1`) 아직 비어 있으면(`fillRatio === 0`) 깜빡이지 않는다 —
 * 그 구간의 다운로드가 끝났거나 아직 시작되지 않았기 때문이다.
 */
function ProgressSegmentBar({ fillRatio }: { fillRatio: number }) {
  const isActive = fillRatio > 0 && fillRatio < 1;

  const widthStyle = useAnimatedStyle(() => ({
    width: withTiming(`${fillRatio * 100}%`),
  }));

  const blinkStyle = useAnimatedStyle(() => ({
    opacity: isActive
      ? withRepeat(
          withSequence(
            withTiming(0.4, { duration: BLINK_CYCLE_MS / 2, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: BLINK_CYCLE_MS / 2, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
        )
      : 1,
  }));

  return (
    <View style={BAR_SEGMENT_TRACK}>
      <Animated.View style={[BAR_SEGMENT_FILL, widthStyle, blinkStyle]} />
    </View>
  );
}

/** `CONTAINER`의 좌우 패딩 — `CAROUSEL_STYLE`이 캐러셀 폭 계산에 재사용한다. */
const CONTAINER_HORIZONTAL_PADDING = 20;

const CONTAINER = {
  flex: 1,
  paddingHorizontal: CONTAINER_HORIZONTAL_PADDING,
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

/**
 * 캐러셀 루트 스타일 — `width`는 `useWindowDimensions()`(화면 전체 너비)에서
 * 계산한다. `CONTAINER`의 좌우 패딩(`CONTAINER_HORIZONTAL_PADDING`, 각
 * 20px)을 빼지 않으면 캐러셀이 부모의 패딩 영역을 무시하고 화면 끝까지
 * 뻗어나가 우측 여백이 좌측과 비대칭이 된다(실기기 실측, 2026-09-21).
 */
function CAROUSEL_STYLE(width: number) {
  return { width: width - CONTAINER_HORIZONTAL_PADDING * 2, flex: 1, marginTop: 16 } as const;
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
