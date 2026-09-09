/**
 * E2SN 프롬프트 재구성 계약 테스트 (036).
 *
 * 계약: specs/036-diary-concept-prompt/contracts/prompt-e2sn.md (E1~E8)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 리포트 §5.6 결정 12(E2SN 채택) + 헌법 1.5.0을 `src/diary/prompt.ts`에 옮긴 것을
 * 잠근다. 한국어 캐릭터(quiet·narrative·imaginative)는 새 머리 + 문장형 신호 +
 * 감싼 캡션, chinese·english는 현행 유지.
 *
 * my-ollama `buildCandidate('E2SN', …)` 바이트 대조는 이 파일이 아니라
 * quickstart.md §3(verify-036.mjs)에서 한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildPrompt, instructionLines, promptPrefix } from "../../src/diary/prompt";
import { buildRequest } from "../../src/diary/request";
import { CHARACTERS, type Character, type CustomNames, type DiaryRequest } from "../../src/diary/types";
import type { DaySignals } from "../../src/signals/types";

const DAY = "2026-01-15";
// 037 — 로스터의 한국어 캐릭터. 로스터가 늘면 자동으로 는다(FR-014).
const KO_CHARACTERS: readonly Character[] = CHARACTERS;
const PROMPT_SRC = readFileSync(join(__dirname, "../../src/diary/prompt.ts"), "utf8");
/** 주석을 걷어낸 소스 — 이 저장소 주석은 무엇을 왜 금지하는지 적으므로 금지어가 등장한다. */
const PROMPT_CODE = PROMPT_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

function req(
  signals: DaySignals,
  character: Character = "quiet",
  opts: { day?: string; now?: Date; customNames?: CustomNames; placeName?: string } = {},
): DiaryRequest {
  const r = buildRequest(signals, character, "none", opts.day, opts.now, opts.customNames);
  if (!r.ok) throw new Error("테스트 준비 실패");
  return opts.placeName ? { ...r.request, placeName: opts.placeName } : r.request;
}

/* ── 신호 헬퍼 (concept-cases.ts와 같은 모양) ── */

const HIDDEN = {
  steps: { kind: "unknown", reason: "걸음 수를 되짚는 통로가 없다" },
  battery: { kind: "unknown", reason: "배터리 기록을 되짚지 못했다" },
  connectivity: { kind: "unknown", reason: "연결 기록을 되짚지 못했다" },
} as const;

const EMPTY: DaySignals = {
  date: DAY,
  photos: { kind: "none" },
  places: { kind: "none" },
  ...HIDDEN,
};

function photosAt(times: string[], complete: boolean): DaySignals["photos"] {
  return {
    kind: "known",
    value: {
      photos: times.map((t, i) => ({ id: `p${i + 1}`, takenAt: new Date(`${DAY}T${t}:00`) })),
      complete,
    },
  };
}

function placesKnown(): DaySignals["places"] {
  return {
    kind: "known",
    value: {
      trace: { visitCount: 3, approximateDistanceMeters: 5100 },
      source: "photo-exif",
      photosWithLocation: 4,
      photosConsidered: 5,
    },
  };
}

const TRUNCATED: DaySignals = {
  date: DAY,
  photos: photosAt(["08:05", "09:30", "11:00", "12:15", "14:40"], false),
  places: placesKnown(),
  ...HIDDEN,
};

function caption(hour: number, text: string) {
  return {
    photoId: `c${hour}`,
    takenAt: new Date(`${DAY}T${String(hour).padStart(2, "0")}:00:00`),
    text,
  };
}

/* ═══════════════════ E1 — 한국어 캐릭터의 새 머리 ═══════════════════ */

describe("E1 — 한국어 캐릭터 E2SN 머리", () => {
  it("promptPrefix('quiet')가 호칭 + E2_RULES + 톤 줄 + E2_TITLE + 언어 줄이다", () => {
    const prefix = promptPrefix("quiet");
    const lines = prefix.split("\n");
    expect(lines[0]).toBe(
      "너는 '금동이'이라 불린다. 주인의 휴대폰이다. 이 글의 '나'는 휴대폰이지 주인이 아니다.",
    );
    // E2_RULES 5줄
    expect(lines[1]).toContain("본 것으로 주인의 하루를 짐작하는 글이다");
    expect(lines[2]).toContain("단서가 말해 주는 것은");
    expect(lines[3]).toContain(
      "기록에 없는 장소 이름, 사람, 물건, 사건을 끌어와 짐작을 채우지 마라",
    );
    expect(lines[4]).toContain("짐작의 말투로 쓴다");
    expect(lines[5]).toContain("마지막 문장은 그날에 대한 짐작으로 끝내라");
    // 톤 줄 (quiet만)
    expect(lines[6]).toBe("담담하게, 짧게 쓴다.");
    // E2_TITLE (한 줄)
    expect(lines[7]).toContain("첫 줄에 제목을");
    expect(lines[7]).toContain("본문 첫 문장은 주인이 그날 한 일에 대한 짐작으로 시작한다.");
    expect(lines[8]).toBe("");
    expect(lines[9]).toBe("한국어로 써라.");
    expect(lines[10]).toBe("");
  });

  it("면책 유발 문장·예시 나열이 없다 (FR-002, 헌법 1.5.0)", () => {
    const prefix = promptPrefix("quiet");
    expect(prefix).not.toContain("모른다고 쓴 일기가 지어낸 일기보다 낫다");
    expect(prefix).not.toContain("예를 들어 날씨, 주인이 먹은 것, 만난 사람, 집에서 한 일은");
  });

  it("제목 반례의 이름·기호 나열이 없다 (FR-003)", () => {
    const prefix = promptPrefix("quiet");
    expect(prefix).not.toContain("금동이의 오늘 일기");
    expect(prefix).not.toContain("루이의 하루");
    expect(prefix).not.toContain("#, *, **, - 같은");
  });

  it("세 한국어 캐릭터가 같은 E2_RULES를 받는다", () => {
    for (const c of KO_CHARACTERS) {
      expect(promptPrefix(c)).toContain("본 것으로 주인의 하루를 짐작하는 글이다");
    }
  });
});

/* ═══════════════════ E2 — 문장형 신호 + 날짜 삭제 ═══════════════════ */

describe("E2 — 문장형 신호, 날짜 삭제", () => {
  it("머리줄이 '오늘 내가 본 것은 이렇다.'이고 날짜 문자열이 없다", () => {
    const p = buildPrompt(req(EMPTY, "quiet"));
    expect(p).toContain("오늘 내가 본 것은 이렇다.");
    expect(p).not.toContain("2026-01-15");
    expect(p).not.toContain("에 네가 본 것:");
  });

  it("사진 none/unknown이 서로 다른 문장이다 (FR-008)", () => {
    const none = buildPrompt(req(EMPTY, "quiet"));
    expect(none).toContain("사진은 없었다.");
    const unknownSignals: DaySignals = {
      date: DAY,
      photos: { kind: "unknown", reason: "사진 접근 권한이 없다" },
      places: { kind: "unknown", reason: "위치 권한이 없다" },
      ...HIDDEN,
    };
    const unknown = buildPrompt(req(unknownSignals, "quiet"));
    expect(unknown).toContain("사진은 모른다. 사진 접근 권한이 없다.");
    expect(unknown).toContain("다닌 자리는 모른다. 위치 권한이 없다.");
    expect(none).not.toBe(unknown);
  });

  it("사진 known은 문장형 + 한국어 숫자 낱말", () => {
    const p = buildPrompt(req(TRUNCATED, "quiet"));
    expect(p).toContain("사진은 다섯 장이 남았다.");
    expect(p).toContain("아침 여덟 시");
    expect(p).toContain("이것이 그날 사진의 전부는 아니다. 더 있을 수 있다.");
    expect(p).toContain("자리는 세 곳에 남았고");
    expect(p).toContain("사진 다섯 장 중 네 장에서 얻은 자리다.");
    expect(p).toContain("이 자리들은 사진이 찍힌 지점이지 하루의 궤적은 아니다.");
  });

  it("걸음·배터리·연결 문장이 없다 (FR-009)", () => {
    const rich: DaySignals = {
      date: DAY,
      photos: { kind: "none" },
      places: { kind: "none" },
      steps: { kind: "known", value: 8000 },
      battery: { kind: "known", value: { startLevel: 0.9, endLevel: 0.2, charged: true } },
      connectivity: {
        kind: "known",
        value: { wifiMinutes: 100, cellularMinutes: 50, wentOffline: false },
      },
    };
    const p = buildPrompt(req(rich, "quiet"));
    expect(p).not.toContain("걸음");
    expect(p).not.toContain("배터리");
    expect(p).not.toMatch(/와이파이|셀룰러/);
  });

  it("dayStillOpen이면 S_DAY_OPEN이 맨 앞에 온다", () => {
    const p = buildPrompt(req(EMPTY, "quiet", { day: DAY, now: new Date(`${DAY}T15:00:00`) }));
    expect(p).toContain("오늘은 아직 다 가지 않았다. 이 뒤에 무슨 일이 더 있을지는 모른다.");
  });
});

/* ═══════════════════ E3·E4 — 감싼 캡션 / A-rule 기각 ═══════════════════ */

describe("E3 — 감싼 캡션", () => {
  const vision = {
    captions: [caption(12, "A woman looking at a menu."), caption(18, "A busy street.")],
    considered: 2,
    available: 2,
  };

  it("한국어 캡션이 '내가 N시에 담은 장면:' 틀 + SCENE_LIMIT", () => {
    const p = buildPrompt(req(TRUNCATED, "quiet"), vision);
    expect(p).toContain("내가 12시에 담은 장면: A woman looking at a menu.");
    expect(p).toContain("내가 18시에 담은 장면: A busy street.");
    expect(p).toContain(
      "이 장면들 속 사람이 누구인지, 주인과 어떤 사이인지 나는 모른다. 사진에 찍힌 순간 밖에서 그 사람이 무엇을 했는지도 모른다.",
    );
    expect(p).not.toContain("사진에 담긴 것:");
    expect(p).not.toMatch(/^- \d+시:/m);
  });

  it("캡션 본문을 변형하지 않는다 (FR-015)", () => {
    const p = buildPrompt(req(TRUNCATED, "quiet"), vision);
    expect(p).toContain("A woman looking at a menu.");
  });
});

describe("E4 — A-rule 기각 (머리에 인물 조항 없음)", () => {
  it("promptPrefix에 머리 인물 조항이 없다 — 인물 언급은 SCENE_LIMIT 하나", () => {
    const prefix = promptPrefix("quiet");
    expect(prefix).not.toContain("사진에 사람이 찍혀 있어도");
    expect(prefix).not.toContain("이야기의 인물로 삼지 말고");
  });
});

/* ═══════════════════ E5 — instructionLines (되뱉기, 한국어) ═══════════════════ */

describe("E5 — instructionLines 한국어 분기", () => {
  it("새 머리·SCENE_LIMIT은 담고 문장형 신호 본문은 안 담는다 (005 P7)", () => {
    const vision = { captions: [caption(12, "A menu.")], considered: 1, available: 3 };
    const lines = instructionLines(req(TRUNCATED, "quiet"), vision);
    const joined = lines.join("\n");
    expect(joined).toContain("본 것으로 주인의 하루를 짐작하는 글이다"); // E2_RULES
    expect(joined).toContain("이 장면들 속 사람이 누구인지"); // SCENE_LIMIT
    expect(joined).toContain("이것이 그날 사진의 전부는 아니다"); // S_TRUNCATED
    expect(joined).toContain("사진이 더 있었지만 그중 몇 장만 보았다."); // S_VISION_PARTIAL (available 3 > considered 1)
    // 문장형 신호 본문은 아님
    expect(joined).not.toMatch(/사진은 .*장이 남았다/);
    expect(joined).not.toContain("오늘 내가 본 것은 이렇다.");
  });

  it("모든 줄이 buildPrompt()에 실제로 있다 (P7 성질)", () => {
    const vision = { captions: [caption(12, "A menu.")], considered: 1, available: 3 };
    const request = req(TRUNCATED, "quiet");
    const prompt = buildPrompt(request, vision);
    for (const line of instructionLines(request, vision)) {
      expect(prompt).toContain(line);
    }
  });

  it("dayStillOpen이면 S_DAY_OPEN이 instructionLines에도 있다 (P2 갱신)", () => {
    const request = req(EMPTY, "quiet", { day: DAY, now: new Date(`${DAY}T15:00:00`) });
    const joined = instructionLines(request).join("\n");
    expect(joined).toContain("오늘은 아직 다 가지 않았다.");
    expect(buildPrompt(request)).toContain("오늘은 아직 다 가지 않았다.");
  });
});

/* ═══════════════════ E6 — 외국어 캐릭터 현행 유지 ═══════════════════ */

/**
 * ★ 037 — 외국어 캐릭터가 로스터에 없어 **현행(비-E2SN) 경로를 부를 수 없다.**
 *
 * 그 경로는 소스에 그대로 있다(FR-014) — 문장형 신호가 한국어 숫자 낱말이라
 * 다른 언어에 못 쓰므로, 외국어 캐릭터가 들어오면 `usesE2SN()`이 언어를 보고
 * 자동으로 이어 준다. 아래는 그 기계가 사라지지 않았다는 소스 검사다.
 *
 * **캐릭터가 늘면 조립 검사로 되돌린다.**
 */
describe("E6 — 현행 경로가 소스에 남아 있다 (037 — 닿는 캐릭터 없음)", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/diary/prompt.ts"), "utf8");

  it("현행 화자 규칙(SPEAKER_RULES)과 그 문안이 남아 있다", () => {
    expect(SOURCE).toContain("SPEAKER_RULES");
    expect(SOURCE).toContain("모른다고 쓴 일기가 지어낸 일기보다 낫다");
  });

  it("현행 날짜 머리줄·라벨형 신호가 남아 있다", () => {
    expect(SOURCE).toContain("에 네가 본 것:");
  });

  it("현행 캡션 목록 형식이 남아 있다", () => {
    expect(SOURCE).toContain("사진에 담긴 것:");
  });

  it("언어로 갈래를 정하는 usesE2SN()이 남아 있다", () => {
    expect(SOURCE).toContain("function usesE2SN");
  });
});

/* ═══════════════════ E4(P8) — 018 프리필 성질 ═══════════════════ */

describe("E4/P8 — buildPrompt가 promptPrefix로 시작한다 (한국어 3캐릭터 × 케이스)", () => {
  const cases: {
    signals: DaySignals;
    vision?: ReturnType<typeof mkVision>;
    day?: string;
    now?: Date;
  }[] = [
    { signals: EMPTY },
    {
      signals: {
        date: DAY,
        photos: photosAt(["10:20", "18:45"], true),
        places: placesKnown(),
        ...HIDDEN,
      },
    },
    { signals: TRUNCATED },
    { signals: EMPTY, day: DAY, now: new Date(`${DAY}T15:00:00`) },
    { signals: TRUNCATED, vision: mkVision() },
  ];
  function mkVision() {
    return {
      captions: [caption(12, "A menu."), caption(18, "A street.")],
      considered: 2,
      available: 7,
    };
  }

  it.each(KO_CHARACTERS)("%s", (character) => {
    const prefix = promptPrefix(character);
    for (const c of cases) {
      const request = req(c.signals, character, { day: c.day, now: c.now });
      expect(buildPrompt(request, c.vision).startsWith(prefix)).toBe(true);
    }
  });
});

/* ═══════════════════ E8 — 톤 줄 캐릭터별 (조건부 spread) ═══════════════════ */

describe("E8 — 톤 줄은 quiet만", () => {
  it("quiet 머리에 톤 줄이 있다", () => {
    expect(promptPrefix("quiet")).toContain("담담하게, 짧게 쓴다.");
  });

  // 037 — 톤 줄이 없는 캐릭터가 로스터에 없다. `E_TONE`이 빈 문자열이면 그 줄을
  // 아예 안 넣는 구조(조건부 spread)는 그대로다 — 캐릭터가 늘면 되살린다.
  it.skip("톤 줄이 없는 캐릭터의 머리에 빈 줄이 안 생긴다", () => {
    for (const c of [] as readonly Character[]) {
      const prefix = promptPrefix(c);
      expect(prefix).not.toContain("담담하게, 짧게 쓴다.");
      // E2_RULES 마지막 줄 다음이 바로 E2_TITLE (빈 줄 없음)
      const lines = prefix.split("\n");
      const rulesEnd = lines.findIndex((l) =>
        l.includes("마지막 문장은 그날에 대한 짐작으로 끝내라"),
      );
      expect(lines[rulesEnd + 1]).toContain("첫 줄에 제목을");
    }
  });

  // 037 — 톤 줄 없는 둘째 캐릭터가 로스터에 없어 길이를 비교할 대상이 없다.
  it.skip("톤 줄 없는 캐릭터의 머리가 quiet보다 한 줄 짧다", () => {
    expect(true).toBe(true);
  });
});

/* ═══════════════════ 사용자 지정 이름 (US3, SC-006) ═══════════════════ */

describe("US3 — 사용자 지정 이름이 새 머리 호칭 줄에 흐른다", () => {
  it("customNames가 호칭 줄만 바꾸고 나머지는 그대로 (SC-006)", () => {
    const base = promptPrefix("quiet");
    const renamed = promptPrefix("quiet", { quiet: "복실이" });
    expect(renamed.split("\n")[0]).toBe(
      "너는 '복실이'이라 불린다. 주인의 휴대폰이다. 이 글의 '나'는 휴대폰이지 주인이 아니다.",
    );
    // 2번째 줄부터 동일
    expect(renamed.split("\n").slice(1).join("\n")).toBe(base.split("\n").slice(1).join("\n"));
  });

  it("이름 미지정이면 로스터 기본값 (금동이)", () => {
    expect(promptPrefix("quiet").split("\n")[0]).toContain("'금동이'");
  });

  /**
   * 018 P11 — 캐릭터마다 접두사가 다르다.
   *
   * 접두사가 같아지면 "캐릭터를 바꿔도 이전 캐릭터의 KV 캐시를 재사용한다"가
   * 발생한다. 한국어 캐릭터의 접두사에서 갈리는 것은 **이름 한 줄뿐**이므로
   * 호칭 줄을 빼면 즉시 깨진다(AGENTS.md가 이 자리를 못 박았다).
   *
   * 037 — 개수를 못 박지 않는다. 캐릭터가 늘면 자동으로 는다.
   */
  it("018 P11 — 캐릭터마다 접두사가 다르다", () => {
    const prefixes = KO_CHARACTERS.map((c) => promptPrefix(c));
    expect(new Set(prefixes).size).toBe(KO_CHARACTERS.length);
  });
});

/* ═══════════════════ E7 — 판정 4갈래·측정 코드 부재 ═══════════════════ */

describe("E7 — 원칙 IV: prompt.ts에 채점 코드가 없다", () => {
  it("면책·되뇜·지어내기를 세거나 점수 매기는 토큰이 없다", () => {
    // 주석을 걷어낸 코드에서만 본다 — 주석은 무엇을 왜 금지하는지 적는다.
    expect(PROMPT_CODE).not.toMatch(/\bscore\b/i);
    expect(PROMPT_CODE).not.toMatch(/감점|되뇜을 센|면책 수|지어내기 수/);
  });
});

/* ═══════════════════ 위반 주입 (T013) ═══════════════════ */

describe("위반 주입 — 방어가 실제로 잡는가", () => {
  it("E2_RULES에 옛 문장이 있으면 E1이 잡는다", () => {
    // promptPrefix에 "모른다고 쓴 일기가 지어낸 일기보다 낫다"가 없어야 한다 —
    // 되살리면 이 기대가 깨진다.
    expect(promptPrefix("quiet")).not.toContain("모른다고 쓴 일기가 지어낸 일기보다 낫다");
  });

  it("날짜 머리줄이 되살아나면 E2가 잡는다", () => {
    expect(buildPrompt(req(EMPTY, "quiet"))).not.toContain("에 네가 본 것:");
  });

  // 037 — 톤 줄이 없어야 할 둘째 캐릭터가 로스터에 없다. 근거 없는 톤 줄을 두지
  // 않는다는 성질은 `E_TONE`에 실측 근거 주석이 있는 캐릭터만 문자열을 갖는 것으로
  // 지킨다(prompt.test.ts가 표 자체를 검사한다).
  it.skip("톤 줄이 없어야 할 캐릭터에 톤 줄이 붙으면 E8이 잡는다", () => {
    expect(true).toBe(true);
  });

  it("머리에 인물 조항이 들어가면 E4가 잡는다", () => {
    expect(promptPrefix("quiet")).not.toContain("이야기의 인물로 삼지 말고");
  });
});
