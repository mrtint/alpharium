/**
 * 032 — 섹션 제목 (contracts/ui-components.md UC4).
 *
 * `AppText`의 `sectionTitle` variant 래퍼. 설정 탭의 "일기 작성자"·"권한" 같은
 * 섹션 머리글에 쓴다.
 */

import type { TextProps } from "react-native";

import { AppText } from "./Text";

export type SectionHeaderProps = Omit<TextProps, "children"> & {
  children: React.ReactNode;
  testID?: string;
};

export function SectionHeader({ children, testID, ...rest }: SectionHeaderProps) {
  return (
    <AppText variant="sectionTitle" testID={testID} {...rest}>
      {children}
    </AppText>
  );
}
