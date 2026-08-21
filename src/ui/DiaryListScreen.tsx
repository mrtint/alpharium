/**
 * 일기 목록 화면.
 *
 * 계약: specs/006-first-diary-app/contracts/screens.md §2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 이 화면이 원칙 I을 어기기 가장 쉬운 자리다.**
 *
 * 006이 처음으로 「저장된 일기를 보여주는 화면」을 만든다. **읽기와 쓰기가 같은 동작에
 * 묶이지 않아야 한다**(S1) — 「이미 있으면 그것을 보여준다」는 지름길을 만들면 저장된
 * 것이 생성을 대신하고, 그 순간 헌법 원칙 I이 깨진다.
 *
 * 그래서 `onWrite`는 **목록을 보지 않는다.** 항목이 있든 없든 같은 일을 한다.
 *
 * **화면 디자인은 이 기능의 범위가 아니다**(FR-027). 읽히고 눌리면 충분하다 —
 * 001·003·004가 「상태가 읽히면 충분하다」로 둔 것과 같은 기준이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { SelectionState } from "../app/selection";
import type { DiaryListItem, PhotoHint, WritePrompt } from "../app/state";
import type { Character } from "../diary/types";
import type { DayDate } from "../config/day-boundary";
import { CharacterPicker } from "./CharacterPicker";
import { DayPicker } from "./DayPicker";

export type DiaryListScreenProps = {
  items: DiaryListItem[];
  onOpen: (item: DiaryListItem) => void;
  /**
   * **목록을 인자로 받지 않는다**(S1). 저장 상태를 볼 수 없으면 그것으로 갈릴 수 없다 —
   * `state.ts`의 `toWriting()`이 인자를 받지 않는 것과 같은 방어다.
   */
  onWrite: () => void;
  /**
   * 누르면 무슨 일이 일어나는가 (007 FR-023·024).
   *
   * **이것을 아는 것은 화면이고, `onWrite`는 여전히 모른다** — 안다는 것과 그것으로
   * 갈리는 것은 다르며 후자만이 원칙 I 위반이다(FR-025).
   */
  write?: WritePrompt;
  /** 누가 쓰는가 (FR-002). 옮겨졌으면 `movedFrom`이 실려 알린다(FR-005a) */
  selection?: SelectionState;
  characters?: readonly { character: Character; ready: boolean }[];
  onSelectCharacter?: (character: Character) => void;
  /**
   * 하루를 고른다 (009 FR-006).
   *
   * **`onWrite`는 여전히 하루를 받지 않는다** — 고른 하루는 이 화면 밖의 상태이고
   * 그것을 파이프라인에 넘기는 것도 밖이다(계약 §3 금지).
   */
  onSelectDay?: (day: DayDate) => void;
};

/**
 * 사진 갈래를 사람이 읽는 말로 (007 FR-018·019).
 *
 * **「없음」과 「모름」이 서로 다른 문구다**(원칙 V). 같은 말로 뭉개면 004가 값에서
 * 지킨 구분이 화면에서 무너지고, 권한이 없는 것을 「사진이 없다」로 적게 된다.
 */
function photoText(hint: PhotoHint): string {
  switch (hint.kind) {
    case "known":
      return `사진 ${hint.count}장`;
    case "none":
      return "사진 없음";
    case "unknown":
      return "사진 모름";
  }
}

export function DiaryListScreen({
  items,
  onOpen,
  onWrite,
  write,
  selection,
  characters,
  onSelectCharacter,
  onSelectDay,
}: DiaryListScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>일기</Text>

      {/* **빈 화면을 보이지 않는다**(FR-018, S7) — 무엇을 하면 생기는지 말한다 */}
      {items.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>아직 일기가 없다</Text>
          <Text style={styles.emptyHint}>
            아래에서 하루를 고르고 「일기 쓰기」를 누르면 휴대폰이 그 하루를 일기로 쓴다.
          </Text>
        </View>
      )}

      {items.map((item) => (
        <Pressable
          accessibilityRole="button"
          key={item.day}
          onPress={() => onOpen(item)}
          style={styles.row}
        >
          <Text style={styles.day}>{item.day}</Text>

          {/*
            ★ 「읽을 수 없다」와 「일기가 없다」는 다른 상태다(S3, 원칙 V).
            조용히 빼면 사용자는 일기를 쓴 기억과 화면이 어긋나는 것을 설명할 수 없다.
          */}
          {!item.readable && <Text style={styles.unreadable}>읽을 수 없다</Text>}

          {/*
            **그날이 무엇을 보고 쓰였는가**(007 FR-018). 사진만 보인다 — 나머지는 전부
            `unknown`이라 줄마다 반복되면 소음이 된다(FR-018a). 상세는 셋을 다 보인다.
          */}
          <Text style={styles.photos}>{photoText(item.photos)}</Text>
        </Pressable>
      ))}

      {/*
        ─────────────────────────────────────────────────────────────────────────
        **쓰기 자리** — 캐릭터·날짜·덮어쓰기 예고가 한자리에 모인다(007 FR-002a).
        셋이 전부 「누르면 무슨 일이 일어나는가」에 답하므로 흩어 두면 읽히지 않는다.
        **확인 화면을 따로 두지 않는다**(FR-002b) — 화면 전이를 늘리지 않는다.
        ─────────────────────────────────────────────────────────────────────────
      */}
      <View style={styles.writeArea}>
        {characters !== undefined && onSelectCharacter !== undefined && (
          <CharacterPicker
            characters={characters}
            onSelect={onSelectCharacter}
            selected={selection?.kind === "selected" ? selection.character : null}
          />
        )}

        {/* **말없이 옮기지 않는다**(FR-005a) — 캐릭터마다 글의 성격이 다르다 */}
        {selection?.kind === "selected" && selection.movedFrom !== undefined && (
          <Text style={styles.moved}>
            {selection.movedFrom}을(를) 쓸 수 없어 {selection.character}(으)로 바꿨다
          </Text>
        )}

        {/*
          **하루를 고르는 자리**(009 FR-006). 「누가 쓸까」 바로 아래에 「언제를 쓸까」가
          온다 — 둘 다 「누르면 무슨 일이 일어나는가」에 답하므로 한자리에 모인다.

          **판정은 여기서 하지 않는다** — `write`가 이미 정해서 왔다(FR-009d).
        */}
        {write !== undefined && (
          <DayPicker
            days={write.selectable}
            // **고를 통로가 없어도 하루 셋은 보인다**(SC-001). 보이는 것과 고를 수
            // 있는 것을 같은 조건에 묶으면, 배선이 끊겼을 때 **자리가 통째로
            // 사라져 아무도 눈치채지 못한다** — 007의 끊긴 `stop`이 그랬다.
            onSelect={onSelectDay ?? (() => {})}
            revertedFrom={write.revertedFrom}
            selected={write.day}
          />
        )}

        {/* **오늘이 아니라 고른 하루다**(009 FR-008, 006 FR-030) */}
        {write !== undefined && <Text style={styles.willWrite}>{write.day}를 쓴다</Text>}

        {/* **덮어쓴다는 것을 누르기 전에 말한다**(FR-024). 사라진 일기는 되돌릴 수 없다 */}
        {write?.overwrites === true && (
          <Text style={styles.overwrite}>이 날의 일기가 이미 있다. 다시 쓰면 덮어쓴다</Text>
        )}

        {/* **항목이 있든 없든 같은 자리다** — 읽기가 쓰기를 대신하지 않는다(S1) */}
        <Pressable accessibilityRole="button" onPress={onWrite} style={styles.write}>
          <Text>일기 쓰기</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 12 },
  title: { fontSize: 20, fontWeight: "600" },
  empty: { paddingVertical: 24, gap: 8 },
  emptyTitle: { fontSize: 16 },
  emptyHint: { fontSize: 14, opacity: 0.7, lineHeight: 20 },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
    gap: 4,
  },
  day: { fontSize: 16 },
  unreadable: { fontSize: 13, opacity: 0.6 },
  photos: { fontSize: 13, opacity: 0.6 },
  writeArea: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ccc",
    gap: 10,
  },
  moved: { fontSize: 13, opacity: 0.8 },
  willWrite: { fontSize: 14 },
  overwrite: { fontSize: 13, opacity: 0.8 },
  write: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
});
