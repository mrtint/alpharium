import { render, screen, fireEvent } from "@testing-library/react-native";

import { GeocodingSettingToggle } from "../../src/ui/GeocodingSettingToggle";

/**
 * 장소명 설정 토글 테스트.
 *
 * 계약: specs/017-diary-body-screen/contracts/place-name.md L8
 *
 * **켤 때 고지 문구가 그 자리에서 뜬다**(FR-006) — 좌표를 기기의 지도
 * 서비스에 물어본다는 사실을 그대로 알린다.
 */
describe("GeocodingSettingToggle — 고지 (L8, FR-006)", () => {
  it("꺼진 상태로 렌더된다", async () => {
    await render(<GeocodingSettingToggle enabled={false} onToggle={() => {}} />);

    expect(screen.getByTestId("geocoding-toggle")).toBeTruthy();
  });

  it("누르면 onToggle이 반대 값으로 불린다", async () => {
    const onToggle = jest.fn();
    await render(<GeocodingSettingToggle enabled={false} onToggle={onToggle} />);

    fireEvent.press(screen.getByTestId("geocoding-toggle"));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("켜진 상태에서 누르면 false로 불린다", async () => {
    const onToggle = jest.fn();
    await render(<GeocodingSettingToggle enabled={true} onToggle={onToggle} />);

    fireEvent.press(screen.getByTestId("geocoding-toggle"));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it("켜진 상태에서는 고지 문구가 보인다", async () => {
    await render(<GeocodingSettingToggle enabled={true} onToggle={() => {}} />);

    expect(screen.getByText(/좌표를.*지도 서비스에 물어봅니다/)).toBeTruthy();
  });

  it("꺼진 상태에서는 고지 문구가 없다", async () => {
    await render(<GeocodingSettingToggle enabled={false} onToggle={() => {}} />);

    expect(screen.queryByText(/좌표를.*지도 서비스에 물어봅니다/)).toBeNull();
  });
});
