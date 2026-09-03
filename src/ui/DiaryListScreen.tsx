/**
 * 일기 목록 화면.
 *
 * 계약: specs/006-first-diary-app/contracts/screens.md §2
 *       specs/029-writing-flow-simplification/contracts/home-screen.md (H1·H2·H6)
 *       specs/032-nativewind-ui-system/contracts/screen-migration.md SM1
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
 * **★ 029에서 쓰기 자리의 위젯 셋이 사라졌다**(FR-001·006). CharacterPicker·
 * VisionPicker·GeocodingSettingToggle과 딸린 안내가 걷혔다 — 캐릭터·사진 설정·장소명은
 * 배선 계층(`resolve-generation.ts`)이 자동 판정한다. 홈에 남는 것은 목록 +
 * "일기 쓰기" + 날짜 셀렉트(009) + 정오 게이트 안내(012) + 거부 권한 안내(021)뿐이다.
 *
 * **★ 032에서 표현만 바꿨다** — `StyleSheet` → 디자인 토큰(className + `tokens.ts`)
 * + 재사용 컴포넌트(`AppText`·`Button`). 기능·문안·`testID`·네비게이션은 불변이다
 * (SM1). 사진 갈래 3문구, `onWrite` 인자 없음, `day-<date>` testID 그대로.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Pressable, ScrollView, View } from "react-native";

import type { DiaryListItem, PhotoHint, WritePrompt } from "../app/state";
import type { DayDate } from "../config/day-boundary";
import { AppText } from "./components/Text";
import { Button } from "./components/Button";
import { COLORS } from "./theme/tokens";
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
  /**
   * 하루를 고른다 (009 FR-006).
   *
   * **`onWrite`는 여전히 하루를 받지 않는다** — 고른 하루는 이 화면 밖의 상태이고
   * 그것을 파이프라인에 넘기는 것도 밖이다(계약 §3 금지).
   */
  onSelectDay?: (day: DayDate) => void;
  /**
   * 정오 전이라 오늘을 아직 쓸 수 없다는 안내 (012, 헌법 원칙 II MUST).
   *
   * `DiaryHomeScreen`이 `isDayWritable()`을 재사용해 계산한 값을 그대로 `DayPicker`에
   * 전달한다 — 이 화면은 계산하지 않고 넘기기만 한다.
   */
  todayNotYetWritable?: boolean;
  /**
   * 자동 판정이 캐릭터를 옮겼을 때의 안내 문구 (029 FR-014).
   *
   * **부모가 계산해 넘긴 문자열만 그린다** — 007의 `movedFrom` 표시를 이 자리로
   * 옮겼다. 화면은 persona도 캐릭터도 모른다(원칙 III).
   */
  movedNotice?: string;
  /**
   * 거부된 권한 때문에 제한되는 기능의 정직한 안내 문구들 (021 FR-014, SC-004).
   */
  deniedNotices?: readonly string[];
};

/**
 * 사진 갈래를 사람이 읽는 말로 (007 FR-018·019).
 *
 * **「없음」과 「모름」이 서로 다른 문구다**(원칙 V).
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
  onSelectDay,
  todayNotYetWritable,
  movedNotice,
  deniedNotices,
}: DiaryListScreenProps) {
  return (
    <ScrollView
      className="bg-bg"
      contentContainerClassName="p-5 gap-3"
      contentContainerStyle={{ padding: 20, gap: 12 }}
      style={{ backgroundColor: COLORS.bg }}
    >
      <AppText variant="title">일기</AppText>

      {/* 021 — 거부된 권한으로 제한되는 기능을 정직하게 알린다(FR-014). */}
      {deniedNotices !== undefined && deniedNotices.length > 0 && (
        <View className="gap-1 py-1" style={{ gap: 4, paddingVertical: 4 }} testID="denied-notices">
          {deniedNotices.map((notice) => (
            <AppText key={notice} variant="caption">
              {notice}
            </AppText>
          ))}
        </View>
      )}

      {/* **빈 화면을 보이지 않는다**(FR-018, S7) — 무엇을 하면 생기는지 말한다 */}
      {items.length === 0 && (
        <View className="py-6 gap-2" style={{ paddingVertical: 24, gap: 8 }}>
          <AppText variant="bodyStrong">아직 일기가 없다</AppText>
          <AppText variant="caption">
            아래에서 하루를 고르고 「일기 쓰기」를 누르면 휴대폰이 그 하루를 일기로 쓴다.
          </AppText>
        </View>
      )}

      {items.map((item) => (
        <Pressable
          accessibilityRole="button"
          className="py-3.5 border-b border-border gap-1"
          key={item.day}
          onPress={() => onOpen(item)}
          style={{
            paddingVertical: 14,
            borderBottomWidth: 0.5,
            borderBottomColor: COLORS.border,
            gap: 4,
          }}
        >
          <AppText variant="body">{item.day}</AppText>

          {item.title !== undefined && <AppText variant="caption">{item.title}</AppText>}

          {!item.readable && <AppText variant="caption">읽을 수 없다</AppText>}

          <AppText variant="caption">{photoText(item.photos)}</AppText>
        </Pressable>
      ))}

      {/*
        ─────────────────────────────────────────────────────────────────────────
        **쓰기 자리** — 029에서 날짜 셀렉트와 "일기 쓰기"만 남았다. 캐릭터·사진 설정·
        장소명은 배선 계층이 자동 판정한다(FR-006).
        ─────────────────────────────────────────────────────────────────────────
      */}
      <View
        className="mt-4 pt-4 border-t border-border gap-2.5"
        style={{
          marginTop: 16,
          paddingTop: 16,
          borderTopWidth: 0.5,
          borderTopColor: COLORS.border,
          gap: 10,
        }}
      >
        {/*
          **자동 판정이 캐릭터를 옮겼으면 알린다**(029 FR-014) — 007의 `movedFrom`
          표시를 이 자리로 옮겼다. 부모가 persona 이름으로 문장을 만들어 넘긴다.
        */}
        {movedNotice !== undefined && <AppText variant="caption">{movedNotice}</AppText>}

        {/*
          **하루를 고르는 자리**(009 FR-006). **판정은 여기서 하지 않는다** —
          `write`가 이미 정해서 왔다(FR-009d).
        */}
        {write !== undefined && (
          <DayPicker
            days={write.selectable}
            onSelect={onSelectDay ?? (() => {})}
            revertedFrom={write.revertedFrom}
            selected={write.day}
            todayNotYetWritable={todayNotYetWritable}
          />
        )}

        {/* **오늘이 아니라 고른 하루다**(009 FR-008, 006 FR-030) */}
        {write !== undefined && <AppText variant="body">{write.day}를 쓴다</AppText>}

        {/* **덮어쓴다는 것을 누르기 전에 말한다**(FR-024). */}
        {write?.overwrites === true && (
          <AppText variant="caption">이 날의 일기가 이미 있다. 다시 쓰면 덮어쓴다</AppText>
        )}

        {/* **항목이 있든 없든 같은 자리다** — 읽기가 쓰기를 대신하지 않는다(S1) */}
        <View className="self-start mt-3" style={{ alignSelf: "flex-start", marginTop: 12 }}>
          <Button variant="secondary" onPress={onWrite}>
            일기 쓰기
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}
