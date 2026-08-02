/**
 * T016 ⚖️ 원칙 IV — 화자 판정의 성질 (quickstart 시나리오 8a)
 *
 * 판정기는 순수 함수이므로 **모델 없이** 검사한다. 이 파일이 검사하는 것은
 * research.md 결정 1이 확정한 **판정의 성질**이며, 표지 목록의 내용은 T058의 실측이
 * 채운다 — 목록이 비어 있어도 아래 성질은 성립해야 한다.
 *
 * - 004 FR-346 / SC-309: 결정성 — 같은 본문에 항상 같은 결과
 * - 004 FR-347: 내용 비평가 — 같은 화자의 좋은 글과 나쁜 글이 같은 판정
 * - 004 FR-349: 교정 없음 — 참·거짓만 내놓는다
 */
import {
  verifySpeaker,
  EMPTY_MARKERS,
  type SpeakerMarkers,
} from "../../src/speaker/verify";

/** 실측 전의 상태 — 표지 목록이 비어 있다. */
const empty: SpeakerMarkers = EMPTY_MARKERS;

/** 성질 검사를 위한 임시 목록. 실측값이 아니다 (T058이 채운다). */
const probe: SpeakerMarkers = {
  userSpeakerMarkers: ["내 다리가", "나는 기뻤다"],
  phoneSpeakerMarkers: ["주인은"],
};

describe("결정성 (004 FR-346, SC-309)", () => {
  const bodies = [
    "주인은 오늘 많이 걸었다.",
    "내 다리가 아팠다.",
    "",
    "주인은 걸었고 나는 기뻤다.",
  ];

  it.each(bodies)("같은 본문에 반복 판정하면 항상 같은 결과다: %p", (body) => {
    const results = Array.from({ length: 20 }, () => verifySpeaker(body, probe));
    expect(new Set(results.map((r) => r.isPhoneSpeaker)).size).toBe(1);
  });

  it("표지 목록이 같으면 호출 순서와 무관하게 같은 결과다", () => {
    const a = verifySpeaker("주인은 걸었다.", probe);
    const b = verifySpeaker("내 다리가 아팠다.", probe);
    const aAgain = verifySpeaker("주인은 걸었다.", probe);
    expect(aAgain).toEqual(a);
    expect(b.isPhoneSpeaker).not.toEqual(a.isPhoneSpeaker);
  });
});

describe("내용 비평가 (004 FR-347)", () => {
  it("같은 화자의 좋은 글과 나쁜 글이 같은 판정을 받는다", () => {
    const goodPhoneVoice =
      "주인은 아침부터 부지런히 움직였다. 걸음이 늘어나는 것을 보며 나는 오늘이 긴 하루가 되겠다고 짐작했다.";
    const badPhoneVoice = "주인은 걸음. 걸음. 걸음. 끝.";

    expect(verifySpeaker(goodPhoneVoice, probe).isPhoneSpeaker).toBe(
      verifySpeaker(badPhoneVoice, probe).isPhoneSpeaker,
    );
  });

  it("같은 사용자 화자의 좋은 글과 나쁜 글이 같은 판정을 받는다", () => {
    const goodUserVoice = "내 다리가 무거웠지만 오후의 바람이 좋아 조금 더 걸었다.";
    const badUserVoice = "내 다리가 아픔";

    expect(verifySpeaker(goodUserVoice, probe).isPhoneSpeaker).toBe(
      verifySpeaker(badUserVoice, probe).isPhoneSpeaker,
    );
  });

  it("길이·문장 수가 판정에 관여하지 않는다", () => {
    const short = "주인은 걸었다.";
    const long = short.repeat(50);
    expect(verifySpeaker(long, probe).isPhoneSpeaker).toBe(verifySpeaker(short, probe).isPhoneSpeaker);
  });
});

describe("교정 없음 (004 FR-349)", () => {
  it("판정 결과에 고쳐진 본문이 없다", () => {
    const result = verifySpeaker("내 다리가 아팠다.", probe);
    expect(result).not.toHaveProperty("correctedBody");
    expect(result).not.toHaveProperty("body");
    expect(Object.keys(result).sort()).toEqual(["isPhoneSpeaker", "violatingMarkers"]);
  });

  it("판정은 참·거짓이다", () => {
    expect(typeof verifySpeaker("주인은 걸었다.", probe).isPhoneSpeaker).toBe("boolean");
  });
});

describe("표지 목록은 매개변수다 (004 FR-348 — T058이 실측으로 채운다)", () => {
  it("기본 목록은 비어 있다", () => {
    expect(EMPTY_MARKERS.userSpeakerMarkers).toHaveLength(0);
    expect(EMPTY_MARKERS.phoneSpeakerMarkers).toHaveLength(0);
  });

  it("목록이 비면 위반 표지를 찾을 수 없으므로 통과시킨다 — 성질은 그대로 성립한다", () => {
    const r1 = verifySpeaker("내 다리가 아팠다.", empty);
    const r2 = verifySpeaker("내 다리가 아팠다.", empty);
    expect(r1).toEqual(r2);
    expect(r1.violatingMarkers).toHaveLength(0);
  });

  it("위반 표지가 발견되면 무엇이 걸렸는지 돌려준다 — 고치지는 않는다", () => {
    const result = verifySpeaker("내 다리가 아팠다.", probe);
    expect(result.isPhoneSpeaker).toBe(false);
    expect(result.violatingMarkers).toEqual(["내 다리가"]);
  });
});
