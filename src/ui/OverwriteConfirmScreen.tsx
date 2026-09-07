/**
 * 덮어쓰기 확인 화면.
 *
 * 계약: specs/012-today-diary/contracts/overwrite-confirm.md §2
 *       specs/034-enduser-nativewind-migration/contracts/enduser-screen-migration.md
 *       ES1·ES3·ES6·ES11
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **그리기만 한다.** 판정은 `state.ts`가 한다 — `confirm-overwrite` 상태를 받아
 * 날짜·확인·취소만 그린다.
 *
 * **props에 `entry`가 없다**(X1, 원칙 I). 담으면 이 화면이 「확인 대신 미리보기」로
 * 미끄러질 수 있다. 진행률·경과 시간도 없다(X2, 원칙 IV) — 이 화면은 아직 생성을
 * 시작하지 않은 상태다. 모델 이름·캐릭터 내부 식별자도 없다(X3, 원칙 III).
 *
 * 034 — 「취소」/「확인」을 공용 `Button`으로. `Button`이 padding·border·radius·
 * 눌림 피드백을 내장한다(기본 `paddingVertical: 12`라 현행 10보다 소폭 커지나,
 * 중앙 정렬 통짜 뷰이고 Maestro가 문안으로만 조회해 도달에 영향 없음 —
 * data-model.md §3).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { View } from "react-native";

import { AppText } from "./components/Text";
import { Button } from "./components/Button";
import type { DayDate } from "../config/day-boundary";

export type OverwriteConfirmScreenProps = {
  day: DayDate;
  onCancel: () => void;
  onConfirm: () => void;
};

export function OverwriteConfirmScreen({ day, onCancel, onConfirm }: OverwriteConfirmScreenProps) {
  return (
    <View className="flex-1 justify-center" style={CONTAINER}>
      <AppText variant="body" style={{ opacity: 0.6 }}>
        {day}
      </AppText>
      <AppText variant="body">이 날의 일기가 이미 있다. 덮어쓸지 확인이 필요하다</AppText>

      <View className="flex-row gap-3 mt-2" style={ACTIONS}>
        <Button variant="secondary" onPress={onCancel}>
          취소
        </Button>
        <Button variant="primary" onPress={onConfirm}>
          확인
        </Button>
      </View>
    </View>
  );
}

/**
 * 034 — 레이아웃 관용값만(색·타이포는 `AppText`·`Button`이 토큰에서 가져온다).
 * NativeWind 변환은 Metro 시점이라 jest에 없으므로 인라인 `style`을 함께 준다.
 */
const CONTAINER = { flex: 1, justifyContent: "center", padding: 24, gap: 16 } as const;

const ACTIONS = { flexDirection: "row", gap: 12, marginTop: 8 } as const;
