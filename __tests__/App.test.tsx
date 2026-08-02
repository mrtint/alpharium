/**
 * 앱 진입 — 오늘 자리에 도달하는가 (006 FR-501).
 *
 * 순수 렌더 검사이므로 원칙 IV의 선행 테스트 대상이 아니다. 축의 계약은 각
 * contract 테스트가 이미 닫았다.
 */
import React from "react";
import { render } from "@testing-library/react-native";
import App from "../App";

// 헌법 원칙 I 개발 예외 — 어댑터 선택은 이 값으로 갈린다. 값이 없으면 `selectEngine`이
// 던지는 것이 정상이다(원칙 II — mock 경로가 없다).
process.env.EXPO_PUBLIC_AI_MODE = "CLOUD";
process.env.EXPO_PUBLIC_AI_API_BASE_URL = "https://example.test/v1";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  multiSet: jest.fn(async () => undefined),
  multiRemove: jest.fn(async () => undefined),
  getAllKeys: jest.fn(async () => []),
}));

describe("<App />", () => {
  it("앱을 열면 오늘 자리에 도달한다 (006 FR-501)", async () => {
    const { findByTestId } = render(<App />);
    // 퍼소나 부여와 어댑터 선택이 끝나면 오늘 자리가 나타난다.
    expect(await findByTestId("today-generate")).toBeTruthy();
  });
});
