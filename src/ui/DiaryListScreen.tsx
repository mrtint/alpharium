/**
 * 일기 홈 — 보드 `1d`("Day-first — one date fills the screen").
 *
 * 계약: specs/049-home-day-picker/contracts/day-picking.md H1~H8·HS5 (헤더·스트립)
 *       specs/048-diary-home-modernist/contracts/home-screen.md G·B
 *       specs/051-home-written-day/contracts/written-day.md HOME·BAR (쓴 날 읽기)
 *       specs/006-first-diary-app/contracts/screens.md §2 (S1·S7·FR-017a는 그대로 산다)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 이 화면이 원칙 I을 어기기 가장 쉬운 자리다**(006).
 *
 * 저장된 일기를 보여주는 화면이다. **읽기와 쓰기가 같은 동작에 묶이지 않아야 한다**(S1) —
 * 「이미 있으면 그것을 보여준다」는 지름길을 만들면 저장된 것이 생성을 대신한다. 그래서
 * `onWrite`는 **목록을 보지 않는다.** 인자도 없다.
 *
 * **048 — 모양과 자리가 바뀌었다.** 고른 날이 화면 위쪽을 채우고(큰 날짜·요일·상태),
 * 스트립에서 날을 고르며, 신호 줄이 「지금 쓰면 볼 것」을 미리 보이고, 쓰기는 화면 아래
 * 고정 바가 맡는다. 헤더와 목록은 함께 스크롤되고 하단 바만 고정된다(FR-023).
 *
 * **049 — 헤더와 주간 스트립이 보드 `1d` ①②③이 됐다.** 스트립은 고른 날이 든 일~토 주이고
 * 좌우로 넘겨 주를 오간다. 헤더의 날짜는 150ms 크로스페이드로 바뀌고, 상태 줄은 「오늘/이 날
 * 일기를 쓸 수 있어요」 또는 그 일기의 제목이다. 헤더에는 누름 처리가 없다(C7).
 *
 * **판정하지 않는다.** 고른 날은 `writePromptFor()`가, 스트립 칸(오늘·미래·점)은
 * `weekCellsFor()`가, 넘긴 뒤의 날은 `swipeWeek()`(`DiaryHomeScreen`)가, 신호 개수는
 * `DayPreview`가 정해서 온다. 이 화면은 신호 원형(`DaySignals`)도, 하루 경계도, 지금 시각도
 * 모른다(G9·G10).
 *
 * **049 — 고른 날은 언제나 쓸 수 있다**(정오 제한 폐지, 미래는 오늘로 떨어진다). 그래서 쓰기
 * 버튼은 늘 있다. 미래 날의 마지막 방어는 파이프라인의 `isDayWritable` 게이트다.
 *
 * **051 — 홈이 곧 상세다.** 「최근 · n편」 목록과 카드가 사라졌다. 옛 일기에는 스트립(049, 과거 한계
 * 없음)과 달력(050)으로 닿는다(§2 성립 조건). 고른 날에 일기가 있으면 상태 줄 자리에 제목, 신호 줄
 * 자리에 지면(`WrittenDayPaper`), 하단 바에 연회색 「다시 쓰기」다(보드 `2c`·`2g`). 무엇을 그릴지는
 * `paperFor()`가 정해 온다 — 이 화면은 판정하지 않는다. 작성 시각도 문자열로만 받는다(시각을 모른다).
 *
 * **051 수정 — 보드와 어긋난 셋을 고쳤다**(실기기 육안, 저장소 소유자). (1) 요일 아래 칸에 상태 줄·제목이
 * 온다(`1d`·`2c` — 큰 숫자 옆 세로 묶음). (2) 쓴 날은 헤더·스트립이 고정되고 지면만 스크롤된다.
 * (3) 하단 바는 화면 폭 전체의 블록 하나다 — 안 쓴 날은 빨강 「일기 쓰기」, 쓴 날은 연회색 「다시 쓰기」이고
 * 쓴 날의 바는 지면 끝에 닿아야 올라온다(`2c` ④, 짧으면 처음부터 — `2k`). `⋯` 메뉴는 없앴다(설정·개발자
 * 진입점은 설정 화면 구성 과제에서 다시 둔다).
 *
 * **052 — 쓴 날을 읽는 동안 스트립이 접힌다**(보드 `5a`·`5b`). 지면을 아래로 8px 넘게 내리면 스트립과
 * 안내 캡션이 접히고(240ms), 위로 맨 위(2px 이하)에 닿으면 다시 펼쳐진다. **접힘 표시(▾)도, 접힌 날짜 줄을
 * 눌러 펴는 길도 두지 않는다** — 스크롤이 맨 위에 닿는 것이 펼침의 유일한 길이다(저장소 소유자: 제목을 줄여
 * 펼치는 것으로 오해하기 쉽다). 큰 숫자·요일의 누름은 접혔든 펴졌든 050 그대로 달력을 연다.
 * **판정은 `foldAfterScroll()`이 한다**(`src/app/reading-scroll.ts`) — 이 화면은 접힘 상태를 들고 그릴
 * 뿐이다. 안 쓴 날에는 접힘이 없다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, View, type TextStyle, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  dayParts,
  type DiaryListItem,
  type StripCell,
  type SwipeDirection,
  type WritePrompt,
} from "../app/state";
import { foldAfterScroll } from "../app/reading-scroll";
import type { PaperState } from "../app/written-day";
import type { DayDate } from "../config/day-boundary";
import { useFontScale } from "./font-scale";
import { AppText } from "./components/Text";
import { FadeLayer } from "./components/FadeLayer";
import { DayPicker } from "./DayPicker";
import {
  DATE_JUMP,
  dayStateText,
  monthText,
  weekdayLong,
  WRITING_TEXT,
  WRITTEN_DAY_TEXT,
} from "./home-text";
import {
  COLORS,
  MATERIAL_GRID,
  READING_SCROLL,
  SETTINGS,
  TOAST,
  WRITING,
  WRITTEN_DAY,
} from "./theme/tokens";
import { text } from "../i18n/current";
import { SETTINGS_TEXT } from "./settings-text";
import { MaterialGrid, type PreviewState } from "./MaterialGrid";
import { FailureToast } from "./FailureToast";
import { WritingPaper } from "./WritingPaper";
import { WrittenDayPaper } from "./WrittenDayPaper";

export type { PreviewState };

export type DiaryListScreenProps = {
  items: DiaryListItem[];
  /**
   * **목록을 인자로 받지 않는다**(S1). 저장 상태를 볼 수 없으면 그것으로 갈릴 수 없다 —
   * `state.ts`의 `toWriting()`이 인자를 받지 않는 것과 같은 방어다.
   */
  onWrite: () => void;
  /**
   * 고른 날과 그 날에 무슨 일이 일어나는가 (007·009·048).
   *
   * **옵셔널인 것은 호환 때문이다** — 없으면 헤더·스트립·하단 바 없이 목록만 그린다(옛 호출자·
   * 권한 안내 테스트). 실제 홈은 언제나 넘긴다.
   */
  write?: WritePrompt;
  /** 주간 스트립의 7칸 (049). `weekCellsFor()`가 만든다 */
  cells?: readonly StripCell[];
  /** 스트립에서 하루를 고른다 (009 FR-006). `onWrite`는 여전히 하루를 받지 않는다 */
  onSelectDay?: (day: DayDate) => void;
  /** 스트립을 넘겼다 (049). 어느 날이 될지는 부르는 쪽이 정한다 */
  onSwipe?: (direction: SwipeDirection) => void;
  /** 다음 주로 넘길 수 있는가 (049) — 거짓이면 스트립이 튕긴다 */
  canSwipeNext?: boolean;
  /** 자동 판정이 캐릭터를 옮겼을 때의 안내 문구 (029 FR-014). 부모가 만든 문장만 그린다 */
  movedNotice?: string;
  /** 거부된 권한으로 제한되는 기능의 정직한 안내 (021 FR-014). */
  deniedNotices?: readonly string[];
  /**
   * 신호 줄의 사진·다닌 자리 (048 US3). 없으면(통로 없음) 두 칸 「모름」.
   *
   * **`DaySignals`가 아니다** — 개수로 좁혀진 값만 받는다(FR-020).
   */
  preview?: PreviewState;
  /** 「권한이 없어요 ›」를 눌렀다 (053) — 사진 권한 요청. 어느 칸이든 같다(FR-011) */
  onRequestPhoto?: () => void;
  /**
   * 헤더의 큰 숫자·요일을 눌렀다 (050 — 「날짜로 이동」 달력, 보드 `2j`). 무엇을 열지는 부르는 쪽이
   * 정한다. 없으면 누름 처리를 두지 않는다(049처럼).
   */
  onPressDate?: () => void;
  /**
   * 월 라벨 줄 오른쪽의 설정 버튼을 눌렀다 (055, 보드 `6a`). 쓰는 중에도 누를 수 있다 — 설정은 홈 위에 겹쳐지고
   * 쓰기는 멈추지 않는다(FR-006). 없으면 버튼은 그려지되 누름이 없다.
   */
  onOpenSettings?: () => void;
  /**
   * 고른 날의 지면 (051). `paperFor()`가 만든다. 없거나 `unwritten`이면 안 쓴 날(048~050 그대로).
   */
  paper?: PaperState;
  /**
   * 오늘의 일기 작성 시각 문구 (051 보드 `2g`). **문자열만 받는다** — 이 화면은 시각을 모른다(G9).
   * 부르는 쪽이 오늘인가(`cellFor`)와 문구(`writtenAtText`)를 정해 넘긴다.
   */
  writtenAt?: string;
  /**
   * 쓰는 중 (054, 보드 `2b`). 있으면 쓴 날 여부와 무관하게 헤더(잠긴 스트립) + 혼잣말 지면 + 검정 「그만두기」 바를
   * 그린다. **문자열만 받는다** — 진행률·시간·글 조각이 들어올 자리가 없다(원칙 IV, FR-007). 이 모드에서는
   * `onSelectDay`·`onSwipe`·`onPressDate`를 넘겨도 쓰지 않는다 — 잠금은 부르는 쪽의 깜빡임에 기대지 않고 이
   * 화면이 스스로 건다(FR-003·004).
   */
  writing?: { line?: string; name?: string };
  /** 「그만두기」 (054) */
  onStop?: () => void;
  /**
   * 실패 토스트 (054, 보드 `2i`). **문자열만 받는다** — 화면은 갈래·실패 종류·이유를 모른다(FR-016). `id`는
   * 토스트마다 다르다(같은 문구가 연달아 나도 새로 뜬다).
   */
  toast?: { id: number; text: string };
  /** 토스트가 스스로 사라졌거나 쓸어 닫혔다 */
  onDismissToast?: () => void;
};

export function DiaryListScreen({
  items,
  onWrite,
  write,
  cells,
  onSelectDay,
  onSwipe,
  canSwipeNext,
  movedNotice,
  deniedNotices,
  preview,
  onRequestPhoto,
  onPressDate,
  onOpenSettings,
  paper,
  writtenAt,
  writing,
  onStop,
  toast,
  onDismissToast,
}: DiaryListScreenProps) {
  const written = paper !== undefined && paper.kind !== "unwritten" ? paper : undefined;
  // 쓴 날의 지면이 끝에 닿았는가 — **그 날의 값만** 믿는다. 날을 바꾸면 새 지면이 잴 때까지 바는 내려가 있다.
  const [end, setEnd] = useState<{ day: DayDate; atEnd: boolean } | undefined>(undefined);
  const atEnd = write !== undefined && end?.day === write.day && end.atEnd;

  // 052 — 스트립이 접혔는가. **그 날의 값만** 믿는다(날을 바꾸면 펼친 상태로 시작한다, FR-015).
  // 끝 판정(`end`)과 서로 독립이다 — 접힘·펼침이 바를 움직이지 않는다(FR-010).
  const [foldState, setFoldState] = useState<{ day: DayDate; collapsed: boolean } | undefined>(
    undefined,
  );
  const stripHeight = useRef(0);
  const collapsed =
    writing === undefined &&
    write !== undefined &&
    foldState?.day === write.day &&
    foldState.collapsed;
  const motion = useFoldMotion(collapsed);

  // 054 R2 — 쓰는 중에는 052의 접힘·끝 판정을 비운다. 그만두고 쓴 날로 돌아오면 지면이 새로 마운트돼 스크롤이 0인데
  // 접힘이 남아 있으면 스트립이 접힌 채 시작한다. 렌더 중 상태 갱신(effect 안 동기 `setState`는 lint가 막는다).
  if (writing !== undefined && (foldState !== undefined || end !== undefined)) {
    setFoldState(undefined);
    setEnd(undefined);
  }

  // 054 — 토스트는 하단 바의 **잰 높이** + 12 위다(보드 `2i`). 바가 내려가 있어도(`RewriteBar`) `onLayout` 높이는
  // 그대로라 바가 올라와도 겹치지 않는다. 재기 전에는 최소 높이다.
  const [barHeight, setBarHeight] = useState<number>(WRITTEN_DAY.bar.minHeight);
  const toastNode =
    toast !== undefined ? (
      <FailureToast
        bottom={barHeight + TOAST.gapAboveBar}
        key={toast.id}
        onDismiss={() => onDismissToast?.()}
        text={toast.text}
      />
    ) : null;

  // 스트립과 안내 캡션 — 안 쓴 날에는 헤더 안에 그대로, 쓴 날에는 지면 위에 덮는 판 안에 놓인다(052).
  const stripBlock =
    write === undefined ? null : writing !== undefined ? (
      // 054 — 쓰는 중: 스트립만 35%로 흐리고 누름·스와이프·접근성에서 뺀다(보드 `2b`). 안내 캡션(옮김·거부
      // 권한)은 정직한 정보라 흐리게 하지 않는다(research R2).
      <>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={{ opacity: WRITING.stripLockedOpacity }}
          testID="home-strip-lock"
        >
          <DayPicker canSwipeNext={false} cells={cells ?? []} onSelect={() => {}} />
        </View>
        <Notices deniedNotices={deniedNotices} movedNotice={movedNotice} />
      </>
    ) : (
      <>
        <DayPicker
          canSwipeNext={canSwipeNext}
          cells={cells ?? []}
          onSelect={onSelectDay ?? (() => {})}
          onSwipe={onSwipe}
        />
        <Notices deniedNotices={deniedNotices} movedNotice={movedNotice} />
      </>
    );

  const header =
    write !== undefined ? (
      <Header
        cells={cells ?? []}
        items={items}
        onOpenSettings={onOpenSettings}
        onPressDate={writing !== undefined ? undefined : onPressDate}
        paper={paper}
        stripBlock={stripBlock}
        stripOverlaid={writing === undefined && written !== undefined}
        writing={writing !== undefined}
        write={write}
      />
    ) : null;

  // 054 — 쓰는 중. 쓴 날 분기·안 쓴 날 분기보다 먼저다(다시 쓰는 날도 같은 그림 — 보드 `2b`).
  if (write !== undefined && writing !== undefined) {
    return (
      <View style={ROOT}>
        <View style={FIXED_HEADER}>{header}</View>
        <WritingPaper line={writing.line} name={writing.name} />
        <View
          onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
          style={REWRITE_SLOT}
          testID="stop-bar"
        >
          <StopBar onStop={onStop} />
        </View>
        {toastNode}
      </View>
    );
  }

  // 051 수정 — 쓴 날은 헤더·스트립이 고정되고 지면만 스크롤된다(보드 `2c`). 바는 지면 위에 겹쳐
  // 아래에서 올라온다 — 지면 본문 아래 여백(104)이 바를 비켜 마지막 문단을 가리지 않는다.
  if (write !== undefined && written !== undefined) {
    // 내려간 바가 아래 안전 영역(내비게이션 바) 뒤로 비치지 않게 자른다 — 실기기 관측.
    return (
      <View style={[ROOT, { overflow: "hidden" }]}>
        <View style={FIXED_HEADER}>{header}</View>
        {/*
          052 — **지면 프레임은 움직이지 않는다.** 스트립은 지면 위에 덮는 판(`StripOverlay`)이고, 접힘은
          판의 높이와 지면 내용 맨 위 스페이서(`FoldSpacer`)가 함께 줄어드는 것으로 만든다. 프레임이
          손가락 아래에서 움직이면 안드로이드가 그것을 드래그로 읽어 접힘·펼침이 되풀이됐다.
        */}
        <View style={{ flex: 1 }}>
          <WrittenDayPaper
            // 날마다 새 지면 — 맨 위에서 시작하고 끝 판정을 새로 잰다
            key={write.day}
            onReachEndChange={(value) => setEnd({ day: write.day, atEnd: value })}
            onScrollSample={(sample) => {
              const next = foldAfterScroll(collapsed, {
                ...sample,
                stripHeight: stripHeight.current,
              });
              if (next !== collapsed) setFoldState({ day: write.day, collapsed: next });
            }}
            paper={written}
            topSpacer={<FoldSpacer motion={motion} />}
          />
          <StripOverlay
            collapsed={collapsed}
            motion={motion}
            onMeasure={(height) => {
              stripHeight.current = height;
            }}
          >
            {stripBlock}
          </StripOverlay>
        </View>
        <RewriteBar
          onLayoutHeight={setBarHeight}
          onWrite={onWrite}
          visible={atEnd}
          writtenAt={writtenAt}
        />
        {toastNode}
      </View>
    );
  }

  // 053 — 안 쓴 날은 보드 `1d`대로: 헤더(고정 여백) 아래에 화면 바닥까지 채우는 지면이고, 「일기 쓰기」 바는
  // 그 위에 겹쳐 바닥에 붙는다(지면 아래 여백 120이 바를 비킨다). 큰 글꼴에서 넘치면 함께 스크롤된다.
  if (write !== undefined) {
    return (
      <View style={ROOT}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          style={{ flex: 1, backgroundColor: COLORS.bg }}
        >
          <View style={FIXED_HEADER}>{header}</View>
          <View style={MATERIAL_PAPER} testID="material-paper">
            <MaterialGrid onRequestPhoto={onRequestPhoto} preview={preview} />
          </View>
        </ScrollView>
        <View
          onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
          style={REWRITE_SLOT}
          testID="write-bar"
        >
          <WriteBar onWrite={onWrite} />
        </View>
        {toastNode}
      </View>
    );
  }

  return (
    <View style={ROOT}>
      <ScrollView
        contentContainerStyle={SCROLL_CONTENT}
        style={{ flex: 1, backgroundColor: COLORS.bg }}
      >
        {/* 헤더가 없는 옛 호출에서도 거부 안내는 보인다(021) */}
        <Notices deniedNotices={deniedNotices} movedNotice={movedNotice} />
      </ScrollView>
    </View>
  );
}

/* ═══════════════════════════════ 헤더 ═══════════════════════════════ */

function Header({
  write,
  items,
  cells,
  onOpenSettings,
  onPressDate,
  paper,
  stripOverlaid,
  stripBlock,
  writing,
}: {
  write: WritePrompt;
  items: readonly DiaryListItem[];
  cells: readonly StripCell[];
  onOpenSettings?: () => void;
  onPressDate?: () => void;
  paper?: PaperState;
  /** 052 — 쓴 날이면 스트립을 부모가 지면 위 판에 그린다. 안 쓴 날은 여기서 그대로 그린다 */
  stripOverlaid: boolean;
  /** 주간 스트립 + 안내 캡션. 안 쓴 날은 여기서 그리고, 쓴 날은 부모가 지면 위 판에 그린다 */
  stripBlock: ReactNode;
  /** 054 — 쓰는 중이면 상태 줄이 「쓰는 중」(빨강)이고 제목은 보이지 않는다 */
  writing: boolean;
}) {
  // 오늘인가는 스트립 칸이 이미 안다 — 화면은 지금 시각을 읽지 않는다.
  const isToday = cells.some((cell) => cell.selected && cell.isToday);
  const item = items.find((entry) => entry.day === write.day);
  // 051 — 제목은 읽은 일기에서, 읽는 중이면 목록 요약에서(같은 값) — 읽기가 끝날 때 상태 줄 모양이
  // 튀지 않게. 목록은 읽혔는데 고른 순간 깨졌으면(`unreadable`) 상태 줄도 「읽을 수 없어요」다.
  const title = writing
    ? undefined
    : paper?.kind === "readable"
      ? paper.entry.title
      : paper?.kind === "loading"
        ? item?.title
        : undefined;
  const stateItem =
    paper?.kind === "unreadable" && item !== undefined ? { ...item, readable: false } : item;
  return (
    <View>
      {/* ① 월 라벨 — 표시만 한다(누름 없음). **고른 날의 달**이다(048 Q2, 049 H1·H2) */}
      {/*
        055 — 오른쪽은 설정 버튼(보드 `6a`). 048의 「일기」 글자 자리다. 스트립의 일기 점과 같은 어휘의 5px 네모 셋.
        이 줄은 안 쓴 날·쓴 날·접힘·쓰는 중 모두 같은 자리에 그려진다(헤더는 접히지 않는다, 052).
      */}
      <View style={MONTH_ROW}>
        <AppText style={[KICKER, { color: COLORS.accent }]} testID="home-month">
          {monthText(write.day)}
        </AppText>
        <SettingsButton onPress={onOpenSettings} />
      </View>

      {/*
        ② 날짜 헤더. **큰 숫자·요일만** 누를 수 있다 — 「날짜로 이동」 달력을 연다(050 FR-012, 보드
        `2j`). 월 라벨·상태 줄은 누를 수 없다. 스트립이 접혀 있어도 같다(052 — 접힌 날짜 줄을 눌러 펴는
        길은 두지 않는다). 크로스페이드 겹은 `pointerEvents="none"`이라 누름을 가로채지 않는다.
      */}
      {/*
        보드 `1d`·`2c` — 큰 숫자 오른쪽에 세로 묶음(요일 / 상태 줄 또는 제목), 아래끝 맞춤. 051 수정 전에는
        상태 줄이 숫자 아래 따로 한 줄이었다(보드와 어긋남).
      */}
      <View style={DATE_ROW}>
        <DateJump onPress={onPressDate} primary>
          <DayHeading day={write.day} part="number" />
        </DateJump>
        <View style={DATE_COLUMN}>
          <DateJump onPress={onPressDate}>
            <DayHeading day={write.day} part="weekday" />
          </DateJump>
          {/*
            051 — 읽을 수 있는 쓴 날에 제목이 있으면 상태 줄 자리에 제목(보드 `2c` — 15/700. 052 — 한 줄 말줄임: 줄이 바뀌면
            날짜 영역이 넓어져 UI를 해친다(저장소 소유자),
            누름 없음). 제목 없음·읽을 수 없음은 지금의 상태 줄 그대로다(FR-007).
          */}
          {writing ? (
            <AppText style={WRITING_STATE} testID="home-day-state">
              {WRITING_TEXT.kicker}
            </AppText>
          ) : title !== undefined ? (
            <AppText
              ellipsizeMode="tail"
              numberOfLines={1}
              style={DAY_TITLE}
              testID="home-day-title"
            >
              {title}
            </AppText>
          ) : (
            <AppText style={DAY_STATE} testID="home-day-state">
              {dayStateText(stateItem, isToday)}
            </AppText>
          )}
        </View>
      </View>

      {/* ③ 주간 스트립 — 안 쓴 날은 여기, 쓴 날은 지면 위 판(052, 안내 캡션과 함께 접힌다) */}
      {stripOverlaid ? null : stripBlock}
    </View>
  );
}

/**
 * 스트립 접힘의 움직임 값 셋 — 덮는 판(`StripOverlay`)과 내용 맨 위 스페이서(`FoldSpacer`)가 **같은 값**을
 * 본다(052). 그래야 판이 줄어드는 만큼 지면 내용이 똑같이 올라가 사이가 뜨거나 겹치지 않는다.
 *
 * `measured`는 접히는 영역의 **잰 자연 높이**다(0이면 아직 못 쟀다 — 그동안은 짐작값 `stripEstimate`).
 * 시작값은 마운트 때의 상태에서 주고, 상태가 바뀌면 **현재 값에서** 옮긴다 — effect로 시작값을 되돌리면
 * 첫 프레임이 샌다(049).
 */
function useFoldMotion(collapsed: boolean) {
  const progress = useSharedValue(collapsed ? 0 : 1);
  const opacity = useSharedValue(collapsed ? 0 : 1);
  const measured = useSharedValue(0);
  useEffect(() => {
    const target = collapsed ? 0 : 1;
    progress.value = withTiming(target, {
      duration: READING_SCROLL.foldMs,
      easing: Easing.out(Easing.ease),
    });
    opacity.value = withTiming(target, {
      duration: READING_SCROLL.fadeMs,
      easing: Easing.out(Easing.ease),
    });
  }, [collapsed, progress, opacity]);
  // 잰 높이를 넣는 통로 — 공유값은 이 훅 안에서만 쓴다(props로 받은 값을 고치지 않는다, react-hooks 규칙).
  const setMeasured = (height: number) => {
    measured.value = height;
  };
  return { progress, opacity, measured, setMeasured };
}

type FoldMotion = ReturnType<typeof useFoldMotion>;

/** 덮는 판·스페이서의 높이 — 스트립 아래 간격(20) + 펼침 진행도 × 스트립의 자연 높이 */
function coverHeight(motion: FoldMotion): number {
  "worklet";
  const natural = motion.measured.value > 0 ? motion.measured.value : READING_SCROLL.stripEstimate;
  return WRITTEN_DAY.paperGap + motion.progress.value * natural;
}

/**
 * 스트립과 안내 캡션을 지면 위에 덮는 판 (052, 보드 `5a` ②·`5b`).
 *
 * **지면 프레임 위에 절대 배치**로 얹힌다 — 지면의 프레임은 접힘으로 움직이지 않는다(실기기: 프레임이
 * 손가락 아래에서 움직이면 접힘·펼침이 되풀이됐다). 판은 불투명이고 높이가 늘 `간격 20 + 진행도 × 자연
 * 높이`이므로 접혀도 스트립 자리 아래 20의 간격이 남고, 그 밑으로 스크롤된 지면 내용이 가려진다.
 * 안쪽 내용은 **절대 배치**라 바깥 높이에 눌리지 않아 잰 높이가 늘 자연 높이다(research R1 — 눌리면 잰
 * 높이가 줄어드는 되먹임이 생겼다). 접히면 누름·스와이프·접근성에서 빠진다(R6).
 *
 * **jest는 배선만 본다**(C9) — 실제로 접히는 움직임은 실기기 녹화로 본다.
 */
function StripOverlay({
  collapsed,
  motion,
  onMeasure,
  children,
}: {
  collapsed: boolean;
  motion: FoldMotion;
  onMeasure: (height: number) => void;
  children: ReactNode;
}) {
  const { opacity, setMeasured } = motion;
  const cover = useAnimatedStyle(() => ({ height: coverHeight(motion) }));
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden={collapsed}
      importantForAccessibility={collapsed ? "no-hide-descendants" : "auto"}
      pointerEvents={collapsed ? "none" : "auto"}
      style={[OVERLAY, cover]}
      testID="home-strip-fold"
    >
      <Animated.View
        onLayout={(e) => {
          const height = e.nativeEvent.layout.height;
          if (height <= 0) return;
          setMeasured(height);
          onMeasure(height);
        }}
        style={[OVERLAY_INNER, fade]}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

/** 지면 내용 맨 위에서 덮는 판만큼 자리를 잡는 스페이서 — 판과 같은 높이로 함께 움직인다 */
function FoldSpacer({ motion }: { motion: FoldMotion }) {
  const style = useAnimatedStyle(() => ({ height: coverHeight(motion) }));
  return <Animated.View style={style} testID="home-fold-spacer" />;
}

/**
 * 큰 숫자·요일의 누름 — 「날짜로 이동」 달력(050 FR-012, 보드 `2j`). 두 자리로 나뉜 까닭은 그 사이 세로
 * 묶음에 **누를 수 없는** 상태 줄·제목이 끼기 때문이다(051 수정). 스크린 리더에는 숫자 쪽 하나만
 * 버튼으로 알린다(`primary`) — 같은 동작이 두 번 읽히지 않게.
 */
function DateJump({
  onPress,
  primary,
  children,
}: {
  onPress?: () => void;
  primary?: boolean;
  children: ReactNode;
}) {
  // ★ 큰 숫자(`primary`)는 누를 수 없을 때도 아래 정렬을 그대로 둔다. 요일처럼 `flex-start`를 주면 접힌 동안
  // 숫자가 줄 위쪽으로 튀어 올랐다(실기기 — 접힐 때 선택한 날짜가 위아래로 움직임, 052).
  if (onPress === undefined) {
    return primary ? (
      <View>{children}</View>
    ) : (
      <View style={{ alignSelf: "flex-start" }}>{children}</View>
    );
  }
  return primary ? (
    <Pressable
      accessibilityLabel={DATE_JUMP.title}
      accessibilityRole="button"
      onPress={onPress}
      testID="home-date-button"
    >
      {children}
    </Pressable>
  ) : (
    <Pressable
      accessible={false}
      importantForAccessibility="no"
      onPress={onPress}
      style={{ alignSelf: "flex-start" }}
      testID="home-date-weekday"
    >
      {children}
    </Pressable>
  );
}

/** 날이 바뀔 때 큰 숫자·요일이 겹쳐 바뀌는 시간 (보드 `1d` ② — 150ms) */
const CROSSFADE_MS = 150;

/**
 * 큰 날짜·요일 — 날이 바뀌면 **150ms 크로스페이드**(049 FR-013, research R8).
 *
 * 두 겹으로 그린다: 이전 날(절대 배치, 1 → 0)과 새 날(0 → 1). 레이아웃 애니메이션
 * (`entering`/`exiting`)을 쓰지 않는 까닭은 나가는 뷰가 흐름에 남아 순간 높이가 두 배가 될 수
 * 있어서다(짐작 — 확인하지 않았다). 두 겹 절대 배치는 높이가 새 날 하나로 고정된다.
 *
 * ★ **겹마다 새로 마운트하고, 시작 투명도를 마운트 값으로 준다**(`FadeLayer`, `key`가 날).
 * 처음에는 한 공유값을 effect에서 0으로 되돌렸는데, effect는 **첫 프레임이 그려진 뒤에** 돌아
 * 그 한 프레임에 새 날(1)이 보였다가 → 이전 날로 돌아갔다가 → 다시 새 날로 바뀌었다(실기기 —
 * 「넘기는 중에 숫자가 빠르게 여러 번 바뀐다」). 마운트 값은 첫 프레임부터 맞다.
 *
 * **jest는 배선만 본다**(C9) — 겹이 함께 그려지는지까지. 실제로 부드럽게 겹치는지는 실기기 D3.
 */
function DayHeading({ day, part }: { day: DayDate; part: DayPart }) {
  const [shown, setShown] = useState<{ day: DayDate; previous: DayDate | null }>({
    day,
    previous: null,
  });
  // 렌더 중 상태 갱신 — 날이 바뀐 그 렌더에서 이전 날을 기억한다(React 문서의 「이전 props
  // 저장」 방식). effect 안의 동기 setState는 lint가 막는다(048 관측).
  if (shown.day !== day) setShown({ day, previous: shown.day });

  return (
    <View>
      {shown.previous !== null && (
        <FadeLayer
          durationMs={CROSSFADE_MS}
          from={1}
          key={`out-${shown.previous}-${shown.day}`}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
          testID={part === "number" ? "home-day-fade-out" : "home-weekday-fade-out"}
          to={0}
        >
          <DayFace day={shown.previous} part={part} />
        </FadeLayer>
      )}
      {/* 앱을 처음 열 때(이전 날 없음)는 나타나는 효과 없이 바로 보인다 */}
      <FadeLayer
        durationMs={CROSSFADE_MS}
        from={shown.previous === null ? 1 : 0}
        key={`in-${shown.day}`}
        to={1}
      >
        <DayFace day={shown.day} part={part} testIDs />
      </FadeLayer>
    </View>
  );
}

/** 헤더 날짜의 두 조각 — 큰 숫자와 요일. 따로 겹쳐 바뀐다(사이에 상태 줄이 끼므로) */
type DayPart = "number" | "weekday";

function DayFace({ day, part, testIDs }: { day: DayDate; part: DayPart; testIDs?: boolean }) {
  const { date, weekday } = dayParts(day);
  const scale = useFontScale();
  if (part === "weekday") {
    return (
      <AppText numberOfLines={1} style={WEEKDAY} testID={testIDs ? "home-weekday" : undefined}>
        {weekdayLong(weekday)}
      </AppText>
    );
  }
  // 숫자 칸은 언제나 두 자리 폭이다 — 「6」과 「30」 사이를 넘길 때 요일이 옆으로 밀리지 않게
  // (실기기, 사용자 요청). 보이지 않는 「00」이 폭을 잡고, 실제 숫자는 그 왼쪽에 겹친다.
  return (
    <View>
      <AppText
        accessibilityElementsHidden
        allowFontScaling={false}
        importantForAccessibility="no-hide-descendants"
        style={[DAY_NUMBER, scaledNumeral(scale), { opacity: 0 }]}
      >
        {DAY_NUMBER_WIDTH}
      </AppText>
      <AppText
        allowFontScaling={false}
        style={[DAY_NUMBER, scaledNumeral(scale), { position: "absolute", left: 0, bottom: 0 }]}
        testID={testIDs ? "home-day-number" : undefined}
      >
        {String(date)}
      </AppText>
    </View>
  );
}

/**
 * 안내 캡션 — 캐릭터 옮김(029)·거부 권한(021). 있을 때만.
 *
 * 049 — 되돌림(009) 캡션을 걷어냈다(FR-022a). 지난 날을 모두 고를 수 있어 고른 날이 범위 밖으로
 * 밀려나는 일이 없다 — 도달할 수 없는 갈래다.
 */
function Notices({
  movedNotice,
  deniedNotices,
}: {
  movedNotice?: string;
  deniedNotices?: readonly string[];
}) {
  const denied = deniedNotices ?? [];
  if (movedNotice === undefined && denied.length === 0) return null;

  return (
    <View style={{ gap: 4, marginTop: 12 }}>
      {movedNotice !== undefined && <AppText variant="caption">{movedNotice}</AppText>}
      {denied.length > 0 && (
        <View style={{ gap: 4 }} testID="denied-notices">
          {denied.map((notice) => (
            <AppText key={notice} variant="caption">
              {notice}
            </AppText>
          ))}
        </View>
      )}
    </View>
  );
}

/* ═══════════════════════════════ 하단 바 ═══════════════════════════════ */

/**
 * 쓰기 바 — 화면 폭 전체의 빨강 블록 「일기 쓰기」 (보드 `1d`, 051 수정).
 *
 * 048~050은 `⋯` 메뉴 옆에 「일기 쓰기 | n일」 조각을 두었다. 보드 `1d`의 바는 화면 바닥에 붙은 블록
 * 하나이고 날짜 조각도 메뉴도 없다 — 051 수정에서 보드대로 되돌렸다(메뉴는 저장소 소유자 지시로 없앰).
 *
 * 049 — 고른 날은 언제나 쓸 수 있다(정오 제한 폐지, 미래는 오늘로 떨어진다).
 */
function WriteBar({ onWrite }: { onWrite: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onWrite()}
      style={[BAR, { backgroundColor: COLORS.accent }]}
      testID="write-button"
    >
      <AppText style={[BAR_TEXT, { color: COLORS.accentForeground }]}>
        {text().home.writeButton}
      </AppText>
    </Pressable>
  );
}

/**
 * 쓰는 중의 하단 바 — 검정 전폭 「그만두기」 (054 보드 `2b`, FR-008).
 *
 * 배경 `text`(검정), 글자 `bg`. 누르면 바로 멈추고 쓰기 전 상태로 돌아간다 — 그 판단은 부르는 쪽이 한다.
 */
function StopBar({ onStop }: { onStop?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onStop?.()}
      style={[BAR, { backgroundColor: COLORS.text }]}
      testID="stop-button"
    >
      <AppText style={[BAR_TEXT, { color: COLORS.bg }]}>{WRITING_TEXT.stop}</AppText>
    </Pressable>
  );
}

/**
 * 쓴 날의 하단 바 — 연회색 「다시 쓰기」 (051 보드 `2c`·`2g`, FR-017~FR-020).
 *
 * **testID는 안 쓴 날과 같은 `write-button`이다**(research R9) — 같은 쓰기 동작(`onWrite`)이다. 누르면
 * 050의 덮어쓰기 확인(`2d`)이 뜬다 — 그 판단은 부르는 쪽(`startWriting`)이 한다.
 *
 * **평소엔 내려가 있고 지면 끝에 닿으면 아래에서 올라온다**(보드 `2c` ④, `5b` 240ms ease-out). 본문이
 * 짧으면 처음부터 끝이라 처음부터 보인다(`2k`). 051 처음 구현은 늘 보였다 — 보드와 어긋나 고쳤다.
 * 내려가 있는 동안은 누를 수 없고 접근성 트리에서도 빠진다. 작성 시각은 오늘의 일기에만 문자열로 온다.
 * 움직임은 jest가 보지 못한다(C9) — 실기기에서 본다.
 */
function RewriteBar({
  onWrite,
  writtenAt,
  visible,
  onLayoutHeight,
}: {
  onWrite: () => void;
  writtenAt?: string;
  visible: boolean;
  /** 잰 높이를 위로 알린다 — 토스트가 바의 자리 기준으로 놓인다 (054) */
  onLayoutHeight?: (height: number) => void;
}) {
  const shown = useSharedValue(visible ? 1 : 0);
  const height = useSharedValue<number>(WRITTEN_DAY.bar.minHeight);
  useEffect(() => {
    shown.value = withTiming(visible ? 1 : 0, {
      duration: WRITTEN_DAY.bar.slideMs,
      easing: Easing.out(Easing.ease),
    });
  }, [visible, shown]);
  const slide = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - shown.value) * height.value }],
  }));

  return (
    <Animated.View
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
      onLayout={(e) => {
        height.value = e.nativeEvent.layout.height;
        onLayoutHeight?.(e.nativeEvent.layout.height);
      }}
      pointerEvents={visible ? "auto" : "none"}
      style={[REWRITE_SLOT, slide]}
      testID="rewrite-bar"
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => onWrite()}
        style={[BAR, { backgroundColor: WRITTEN_DAY.rewriteBar }]}
        testID="write-button"
      >
        <AppText style={[BAR_TEXT, { color: COLORS.text }]}>{WRITTEN_DAY_TEXT.rewrite}</AppText>
        {writtenAt !== undefined && (
          <AppText style={WRITTEN_AT} testID="written-at">
            {writtenAt}
          </AppText>
        )}
      </Pressable>
    </Animated.View>
  );
}

/* ═══════════════════════════════ 치수 ═══════════════════════════════ */
/*
 * 치수는 보드 `1d`의 값을 옮긴 레이아웃 숫자다(FR-038, 032·047 관례). 색은 `COLORS.*`만.
 * accent 위 글자는 `accentForeground`(보드의 오프화이트).
 */

const ROOT = { flex: 1, backgroundColor: COLORS.bg } as const;

const MONTH_ROW: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  minHeight: 16,
};

/**
 * 설정 버튼 — 점 셋(5×5, 간격 4, 본문 글자 색), 누름 44×44를 오른쪽 위 모서리 쪽으로(보드 음수 여백 -14 -12 -14 0).
 * 스크린리더 라벨 「설정」(FR-003).
 */
function SettingsButton({ onPress }: { onPress?: () => void }) {
  const { dot, gap, hit, margin } = SETTINGS.entry;
  return (
    <Pressable
      accessibilityLabel={SETTINGS_TEXT.entryLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={{
        width: hit,
        height: hit,
        marginTop: margin.top,
        marginRight: margin.right,
        marginBottom: margin.bottom,
        alignItems: "center",
        justifyContent: "center",
      }}
      testID="home-settings"
    >
      <View style={{ flexDirection: "row", gap }} testID="home-settings-dots">
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: dot, height: dot, backgroundColor: COLORS.text }} />
        ))}
      </View>
    </Pressable>
  );
}

const KICKER = {
  fontSize: 11,
  letterSpacing: 1.1,
  fontWeight: "600",
} as const;

/**
 * 보드 `1d` ② — 62/800, 자간 -.05em, 고정폭 숫자 (049). 보드는 줄높이 .85(= 53)지만 iOS는
 * 줄높이가 글자 높이보다 작으면 윗부분을 잘라 내므로 글자 크기(62)와 같게 잡는다.
 */
/** 큰 날짜 칸의 폭을 잡는 글자 — 한 달의 가장 긴 날(두 자리). 숫자는 `tabular-nums`라 폭이 같다 */
const DAY_NUMBER_WIDTH = "00";

/** 큰 날짜 숫자의 크기·줄높이·자간에 글꼴 배율을 곱한다(선형 — `font-scale.ts`) */
const scaledNumeral = (scale: number): TextStyle => ({
  fontSize: DAY_NUMBER.fontSize! * scale,
  lineHeight: DAY_NUMBER.lineHeight! * scale,
  letterSpacing: DAY_NUMBER.letterSpacing! * scale,
});

const DAY_NUMBER: TextStyle = {
  fontSize: 62,
  lineHeight: 62,
  fontWeight: "800",
  letterSpacing: -3.1,
  color: COLORS.text,
  fontVariant: ["tabular-nums"],
};

/** 요일 16/700 */
const WEEKDAY: TextStyle = { fontSize: 16, fontWeight: "700", color: COLORS.text };

/** 상태 줄 13, 보조색 (보드 `1d` — 요일 아래) */
const DAY_STATE: TextStyle = { fontSize: 13, color: COLORS.textMuted };

/** 쓰는 중 상태 줄 13/600, accent (보드 `2b`) */
const WRITING_STATE: TextStyle = { fontSize: 13, fontWeight: "600", color: COLORS.accent };

/** 큰 숫자와 세로 묶음 — 아래끝 맞춤, 간격 12 (보드 `1d` ②) */
const DATE_ROW: ViewStyle = { flexDirection: "row", alignItems: "flex-end", gap: 12, marginTop: 4 };

/** 지면 위에 덮는 판 — 지면 프레임 맨 위에 절대 배치, 불투명, 좌우 여백은 헤더와 같다(20) (052) */
const OVERLAY: ViewStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  overflow: "hidden",
  backgroundColor: COLORS.bg,
};

/** 판 안쪽 — 절대 배치라 바깥 높이에 눌리지 않는다(잰 높이가 늘 자연 높이) */
const OVERLAY_INNER: ViewStyle = { position: "absolute", top: 0, left: 20, right: 20 };

/** 요일 / 상태 줄·제목 — 간격 2, 아래 2 (보드 `1d`·`2c`) */
const DATE_COLUMN: ViewStyle = { flex: 1, minWidth: 0, gap: 2, paddingBottom: 2 };

/** 안 쓴 날의 홈 스크롤 여백 */
const SCROLL_CONTENT: ViewStyle = {
  flexGrow: 1,
  paddingHorizontal: 20,
  paddingTop: 24,
  paddingBottom: 24,
};

/** 쓴 날의 고정 헤더 — 홈 스크롤과 같은 여백 */
const FIXED_HEADER: ViewStyle = { paddingHorizontal: 20, paddingTop: 24 };

/** 안 쓴 날의 지면 — 화면 바닥까지 채운다. 아래 120은 하단 바가 덮는 자리 (보드 `1d`) */
const MATERIAL_PAPER: ViewStyle = {
  flexGrow: 1,
  marginTop: WRITTEN_DAY.paperGap,
  backgroundColor: WRITTEN_DAY.paper,
  paddingTop: MATERIAL_GRID.paperPadding.top,
  paddingHorizontal: MATERIAL_GRID.paperPadding.horizontal,
  paddingBottom: MATERIAL_GRID.paperPadding.bottom,
};

/**
 * 하단 바 — 화면 폭 전체, 위 좌우 반경 6, 최소 높이 64, 글자 17/800 (보드 `1d`·`2c`). 아래 안전 영역은
 * 루트 `SafeAreaView`가 비킨다.
 */
const BAR: ViewStyle = {
  minHeight: WRITTEN_DAY.bar.minHeight,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderTopLeftRadius: WRITTEN_DAY.bar.radius,
  borderTopRightRadius: WRITTEN_DAY.bar.radius,
};

const BAR_TEXT = {
  fontSize: WRITTEN_DAY.rewrite.fontSize,
  fontWeight: WRITTEN_DAY.rewrite.fontWeight,
} as const;

/** 쓴 날의 바 자리 — 지면 위에 겹쳐 화면 바닥에 붙는다 */
const REWRITE_SLOT: ViewStyle = { position: "absolute", left: 0, right: 0, bottom: 0 };

/** 051 — 쓴 날 헤더의 제목 (보드 `2c` — 15/700 본문색, 상태 줄과 같은 자리) */
const DAY_TITLE: TextStyle = {
  fontSize: WRITTEN_DAY.title.fontSize,
  fontWeight: WRITTEN_DAY.title.fontWeight,
  color: COLORS.text,
};

const WRITTEN_AT = {
  fontSize: WRITTEN_DAY.writtenAt.fontSize,
  fontWeight: WRITTEN_DAY.writtenAt.fontWeight,
  marginTop: WRITTEN_DAY.writtenAt.gap,
  color: COLORS.textMuted,
} as const;
