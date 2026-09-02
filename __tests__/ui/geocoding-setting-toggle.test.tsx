import { render, screen, fireEvent } from "@testing-library/react-native";

import { GeocodingSettingToggle } from "../../src/ui/GeocodingSettingToggle";

/**
 * 장소명 설정 3-상태 선택 테스트 (029).
 *
 * 계약: specs/017-diary-body-screen/contracts/place-name.md L8
 *       specs/029-writing-flow-simplification/contracts/settings-sections.md S3 (ST2·ST5)
 *
 * 029에서 boolean 토글에서 자동/켬/끔 3-상태로 바뀌었다. 켜짐·자동일 때 고지 문구,
 * 끔일 때 없음.
 */
describe("GeocodingSettingToggle — 3-상태 (029 S3)", () => {
  it('세 선택지가 렌더되고 "자동"이 선택 가능하다', async () => {
    await render(<GeocodingSettingToggle mode="auto" onSelect={() => {}} />);
    expect(screen.getByTestId("geocoding-auto")).toBeTruthy();
    expect(screen.getByTestId("geocoding-on")).toBeTruthy();
    expect(screen.getByTestId("geocoding-off")).toBeTruthy();
  });

  it('"켬"을 누르면 onSelect("on")이 불린다 (SS9)', async () => {
    const onSelect = jest.fn();
    await render(<GeocodingSettingToggle mode="auto" onSelect={onSelect} />);
    fireEvent.press(screen.getByTestId("geocoding-on"));
    expect(onSelect).toHaveBeenCalledWith("on");
  });

  it('"끔"을 누르면 onSelect("off")이 불린다', async () => {
    const onSelect = jest.fn();
    await render(<GeocodingSettingToggle mode="on" onSelect={onSelect} />);
    fireEvent.press(screen.getByTestId("geocoding-off"));
    expect(onSelect).toHaveBeenCalledWith("off");
  });

  it('"자동"·"켬"에서는 고지 문구가 보인다 (L8, FR-006)', async () => {
    await render(<GeocodingSettingToggle mode="auto" onSelect={() => {}} />);
    expect(screen.getByText(/좌표를.*지도 서비스에 물어봅니다/)).toBeTruthy();
  });

  it('"끔"에서는 고지 문구가 없다', async () => {
    await render(<GeocodingSettingToggle mode="off" onSelect={() => {}} />);
    expect(screen.queryByText(/좌표를.*지도 서비스에 물어봅니다/)).toBeNull();
  });

  it("선택된 항목에 표식이 있다", async () => {
    await render(<GeocodingSettingToggle mode="on" onSelect={() => {}} />);
    // "켬" 행에 "선택" 표식.
    expect(screen.getByText("선택")).toBeTruthy();
  });
});
