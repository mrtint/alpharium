import { CloudMacbookAIEngine } from "../src/services/aiService";
import { DeviceSignalPackage } from "../src/types/signals";

describe("AI Engine Adapter Unit Tests", () => {
  const sampleSignals: DeviceSignalPackage = {
    date: "2026-08-01",
    totalSteps: 10245,
    sleepDuration: "7시간 20분",
    wifiLocation: "Starbucks_Free",
    timelineLogs: [
      {
        id: "1",
        time: "08:45 AM",
        locationName: "성수동 카페",
        visionCaption: "라떼아트 커피잔",
      },
    ],
  };

  it("should return valid DiaryOutput structure even on network fallback", async () => {
    // Unreachable URL to force fallback test
    const engine = new CloudMacbookAIEngine("http://invalid-localhost-99999.local");
    const result = await engine.generateDiary(sampleSignals);

    expect(result).toBeDefined();
    expect(result.title).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.moodTag).toBeDefined();
    expect(Array.isArray(result.keyLocations)).toBe(true);
    expect(result.keyLocations.length).toBeGreaterThan(0);
  });
});
