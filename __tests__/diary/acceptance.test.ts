/**
 * 출력 판정 계약 테스트.
 *
 * 계약: specs/005-diary-generation/contracts/acceptance.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 파일이 헌법 원칙 I의 마지막 방어선이자 원칙 IV의 자동 방어다.**
 *
 * 002가 `GenerationFailure`에 `text`를 두지 않아 **타입에서** 막았다. `judge()`가
 * **실행에서** 막는다. 둘이 함께 있어야 「그럴듯한 무언가」가 일기 자리에 들어가는 것을
 * 실제로 못 한다.
 *
 * **A-7·A-8이 특히 중요하다.** 판정은 한 번에 무너지지 않는다 — 갈래 하나가 그럴듯한
 * 이유로 늘고, 다음에 또 하나가 늘고, 어느 순간 채점기가 되어 있다. 이 두 테스트가
 * 그것을 자동으로 막는다(FR-018b·c). 사람이 리뷰에서 잡는 것에 기대지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { judge, REJECT_REASONS, type Verdict } from "../../src/diary/acceptance";
import type { Ending } from "../../src/inference/engine-port";
import type { Character } from "../../src/diary/types";

const EOS: Ending = { kind: "eos" };

/** 실제 프롬프트의 고정 줄을 닮은 지시문 */
const INSTRUCTIONS = [
  "너는 주인의 휴대폰이다. 이 글의 '나'는 휴대폰이며 주인이 아니다.",
  "아래에 적힌 기록만이 네가 아는 전부다. 기록에 없는 사물이나 사건을 있었던 것처럼 단언하지 마라.",
];

/** 통과해야 하는 정상 일기 (한국어) */
const GOOD_KO =
  "오늘 주인은 아침부터 어딘가로 나섰다. 사진 세 장이 남았고, 나는 그것 말고는 아무것도 보지 못했다. 아마 즐거웠을 것이다.";

function ask(
  text: string,
  ending: Ending = EOS,
  character: Character = "quiet",
): Verdict {
  return judge(text, ending, character, INSTRUCTIONS);
}

describe("A-1 빈 글은 거부된다 (FR-016a)", () => {
  it.each(["", "   ", "\n\n", "\t \n  \t"])("%j → empty", (text) => {
    const verdict = ask(text);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.why).toBe("empty");
  });

  it("길이 하한을 두지 않는다 — 짧아도 비어 있지 않으면 통과한다", () => {
    // "몇 자 이상이어야 일기인가"는 품질 판단이고 임계값이다(원칙 IV).
    expect(ask("조용한 하루였다.").ok).toBe(true);
  });
});

describe("A-6 정상 일기는 통과한다", () => {
  it("한국어 캐릭터 + eos → ok", () => {
    expect(ask(GOOD_KO).ok).toBe(true);
  });

  it("중국어 캐릭터 + 중국어 글 → ok", () => {
    expect(ask("今天主人出门了。我只看到了三张照片。", EOS, "chinese").ok).toBe(true);
  });

  it("영어 캐릭터 + 영어 글 → ok", () => {
    expect(
      ask("My owner went out today. I only saw three photographs.", EOS, "english").ok,
    ).toBe(true);
  });
});

describe("A-2 되뱉기는 거부된다 (FR-016b-1)", () => {
  it("지시문 한 줄이 그대로 들어 있으면 거부", () => {
    const verdict = ask(`${INSTRUCTIONS[0]}\n\n오늘은 조용한 하루였다.`);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.why).toBe("echo");
  });

  it("지시문이 글 중간에 있어도 거부", () => {
    const verdict = ask(`오늘은 조용했다. ${INSTRUCTIONS[1]} 그리고 잠들었다.`);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.why).toBe("echo");
  });

  it("되뱉은 부분만 잘라내 통과시키지 않는다 (FR-017)", () => {
    // 고쳐서 통과시키면 모델이 쓴 일기가 아니라 우리가 만든 일기가 된다.
    const verdict = ask(`${INSTRUCTIONS[0]}\n\n${GOOD_KO}`);
    expect(verdict.ok).toBe(false);
  });
});

describe("A-2b 오탐이 없다", () => {
  it("정상 일기가 echo로 거부되지 않는다", () => {
    // 오탐이 나면 이 기능 자체가 못 쓰게 된다.
    expect(ask(GOOD_KO).ok).toBe(true);
  });

  it("흔한 짧은 표현이 겹쳐도 통과한다", () => {
    // "나는"·"오늘은" 같은 조각까지 잡으면 모든 일기가 거부된다. 최소 길이가 그 사이다.
    for (const text of [
      "나는 오늘 아무것도 보지 못했다.",
      "주인이 어디 있었는지 나는 모른다.",
      "기록에 남은 것은 사진 한 장뿐이다.",
    ]) {
      expect(ask(text).ok).toBe(true);
    }
  });

  it("지시문과 같은 낱말을 써도 문장이 다르면 통과한다", () => {
    expect(ask("나는 휴대폰이라서 주인의 하루를 조금밖에 알지 못한다.").ok).toBe(true);
  });

  it("지시문이 비어 있으면 echo로 거부하지 않는다", () => {
    expect(judge(GOOD_KO, EOS, "quiet", []).ok).toBe(true);
  });
});

describe("A-3 언어 판정 (FR-016c)", () => {
  const KOREAN = "오늘은 조용한 하루였다.";
  const CHINESE = "今天很安静。";
  const ENGLISH = "It was a quiet day.";

  describe("한국어 캐릭터 셋 — 한글이 있어야 한다", () => {
    it.each(["quiet", "narrative", "imaginative"] as const)("%s", (character) => {
      expect(ask(KOREAN, EOS, character).ok).toBe(true);

      const chinese = ask(CHINESE, EOS, character);
      expect(chinese.ok).toBe(false);
      if (!chinese.ok) expect(chinese.why).toBe("language");

      const english = ask(ENGLISH, EOS, character);
      expect(english.ok).toBe(false);
      if (!english.ok) expect(english.why).toBe("language");
    });
  });

  describe("비대칭이 의도적이다 — 헌법이 못 박은 방향만 금지한다", () => {
    it("한국어 캐릭터는 한자가 섞여도 통과한다", () => {
      // 고유명사에 한자가 섞이는 것은 정상이다. 헌법은 한국어 캐릭터가 다른 문자를
      // 못 쓴다고 말한 적이 없다.
      expect(ask("오늘 주인은 韓國에 있었다.").ok).toBe(true);
    });

    it("한국어 캐릭터는 영어 낱말이 섞여도 통과한다", () => {
      expect(ask("주인은 오늘 cafe에 갔다. 나는 그것만 안다.").ok).toBe(true);
    });

    it("chinese는 한글이 섞이면 거부된다", () => {
      // 헌법: "한국어로는 쓰지 않는다(MUST NOT)"
      const verdict = ask("今天주인은 나갔다。", EOS, "chinese");
      expect(verdict.ok).toBe(false);
      if (!verdict.ok) expect(verdict.why).toBe("language");
    });

    it("english는 한글이 섞이면 거부된다", () => {
      const verdict = ask("Today my owner 나갔다.", EOS, "english");
      expect(verdict.ok).toBe(false);
      if (!verdict.ok) expect(verdict.why).toBe("language");
    });

    it("english는 한자가 섞이면 거부된다", () => {
      expect(ask("Today my owner went to 韓國.", EOS, "english").ok).toBe(false);
    });
  });

  it("chinese가 한자 없이 영어만 쓰면 거부된다", () => {
    expect(ask("It was a quiet day.", EOS, "chinese").ok).toBe(false);
  });

  it("english가 라틴 문자 없이 쓰면 거부된다", () => {
    expect(ask("今天很安静。", EOS, "english").ok).toBe(false);
  });
});

describe("A-4 끝나지 않은 글은 거부된다 (FR-016d, FR-021c)", () => {
  const NOT_EOS: Ending[] = [
    { kind: "length" },
    { kind: "context" },
    { kind: "interrupted" },
    { kind: "timeout" },
  ];

  it.each(NOT_EOS)("$kind → unfinished", (ending) => {
    const verdict = ask(GOOD_KO, ending);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.why).toBe("unfinished");
  });

  it("eos만 정상이다", () => {
    expect(ask(GOOD_KO, { kind: "eos" }).ok).toBe(true);
  });

  it("문자열을 보지 않는다 — 완결돼 보여도 eos가 아니면 거부", () => {
    expect(ask("오늘은 조용한 하루였다. 잘 자라, 주인아.", { kind: "length" }).ok).toBe(
      false,
    );
  });
});

describe("A-5 판정 순서가 정해져 있다", () => {
  // **끊긴 결과에도 거기까지 생성된 text가 들어 있다**(research §2). 다른 판정을 먼저
  // 하면 끊긴 글이 나머지를 통과할 수 있고, 그러면 순서에 의존하는 취약한 방어가 된다.
  it("끊겼고 동시에 되뱉었으면 unfinished다", () => {
    const verdict = ask(`${INSTRUCTIONS[0]}\n\n${GOOD_KO}`, { kind: "interrupted" });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.why).toBe("unfinished");
  });

  it("끊겼고 동시에 비었으면 unfinished다", () => {
    const verdict = ask("", { kind: "interrupted" });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.why).toBe("unfinished");
  });

  it("끊겼고 동시에 언어가 틀렸으면 unfinished다", () => {
    const verdict = ask("It was quiet.", { kind: "timeout" });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.why).toBe("unfinished");
  });

  it("비었고 동시에 되뱉는 것은 불가능하지만, 빈 글이 echo보다 먼저다", () => {
    expect(ask("   ").ok).toBe(false);
  });

  it("같은 입력에 항상 같은 why가 나온다", () => {
    const text = `${INSTRUCTIONS[0]}\n\n${GOOD_KO}`;
    const first = ask(text);
    const second = ask(text);
    expect(first).toEqual(second);
  });
});

describe("A-7 갈래가 넷을 넘지 않는다 (FR-018b) ★ 원칙 IV의 자동 방어", () => {
  it("RejectReason이 정확히 넷이다", () => {
    // **다섯 번째를 넣으면 이 테스트가 깨진다.** 깨지면 contracts/acceptance.md를
    // 먼저 읽고 원칙 IV를 어기지 않는지 따져야 한다.
    expect(REJECT_REASONS).toHaveLength(4);
    expect([...REJECT_REASONS].sort()).toEqual([
      "echo",
      "empty",
      "language",
      "unfinished",
    ]);
  });

  it("판정이 넷 밖의 값을 내지 않는다", () => {
    const inputs: [string, Ending, Character][] = [
      ["", EOS, "quiet"],
      [INSTRUCTIONS[0], EOS, "quiet"],
      ["It was quiet.", EOS, "quiet"],
      [GOOD_KO, { kind: "length" }, "quiet"],
      [GOOD_KO, EOS, "quiet"],
    ];

    for (const [text, ending, character] of inputs) {
      const verdict = judge(text, ending, character, INSTRUCTIONS);
      if (!verdict.ok) expect(REJECT_REASONS).toContain(verdict.why);
    }
  });
});

describe("A-8 Verdict에 수가 없다 (FR-018c) ★ 원칙 IV의 자동 방어", () => {
  it("어떤 갈래에도 number 필드가 없다", () => {
    // **수가 담기면 그것으로 모델을 견주게 된다.** 길이·비율·점수 어느 것도 없어야 한다.
    const verdicts: Verdict[] = [
      ask(GOOD_KO),
      ask(""),
      ask(INSTRUCTIONS[0]),
      ask("It was quiet."),
      ask(GOOD_KO, { kind: "length" }),
    ];

    for (const verdict of verdicts) {
      for (const value of Object.values(verdict)) {
        expect(typeof value).not.toBe("number");
      }
    }
  });

  it("거부된 글이 Verdict에 실려 나오지 않는다 (FR-017c)", () => {
    // 실어 나르면 그것이 text가 새는 경로가 된다.
    const rejected = "이 글은 거부되어야 하고 어디에도 남아서는 안 된다";
    const verdict = judge(rejected, { kind: "length" }, "quiet", INSTRUCTIONS);

    expect(JSON.stringify(verdict)).not.toContain(rejected);
  });

  it("통과한 글도 Verdict에 실리지 않는다", () => {
    // 부르는 쪽이 이미 들고 있으므로 돌려줄 이유가 없다.
    expect(JSON.stringify(ask(GOOD_KO))).not.toContain(GOOD_KO);
  });
});
