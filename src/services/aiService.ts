import { DeviceSignalPackage, DiaryOutput } from "../types/signals";

export interface AIEngine {
  generateDiary(signals: DeviceSignalPackage): Promise<DiaryOutput>;
}

// 1. 개발/테스트용 맥북 API 호스트 연동 어댑터
export class CloudMacbookAIEngine implements AIEngine {
  private baseUrl: string;

  constructor(
    baseUrl: string = process.env.EXPO_PUBLIC_AI_API_BASE_URL ||
      "https://macbook.yattle-mora.ts.net/v1",
  ) {
    this.baseUrl = baseUrl;
  }

  async generateDiary(signals: DeviceSignalPackage): Promise<DiaryOutput> {
    const t0 = Date.now();
    const prompt = `다음은 오늘 스마트폰에서 수집된 개인 일상 신호 기록입니다:
- 날짜: ${signals.date}
- 총 걸음수: ${signals.totalSteps.toLocaleString()}보
- 수면시간: ${signals.sleepDuration}
- 주요 Wi-Fi: ${signals.wifiLocation}

[타임라인 활동 및 사진 로그]
${signals.timelineLogs.map((log) => `- [${log.time}] ${log.locationName}\n  * 사진 시각분석: ${log.visionCaption}`).join("\n")}

위 기록을 바탕으로 1인칭 시점의 따뜻한 감성 한국어 일기를 작성해줘.
다음 JSON 형식으로만 답변해줘:
{
  "title": "일기 제목",
  "content": "일기 본문 내용 (3~4문장)",
  "moodTag": "오늘의 감정 태그",
  "keyLocations": ["장소1", "장소2"]
}`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "exaone3.5:7.8b",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`API HTTP Error: ${response.status}`);
      }

      const json = await response.json();
      const rawText = json.choices[0]?.message?.content || "";
      const t1 = Date.now();
      const totalDurationMs = t1 - t0;

      // JSON 파싱 시도 (LLM 응답에서 JSON 추출)
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || "오늘의 일기",
          content: parsed.content || rawText,
          moodTag: parsed.moodTag || "평온함",
          keyLocations: parsed.keyLocations || ["성수동 카페", "한강공원"],
          totalDurationMs,
        };
      }

      return {
        title: "오늘의 일기",
        content: rawText,
        moodTag: "보람참",
        keyLocations: ["성수동", "한강공원"],
        totalDurationMs,
      };
    } catch (error) {
      console.warn("맥북 API 호스트 연결 불가, Fallback Mock 데이터로 처리합니다:", error);
      const t1 = Date.now();
      return {
        title: "성수동의 아침과 한강 바람으로 가득 채운 하루",
        content: `오늘 아침은 성수동 카페에서 따뜻한 라떼아트 한 잔으로 여유롭게 시작했다. 오후엔 동료들과 함께 원목 식당에서 웃음꽃을 피우며 점심을 먹었다. 저녁엔 한강공원으로 나가 무려 ${signals.totalSteps.toLocaleString()}보나 뛰었더니 온몸이 상쾌해졌다. 소소하지만 충만했던 하루!`,
        moodTag: "상쾌함 & 감사",
        keyLocations: ["성수동 카페", "강남역", "한강공원"],
        totalDurationMs: t1 - t0,
      };
    }
  }
}

// 기본 수출 어댑터
export const defaultAIEngine: AIEngine = new CloudMacbookAIEngine();
