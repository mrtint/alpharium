import { render, screen, waitFor } from "@testing-library/react-native";

import type { SelectionState } from "../../src/app/selection";
import type { EnvironmentResolution } from "../../src/config/types";
import { memoryStore } from "../../src/diary/store";
import type { DiaryEntry } from "../../src/diary/types";
import type { DaySignals } from "../../src/signals/types";
import { DiaryHomeScreen } from "../../src/ui/DiaryHomeScreen";

/**
 * 일기 홈 화면 — 알림을 눌러 열렸을 때 (020).
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/notification.md N6
 *       spec.md FR-006·FR-007·SC-004
 *
 * **`initialDay`가 주어지면 첫 화면이 목록이 아니라 상세다**(FR-006) — 탭
 * 1회로 상세에 도달한다(SC-004). 상세 진입 시 그 하루의 알림을 확인
 * 처리한다(FR-007 (2)).
 */

jest.setTimeout(30000);

const resolved: EnvironmentResolution = { ok: true, environment: "dev" };
const DAY = "2026-08-19";

const signals: DaySignals = {
  date: DAY,
  photos: { kind: "unknown", reason: "권한이 없다" },
  places: { kind: "unknown", reason: "위치 권한이 없다" },
  steps: { kind: "unknown", reason: "안드로이드가 기간 걸음 수를 주지 않는다" },
  battery: { kind: "unknown", reason: "기록이 없다" },
  connectivity: { kind: "unknown", reason: "기록이 없다" },
};

const entry: DiaryEntry = {
  date: DAY,
  text: "조용한 하루였다.",
  title: "조용한 하루",
  character: "quiet",
  signalsUsed: signals,
  createdAt: new Date("2026-08-20T05:00:00Z"),
};

const selected: SelectionState = { kind: "selected", character: "quiet" };

async function renderWith(
  opts: { initialDay?: string | null; onAcknowledge?: (day: string) => void; seed?: boolean } = {},
) {
  const store = memoryStore();
  if (opts.seed !== false) await store.save(entry);
  await render(
    <DiaryHomeScreen
      pipeline={undefined}
      resolution={resolved}
      selection={selected}
      store={store}
      initialDay={opts.initialDay ?? null}
      onAcknowledge={opts.onAcknowledge}
    />,
  );
  return store;
}

describe("initialDay가 있으면 상세가 첫 화면이다 (FR-006, SC-004)", () => {
  it("목록 헤더를 거치지 않고 그 하루의 전문이 바로 보인다", async () => {
    await renderWith({ initialDay: DAY });

    // 상세의 「← 목록」 버튼이 있다 = 상세 화면이다.
    await waitFor(() => expect(screen.getByText("← 목록")).toBeTruthy());
    expect(screen.getByText("조용한 하루였다.")).toBeTruthy();
  });

  it("상세 진입 시 onAcknowledge(day)가 불린다 (FR-007 (2))", async () => {
    const onAcknowledge = jest.fn();
    await renderWith({ initialDay: DAY, onAcknowledge });

    await waitFor(() => expect(onAcknowledge).toHaveBeenCalledWith(DAY));
  });
});

describe("initialDay가 없으면 기존대로 목록이다 (회귀 없음)", () => {
  it("목록 제목이 보이고 상세로 튕기지 않는다", async () => {
    const onAcknowledge = jest.fn();
    await renderWith({ initialDay: null, onAcknowledge });

    await waitFor(() => expect(screen.getByText("일기 쓰기")).toBeTruthy());
    expect(screen.queryByText("← 목록")).toBeNull();
    expect(onAcknowledge).not.toHaveBeenCalled();
  });
});

describe("initialDay가 저장소에 없으면 조용히 목록으로 (원칙 V)", () => {
  it("상세로 가지 않고 onAcknowledge도 안 불린다", async () => {
    const onAcknowledge = jest.fn();
    await renderWith({ initialDay: "2020-01-01", onAcknowledge });

    await waitFor(() => expect(screen.getByText("일기 쓰기")).toBeTruthy());
    expect(screen.queryByText("← 목록")).toBeNull();
    expect(onAcknowledge).not.toHaveBeenCalled();
  });
});
