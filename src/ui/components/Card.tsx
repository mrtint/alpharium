/**
 * 032 — 카드 / 섹션 컨테이너 (contracts/ui-components.md UC2).
 *
 *  - `Card`    — surface 배경 + rounded-card + 얇은 border. 내용을 감싼다.
 *  - `Section` — `Card` + 선택적 `title`(있으면 상단에 `SectionHeader`).
 *
 * 그림자 대신 border로 경계를 준다(안드로이드에서 과한 elevation을 피함 —
 * data-model.md §1.2).
 */

import { View, type ViewProps } from "react-native";

import { COLORS, RADIUS } from "../theme/tokens";
import { SectionHeader } from "./SectionHeader";

export type CardProps = ViewProps & {
  children: React.ReactNode;
  testID?: string;
};

export function Card({ children, style, testID, ...rest }: CardProps) {
  return (
    <View
      className="bg-surface rounded-card border border-border p-4"
      style={[
        {
          backgroundColor: COLORS.surface,
          borderRadius: RADIUS.card,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: 16,
        },
        style,
      ]}
      testID={testID}
      {...rest}
    >
      {children}
    </View>
  );
}

export type SectionProps = CardProps & {
  title?: string;
};

export function Section({ title, children, testID, ...rest }: SectionProps) {
  return (
    <Card testID={testID} {...rest}>
      {title !== undefined && (
        <SectionHeader testID={testID ? `${testID}-title` : undefined}>{title}</SectionHeader>
      )}
      {children}
    </Card>
  );
}
