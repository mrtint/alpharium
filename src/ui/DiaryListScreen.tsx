/**
 * 일기 홈 — 보드 `1d`("Day-first — one date fills the screen").
 *
 * 계약: specs/048-diary-home-modernist/contracts/home-screen.md H·S·G·B, US5 카드
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
 * 7칸 스트립에서 날을 고르며, 신호 줄이 「지금 쓰면 볼 것」을 미리 보이고, 쓰기는 화면 아래
 * 고정 바가 맡는다. 헤더와 목록은 함께 스크롤되고 하단 바만 고정된다(FR-023).
 *
 * **판정하지 않는다.** 고른 날·쓸 수 있음·쓸 수 있게 되는 시각은 `writePromptFor()`가,
 * 스트립 칸은 `stripCellsFor()`가, 신호 개수는 `DayPreview`가 정해서 온다. 이 화면은
 * 신호 원형(`DaySignals`)도, 하루 경계의 04·12도 모른다(G9·G10).
 *
 * **★ 쓸 수 없는 날에는 쓰기 버튼이 없다**(FR-029·FR-034 첫째 겹) — 비활성 모양으로도 그리지
 * 않는다. 무엇을 눌러도 `onWrite`에 닿지 않는다(B5). 둘째 겹은 `DiaryHomeScreen.write()`의
 * 게이트, 셋째 겹은 파이프라인의 `isDayWritable`(012)이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Pressable, ScrollView, View, type TextStyle } from "react-native";

import {
  dayParts,
  type CountHint,
  type DayPreview,
  type DiaryListItem,
  type PhotoHint,
  type StripCell,
  type WritePrompt,
} from "../app/state";
import type { DayDate } from "../config/day-boundary";
import { AppText } from "./components/Text";
import { DayPicker } from "./DayPicker";
import { BAR_HEIGHT, HomeMenu, type HomeMenuItem } from "./HomeMenu";
import {
  cardDateText,
  dayOfMonthText,
  hourText,
  monthText,
  revertedText,
  weekdayLong,
} from "./home-text";
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
  /** 7칸 스트립 (048). `stripCellsFor()`가 만든다 */
  cells?: readonly StripCell[];
  /** 스트립에서 하루를 고른다 (009 FR-006). `onWrite`는 여전히 하루를 받지 않는다 */
  onSelectDay?: (day: DayDate) => void;
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
            cells={cells ?? []}
            deniedNotices={deniedNotices}
            movedNotice={movedNotice}
            onSelectDay={onSelectDay}
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
  cells,
  onSelectDay,
  movedNotice,
  deniedNotices,
  preview,
}: {
  write: WritePrompt;
  cells: readonly StripCell[];
  onSelectDay?: (day: DayDate) => void;
  movedNotice?: string;
  deniedNotices?: readonly string[];
  preview?: PreviewState;
}) {
  const { date, weekday } = dayParts(write.day);

  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {/* 월은 **고른 날의 달**이다(Clarification Q2) */}
        <AppText style={[KICKER, { color: COLORS.accent }]} testID="home-month">
          {monthText(write.day)}
        </AppText>
        <AppText style={[KICKER, { color: COLORS.textMuted }]} testID="home-kicker">
          일기
        </AppText>
      </View>

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12, marginTop: 4 }}>
        <AppText style={DAY_NUMBER} testID="home-day-number">
          {date}
        </AppText>
        <View style={{ gap: 2, paddingBottom: 8, flexShrink: 1 }}>
          <AppText
            style={{ fontSize: 16, fontWeight: "700", color: COLORS.text }}
            testID="home-weekday"
          >
            {weekdayLong(weekday)}
          </AppText>
          {/* 012의 덮어쓰기 사전 고지가 이 자리로 옮겨 왔다(FR-010) */}
          <AppText style={{ fontSize: 13, color: COLORS.textMuted }} testID="home-day-state">
            {write.overwrites ? "이미 썼어요 · 다시 쓰면 덮어써요" : "아직 쓰지 않았어요"}
          </AppText>
        </View>
      </View>

      <DayPicker cells={cells} onSelect={onSelectDay ?? (() => {})} />

      <Notices
        deniedNotices={deniedNotices}
        movedNotice={movedNotice}
        reverted={
          write.revertedFrom !== undefined ? revertedText(write.revertedFrom, write.day) : undefined
        }
      />

      <SignalRow preview={preview} write={write} />
    </View>
  );
}

/** 안내 캡션 — 되돌림(009)·캐릭터 옮김(029)·거부 권한(021). 있을 때만. */
function Notices({
  reverted,
  movedNotice,
  deniedNotices,
}: {
  reverted?: string;
  movedNotice?: string;
  deniedNotices?: readonly string[];
}) {
  const denied = deniedNotices ?? [];
  if (reverted === undefined && movedNotice === undefined && denied.length === 0) return null;

  return (
    <View style={{ gap: 4, marginTop: 12 }}>
      {/*
        **말없이 다른 하루를 쓰지 않는다**(009 FR-009). 쓰기 자리를 열어 둔 채 04:00을 넘기면
        가장 이른 하루가 범위를 벗어나는데, 그때 조용히 바꾸면 사용자는 엉뚱한 하루를 얻는다.
      */}
      {reverted !== undefined && <AppText variant="caption">{reverted}</AppText>}
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
function SignalRow({ write, preview }: { write: WritePrompt; preview?: PreviewState }) {
  const count = (pick: (p: DayPreview) => CountHint): string => {
    if (preview === undefined) return "모름";
    if (!("photos" in preview)) return "…";
    return countText(pick(preview));
  };

  const windowText =
    write.writable || write.writableAt === undefined ? "지금" : `${hourText(write.writableAt)}부터`;

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
      <AppText
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
 * **쓸 수 없으면 버튼이 없다** — 비활성 모양도 아니다. 언제부터 쓸 수 있는지만 말한다.
 */
function WriteBar({ write, onWrite }: { write: WritePrompt; onWrite: () => void }) {
  if (!write.writable) {
    return (
      <View style={{ flex: 1, flexShrink: 1, marginLeft: 12, justifyContent: "center" }}>
        <AppText
          style={{ fontSize: 14, fontWeight: "600", color: COLORS.text }}
          testID="write-unavailable"
        >
          {`오늘 일기는 ${write.writableAt !== undefined ? hourText(write.writableAt) : ""}부터 쓸 수 있어요`}
        </AppText>
      </View>
    );
  }

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

const DAY_NUMBER: TextStyle = {
  fontSize: 124,
  lineHeight: 118,
  fontWeight: "800",
  letterSpacing: -6,
  color: COLORS.text,
  fontVariant: ["tabular-nums"],
};

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
