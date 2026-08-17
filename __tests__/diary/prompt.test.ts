/**
 * 프롬프트 구성 계약 테스트.
 *
 * 계약: specs/005-diary-generation/contracts/prompt.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 파일이 헌법 원칙 II의 방어선이자 원칙 V의 두 번째 시험대다.**
 *
 * 004가 「관측한 것」과 「관측하지 못한 것」을 값에서 갈랐고, 프롬프트가 그 구분을
 * 언어로 옮긴다. **여기서 뭉개지면 004가 지킨 것이 전부 무의미해진다** — `unknown`을
 * 「0걸음」으로 적는 순간 일기가 "걷지 않았다"는 거짓을 쓴다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { buildPrompt, instructionLines } from "../../src/diary/prompt";
import { buildRequest } from "../../src/diary/request";
import { CHARACTERS, type Character, type DiaryRequest } from "../../src/diary/types";
import type { DaySignals } from "../../src/signals/types";
import { emptyDay, partiallyUnknownDay, richDay, unknownDay } from "../../src/signals/fake";

const DAY = "2026-08-16";

/** 요청 하나를 만든다. buildRequest를 거쳐 실제 경로와 같은 모양을 쓴다. */
function requestFor(signals: DaySignals, character: Character = "quiet"): DiaryRequest {
  const result = buildRequest(signals, character, "none");
  if (!result.ok) throw new Error("테스트 준비 실패: 요청을 만들지 못했다");
  return result.request;
}

describe("P-1 화자 규칙이 항상 있다 (FR-013·013a)", () => {
  // 어떤 캐릭터, 어떤 신호에서도 빠지지 않아야 한다. 빠지는 조합이 하나라도 있으면
  // 그 조합에서 이 앱은 그냥 일기 앱이 된다.
  const days = [richDay(DAY), emptyDay(DAY), unknownDay(DAY), partiallyUnknownDay(DAY)];

  it.each(CHARACTERS)("%s — 화자가 휴대폰이라는 것이 담긴다", (character) => {
    for (const day of days) {
      const prompt = buildPrompt(requestFor(day, character));
      expect(prompt).toContain("휴대폰");
    }
  });

  it("시야가 제한적이라는 것이 담긴다", () => {
    const prompt = buildPrompt(requestFor(richDay(DAY)));
    // 주머니·가방 속에 있어 조금밖에 보지 못한다는 설정(헌법 「이 앱이 무엇인가」)
    expect(prompt).toMatch(/주머니|가방|조금/);
  });

  it("기록에 없는 것을 단언하지 말라는 지시가 담긴다", () => {
    const prompt = buildPrompt(requestFor(richDay(DAY)));
    expect(prompt).toContain("단언");
  });

  it("짐작을 금지하지 않는다 — 원칙 II가 권장한 것이다", () => {
    const prompt = buildPrompt(requestFor(richDay(DAY)));
    // "지어내지 마라"라고 쓰면 모델이 짐작까지 멈춘다. 금지 대상은 단언이지 짐작이
    // 아니며, 프롬프트가 짐작을 허용한다고 말해야 한다.
    expect(prompt).toMatch(/짐작|아마/);
  });
});

describe("P-2 캐릭터에서 오는 것은 언어뿐이다 (FR-014·014a·014b)", () => {
  it("한국어 캐릭터 셋은 한국어로 쓰도록 지시받는다", () => {
    for (const character of ["quiet", "narrative", "imaginative"] as const) {
      expect(buildPrompt(requestFor(richDay(DAY), character))).toContain("한국어");
    }
  });

  it("chinese는 중국어로 쓰고 한국어 지시를 받지 않는다", () => {
    const prompt = buildPrompt(requestFor(richDay(DAY), "chinese"));
    expect(prompt).toContain("중국어");
    expect(prompt).not.toContain("한국어");
  });

  it("english는 영어로 쓰고 한국어 지시를 받지 않는다", () => {
    const prompt = buildPrompt(requestFor(richDay(DAY), "english"));
    expect(prompt).toContain("영어");
    expect(prompt).not.toContain("한국어");
  });

  it("언어 문장을 빼면 다섯 캐릭터의 프롬프트가 같다", () => {
    // **이것이 FR-014의 핵심 검증이다.** 성격 지시("짧게 써라", "감정을 얹어라")가
    // 하나라도 들어가면 이 테스트가 깨진다 — 그 순간 성격이 모델이 아니라 우리가 지어낸
    // 것이 되고 로스터의 근거가 무너진다(원칙 III).
    const stripped = CHARACTERS.map((character) =>
      buildPrompt(requestFor(richDay(DAY), character))
        .split("\n")
        .filter((line) => !/한국어|중국어|영어/.test(line))
        .join("\n"),
    );

    for (const prompt of stripped) expect(prompt).toBe(stripped[0]);
  });
});

describe("P-3 신호의 세 갈래가 서로 다른 말이 된다 (FR-012a·b)", () => {
  it("unknown인 걸음 수가 0으로 적히지 않는다", () => {
    // **이 테스트가 원칙 V의 두 번째 시험대다.** 0으로 적으면 일기가 "걷지 않았다"고
    // 쓰고, 그것이 004가 막은 바로 그 거짓이다.
    const prompt = buildPrompt(requestFor(unknownDay(DAY)));
    expect(prompt).not.toMatch(/0\s*걸음|걸음\s*(수)?\s*[:：]?\s*0/);
  });

  it("unknown은 「모른다」로 전달된다", () => {
    const prompt = buildPrompt(requestFor(unknownDay(DAY)));
    expect(prompt).toMatch(/모른다|알 수 없/);
  });

  it("unknown의 이유가 함께 전달된다", () => {
    // 004가 「왜 모르는지」를 담아 두었다. 그것이 프롬프트까지 와야 휴대폰이
    // "권한이 없어 보지 못했다"와 "안드로이드가 알려주지 않는다"를 구분해 쓸 수 있다.
    const prompt = buildPrompt(requestFor(unknownDay(DAY)));
    expect(prompt).toContain("권한");
  });

  it("none은 「없었다」로 전달되며 unknown과 다른 문장이다", () => {
    const noneP = buildPrompt(requestFor(emptyDay(DAY)));
    const unknownP = buildPrompt(requestFor(unknownDay(DAY)));

    expect(noneP).not.toBe(unknownP);
    // 찾아봤는데 없었던 것은 관측된 사실이고 일기의 내용이 된다.
    expect(noneP).toMatch(/없었다|없다/);
  });

  it("none인 하루가 「모른다」로 적히지 않는다", () => {
    // 뒤집힌 실수도 막는다. 사진 0장을 "모른다"로 적으면 쓸 수 있는 사실을 버리는 것이다.
    const prompt = buildPrompt(requestFor(emptyDay(DAY)));
    const photoSection = prompt.split("\n").filter((l) => l.includes("사진"));
    expect(photoSection.join("\n")).not.toMatch(/모른다|알 수 없/);
  });

  it("known은 관측된 사실로 적힌다", () => {
    const prompt = buildPrompt(requestFor(richDay(DAY)));
    expect(prompt).toContain("3"); // 사진 세 장
  });

  it("한 하루 안에서 세 갈래가 섞여도 각각 옳게 나온다", () => {
    // 실제로 가장 흔한 모양이다 — 사진은 봤고, 위치는 모르고, 연결은 없었다.
    const prompt = buildPrompt(requestFor(partiallyUnknownDay(DAY)));
    expect(prompt).toMatch(/모른다|알 수 없/);
    expect(prompt).toMatch(/없었다|없다/);
  });
});

describe("P-4 관측의 한계가 함께 간다 (FR-012c·d)", () => {
  /** 사진이 상한에 걸려 잘린 하루 */
  function truncatedDay(): DaySignals {
    const base = richDay(DAY);
    return {
      ...base,
      photos: {
        kind: "known",
        value: {
          photos: [{ id: "p1", takenAt: new Date(`${DAY}T09:00:00`) }],
          complete: false,
        },
      },
    };
  }

  it("잘린 사진에 「전부가 아님」이 붙는다 (004 FR-014d)", () => {
    const prompt = buildPrompt(requestFor(truncatedDay()));
    expect(prompt).toMatch(/전부가 아니|더 있을/);
  });

  it("잘린 하루에는 사진 수를 단언하지 말라는 지시가 붙는다", () => {
    // 잘린 목록의 길이는 그날 찍은 수가 아니라 우리가 본 수다.
    const prompt = buildPrompt(requestFor(truncatedDay()));
    expect(prompt).toMatch(/정확한 수|수를 단언/);
  });

  it("잘리지 않은 하루에는 그 경고가 붙지 않는다", () => {
    const prompt = buildPrompt(requestFor(richDay(DAY)));
    expect(prompt).not.toMatch(/전부가 아니/);
  });

  it("사진에서 얻은 자리에 「궤적이 아님」이 붙는다 (004 FR-013e)", () => {
    const prompt = buildPrompt(requestFor(richDay(DAY)));
    expect(prompt).toMatch(/궤적이 아니|사진이 찍힌/);
  });

  it("좌표를 본 사진 수와 물어본 수가 함께 간다", () => {
    // 열 장 중 두 장에만 좌표가 있었다면 visitCount가 1이어도 "하루 종일 한 곳"이
    // 아니라 "좌표를 본 두 장이 같은 곳"이다. 이 차이가 단언과 짐작을 가른다.
    const base = richDay(DAY);
    const signals: DaySignals = {
      ...base,
      places: {
        kind: "known",
        value: {
          trace: { visitCount: 1, approximateDistanceMeters: 0 },
          source: "photo-exif",
          photosWithLocation: 2,
          photosConsidered: 10,
        },
      },
    };
    const prompt = buildPrompt(requestFor(signals));
    expect(prompt).toContain("2");
    expect(prompt).toContain("10");
  });
});

describe("P-5 모델 정보가 없다 (FR-015)", () => {
  it("프롬프트에 모델 식별자·자산 키가 없다", () => {
    // 모델이 자기 정체를 되뱉으면 그것이 화면으로 새는 경로가 된다(원칙 III).
    const forbidden = [
      "kanana",
      "exaone",
      "hyperclovax",
      "qwen",
      "gemma",
      "gguf",
      "Q4_K_M",
      "huggingface",
    ];

    for (const character of CHARACTERS) {
      const prompt = buildPrompt(requestFor(richDay(DAY), character)).toLowerCase();
      for (const word of forbidden) expect(prompt).not.toContain(word.toLowerCase());
    }
  });

  it("캐릭터 식별자 자체도 프롬프트에 없다", () => {
    // "quiet"·"narrative" 같은 내부 식별자가 새면 그것으로 모델을 역추적할 수 있다.
    for (const character of CHARACTERS) {
      const prompt = buildPrompt(requestFor(richDay(DAY), character));
      expect(prompt).not.toContain(character);
    }
  });
});

describe("P-6 결정적이다", () => {
  it("같은 입력이면 같은 문자열", () => {
    // FR-016b-1(되뱉기 판정)이 우리가 보낸 문자열을 알아야 성립한다. 부를 때마다
    // 달라지면 판정이 무엇과 비교할지 모른다.
    const request = requestFor(richDay(DAY));
    expect(buildPrompt(request)).toBe(buildPrompt(request));
  });

  it("시각을 읽지 않는다 — 시간이 흘러도 같다", () => {
    const request = requestFor(richDay(DAY));
    const first = buildPrompt(request);
    jest.useFakeTimers().setSystemTime(new Date("2027-01-01T00:00:00Z"));
    const second = buildPrompt(request);
    jest.useRealTimers();
    expect(second).toBe(first);
  });
});

describe("P-7 두 함수가 같은 상수에서 나온다", () => {
  /** 사진이 잘린 하루 — 조건부 경고가 붙는 쪽 */
  function truncatedDay(): DaySignals {
    const base = richDay(DAY);
    return {
      ...base,
      photos: {
        kind: "known",
        value: {
          photos: [{ id: "p1", takenAt: new Date(`${DAY}T09:00:00`) }],
          complete: false,
        },
      },
    };
  }

  // **이것이 회귀를 막는 장치다.** 프롬프트를 고치면서 판정 쪽을 잊으면 여기서
  // 깨진다 — 잊은 채로 두면 되뱉기 판정이 조용히 무력해진다.
  //
  // **모든 하루 모양에서 성립해야 한다.** 조건부 지시문(잘림 경고·자리 한계)이 있어서
  // 한 모양만 보면 구멍을 놓친다 — 구현 중에 실제로 이 구멍이 드러났다.
  const days: [string, DaySignals][] = [
    ["신호가 많은 하루", richDay(DAY)],
    ["아무것도 없던 하루", emptyDay(DAY)],
    ["아무것도 모르는 하루", unknownDay(DAY)],
    ["일부만 아는 하루", partiallyUnknownDay(DAY)],
    ["사진이 잘린 하루", truncatedDay()],
  ];

  it.each(days)("%s — 지시문의 모든 줄이 프롬프트에 들어 있다", (_label, signals) => {
    const request = requestFor(signals);
    const prompt = buildPrompt(request);
    for (const line of instructionLines(request)) {
      expect(prompt).toContain(line);
    }
  });

  it("지시문에 신호 값이 섞이지 않는다", () => {
    // 신호가 들어간 줄은 일기에 자연스럽게 나올 수 있으므로 비교 대상이면 오탐이 된다.
    // 사진 수·장소 수 같은 값이 지시문에 들어 있으면 안 된다.
    for (const [, signals] of days) {
      for (const line of instructionLines(requestFor(signals))) {
        expect(line).not.toMatch(/\d+장|\d+곳|\d+걸음|\d+%|\d+분/);
      }
    }
  });

  it("조건부 지시문도 빠짐없이 비교 대상이 된다", () => {
    // **구현 중에 드러난 구멍이다.** 잘림 경고를 목록에서 빼면 모델이 그 줄을 그대로
    // 되뱉어도 잡지 못한다. 잘린 하루에서는 그 줄이 목록에 있어야 한다.
    const truncated = requestFor(truncatedDay());
    expect(instructionLines(truncated).join("\n")).toMatch(/전부가 아니/);

    // 반대로 잘리지 않은 하루에서는 없어야 한다 — 프롬프트에 없는 줄을 비교하면
    // P-7이 거짓으로 깨진다.
    const whole = requestFor(richDay(DAY));
    expect(instructionLines(whole).join("\n")).not.toMatch(/전부가 아니/);
  });

  it("지시문이 비어 있지 않다", () => {
    // 빈 목록이면 되뱉기 판정이 아무것도 못 잡는다.
    for (const [, signals] of days) {
      expect(instructionLines(requestFor(signals)).length).toBeGreaterThan(0);
    }
  });
});
