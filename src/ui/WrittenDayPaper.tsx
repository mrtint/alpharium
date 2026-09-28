/**
 * 쓴 날의 지면 (051, 보드 `2c`·`2k`).
 *
 * 계약: specs/051-home-written-day/contracts/written-day.md HOME2·HOME8~HOME11, CAR1·CAR10
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **홈이 곧 상세다.** 스트립 아래 회색 지면에 캐러셀과 본문이 한 덩어리로 놓인다. 날짜 책등이 없다.
 * 판정은 `paperFor()`(`src/app/written-day.ts`)가 하고 여기서는 그리기만 한다.
 *
 * **지면은 캐러셀과 본문뿐이다**(FR-016a) — 017의 「이 일기가 본 것」·소요 시간·작성자 문장·장소
 * 이름을 보이지 않는다. 저장된 값은 남는다. 장소 이름은 프롬프트를 거쳐 본문에 실릴 수 있다.
 *
 * **읽는 중에는 빈 지면이다**(FR-016) — 회전 표시를 두지 않는다. 쓴 날인가는 이미 목록 요약이
 * 정했으므로 하단 바는 이미 「다시 쓰기」다.
 *
 * **읽을 수 없으면 그 사실을 말한다**(FR-015, 006 FR-017a) — 빈 본문을 지어내지 않는다.
 *
 * **지면만 스크롤된다**(보드 `2c` — 헤더·스트립은 `flex:none`, 지면이 `overflow`). 그래서 이 컴포넌트가
 * 곧 스크롤 영역이고, 끝에 닿았는가(`reachedEnd`)를 부르는 쪽에 알린다 — 「다시 쓰기」 바가 그때
 * 올라온다(`2c` ④, 051 수정). 스트립 접힘은 「읽기 스크롤」 조각 몫이다(C7).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useRef, useState } from "react";
import { ScrollView, useWindowDimensions, View, type ViewStyle } from "react-native";

import { reachedEnd, type PaperState } from "../app/written-day";
import { AppText } from "./components/Text";
import { WRITTEN_DAY_TEXT } from "./home-text";
import { PhotoCarousel } from "./PhotoCarousel";
import { COLORS, WRITTEN_DAY } from "./theme/tokens";

export type WrittenDayPaperProps = {
  /** 쓴 날의 지면 상태 — 안 쓴 날(`unwritten`)에는 이 화면을 그리지 않는다 */
  paper: Exclude<PaperState, { kind: "unwritten" }>;
  /** 지면 끝에 닿았는가가 바뀌었다 (처음 잰 순간에도 한 번 알린다) */
  onReachEndChange?: (atEnd: boolean) => void;
};

const { body, carouselPadding } = WRITTEN_DAY;

export function WrittenDayPaper({ paper, onReachEndChange }: WrittenDayPaperProps) {
  // 슬라이드 폭 = 지면 폭 − 좌우 여백. 지면을 잰 값을 쓰고, 재기 전 첫 프레임만 창 폭으로 둔다 —
  // 지면은 화면 끝까지 닿으므로(아래 PAPER) 둘은 같아야 한다. 캐러셀이 늦게 튀어나오지 않게.
  const window = useWindowDimensions();
  const [measured, setMeasured] = useState<number | undefined>(undefined);
  const width = measured ?? window.width;

  // 끝 판정에 쓰는 세 값 — 렌더와 무관하므로 ref에 둔다. 바뀐 결과만 알린다.
  const metrics = useRef({ y: 0, viewport: 0, content: 0 });
  const reported = useRef<boolean | undefined>(undefined);
  const report = () => {
    const { y, viewport, content } = metrics.current;
    if (viewport <= 0 || content <= 0) return;
    const atEnd = reachedEnd(y, viewport, content);
    if (reported.current === atEnd) return;
    reported.current = atEnd;
    onReachEndChange?.(atEnd);
  };
  const hasPhotos = paper.kind === "readable" && (paper.entry.photos?.length ?? 0) > 0;

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      onContentSizeChange={(_, height) => {
        metrics.current.content = height;
        report();
      }}
      onLayout={(e) => {
        setMeasured(e.nativeEvent.layout.width);
        metrics.current.viewport = e.nativeEvent.layout.height;
        report();
      }}
      onScroll={(e) => {
        metrics.current.y = e.nativeEvent.contentOffset.y;
        report();
      }}
      scrollEventThrottle={16}
      style={PAPER}
      testID="written-paper"
    >
      {paper.kind === "readable" && (
        <>
          {width > 0 && hasPhotos && (
            <View style={CAROUSEL_FRAME}>
              {/* 날이 바뀌면 새로 마운트해 1장부터 시작한다(CAR10) */}
              <PhotoCarousel
                key={paper.entry.date}
                photos={paper.entry.photos}
                width={width - carouselPadding.horizontal * 2}
              />
            </View>
          )}
          {/* 사진이 없으면 본문이 지면 맨 위 20부터다(보드 `2k`), 있으면 인디케이터 아래 16 */}
          <View
            style={[BODY, { paddingTop: hasPhotos ? body.paddingTop : body.paddingTopAlone }]}
            testID="written-body"
          >
            {paragraphsOf(paper.entry.text).map((text, i) => (
              <AppText key={i} style={PARAGRAPH}>
                {text}
              </AppText>
            ))}
          </View>
        </>
      )}

      {paper.kind === "unreadable" && (
        <View style={[BODY, { paddingTop: body.paddingTopAlone }]} testID="written-unreadable">
          {WRITTEN_DAY_TEXT.unreadableLines.map((line) => (
            <AppText key={line} style={PARAGRAPH}>
              {line}
            </AppText>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

/** 빈 줄로 문단을 가른다 — 전문을 자르지 않는다(FR-014) */
function paragraphsOf(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/* ═══════════════════════════════ 치수 (보드 `2c`) ═══════════════════════════════ */

/** 스트립 아래 20, 화면 좌우 끝까지, 남은 높이 전부 (보드 `2c` — `flex:1; margin-top:20px`) */
const PAPER: ViewStyle = {
  flex: 1,
  marginTop: WRITTEN_DAY.paperGap,
  backgroundColor: WRITTEN_DAY.paper,
};

const CAROUSEL_FRAME: ViewStyle = {
  paddingTop: carouselPadding.top,
  paddingHorizontal: carouselPadding.horizontal,
};

const BODY: ViewStyle = {
  paddingHorizontal: body.paddingH,
  paddingBottom: body.paddingBottom,
  gap: body.paragraphGap,
};

const PARAGRAPH = {
  fontSize: body.fontSize,
  lineHeight: body.fontSize * body.lineHeightRatio,
  color: COLORS.text,
} as const;
