import { render, screen } from "@testing-library/react-native";

import { DiaryListScreen } from "../../src/ui/DiaryListScreen";
import { PERMISSION_REQUIREMENTS } from "../../src/onboarding/requirements";

/**
 * 거부된 권한으로 제한되는 기능의 정직한 안내 (021).
 *
 * 계약: specs/021-unified-permission-onboarding/contracts/onboarding-screen.md
 *       S3
 *       spec.md FR-014, SC-004
 *
 * 020 N8("알림 권한 없어 완성 알릴 수 없다")의 일반화. **문구는
 * `PERMISSION_REQUIREMENTS[...].ifDenied`에서 온다**(중복 정의 없음).
 */

// CI 러너(2코어)에서 `jest-expo` 첫 `render()`가 기본 5초를 넘길 수 있다.
jest.setTimeout(30000);

// 056 — 옛 자동 생성 화면(`AutoDiarySettingsScreen`)과 그 아래의 알림 거부 안내(020 N8)를 걷었다(056 FR-033) — 설정의
// 「권한 · 휴대폰 설정으로 이동」 묶음의 알림 행 「허용 안 함」이 같은 사실을 말한다(settings-screen.test.tsx C4·C5).

describe("DiaryListScreen — deniedNotices 배너 (FR-014, SC-004)", () => {
  const photoDenied = PERMISSION_REQUIREMENTS.find((r) => r.key === "photos")!.ifDenied;
  // 031 — photo-location 항목이 제거됐으므로 location의 ifDenied로 두 번째 문구를 만든다.
  const locDenied = PERMISSION_REQUIREMENTS.find((r) => r.key === "location")!.ifDenied;

  it("deniedNotices가 있으면 그 문구들이 상단에 보인다", async () => {
    await render(
      <DiaryListScreen
        items={[]}

        onWrite={() => {}}
        deniedNotices={[photoDenied, locDenied]}
      />,
    );
    expect(screen.getByTestId("denied-notices")).toBeTruthy();
    expect(screen.getByText(photoDenied)).toBeTruthy();
    expect(screen.getByText(locDenied)).toBeTruthy();
  });

  it("deniedNotices가 비었으면 배너가 없다", async () => {
    await render(<DiaryListScreen items={[]} onWrite={() => {}} deniedNotices={[]} />);
    expect(screen.queryByTestId("denied-notices")).toBeNull();
  });

  it("deniedNotices 미지정이면 배너가 없다 (006~020 기존 호출 호환)", async () => {
    await render(<DiaryListScreen items={[]} onWrite={() => {}} />);
    expect(screen.queryByTestId("denied-notices")).toBeNull();
  });
});
