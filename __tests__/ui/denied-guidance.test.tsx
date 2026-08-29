import { render, screen } from "@testing-library/react-native";

import { AutoDiarySettingsScreen } from "../../src/ui/AutoDiarySettingsScreen";
import { DiaryListScreen } from "../../src/ui/DiaryListScreen";
import { DEFAULT_AUTO_DIARY_SETTINGS } from "../../src/schedule/settings";
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

describe("AutoDiarySettingsScreen — 알림·배터리 안내 (FR-014)", () => {
  it("notificationDenied면 알림 권한 안내가 보인다 (020 N8 유지)", async () => {
    await render(
      <AutoDiarySettingsScreen
        settings={DEFAULT_AUTO_DIARY_SETTINGS}
        onToggleEnabled={() => {}}
        onChangeTargetHour={() => {}}
        onOpenBatterySettings={() => {}}
        notificationDenied
      />,
    );
    expect(screen.getByText(/알림 권한이 없어/)).toBeTruthy();
  });

  it("배터리 지연 경고가 상시 보인다 (배터리 예외 설정 버튼은 여기 없음 — D1)", async () => {
    await render(
      <AutoDiarySettingsScreen
        settings={DEFAULT_AUTO_DIARY_SETTINGS}
        onToggleEnabled={() => {}}
        onChangeTargetHour={() => {}}
        onOpenBatterySettings={() => {}}
      />,
    );
    // 020의 기존 배터리 링크(open-battery-settings)는 유지된다 —
    // FR-018의 상시 링크. 021 D1은 "PermissionsSection에도 중복으로 두지 않는다"이지
    // AutoDiarySettingsScreen에서 빼라는 것이 아니다(이 화면의 링크는 020 E4).
    expect(screen.getByTestId("open-battery-settings")).toBeTruthy();
  });
});

describe("DiaryListScreen — deniedNotices 배너 (FR-014, SC-004)", () => {
  const photoDenied = PERMISSION_REQUIREMENTS.find((r) => r.key === "photos")!.ifDenied;
  const locDenied = PERMISSION_REQUIREMENTS.find((r) => r.key === "photo-location")!.ifDenied;

  it("deniedNotices가 있으면 그 문구들이 상단에 보인다", async () => {
    await render(
      <DiaryListScreen
        items={[]}
        onOpen={() => {}}
        onWrite={() => {}}
        deniedNotices={[photoDenied, locDenied]}
      />,
    );
    expect(screen.getByTestId("denied-notices")).toBeTruthy();
    expect(screen.getByText(photoDenied)).toBeTruthy();
    expect(screen.getByText(locDenied)).toBeTruthy();
  });

  it("deniedNotices가 비었으면 배너가 없다", async () => {
    await render(
      <DiaryListScreen items={[]} onOpen={() => {}} onWrite={() => {}} deniedNotices={[]} />,
    );
    expect(screen.queryByTestId("denied-notices")).toBeNull();
  });

  it("deniedNotices 미지정이면 배너가 없다 (006~020 기존 호출 호환)", async () => {
    await render(<DiaryListScreen items={[]} onOpen={() => {}} onWrite={() => {}} />);
    expect(screen.queryByTestId("denied-notices")).toBeNull();
  });
});
