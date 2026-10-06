/**
 * 한국어 캐릭터 문장형 프롬프트 계약 테스트 (036 E2SN → 061 교체).
 *
 * 계약: specs/061-diary-prompt-swap/contracts/prompt.md (PR1~PR5)
 *       specs/036-diary-concept-prompt/contracts/prompt-e2sn.md (남은 성질: 날짜 없음·none/unknown·P8·P11)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 061이 머리·기록·꼬리를 my-ollama `variants.ts` `R16.u1`·`R17.x1`로 바꿨다. 이 파일은
 * 그 문안을 **글자 그대로** 잠근다. 원본과의 10케이스 바이트 대조는 이 저장소가 아니라
 * my-ollama `scripts/device-repro/gen-prompts.ts`에서 한다(원칙 IV — 측정 장치를 들이지 않는다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildPrompt, instructionLines, promptPrefix, titleQuestion } from "../../src/diary/prompt";
import { buildRequest } from "../../src/diary/request";
import {
  CHARACTERS,
  type Character,
  type CustomNames,
  type DiaryRequest,
} from "../../src/diary/types";
import type { DaySignals } from "../../src/signals/types";
import type { PhotoVision } from "../../src/vision/types";

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
  const r = buildRequest(signals, character, "quick", opts.day, opts.now, opts.customNames);
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

/* ═══════════════════ 061 — 원본 문안 (지시서 §1~§4, variants.ts R16.u1·R17.x1) ═══════════════════
 *
 * 글자 그대로 박는다(047 교훈 — 「참조했다」는 「같다」가 아니다). 원본과의 바이트 대조는
 * my-ollama `gen-prompts.ts`에서 한다(측정 장치는 이 저장소에 두지 않는다, 원칙 IV).
 */

const HEAD_RULES = [
  "너는 주머니와 가방 속에서 하루를 보내서, 사진에 담긴 장면 말고는 본 것이 없다. 주인이 무엇을 했는지는 보지 못했다.",
  "일기에는 네가 본 장면과 그것을 보며 든 생각을 적는다. 장면을 차례대로 다 옮겨 적지 말고, 마음에 남은 두세 가지만 골라 한 흐름으로 이어 쓴다.",
  "주인이 무엇을 했는지는 '~했을 것 같다', '~였을지도 모른다'처럼 짐작으로 쓴다. 기록에 없는 장소 이름, 사람, 물건, 사건은 쓰지 않는다.",
  "담담하게, 짧게 쓴다. 본문은 서너 문장이면 된다.",
];
const LANGUAGE_LINE = "한국어로 써라. 영어로 적힌 장면도 한국어로 풀어 쓴다.";
const headLine = (name: string, particle: string) =>
  `너는 '${name}'${particle} 불리는, 주인의 휴대폰이다. 하루가 끝나면 그날 본 것으로 일기를 쓴다. 이 글의 '나'는 휴대폰이지 주인이 아니다.`;

const SCENE_TAIL = "이 기록으로 그 하루의 일기를 써라.";
const B_OPEN = "오늘은 아직 다 가지 않아서 이 뒤에 무슨 일이 더 있을지도 나는 모른다.";
const noSceneTail = (why: string, mine: string, open = false) =>
  `${why}${open ? ` ${B_OPEN}` : ""} 그래서 오늘 일기는 주인의 하루가 아니라 내 하루를 쓴다. '나는 오늘 아무것도 보지 못했다'는 말로 시작하고, ${mine} 적는다. '심심했다', '하품만 했다', '기다리다 지쳤다'처럼 가벼운 말로 쓴다. 주인이 무엇을 했는지는 짐작하지 않는다. 끝은 '내일은 무엇이든 보여 줬으면 좋겠다'처럼 다음을 바라는 한 문장으로 맺는다. 본문은 서너 문장이면 된다.`;
const WHY = {
  zero: "나는 오늘 사진을 한 장도 보지 못해서 본 것이 없다.",
  unread: "나는 오늘 사진 속을 보지 못해서 본 것이 없다.",
  unseen: "나는 오늘 사진을 볼 수 없어서 본 것이 없다. 사진이 있었는지도 나는 모른다.",
};
const MINE = {
  zero: "주머니와 가방 속에서 하루를 보낸 내가 어땠는지",
  unread: "사진은 쌓였는데 그 속을 끝까지 들여다보지 못한 내가 어땠는지",
  unseen: "사진을 볼 길이 막혀 아무것도 보지 못한 내가 어땠는지",
};
const TITLE_ASK_SCENE =
  "방금 쓴 일기에서 가장 마음에 남는 장면 하나를 골라, 그것을 가리키는 짧은 제목을 한 줄로 적어라. 제목만 적는다.";
const TITLE_ASK = "방금 쓴 일기에 붙일 제목을 한 줄로 적어라. 제목만 적는다.";
const S_DAY_OPEN = "오늘은 아직 다 가지 않았다. 이 뒤에 무슨 일이 더 있을지는 모른다.";
const SIG_HEAD = "오늘 내가 본 것은 이렇다.";

const UNSEEN: DaySignals = {
  date: DAY,
  photos: { kind: "unknown", reason: "사진 접근 권한이 없다" },
  places: { kind: "unknown", reason: "위치 권한이 없다" },
  ...HIDDEN,
};
const OPEN = { day: DAY, now: new Date(`${DAY}T15:00:00`) };
const twoCaptions = () => ({
  captions: [caption(12, "A woman looking at a menu."), caption(18, "A busy street.")],
  considered: 2,
  available: 2,
});

/* ═══════════════════ E1 — 머리 (061 지시서 §1) ═══════════════════ */

describe("E1 — 한국어 캐릭터 머리 다섯 줄", () => {
  it("promptPrefix('quiet')가 호칭 줄 + 머리 넷 + 빈 줄 + 언어 줄 + 빈 줄이다 (글자 그대로)", () => {
    expect(promptPrefix("quiet").split("\n")).toEqual([
      headLine("금동이", "라"),
      ...HEAD_RULES,
      "",
      LANGUAGE_LINE,
      "",
    ]);
  });

  it("제목 지시가 머리에 없다 (FR-002) — 제목은 두 번째 호출로 묻는다", () => {
    const prefix = promptPrefix("quiet");
    expect(prefix).not.toContain("제목");
    expect(prefix).not.toContain("첫 줄에");
  });

  it("옛 E2SN 머리(보고서 말투를 시키던 「단서」)가 없다", () => {
    const prefix = promptPrefix("quiet");
    expect(prefix).not.toContain("단서");
    expect(prefix).not.toContain("본 것으로 주인의 하루를 짐작하는 글이다");
    expect(prefix).not.toContain("모른다고 쓴 일기가 지어낸 일기보다 낫다");
  });

  it("받침 있는 이름은 「이라」, 없는 이름은 「라」 (particle.ts)", () => {
    expect(promptPrefix("quiet", { quiet: "은동" }).split("\n")[0]).toBe(headLine("은동", "이라"));
    expect(promptPrefix("quiet", { quiet: "모카" }).split("\n")[0]).toBe(headLine("모카", "라"));
  });
});

/* ═══════════════════ E2 — 기록 (061 지시서 §2) ═══════════════════ */

describe("E2 — 문장형 기록, 숫자 시각 없음", () => {
  it("날짜 문자열·라벨형 머리줄이 없다", () => {
    const p = buildPrompt(req(TRUNCATED, "quiet"), twoCaptions());
    expect(p).not.toContain("2026-01-15");
    expect(p).not.toContain("에 네가 본 것:");
  });

  it("사진 none/unknown이 서로 다른 문장이다 (원칙 V)", () => {
    const none = buildPrompt(req(EMPTY, "quiet"));
    const unknown = buildPrompt(req(UNSEEN, "quiet"));
    expect(none).toContain("사진은 없었다.");
    expect(unknown).toContain("사진은 모른다. 사진 접근 권한이 없다.");
    expect(unknown).toContain("다닌 자리는 모른다. 위치 권한이 없다.");
    expect(unknown).not.toContain("사진은 없었다.");
  });

  it("사진 찍힌 때는 처음~끝 두 때만, 숫자 시각 없음", () => {
    const p = buildPrompt(req(TRUNCATED, "quiet"));
    expect(p).toContain("사진은 다섯 장이 남았다. 오전부터 오후까지 찍혔다.");
    expect(p).not.toMatch(/\d+시|여덟 시|한 시/);
    expect(p).toContain("이것이 그날 사진의 전부는 아니다. 더 있을 수 있다.");
  });

  it("때가 하나뿐이면 「{때}에 찍혔다.」", () => {
    const one: DaySignals = { ...EMPTY, photos: photosAt(["19:12"], true) };
    expect(buildPrompt(req(one, "quiet"))).toContain("사진은 한 장이 남았다. 저녁에 찍혔다.");
  });

  it.each([
    ["06:00", "오전"],
    ["11:59", "오전"],
    ["12:00", "오후"],
    ["13:30", "오후"],
    ["17:59", "오후"],
    ["18:00", "저녁"],
    ["20:59", "저녁"],
    ["21:00", "밤"],
    ["23:30", "밤"],
  ])("때 이름은 넷 — %s → %s (아침·낮 없음)", (time, part) => {
    const s: DaySignals = { ...EMPTY, photos: photosAt([time], true) };
    const p = buildPrompt(req(s, "quiet"));
    expect(p).toContain(`${part}에 찍혔다.`);
  });

  it("자리가 여럿이면 거리, 한 곳이면 「자리는 한 곳에 남았다.」", () => {
    const many = buildPrompt(req(TRUNCATED, "quiet"));
    expect(many).toContain(
      "자리는 세 곳에 남았고, 가장 먼 두 곳은 다섯 킬로미터쯤 떨어져 있다. 사진 다섯 장 중 네 장에서 얻은 자리다.",
    );
    const single: DaySignals = {
      ...TRUNCATED,
      places: {
        kind: "known",
        value: {
          trace: { visitCount: 1, approximateDistanceMeters: 0 },
          source: "photo-exif",
          photosWithLocation: 2,
          photosConsidered: 2,
        },
      },
    };
    const p = buildPrompt(req(single, "quiet"));
    expect(p).toContain("자리는 한 곳에 남았다. 사진 두 장 중 두 장에서 얻은 자리다.");
    expect(p).not.toContain("0 미터");
    expect(p).toContain("이 자리들은 사진이 찍힌 지점이지 하루의 궤적은 아니다.");
  });

  it("걸음·배터리·연결 문장이 없다 (036 FR-009)", () => {
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
});

/* ═══════════════════ E3 — 캡션 (061) ═══════════════════ */

describe("E3 — 캡션 줄머리는 때 이름, SCENE_LIMIT 없음", () => {
  it("「{때}에 담은 장면: {캡션}」이고 숫자 시각·인물 한계 문장이 없다", () => {
    const p = buildPrompt(req(TRUNCATED, "quiet"), twoCaptions());
    expect(p).toContain("오후에 담은 장면: A woman looking at a menu.");
    expect(p).toContain("저녁에 담은 장면: A busy street.");
    expect(p).not.toContain("내가 12시에");
    expect(p).not.toContain("이 장면들 속 사람이 누구인지");
    expect(p).not.toContain("사진에 담긴 것:");
  });

  it("캡션 본문을 변형하지 않는다 (011)", () => {
    expect(buildPrompt(req(TRUNCATED, "quiet"), twoCaptions())).toContain(
      "A woman looking at a menu.",
    );
  });
});

/* ═══════════════════ E9 — 꼬리, 날의 갈래 넷 (061 지시서 §3) ═══════════════════ */

describe("E9 — 꼬리는 날의 갈래 넷", () => {
  const lastLine = (p: string) => p.split("\n").at(-1);

  it("① 캡션이 있는 날 — 「이 기록으로 그 하루의 일기를 써라.」, 기록 머리줄이 있다", () => {
    const p = buildPrompt(req(TRUNCATED, "quiet"), twoCaptions());
    expect(lastLine(p)).toBe(SCENE_TAIL);
    expect(p).toContain(SIG_HEAD);
  });

  it("② 사진 0장(none) — 「한 장도 보지 못해서」 + 주머니와 가방 속", () => {
    const p = buildPrompt(req(EMPTY, "quiet"));
    expect(lastLine(p)).toBe(noSceneTail(WHY.zero, MINE.zero));
  });

  it("② known인데 목록이 빈 날도 0장 갈래", () => {
    const s: DaySignals = {
      ...EMPTY,
      photos: { kind: "known", value: { photos: [], complete: true } },
    };
    expect(lastLine(buildPrompt(req(s, "quiet")))).toBe(noSceneTail(WHY.zero, MINE.zero));
  });

  it("③ 사진은 있고 캡션 없음 — 「사진 속을 보지 못해서」", () => {
    expect(lastLine(buildPrompt(req(TRUNCATED, "quiet")))).toBe(
      noSceneTail(WHY.unread, MINE.unread),
    );
    // 캡션을 하나도 못 읽은 vision이 와도 같다
    const unreadVision = { captions: [], considered: 3, available: 5 };
    const p = buildPrompt(req(TRUNCATED, "quiet"), unreadVision);
    expect(lastLine(p)).toBe(noSceneTail(WHY.unread, MINE.unread));
    // 「일부만 보았다」는 「사진 속을 보지 못했다」와 어긋나므로 싣지 않는다 (research R3)
    expect(p).not.toContain("사진이 더 있었지만 그중 몇 장만 보았다.");
  });

  it("④ 권한이 없어 못 읽음(unknown) — 「모른다」로 시작하고 「한 장도」(없었다 단정)가 없다", () => {
    const p = buildPrompt(req(UNSEEN, "quiet"));
    expect(lastLine(p)).toBe(noSceneTail(WHY.unseen, MINE.unseen));
    expect(p).not.toContain("한 장도 보지 못해서");
  });

  it("본 장면 없는 날은 기록 머리줄과 S_DAY_OPEN을 싣지 않는다", () => {
    for (const s of [EMPTY, TRUNCATED, UNSEEN]) {
      const p = buildPrompt(req(s, "quiet", OPEN));
      expect(p).not.toContain(SIG_HEAD);
      expect(p).not.toContain(S_DAY_OPEN);
    }
  });

  it("하루가 안 끝났으면 본 장면 없는 날 꼬리의 첫 문장(들) 뒤에 B가 붙는다", () => {
    expect(lastLine(buildPrompt(req(EMPTY, "quiet", OPEN)))).toBe(
      noSceneTail(WHY.zero, MINE.zero, true),
    );
    expect(lastLine(buildPrompt(req(UNSEEN, "quiet", OPEN)))).toBe(
      noSceneTail(WHY.unseen, MINE.unseen, true),
    );
  });

  it("본 장면 있는 날이 안 끝났으면 S_DAY_OPEN이 기록 맨 위에 남는다 (원본 코드가 이긴다, research R2)", () => {
    const p = buildPrompt(req(TRUNCATED, "quiet", OPEN), twoCaptions());
    const record = p.split("\n").slice(promptPrefix("quiet").split("\n").length);
    expect(record[0]).toBe(S_DAY_OPEN);
    expect(record[1]).toBe(SIG_HEAD);
    expect(lastLine(p)).toBe(SCENE_TAIL);
  });

  it("꼬리에 「상상」·금지문 「탓하」가 없다 (지시서 §3 규칙 2·3)", () => {
    for (const s of [EMPTY, TRUNCATED, UNSEEN]) {
      const p = buildPrompt(req(s, "quiet"));
      expect(p).not.toContain("상상");
      expect(p).not.toContain("탓하");
    }
  });
});

/* ═══════════════════ E10 — 제목 질문 (061 지시서 §4) ═══════════════════ */

describe("E10 — titleQuestion", () => {
  it("캡션이 있는 날은 장면을 고르는 질문", () => {
    expect(titleQuestion(req(TRUNCATED, "quiet"), twoCaptions())).toBe(TITLE_ASK_SCENE);
  });

  it.each([
    ["0장", EMPTY],
    ["캡션 없음", TRUNCATED],
    ["권한 없음", UNSEEN],
  ])("본 장면 없는 날(%s)은 조건 없는 질문", (_, s) => {
    expect(titleQuestion(req(s, "quiet"))).toBe(TITLE_ASK);
  });
});

/* ═══════════════════ E5 — instructionLines (되뱉기) ═══════════════════ */

describe("E5 — instructionLines 한국어 분기 (원본 행과 같은 순서)", () => {
  it("본 장면 있는 날: 머리 넷 → 한계 → 제목 질문 → 언어 줄", () => {
    const vision = { captions: [caption(12, "A menu.")], considered: 1, available: 3 };
    expect(instructionLines(req(TRUNCATED, "quiet", OPEN), vision)).toEqual([
      ...HEAD_RULES,
      S_DAY_OPEN,
      "이것이 그날 사진의 전부는 아니다. 더 있을 수 있다.",
      "이 자리들은 사진이 찍힌 지점이지 하루의 궤적은 아니다.",
      "사진이 더 있었지만 그중 몇 장만 보았다.",
      TITLE_ASK_SCENE,
      LANGUAGE_LINE,
    ]);
  });

  it("본 장면 없는 날: … → 제목 질문 → 언어 줄 → 꼬리 (S_DAY_OPEN은 꼬리가 말한다)", () => {
    expect(instructionLines(req(EMPTY, "quiet", OPEN))).toEqual([
      ...HEAD_RULES,
      TITLE_ASK,
      LANGUAGE_LINE,
      noSceneTail(WHY.zero, MINE.zero, true),
    ]);
  });

  it("문장형 신호 본문·캡션은 담지 않는다 (005 P7, 011 P5)", () => {
    const joined = instructionLines(req(TRUNCATED, "quiet"), twoCaptions()).join("\n");
    expect(joined).not.toMatch(/사진은 .*장이 남았다/);
    expect(joined).not.toContain(SIG_HEAD);
    expect(joined).not.toContain("A busy street.");
  });

  it("제목 질문을 뺀 모든 줄이 buildPrompt()에 실제로 있다 (P7 성질)", () => {
    const cases: [DaySignals, PhotoVision | undefined][] = [
      [TRUNCATED, twoCaptions()],
      [EMPTY, undefined],
      [TRUNCATED, undefined],
      [UNSEEN, undefined],
    ];
    for (const [s, vision] of cases) {
      const request = req(s, "quiet", OPEN);
      const prompt = buildPrompt(request, vision);
      const question = titleQuestion(request, vision);
      for (const line of instructionLines(request, vision)) {
        if (line === question) continue;
        expect(prompt).toContain(line);
      }
    }
  });
});

/* ═══════════════════ E6 — 외국어 캐릭터 현행 유지 ═══════════════════ */

/**
 * ★ 037 — 외국어 캐릭터가 로스터에 없어 **현행(비-문장형) 경로를 부를 수 없다.**
 * 그 경로는 소스에 그대로 있다(FR-014). 아래는 그 기계가 사라지지 않았다는 소스 검사다.
 * **캐릭터가 늘면 조립 검사로 되돌린다.**
 */
describe("E6 — 현행 경로가 소스에 남아 있다 (037 — 닿는 캐릭터 없음)", () => {
  const SOURCE = readFileSync(join(__dirname, "../../src/diary/prompt.ts"), "utf8");

  it("현행 화자 규칙(SPEAKER_RULES)과 그 문안이 남아 있다", () => {
    expect(SOURCE).toContain("SPEAKER_RULES");
    expect(SOURCE).toContain("모른다고 쓴 일기가 지어낸 일기보다 낫다");
  });

  it("현행 날짜 머리줄·라벨형 신호·캡션 목록이 남아 있다", () => {
    expect(SOURCE).toContain("에 네가 본 것:");
    expect(SOURCE).toContain("사진에 담긴 것:");
  });

  it("언어로 갈래를 정하는 usesE2SN()이 남아 있다", () => {
    expect(SOURCE).toContain("function usesE2SN");
  });
});

/* ═══════════════════ E4(P8) — 018 프리필 성질 ═══════════════════ */

describe("E4/P8 — buildPrompt가 promptPrefix로 시작한다 (날의 갈래 넷 × 하루 안 끝남)", () => {
  const cases: { signals: DaySignals; vision?: PhotoVision; open?: boolean }[] = [
    { signals: EMPTY },
    { signals: EMPTY, open: true },
    { signals: TRUNCATED },
    { signals: UNSEEN, open: true },
    { signals: TRUNCATED, vision: twoCaptions() },
    { signals: TRUNCATED, vision: twoCaptions(), open: true },
  ];

  it.each(KO_CHARACTERS)("%s", (character) => {
    for (const customNames of [{}, { [character]: "은동" }]) {
      const prefix = promptPrefix(character, customNames);
      for (const c of cases) {
        const request = req(c.signals, character, { ...(c.open ? OPEN : {}), customNames });
        expect(buildPrompt(request, c.vision).startsWith(prefix)).toBe(true);
      }
    }
  });

  it("018 P9 — 소스에서 buildPrompt가 fixedHead()와 같은 배열을 쓴다", () => {
    expect(PROMPT_CODE).toMatch(/const head = fixedHead\(/);
    expect(PROMPT_CODE).toMatch(/return fixedHead\(character, customNames\)\.join\("\\n"\)/);
  });
});

/* ═══════════════════ E8 — 톤 줄 캐릭터별 (조건부 spread) ═══════════════════ */

describe("E8 — 톤 줄은 quiet만", () => {
  it("quiet 머리의 다섯째 줄이 톤 줄이다", () => {
    expect(promptPrefix("quiet").split("\n")[4]).toBe(
      "담담하게, 짧게 쓴다. 본문은 서너 문장이면 된다.",
    );
  });

  // 037 — 톤 줄이 없는 캐릭터가 로스터에 없다. `E_TONE`이 빈 문자열이면 그 줄을
  // 아예 안 넣는 구조(조건부 spread)는 그대로다 — 캐릭터가 늘면 되살린다.
  it.skip("톤 줄이 없는 캐릭터의 머리에 빈 줄이 안 생긴다", () => {
    expect(true).toBe(true);
  });
});

/* ═══════════════════ 사용자 지정 이름 (035 US3, SC-006) ═══════════════════ */

describe("US3 — 사용자 지정 이름이 호칭 줄에 흐른다", () => {
  it("customNames가 호칭 줄만 바꾸고 나머지는 그대로 (SC-006)", () => {
    const base = promptPrefix("quiet");
    const renamed = promptPrefix("quiet", { quiet: "복실이" });
    expect(renamed.split("\n")[0]).toBe(headLine("복실이", "라"));
    expect(renamed.split("\n").slice(1).join("\n")).toBe(base.split("\n").slice(1).join("\n"));
  });

  it("이름 미지정이면 로스터 기본값 (금동이)", () => {
    expect(promptPrefix("quiet").split("\n")[0]).toContain("'금동이'");
  });

  /**
   * 018 P11 — 캐릭터마다 접두사가 다르다. 한국어 캐릭터의 접두사에서 갈리는 것은
   * **이름 한 줄뿐**이므로 호칭 줄을 빼면 즉시 깨진다(AGENTS.md).
   */
  it("018 P11 — 캐릭터마다 접두사가 다르다", () => {
    const prefixes = KO_CHARACTERS.map((c) => promptPrefix(c));
    expect(new Set(prefixes).size).toBe(KO_CHARACTERS.length);
  });
});

/* ═══════════════════ E7 — 판정 4갈래·측정 코드 부재 ═══════════════════ */

describe("E7 — 원칙 IV: prompt.ts에 채점 코드가 없다", () => {
  it("면책·되뇜·지어내기를 세거나 점수 매기는 토큰이 없다", () => {
    expect(PROMPT_CODE).not.toMatch(/\bscore\b/i);
    expect(PROMPT_CODE).not.toMatch(/감점|되뇜을 센|면책 수|지어내기 수/);
  });
});

/* ═══════════════════ 위반 주입 — 방어가 실제로 잡는가 ═══════════════════ */

describe("위반 주입 — 방어가 실제로 잡는가", () => {
  it("제목 지시가 머리에 되살아나면 E1이 잡는다", () => {
    expect(promptPrefix("quiet")).not.toContain("첫 줄에 제목을");
  });

  it("날짜 머리줄이 되살아나면 E2가 잡는다", () => {
    expect(buildPrompt(req(EMPTY, "quiet"))).not.toContain("에 네가 본 것:");
  });

  it("권한 없는 날이 0장 꼬리를 받으면 E9 ④가 잡는다", () => {
    expect(buildPrompt(req(UNSEEN, "quiet"))).toContain(WHY.unseen);
  });
});
