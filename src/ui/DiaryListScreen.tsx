/**
 * 일기 홈 — 보드 `1d`("Day-first — one date fills the screen").
 *
 * 계약: specs/049-home-day-picker/contracts/day-picking.md H1~H8·HS5 (헤더·스트립)
 *       specs/048-diary-home-modernist/contracts/home-screen.md G·B, US5 카드
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
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState, type ReactNode } from "react";
import { Pressable, ScrollView, View, type TextStyle, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import {
  dayParts,
  type CountHint,
  type DayPreview,
  type DiaryListItem,
  type PhotoHint,
  type StripCell,
  type SwipeDirection,
  type WritePrompt,
} from "../app/state";
import type { DayDate } from "../config/day-boundary";
import { AppText } from "./components/Text";
import { DayPicker } from "./DayPicker";
import { BAR_HEIGHT, HomeMenu, type HomeMenuItem } from "./HomeMenu";
import { cardDateText, dayOfMonthText, dayStateText, monthText, weekdayLong } from "./home-text";
import { COLORS } from "./theme/tokens";

/** 신호 줄의 사진·다닌 자리 칸 — 읽는 중이거나, 다 읽었거나 */
export type PreviewState = { kind: "loading"; day: DayDate } | DayPreview;

export type DiaryListScreenProps = {
  items: DiaryListItem[];
  onOpen: (item: DiaryListItem) => void;
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
  /** `⋯` 메뉴 항목 (048 US4). 무엇을 넣을지는 부르는 쪽이 정한다 */
  menuItems?: readonly HomeMenuItem[];
};

export function DiaryListScreen({
  items,
  onOpen,
  onWrite,
  write,
  cells,
  onSelectDay,
  onSwipe,
  canSwipeNext,
  movedNotice,
  deniedNotices,
  preview,
  menuItems,
}: DiaryListScreenProps) {
  return (
    <View style={ROOT}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 }}
        style={{ flex: 1, backgroundColor: COLORS.bg }}
      >
        {write !== undefined && (
          <Header
            canSwipeNext={canSwipeNext}
            cells={cells ?? []}
            deniedNotices={deniedNotices}
            items={items}
            movedNotice={movedNotice}
            onSelectDay={onSelectDay}
            onSwipe={onSwipe}
            preview={preview}
            write={write}
          />
        )}

        {/* 헤더가 없는 옛 호출에서도 거부 안내는 보인다(021) */}
        {write === undefined && <Notices deniedNotices={deniedNotices} movedNotice={movedNotice} />}

        <DiaryList items={items} onOpen={onOpen} />
      </ScrollView>

      {write !== undefined && (
        <View style={BOTTOM_BAR} testID="home-bottom-bar">
          {menuItems !== undefined && menuItems.length > 0 ? (
            <HomeMenu items={menuItems} />
          ) : (
            <View />
          )}
          <WriteBar onWrite={onWrite} write={write} />
        </View>
      )}
    </View>
  );
}

/* ═══════════════════════════════ 헤더 ═══════════════════════════════ */

function Header({
  write,
  items,
  cells,
  onSelectDay,
  onSwipe,
  canSwipeNext,
  movedNotice,
  deniedNotices,
  preview,
}: {
  write: WritePrompt;
  items: readonly DiaryListItem[];
  cells: readonly StripCell[];
  onSelectDay?: (day: DayDate) => void;
  onSwipe?: (direction: SwipeDirection) => void;
  canSwipeNext?: boolean;
  movedNotice?: string;
  deniedNotices?: readonly string[];
  preview?: PreviewState;
}) {
  // 오늘인가는 스트립 칸이 이미 안다 — 화면은 지금 시각을 읽지 않는다.
  const isToday = cells.some((cell) => cell.selected && cell.isToday);
  const item = items.find((entry) => entry.day === write.day);

  return (
    <View>
      {/* ① 월 라벨 — 표시만 한다(누름 없음). **고른 날의 달**이다(048 Q2, 049 H1·H2) */}
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <AppText style={[KICKER, { color: COLORS.accent }]} testID="home-month">
          {monthText(write.day)}
        </AppText>
        <AppText style={[KICKER, { color: COLORS.textMuted }]} testID="home-kicker">
          일기
        </AppText>
      </View>

      {/*
        ② 날짜 헤더. **누름 처리를 두지 않는다**(049 FR-016, C7) — 탭하면 달력을 여는 것은
        「대화상자 기반」, 접힌 스트립을 펼치는 것은 「읽기 스크롤」 조각이다.
      */}
      <DayHeading day={write.day} />
      <AppText style={DAY_STATE} testID="home-day-state">
        {dayStateText(item, isToday)}
      </AppText>

      {/* ③ 주간 스트립 */}
      <DayPicker
        canSwipeNext={canSwipeNext}
        cells={cells}
        onSelect={onSelectDay ?? (() => {})}
        onSwipe={onSwipe}
      />

      <Notices deniedNotices={deniedNotices} movedNotice={movedNotice} />

      <SignalRow preview={preview} />
    </View>
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
function DayHeading({ day }: { day: DayDate }) {
  const [shown, setShown] = useState<{ day: DayDate; previous: DayDate | null }>({
    day,
    previous: null,
  });
  // 렌더 중 상태 갱신 — 날이 바뀐 그 렌더에서 이전 날을 기억한다(React 문서의 「이전 props
  // 저장」 방식). effect 안의 동기 setState는 lint가 막는다(048 관측).
  if (shown.day !== day) setShown({ day, previous: shown.day });

  return (
    <View style={{ marginTop: 4 }}>
      {shown.previous !== null && (
        <FadeLayer
          from={1}
          key={`out-${shown.previous}-${shown.day}`}
          style={{ position: "absolute", left: 0, right: 0, top: 0 }}
          testID="home-day-fade-out"
          to={0}
        >
          <DayFace day={shown.previous} />
        </FadeLayer>
      )}
      {/* 앱을 처음 열 때(이전 날 없음)는 나타나는 효과 없이 바로 보인다 */}
      <FadeLayer from={shown.previous === null ? 1 : 0} key={`in-${shown.day}`} to={1}>
        <DayFace day={shown.day} testIDs />
      </FadeLayer>
    </View>
  );
}

/** 마운트할 때의 투명도 `from`에서 `to`로 `CROSSFADE_MS` 동안 옮긴다. 다시 쓰려면 `key`를 바꾼다. */
function FadeLayer({
  from,
  to,
  style,
  testID,
  children,
}: {
  from: number;
  to: number;
  style?: ViewStyle;
  testID?: string;
  children: ReactNode;
}) {
  const opacity = useSharedValue(from);
  useEffect(() => {
    if (from !== to) opacity.value = withTiming(to, { duration: CROSSFADE_MS });
    // 마운트 때 한 번만 — 값이 바뀌면 부르는 쪽이 `key`로 새로 마운트한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    // 헤더 날짜는 누를 수 없다(H7) — 겹친 두 겹이 터치를 가로채지 않게 한다.
    <Animated.View pointerEvents="none" style={[style, fade]} testID={testID}>
      {children}
    </Animated.View>
  );
}

function DayFace({ day, testIDs }: { day: DayDate; testIDs?: boolean }) {
  const { date, weekday } = dayParts(day);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
      {/* 숫자 칸은 언제나 두 자리 폭이다 — 「6」과 「30」 사이를 넘길 때 요일이 옆으로 밀리지 않게
          (실기기, 사용자 요청). 보이지 않는 「00」이 폭을 잡고, 실제 숫자는 그 왼쪽에 겹친다. */}
      <View>
        <AppText
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[DAY_NUMBER, { opacity: 0 }]}
        >
          {DAY_NUMBER_WIDTH}
        </AppText>
        <AppText
          style={[DAY_NUMBER, { position: "absolute", left: 0, bottom: 0 }]}
          testID={testIDs ? "home-day-number" : undefined}
        >
          {String(date)}
        </AppText>
      </View>
      <AppText style={WEEKDAY} testID={testIDs ? "home-weekday" : undefined}>
        {weekdayLong(weekday)}
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

/* ═══════════════════════════════ 신호 줄 ═══════════════════════════════ */

/**
 * 「지금 쓰면 볼 것」 세 칸 (048 US3, FR-016~018).
 *
 * **「없음」과 「모름」은 다른 글자다**(원칙 V) — 0으로 채우지 않는다. 미리보기가 아직 오지
 * 않았으면 「…」, 통로가 없으면 「모름」.
 */
function SignalRow({ preview }: { preview?: PreviewState }) {
  const count = (pick: (p: DayPreview) => CountHint): string => {
    if (preview === undefined) return "모름";
    if (!("photos" in preview)) return "…";
    return countText(pick(preview));
  };

  // 049 — 오늘은 언제든 쓸 수 있어 이 칸은 늘 「지금」이다(FR-018c). 칸 자체는 「쓸 재료」 조각이
  // 신호 줄을 다시 짤 때까지 남긴다(C7).
  const windowText = "지금";

  return (
    <View style={SIGNAL_ROW} testID="signal-row">
      <SignalCell label="사진" testID="signal-photos" value={count((p) => p.photos)} />
      <SignalCell label="다닌 자리" testID="signal-places" value={count((p) => p.places)} />
      <SignalCell emphasis label="쓸 수 있는 때" last testID="signal-window" value={windowText} />
    </View>
  );
}

function countText(hint: CountHint): string {
  switch (hint.kind) {
    case "known":
      return String(hint.count);
    case "none":
      return "없음";
    case "unknown":
      return "모름";
  }
}

function SignalCell({
  label,
  value,
  testID,
  emphasis,
  last,
}: {
  label: string;
  value: string;
  testID: string;
  emphasis?: boolean;
  last?: boolean;
}) {
  return (
    <View
      style={[
        { flex: last ? 1.1 : 1, gap: 2, paddingVertical: 12 },
        last
          ? { paddingLeft: 12 }
          : { paddingRight: 12, borderRightWidth: 1, borderRightColor: COLORS.border },
      ]}
    >
      <AppText style={SIGNAL_LABEL}>{label}</AppText>
      {/* testID는 값에 둔다 — 라벨과 값을 한 노드로 맞추면 「사진…」처럼 섞여 읽힌다 */}
      {/*
        「오후 12시부터」는 좁은 셋째 칸에서 두 줄로 꺾여 신호 줄 높이를 밀어 올렸다(048 실기기
        관측, SM-S901N). 한 줄에 두고 넘치면 글자를 줄인다 — 칸 높이가 날마다 달라지지 않게.
      */}
      <AppText
        adjustsFontSizeToFit={emphasis}
        minimumFontScale={0.6}
        numberOfLines={emphasis ? 1 : undefined}
        style={[SIGNAL_VALUE, emphasis ? { color: COLORS.danger, fontSize: 18 } : null]}
        testID={testID}
      >
        {value}
      </AppText>
    </View>
  );
}

/* ═══════════════════════════════ 목록 ═══════════════════════════════ */

function DiaryList({
  items,
  onOpen,
}: {
  items: DiaryListItem[];
  onOpen: (item: DiaryListItem) => void;
}) {
  return (
    <View style={{ marginTop: 22 }}>
      <View style={LIST_HEAD}>
        <AppText style={[KICKER, { color: COLORS.text }]} testID="home-recent">
          최근
        </AppText>
        <AppText style={{ fontSize: 12, color: COLORS.textMuted }} testID="home-count">
          {`${items.length}편`}
        </AppText>
      </View>

      {/* **빈 화면을 보이지 않는다**(006 S7) — 무엇을 하면 생기는지 말한다 */}
      {items.length === 0 && (
        <View style={{ paddingVertical: 24, gap: 8 }}>
          <AppText variant="bodyStrong">아직 일기가 없어요</AppText>
          <AppText variant="caption">
            위에서 하루를 고르고 「일기 쓰기」를 누르면 휴대폰이 그 하루를 일기로 써요
          </AppText>
        </View>
      )}

      {items.map((item) => (
        <DiaryCard item={item} key={item.day} onOpen={onOpen} />
      ))}
    </View>
  );
}

/**
 * 목록 카드 (US5).
 *
 * **실제 사진 썸네일을 쓰지 않는다** — 목록 항목은 사진 경로를 갖지 않는다(범위 밖). 사진 더미는
 * 모양일 뿐이고 장수는 배지가 말한다. 사진이 없던 일기와 모르는 일기는 같은 빈 사각형이지만
 * 날짜 줄 끝의 말로 **서로 구분된다**(007 FR-018·019, 원칙 V).
 */
function DiaryCard({
  item,
  onOpen,
}: {
  item: DiaryListItem;
  onOpen: (item: DiaryListItem) => void;
}) {
  const hint = photoHintText(item.photos);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onOpen(item)}
      style={CARD}
      testID={`diary-card-${item.day}`}
    >
      <PhotoStack day={item.day} photos={item.photos} />
      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
        <AppText style={{ fontSize: 11, letterSpacing: 0.66, color: COLORS.textMuted }}>
          {hint === undefined ? cardDateText(item.day) : `${cardDateText(item.day)} · ${hint}`}
        </AppText>
        {!item.readable ? (
          // **사라지지 않고 그렇다고 말한다**(006 FR-017a)
          <AppText style={CARD_TITLE}>읽을 수 없어요</AppText>
        ) : (
          item.title !== undefined && <AppText style={CARD_TITLE}>{item.title}</AppText>
        )}
      </View>
    </Pressable>
  );
}

/** 「사진 없음」과 「사진 모름」은 다른 말이다(원칙 V). 본 일기는 배지가 말하므로 없음. */
function photoHintText(photos: PhotoHint): string | undefined {
  switch (photos.kind) {
    case "known":
      return undefined;
    case "none":
      return "사진 없음";
    case "unknown":
      return "사진 모름";
  }
}

function PhotoStack({ day, photos }: { day: DayDate; photos: PhotoHint }) {
  const seen = photos.kind === "known";
  return (
    <View style={{ width: 44, height: 44, marginTop: 2 }}>
      {seen && (
        <>
          <View style={[STACK_BACK, { opacity: 0.6 }]} />
          <View style={[STACK_MID, { opacity: 0.8 }]} />
        </>
      )}
      <View
        style={[
          STACK_FRONT,
          seen
            ? { backgroundColor: COLORS.surface, borderColor: COLORS.border }
            : { backgroundColor: COLORS.bg, borderColor: COLORS.border },
        ]}
      />
      {photos.kind === "known" && (
        <AppText style={BADGE} testID={`diary-card-badge-${day}`}>
          {String(photos.count)}
        </AppText>
      )}
    </View>
  );
}

/* ═══════════════════════════════ 하단 바 ═══════════════════════════════ */

/**
 * 쓰기 바 (FR-028·029).
 *
 * **날짜 조각은 쓰기 버튼 밖의 형제다**(research R8) — 보드에서는 한 버튼처럼 보이지만, 「n일」을
 * 누르면 쓰기가 시작되는 것은 「누를 수 없는 글자」(D7·FR-014)와 어긋난다. 그래서 같은 강조
 * 블록 안에 나란히 두되 누름은 왼쪽 조각만 받는다.
 *
 * 049 — 고른 날은 언제나 쓸 수 있다(정오 제한 폐지, 미래는 오늘로 떨어진다). 048의 「오늘 일기는
 * …부터 쓸 수 있어요」 갈래는 도달할 수 없어 걷어냈다(FR-018c).
 */
function WriteBar({ write, onWrite }: { write: WritePrompt; onWrite: () => void }) {
  return (
    <View style={WRITE_BLOCK}>
      <Pressable
        accessibilityRole="button"
        onPress={() => onWrite()}
        style={WRITE_BUTTON}
        testID="write-button"
      >
        <AppText style={WRITE_TEXT}>일기 쓰기</AppText>
      </Pressable>
      <View style={WRITE_DAY}>
        <AppText style={[WRITE_TEXT, { fontSize: 13, fontWeight: "700" }]} testID="write-day-label">
          {dayOfMonthText(write.day)}
        </AppText>
      </View>
    </View>
  );
}

/* ═══════════════════════════════ 치수 ═══════════════════════════════ */
/*
 * 치수는 보드 `1d`의 값을 옮긴 레이아웃 숫자다(FR-038, 032·047 관례). 색은 `COLORS.*`만.
 * accent 위 글자는 `accentForeground`(검정) — 보드의 오프화이트 글자는 AA 미달이다(043 R2).
 */

const ROOT = { flex: 1, backgroundColor: COLORS.bg } as const;

const KICKER = {
  fontSize: 11,
  letterSpacing: 1.1,
  fontWeight: "600",
} as const;

/** 보드 `1d` ② — 62/800, 줄높이 .85, 자간 -.05em, 고정폭 숫자 (049) */
/** 큰 날짜 칸의 폭을 잡는 글자 — 한 달의 가장 긴 날(두 자리). 숫자는 `tabular-nums`라 폭이 같다 */
const DAY_NUMBER_WIDTH = "00";

const DAY_NUMBER: TextStyle = {
  fontSize: 62,
  lineHeight: 53,
  fontWeight: "800",
  letterSpacing: -3.1,
  color: COLORS.text,
  fontVariant: ["tabular-nums"],
};

/** 요일 16/700 */
const WEEKDAY: TextStyle = { fontSize: 16, fontWeight: "700", color: COLORS.text };

/** 상태 줄 13, 보조색 */
const DAY_STATE: TextStyle = { fontSize: 13, color: COLORS.textMuted, marginTop: 6 };

const SIGNAL_ROW = {
  flexDirection: "row",
  alignItems: "stretch",
  marginTop: 16,
  borderTopWidth: 1,
  borderTopColor: COLORS.border,
  borderBottomWidth: 2,
  borderBottomColor: COLORS.text,
} as const;

const SIGNAL_LABEL = {
  fontSize: 10,
  letterSpacing: 1,
  fontWeight: "600",
  color: COLORS.textMuted,
} as const;

const SIGNAL_VALUE: TextStyle = {
  fontSize: 22,
  lineHeight: 26,
  fontWeight: "800",
  color: COLORS.text,
  fontVariant: ["tabular-nums"],
};

const LIST_HEAD = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "baseline",
  paddingBottom: 8,
  borderBottomWidth: 2,
  borderBottomColor: COLORS.text,
} as const;

const CARD = {
  flexDirection: "row",
  gap: 12,
  alignItems: "flex-start",
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: COLORS.border,
} as const;

const CARD_TITLE = { fontSize: 17, lineHeight: 22, fontWeight: "700", color: COLORS.text } as const;

const STACK_BACK = {
  position: "absolute",
  left: 6,
  top: 0,
  right: 0,
  bottom: 6,
  backgroundColor: COLORS.border,
} as const;

const STACK_MID = {
  position: "absolute",
  left: 3,
  top: 3,
  right: 3,
  bottom: 3,
  backgroundColor: COLORS.textMuted,
} as const;

const STACK_FRONT = {
  position: "absolute",
  left: 0,
  bottom: 0,
  width: 38,
  height: 38,
  borderWidth: 1,
} as const;

const BADGE = {
  position: "absolute",
  right: 0,
  bottom: -3,
  backgroundColor: COLORS.accent,
  color: COLORS.accentForeground,
  fontSize: 10,
  lineHeight: 15,
  fontWeight: "800",
  paddingHorizontal: 5,
} as const;

const BOTTOM_BAR = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  paddingHorizontal: 20,
  paddingTop: 12,
  paddingBottom: 12,
  borderTopWidth: 2,
  borderTopColor: COLORS.text,
  backgroundColor: COLORS.bg,
} as const;

const WRITE_BLOCK = {
  flexDirection: "row",
  alignItems: "stretch",
  minHeight: BAR_HEIGHT,
  backgroundColor: COLORS.accent,
} as const;

const WRITE_BUTTON = {
  justifyContent: "center",
  paddingVertical: 14,
  paddingHorizontal: 16,
} as const;

const WRITE_DAY = {
  justifyContent: "center",
  paddingHorizontal: 14,
  borderLeftWidth: 1,
  borderLeftColor: COLORS.accentForeground,
} as const;

const WRITE_TEXT = { fontSize: 15, fontWeight: "800", color: COLORS.accentForeground } as const;
