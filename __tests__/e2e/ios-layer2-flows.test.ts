import { LAYER2_FLOWS as ANDROID_FLOWS } from "../../scripts/layer2/flows";
import { IOS_LAYER2_FLOWS } from "../../scripts/layer2-ios/flows";

/**
 * 095 — iOS 층 2 흐름 표. 안드로이드 `LAYER2_FLOWS`와 출발 상태·쓴 날·이야기가 같고, 사람이 눌러야 하는 것만 더한다.
 *
 * 계약: specs/095-ios-e2e-suite/data-model.md 「Layer2IosFlow」
 */

const NOW = new Date(2026, 9, 22, 14, 30);

describe("iOS 층 2 흐름 표 (095)", () => {
  it("흐름 id 넷이 순서대로 있다", () => {
    expect(IOS_LAYER2_FLOWS.map((f) => f.id)).toEqual([
      "write-and-read",
      "open-app-writes",
      "diagnostics-try-write",
      "first-run-auto-diary",
    ]);
  });

  it("안드로이드 층 2 흐름과 이야기·쓴 날·출발 상태가 같다 (복제 아닌 재사용)", () => {
    for (const ios of IOS_LAYER2_FLOWS) {
      const android = ANDROID_FLOWS.find((a) => a.file === `.maestro/layer2-${ios.id}.yml`);
      expect(android).toBeDefined();
      expect(ios.story).toBe(android!.story);
      expect(ios.writtenDay).toBe(android!.writtenDay);
      expect(ios.absentDays).toEqual(android!.absentDays);
      expect(ios.deleteFiles).toEqual(android!.deleteFiles);
      expect(ios.preferenceOverrides(NOW)).toEqual(android!.preferenceOverrides(NOW));
    }
  });

  it("앱을 열면 쓰기만 사람 조작이 없다 — 나머지는 번호 매긴 안내문이 있다", () => {
    for (const flow of IOS_LAYER2_FLOWS) {
      if (flow.id === "open-app-writes") expect(flow.humanSteps).toEqual([]);
      else {
        expect(flow.humanSteps.length).toBeGreaterThan(0);
        expect(flow.humanSteps.every((s) => s.trim() !== "")).toBe(true);
      }
    }
  });

  it("대기 한도 기본값은 조작 5분·생성 10분이다 (clarify)", () => {
    for (const flow of IOS_LAYER2_FLOWS) {
      expect(flow.operationTimeoutMs).toBe(5 * 60_000);
      expect(flow.generationTimeoutMs).toBe(10 * 60_000);
    }
  });

  it("사진을 심는 흐름은 어제를 쓰는 둘뿐이다 (같은 날 재시딩 방지의 대상)", () => {
    const seeds = IOS_LAYER2_FLOWS.filter((f) => f.seedsPhotos).map((f) => f.id);
    expect(seeds).toEqual(["write-and-read", "open-app-writes"]);
  });
});
