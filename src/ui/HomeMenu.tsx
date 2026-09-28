/**
 * 하단 바의 `⋯` 메뉴 (048, 설계 D2).
 *
 * 계약: specs/048-diary-home-modernist/contracts/home-screen.md M1~M5, B7
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **전역 탭 줄이 사라졌으므로 설정·개발자로 가는 유일한 길이다.** 쓰기 바 바로 왼쪽에 두어
 * 쓰기 바가 오른쪽 가장자리를 지킨다(D2). 위로 펼쳐진다.
 *
 * **받은 것만 그린다.** 개발자 항목을 넣을지는 부르는 쪽(`App.tsx`)이 환경으로 정한다 —
 * prod에서는 배열에 **아예 없다**(FR-003, 숨김이 아니다). 이 컴포넌트는 환경을 모른다.
 *
 * **050 — RNR `DropdownMenu`로 옮겼다**(Clarifications Q4, contracts/dialogs.md MIG2). 048은 RN 코어
 * `Modal`로 만들었다(FR-008). 계약은 그대로다 — 바깥 누름과 안드로이드 뒤로 가기가 둘 다 메뉴만 닫고,
 * 항목을 누르면 닫히며 그 동작이 불린다. 프리미티브가 뒤로 가기를 스스로 붙잡는다(research R3). 새
 * 네이티브 의존성이 없다(research R1).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { AppText } from "./components/Text";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./rnr/dropdown-menu";
import { COLORS } from "./theme/tokens";

export type HomeMenuItem = {
  /** `home-menu-<key>` testID가 된다 */
  key: string;
  label: string;
  onPress: () => void;
};

/** 쓰기 바와 같은 높이 — 보드 `1d`의 CTA 최소 높이 */
export const BAR_HEIGHT = 50;

/**
 * 목록과 버튼 사이 — 버튼 위쪽 여백(12)과 하단 바의 윗선(2)을 넘어 8만큼 띄운다. 버튼 위에만 붙이면
 * 목록이 하단 바의 굵은 윗선을 덮는다(048 실기기 관측). 048은 버튼의 창 좌표를 재서 이 값을 더했고,
 * 050부터는 프리미티브가 트리거를 재고 이 값을 `sideOffset`으로 받는다.
 */
const LIST_OFFSET = 12 + 2 + 8;

export function HomeMenu({ items }: { items: readonly HomeMenuItem[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        accessibilityLabel="메뉴"
        accessibilityRole="button"
        style={BUTTON}
        testID="home-menu-button"
      >
        <AppText style={{ fontSize: 20, fontWeight: "800", color: COLORS.text }}>⋯</AppText>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        overlayTestID="home-menu-backdrop"
        side="top"
        sideOffset={LIST_OFFSET}
        style={LIST}
        testID="home-menu-list"
      >
        {items.map((item) => (
          <DropdownMenuItem
            accessibilityRole="button"
            key={item.key}
            onPress={item.onPress}
            style={ITEM}
            testID={`home-menu-${item.key}`}
          >
            <AppText variant="bodyStrong">{item.label}</AppText>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** 정사각형, 잉크색 테두리(강조색이 아니다 — FR-030). 치수는 보드의 값(FR-038). */
const BUTTON = {
  width: BAR_HEIGHT,
  height: BAR_HEIGHT,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
  borderColor: COLORS.text,
  backgroundColor: COLORS.bg,
} as const;

/** 버튼 위에 뜨는 목록 — 자리는 프리미티브가 트리거를 재서 정한다(`side="top"`). */
const LIST = {
  minWidth: 160,
  backgroundColor: COLORS.bg,
  borderWidth: 1,
  borderColor: COLORS.text,
} as const;

const ITEM = { paddingVertical: 14, paddingHorizontal: 16 } as const;
