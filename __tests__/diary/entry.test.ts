/**
 * DiaryEntry 계약 테스트.
 *
 * 계약: specs/002-diary-pipeline-contracts/contracts/diary.md 「DiaryEntry」
 *
 * **이 타입이 헌법 원칙 III·IV를 어기기 가장 쉬운 자리다.** 모델 이름을 담고 싶어지고,
 * "생성에 몇 초 걸렸는지"를 담고 싶어진다. 뒤쪽은 무해해 보이지만 그것이 모델 비교의
 * 시작점이 된다(원칙 IV). 이 파일이 두 유혹을 모두 막는다.
 */

import type { DiaryEntry } from "../../src/diary/types";
import { richDay } from "../../src/signals/fake";

/** 일기 하나. 실제 생성은 다음 기능이므로 모양만 만든다. */
const entry: DiaryEntry = {
  date: "2026-08-12",
  text: "오늘 주인은 네 곳을 다녔다. 사진이 세 장 남았다.",
  character: "quiet",
  signalsUsed: richDay("2026-08-12"),
  createdAt: new Date("2026-08-13T04:10:00"),
};

describe("DiaryEntry — 필드 구성", () => {
  it("다섯 필드뿐이다 — 그 외의 자리가 없다", () => {
    expect(Object.keys(entry).sort()).toEqual([
      "character",
      "createdAt",
      "date",
      "signalsUsed",
      "text",
    ]);
  });

  it("signalsUsed가 있어 무엇을 보고 쓰였는지 되짚을 수 있다 (FR-011)", () => {
    expect(entry.signalsUsed.date).toBe("2026-08-12");
    expect(entry.signalsUsed.photos.kind).toBe("known");
  });

  it("어떤 캐릭터가 썼는지 남는다 — 다음 기능이 화자를 잃지 않게", () => {
    expect(entry.character).toBe("quiet");
  });
});

describe("모델 식별자를 담지 않는다 (FR-013, 원칙 III)", () => {
  const FORBIDDEN_MODEL = [
    "kanana",
    "exaone",
    "hyperclovax",
    "qwen",
    "gemma",
    "llama",
    "gguf",
    "q4_k",
    "1.7b",
    "2.4b",
    "quantiz",
    "modelpath",
    "modelid",
  ];

  it("일기를 직렬화해도 모델 이름이 나오지 않는다", () => {
    const serialized = JSON.stringify(entry).toLowerCase();

    for (const forbidden of FORBIDDEN_MODEL) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("모델을 가리키는 필드 이름이 없다", () => {
    const keys = Object.keys(entry).map((k) => k.toLowerCase());

    for (const key of keys) {
      expect(key).not.toContain("model");
      expect(key).not.toContain("backend");
      expect(key).not.toContain("quant");
    }
  });
});

describe("측정 지표를 담지 않는다 (원칙 IV)", () => {
  /**
   * "생성에 몇 초 걸렸는지"를 넣고 싶어지는 자리다. 넣으면 모델 비교가 시작되고,
   * 그것이 헌법 원칙 IV가 금지한 측정 장치다. 필요하면 별도 저장소에서 한다.
   */
  const FORBIDDEN_METRIC = [
    "score",
    "elapsed",
    "duration",
    "tokenspersec",
    "benchmark",
    "latency",
    "quality",
    "rating",
    "ms",
  ];

  it("속도·점수·품질 필드가 없다", () => {
    const keys = Object.keys(entry).map((k) => k.toLowerCase());

    for (const key of keys) {
      for (const forbidden of FORBIDDEN_METRIC) {
        expect(key).not.toContain(forbidden);
      }
    }
  });

  it("createdAt은 시각이지 소요 시간이 아니다", () => {
    // 언제 만들어졌는지는 일기의 사실이고, 얼마나 걸렸는지는 모델의 성능이다.
    expect(entry.createdAt).toBeInstanceOf(Date);
    expect(Object.keys(entry)).not.toContain("generationMs");
  });
});

describe("실패는 DiaryEntry가 되지 않는다 (FR-012)", () => {
  it("text는 필수이며 옵셔널이 아니다 — 빈 본문의 일기를 만들 수 없다", () => {
    // text가 옵셔널이면 "본문 없는 일기"가 타입으로 가능해진다.
    // 아래가 컴파일된다는 것 자체가 text 필수를 뜻한다(tsc가 lint에서 검사한다).
    expect(typeof entry.text).toBe("string");
    expect(entry.text.length).toBeGreaterThan(0);
  });
});
