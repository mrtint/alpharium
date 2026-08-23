/**
 * 하루를 고르는 자리.
 *
 * 계약: specs/009-past-day-diary/contracts/write-prompt.md §3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 006이 박아 둔 「어제 하나」를 사용자가 고를 수 있게 만드는 자리다.**
 *
 * 그 전까지 쓰기 자리에는 「2026-08-20를 쓴다」가 고정으로 있었고 바꿀 길이 없었다 —
 * **하루를 놓치면 영영 못 썼다.** 신호(사진)는 기기에 그대로 남아 있는데도.
 *
 * **판정하지 않는다.** 어느 하루가 골라졌는지도, 되돌려졌는지도 `writePromptFor()`가
 * 정해서 넘겨준다(FR-009d) — 화면이 스스로 이전 값과 비교하면 같은 규칙이 두 곳에
 * 생긴다. 007의 `CharacterPicker`가 `movedFrom`을 받아 그리기만 하는 것과 같다.
 *
 * **사진 갈래를 그리지 않는다**(FR-011a). **아직 쓰지 않은 하루의 그 값은 알 수
 * 없고**, 알려면 이 화면이 세 하루의 신호를 미리 수집해야 하는데 그것은 범위 밖의
 * 기록 계층을 여는 일이다. 목록의 줄에는 사진 갈래가 계속 보이지만 그것은 **이미 쓴
 * 일기**의 값이라 알려져 있다 — 그 차이가 이 방어의 근거다.
 *
 * **날짜를 그대로 적는다.** 「어제·그저께」로 옮기지 않는다 — 04:00 경계 때문에
 * 새벽에는 「어제」가 달력의 어제와 어긋난다(research §4).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Pressable, StyleSheet, Text, View } from "react-native";

import type { DayDate } from "../config/day-boundary";
import type { SelectableDay } from "../app/state";

export type DayPickerProps = {
  /**
   * 고를 수 있는 하루들. 최근이 먼저다(FR-001).
   *
   * **받는 것이 이것뿐이다** — 사진 갈래·신호 미리보기·예상 크기를 받지 않는다.
   * 자리가 없으면 그릴 수 없다.
   */
  days: readonly SelectableDay[];
  /** 지금 쓰게 될 하루. **판정이 정한 것이며 화면이 고르지 않는다** */
  selected: DayDate;
  /**
   * 되돌려졌으면 사용자가 원래 고른 하루 (FR-009).
   *
   * **다시 고를 때까지 남는다**(FR-009c) — 지우는 코드가 여기 없다. 판정이 매번 다시
   * 돌므로 유효한 하루를 고르면 다음 렌더에서 저절로 빠진다.
   */
  revertedFrom?: DayDate;
  /**
   * 정오 전이라 오늘을 아직 쓸 수 없다는 안내 (012, 헌법 원칙 II MUST).
   *
   * **문자열이 아니라 `true | undefined`다.** 문구("정오부터 오늘을 쓸 수 있다")는
   * 화면이 스스로 짓는다 — `WRITABLE_FROM_HOUR`(12)를 문자열로 바꾸는 판정을
   * 화면 밖(`day-boundary.ts`)에 둘 필요가 없다.
   *
   * **`now`를 직접 읽지 않는다** — 이 값을 인자로 받을 뿐이다(계약 §4 금지).
   */
  todayNotYetWritable?: boolean;
  onSelect: (day: DayDate) => void;
};

export function DayPicker({
  days,
  selected,
  revertedFrom,
  todayNotYetWritable,
  onSelect,
}: DayPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>언제를 쓸까</Text>

      {/*
        **말없이 다른 하루를 쓰지 않는다**(FR-009). 쓰기 자리를 열어 둔 채 04:00을
        넘기면 가장 이른 하루가 범위를 벗어나는데, 그때 조용히 바꾸면 사용자는
        엉뚱한 하루의 일기를 얻는다. 007이 캐릭터 옮김을 알린 것과 같은 성질이다.
      */}
      {revertedFrom !== undefined && (
        <Text style={styles.reverted}>
          {revertedFrom}는 이제 쓸 수 없어 {selected}로 바꿨다
        </Text>
      )}

      {/*
        **012 — 헌법 원칙 II "하루의 끝" MUST**: "왜 아직인지"와 "언제부터"를
        함께 알린다. `WRITABLE_FROM_HOUR`(12시) 외의 곳에서 시각을 얻지 않는다 —
        이 문구가 유일하게 "정오"라는 값을 사람이 읽는 말로 바꾸는 자리다.
      */}
      {todayNotYetWritable === true && (
        <Text style={styles.notice}>오늘은 아직 하루가 끝나지 않아 정오(12시)부터 쓸 수 있다</Text>
      )}

      {days.map(({ day, hasDiary }) => {
        const isSelected = day === selected;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={day}
            onPress={() => onSelect(day)}
            style={[styles.row, isSelected && styles.rowSelected]}
            // **하루마다 따로 준다** — RN은 접근성 트리가 평탄화되어 Maestro의
            // `childOf`가 통하지 않는다(008 실측). `testID`는 release에서 살아남는다.
            testID={`day-${day}`}
          >
            <View style={styles.info}>
              {/* 날짜를 그대로 적는다 — 「어제」로 옮기지 않는다 */}
              <Text style={styles.day}>{day}</Text>

              {/*
                **「일기가 있다」뿐이다**(FR-011a). 사진 몇 장인지·무엇을 보고 썼는지는
                여기 오지 않는다 — 아직 쓰지 않은 하루에 대해서는 알 수 없는 것이고,
                이미 쓴 하루에 대해서만 아는 것을 섞으면 줄마다 뜻이 달라진다.
              */}
              {hasDiary && <Text style={styles.hint}>일기가 있다</Text>}
            </View>

            {isSelected && <Text style={styles.mark}>선택</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  title: { fontSize: 15, fontWeight: "600" },
  reverted: { fontSize: 13, opacity: 0.8, lineHeight: 18 },
  notice: { fontSize: 13, opacity: 0.8, lineHeight: 18 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    borderRadius: 6,
  },
  rowSelected: { borderWidth: 2, borderColor: "#333" },
  info: { flex: 1, gap: 2 },
  day: { fontSize: 15 },
  hint: { fontSize: 12, opacity: 0.7 },
  mark: { fontSize: 12, opacity: 0.7 },
});
