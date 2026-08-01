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

  // fetch를 모킹해 실제 네트워크에 나가지 않도록 한다.
  // 실제 호출은 DNS 타임아웃(약 10초)에 걸려 테스트가 불안정해진다.
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const mockFetchOnce = (impl: () => Promise<unknown>) => {
    global.fetch = jest.fn(impl) as unknown as typeof fetch;
  };

  const chatCompletionResponse = (content: string) => ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  });

  it("파싱 가능한 JSON 응답을 DiaryOutput으로 변환한다", async () => {
    mockFetchOnce(async () =>
      chatCompletionResponse(
        JSON.stringify({
          title: "성수동에서 시작한 하루",
          content: "아침 햇살이 좋았다.",
          moodTag: "평온함",
          keyLocations: ["성수동 카페"],
        }),
      ),
    );

    const engine = new CloudMacbookAIEngine("http://mock.invalid/v1");
    const result = await engine.generateDiary(sampleSignals);

    expect(result.title).toBe("성수동에서 시작한 하루");
    expect(result.content).toBe("아침 햇살이 좋았다.");
    expect(result.moodTag).toBe("평온함");
    expect(result.keyLocations).toEqual(["성수동 카페"]);
    expect(typeof result.totalDurationMs).toBe("number");
  });

  it("수집된 신호를 프롬프트에 담아 요청한다", async () => {
    mockFetchOnce(async () => chatCompletionResponse("{}"));

    const engine = new CloudMacbookAIEngine("http://mock.invalid/v1");
    await engine.generateDiary(sampleSignals);

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("http://mock.invalid/v1/chat/completions");

    const prompt = JSON.parse(init.body).messages[0].content;
    expect(prompt).toContain("10,245");
    expect(prompt).toContain("성수동 카페");
    expect(prompt).toContain("라떼아트 커피잔");
  });

  it("네트워크 실패 시에도 DiaryOutput 형태를 유지한다", async () => {
    mockFetchOnce(async () => {
      throw new TypeError("fetch failed");
    });
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const engine = new CloudMacbookAIEngine("http://mock.invalid/v1");
    const result = await engine.generateDiary(sampleSignals);

    expect(result.title).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.moodTag).toBeDefined();
    expect(Array.isArray(result.keyLocations)).toBe(true);
    expect(result.keyLocations.length).toBeGreaterThan(0);
  });

  it("HTTP 오류 응답도 실패로 처리한다", async () => {
    mockFetchOnce(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const engine = new CloudMacbookAIEngine("http://mock.invalid/v1");
    const result = await engine.generateDiary(sampleSignals);

    expect(result.title).toBeDefined();
    expect(Array.isArray(result.keyLocations)).toBe(true);
  });
});
