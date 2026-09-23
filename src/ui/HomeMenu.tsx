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
 * **RN 코어 `Modal`만 쓴다**(FR-008) — 바깥 누름과 안드로이드 뒤로 가기(`onRequestClose`)가
 * 둘 다 메뉴만 닫는다. 새 네이티브 의존성이 없어 release 재확인이 필요 없다(012).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useRef, useState } from "react";
import { Dimensions, Modal, Pressable, View } from "react-native";

import { AppText } from "./components/Text";
import { COLORS } from "./theme/tokens";

export type HomeMenuItem = {
  /** `home-menu-<key>` testID가 된다 */
  key: string;
  label: string;
  onPress: () => void;
};

/** 쓰기 바와 같은 높이 — 보드 `1d`의 CTA 최소 높이 */
export const BAR_HEIGHT = 50;

export function HomeMenu({ items }: { items: readonly HomeMenuItem[] }) {
  const [open, setOpen] = useState(false);
  /**
   * 목록을 버튼 바로 위에 붙이기 위한 자리. 열 때 버튼의 창 좌표를 재서 정한다 — 하단 바의
   * 높이가 기기(내비게이션 바·글꼴 크기)마다 달라 고정값으로는 어긋난다. 재지 못하면(테스트
   * 환경 등) 보드 치수로 계산한 기본값을 쓴다.
   */
  const [anchor, setAnchor] = useState<{ left: number; bottom: number } | null>(null);
  const buttonRef = useRef<View>(null);

  const openMenu = () => {
    setOpen(true);
    buttonRef.current?.measureInWindow?.((x, y) => {
      if (typeof x !== "number" || typeof y !== "number") return;
      // 버튼 위쪽 여백(12)과 하단 바의 윗선(2)을 넘어 8만큼 띄운다 — 버튼 위에만 붙이면
      // 목록이 하단 바의 굵은 윗선을 덮는다(048 실기기 관측).
      setAnchor({ left: x, bottom: Dimensions.get("window").height - y + 12 + 2 + 8 });
    });
  };

  return (
    <>
      <Pressable
        accessibilityLabel="메뉴"
        accessibilityRole="button"
        onPress={openMenu}
        ref={buttonRef}
        style={BUTTON}
        testID="home-menu-button"
      >
        <AppText style={{ fontSize: 20, fontWeight: "800", color: COLORS.text }}>⋯</AppText>
      </Pressable>

      {open && (
        <Modal animationType="none" onRequestClose={() => setOpen(false)} transparent visible>
          <Pressable
            accessibilityLabel="메뉴 닫기"
            onPress={() => setOpen(false)}
            style={BACKDROP}
            testID="home-menu-backdrop"
          />
          <View style={[LIST, anchor ?? null]} testID="home-menu-list">
            {items.map((item) => (
              <Pressable
                accessibilityRole="button"
                key={item.key}
                onPress={() => {
                  setOpen(false);
                  item.onPress();
                }}
                style={ITEM}
                testID={`home-menu-${item.key}`}
              >
                <AppText variant="bodyStrong">{item.label}</AppText>
              </Pressable>
            ))}
          </View>
        </Modal>
      )}
    </>
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

const BACKDROP = { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 } as const;

/**
 * 하단 바 바로 위, 왼쪽 가장자리에 붙는 목록. 하단 바의 높이(위 여백 12 + 버튼 50 + 아래 여백
 * 34 + 윗선 2)만큼 띄운다 — 보드 `1d` 하단 바의 치수와 같다.
 */
const LIST = {
  position: "absolute",
  left: 20,
  bottom: 12 + BAR_HEIGHT + 34 + 2 + 8,
  minWidth: 160,
  backgroundColor: COLORS.bg,
  borderWidth: 1,
  borderColor: COLORS.text,
} as const;

const ITEM = { paddingVertical: 14, paddingHorizontal: 16 } as const;
