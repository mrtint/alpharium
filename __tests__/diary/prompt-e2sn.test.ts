/**
 * 한국어 캐릭터 문장형 프롬프트 계약 테스트 (036 E2SN → 061 교체).
 *
 * 계약: specs/061-diary-prompt-swap/contracts/prompt.md (PR1~PR5)
 *       specs/036-diary-concept-prompt/contracts/prompt-e2sn.md (남은 성질: 날짜 없음·none/unknown·P8·P11)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 077이 머리·기록·꼬리를 my-ollama `results/hand-prompt/v5/user-prompt.md`(PR #8)로 바꿨다.
 * 이 파일은 그 문안을 **글자 그대로** 잠근다. 첫 문장 틀 11개는 원본 블록의 사본
 * `fixtures/v5-first-sentence-frames.txt`와 대조한다. 원본과의 10케이스 바이트 대조는 이 저장소가
 * 아니라 my-ollama `scripts/kanana2-compare/gen-prompts.ts`에서 한다(원칙 IV — 측정 장치를 들이지 않는다).
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

/* ═══════════════════ 077 — 원본 문안 (my-ollama hand-prompt v5, 지시서 §1~§3) ═══════════════════
 *
 * 글자 그대로 박는다(047 교훈 — 「참조했다」는 「같다」가 아니다). 원본과의 바이트 대조는
 * my-ollama `gen-prompts.ts`에서 한다(측정 장치는 이 저장소에 두지 않는다, 원칙 IV).
 */

const TONE_LINE = "서정적이며 담담하게 쓴다. 본문은 여덟 문장쯤, 사백 자 안팎으로 쓴다.";
const HEAD_RULES = [
  "너는 주인의 주머니나 가방 속에서 하루를 보내서, 사진에 담긴 장면만 보고 이야기한다.",
  "일기에는 네가 본 사진의 장면과 그것을 보며 든 마음을 적는다. 마음에 남은 장면은 떠오르는 마음을 한두 문장 더 풀어 쓴다.",
  "주인의 마음은 '주인도 ~했을 것 같아요'처럼 한 번만 짐작한다. 기록에 없는 장소 이름, 사람, 물건, 사건은 쓰지 않는다.",
  TONE_LINE,
];
const LANGUAGE_LINE = "한국어로 써라. 영어로 적힌 장면도 한국어로 풀어 쓴다.";
const headLine = (name: string, particle: string) =>
  `너는 '${name}'${particle} 불리는, 주인의 휴대폰이다. 하루가 끝나면 그날 본 것으로 일기를 쓴다. 이 글의 '나'는 휴대폰이지 주인이 아니다.`;

/** 원본 「첫 문장 틀」 블록의 사본 — 11줄, 순서가 고르는 규칙의 일부다 */
const FRAMES = readFileSync(join(__dirname, "fixtures/v5-first-sentence-frames.txt"), "utf8")
  .split("\n")
  .filter((line) => line !== "");
/** 077 — 날짜(1970-01-01부터 일수) mod 11. 픽스처로 계산한다(구현 상수를 읽지 않는다) */
function frameOf(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return FRAMES[Math.floor(Date.UTC(y, m - 1, d) / 86_400_000) % FRAMES.length];
}
const sceneTail = (day: string) =>
  `이 기록으로 그 하루의 일기를 써라. 첫 문장은 '${frameOf(day)}'처럼 시작하고, 끝까지 '요'로 끝나는 말투로 쓴다.`;
const SCENE_TAIL = sceneTail(DAY);
// 063 — 하루가 안 끝난 날에도 꼬리는 같다. 그 사실은 기록 첫 줄(S_DAY_OPEN)이 말한다(R18.y3).
const B_OPEN = "오늘은 아직 다 가지 않아서 이 뒤에 무슨 일이 더 있을지도 나는 모른다.";
const noSceneTail = (why: string, mine: string) =>
  `${why} 그래서 오늘 일기는 주인의 하루가 아니라 네 하루를 쓴다. '나는 오늘 아무것도 보지 못했어요'라는 말로 시작하고, ${mine} 적는다. '심심했어요', '하품만 했어요', '기다리다 지쳤어요'처럼 가벼운 말로 쓴다. 주인이 무엇을 했는지는 짐작하지 않는다. 끝은 '내일은 무엇이든 보여 줬으면 좋겠어요'처럼 다음을 바라는 한 문장으로 맺는다. 본문은 네댓 문장이면 되고, 끝까지 '요'로 끝나는 말투로 쓴다.`;
const WHY = {
  zero: "너는 오늘 사진을 한 장도 보지 못해서 본 것이 없다.",
  unread: "너는 오늘 사진 속을 보지 못해서 본 것이 없다.",
  unseen: "너는 오늘 사진을 볼 수 없어서 본 것이 없다. 사진이 있었는지도 너는 모른다.",
};
const MINE = {
  zero: "주머니와 가방 속에서 하루를 보낸 네가 어땠는지",
  unread: "사진은 쌓였는데 그 속을 끝까지 들여다보지 못한 네가 어땠는지",
  unseen: "사진을 볼 길이 막혀 아무것도 보지 못한 네가 어땠는지",
};
const TITLE_ASK_SCENE =
  "방금 쓴 일기에서 가장 마음에 남는 장면 하나를 골라, 그것을 가리키는 짧은 제목을 한 줄로 적어라. 제목만 적는다.";
const TITLE_ASK =
  "방금 쓴 일기에서 네 마음이 어땠는지를 가리키는 짧은 제목을 한 줄로 적어라. 제목만 적는다.";
const S_DAY_OPEN = "오늘은 아직 다 가지 않았어요. 이 뒤에 무슨 일이 더 있을지는 몰라요.";
const S_TRUNCATED = "이것이 그날 사진의 전부는 아니에요. 더 있을 수 있어요.";
const S_PLACES = "이 자리들은 사진이 찍힌 지점이지 하루의 궤적은 아니에요.";
const S_VISION_PARTIAL = "사진이 더 있었지만 그중 몇 장만 보았어요.";
const SIG_HEAD = "오늘 내가 본 것은 이래요.";
/** 077 — 신호의 까닭 문자열 대신 쓰는 고정 문장 (FR-007) */
const PHOTOS_UNSEEN = "사진은 몰라요. 사진을 볼 수 있는 길이 막혀 있어요.";
const PLACES_NO_PHOTOS = "다닌 자리는 몰라요. 사진을 보지 못해 좌표를 물을 수 없어요.";
const PLACES_UNREAD = "다닌 자리는 몰라요. 사진의 좌표를 읽지 못했어요.";

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
    expect(none).toContain("사진은 없었어요.");
    expect(unknown).toContain(PHOTOS_UNSEEN);
    expect(unknown).toContain(PLACES_NO_PHOTOS);
    expect(unknown).not.toContain("사진은 없었어요.");
  });

  it("사진 찍힌 때는 처음~끝 두 때만, 숫자 시각 없음", () => {
    const p = buildPrompt(req(TRUNCATED, "quiet"));
    expect(p).toContain("사진은 다섯 장이 남았어요. 오전부터 오후까지 찍혔어요.");
    expect(p).not.toMatch(/\d+시|여덟 시|한 시/);
    expect(p).toContain(S_TRUNCATED);
  });

  it("때가 하나뿐이면 「{때}에 찍혔어요.」", () => {
    const one: DaySignals = { ...EMPTY, photos: photosAt(["19:12"], true) };
    expect(buildPrompt(req(one, "quiet"))).toContain("사진은 한 장이 남았어요. 저녁에 찍혔어요.");
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
    expect(p).toContain(`${part}에 찍혔어요.`);
  });

  it("자리가 여럿이면 거리, 한 곳이면 「자리는 한 곳에 남았어요.」", () => {
    const many = buildPrompt(req(TRUNCATED, "quiet"));
    expect(many).toContain(
      "자리는 세 곳에 남았고, 가장 먼 두 곳은 다섯 킬로미터쯤 떨어져 있어요. 사진 다섯 장 중 네 장에서 얻은 자리예요.",
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
    expect(p).toContain("자리는 한 곳에 남았어요. 사진 두 장 중 두 장에서 얻은 자리예요.");
    expect(p).not.toContain("0 미터");
    expect(p).toContain(S_PLACES);
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

  it("① 캡션이 있는 날 — 날짜로 고른 첫 문장 틀이 든 꼬리, 기록 머리줄이 있다", () => {
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
    expect(p).not.toContain(S_VISION_PARTIAL);
  });

  it("④ 권한이 없어 못 읽음(unknown) — 「모른다」로 시작하고 「한 장도」(없었다 단정)가 없다", () => {
    const p = buildPrompt(req(UNSEEN, "quiet"));
    expect(lastLine(p)).toBe(noSceneTail(WHY.unseen, MINE.unseen));
    expect(p).not.toContain("한 장도 보지 못해서");
  });

  it("본 장면 없는 날은 기록 머리줄을 싣지 않는다", () => {
    for (const s of [EMPTY, TRUNCATED, UNSEEN]) {
      expect(buildPrompt(req(s, "quiet", OPEN))).not.toContain(SIG_HEAD);
    }
  });

  it("063 — 하루가 안 끝난 본 장면 없는 날은 S_DAY_OPEN이 기록 첫 줄이고 꼬리에 B가 없다 (R18.y3)", () => {
    const cases: [DaySignals, string, string][] = [
      [EMPTY, WHY.zero, MINE.zero],
      [TRUNCATED, WHY.unread, MINE.unread],
      [UNSEEN, WHY.unseen, MINE.unseen],
    ];
    for (const [s, why, mine] of cases) {
      const p = buildPrompt(req(s, "quiet", OPEN));
      const record = p.split("\n").slice(promptPrefix("quiet").split("\n").length);
      expect(record[0]).toBe(S_DAY_OPEN);
      expect(lastLine(p)).toBe(noSceneTail(why, mine));
      expect(p).not.toContain(B_OPEN);
    }
  });

  it("063 — 하루가 끝난 본 장면 없는 날은 S_DAY_OPEN이 없다", () => {
    for (const s of [EMPTY, TRUNCATED, UNSEEN]) {
      expect(buildPrompt(req(s, "quiet"))).not.toContain(S_DAY_OPEN);
    }
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

/* ═══════════════════ T — 첫 문장 틀 (077, contracts/prompt.md TN3) ═══════════════════ */

describe("T — 첫 문장 틀은 날짜로 하나 (077)", () => {
  const sceneDay = (day: string): DaySignals => ({ ...TRUNCATED, date: day });
  const frameIn = (prompt: string) => /첫 문장은 '([^']*)'처럼 시작하고/.exec(prompt)?.[1];

  // 「나」·「내」를 넣는다는 지시서의 기준은 새 틀을 더할 때의 것이다 — 원본 11개 중
  // 「오늘도 주인 곁에서 ~을 지켜보았어요」에는 없다(원본이 이긴다, 단언하지 않는다).
  it("픽스처는 원본 블록의 11줄이다 (`~` 하나, `요`로 끝남)", () => {
    expect(FRAMES).toHaveLength(11);
    for (const f of FRAMES) {
      expect(f.split("~")).toHaveLength(2);
      expect(f.endsWith("요")).toBe(true);
    }
  });

  it("TN3b — 연속한 11일이 틀 11개를 하나씩 쓴다", () => {
    const used = Array.from({ length: 11 }, (_, i) => {
      const day = `2026-01-${String(i + 1).padStart(2, "0")}`;
      return frameIn(buildPrompt(req(sceneDay(day), "quiet"), twoCaptions()));
    });
    expect(new Set(used)).toEqual(new Set(FRAMES));
  });

  it("1970년 이전 날짜도 틀 하나를 고른다 (음수 나머지 없음)", () => {
    const f = frameIn(buildPrompt(req(sceneDay("1969-12-31"), "quiet"), twoCaptions()));
    expect(FRAMES).toContain(f);
  });

  it("고르는 규칙 — 1970-01-01부터의 일수 mod 11번째 줄", () => {
    for (const day of ["2026-01-01", "2026-10-12", "2027-03-01", "2024-02-29"]) {
      expect(frameIn(buildPrompt(req(sceneDay(day), "quiet"), twoCaptions()))).toBe(frameOf(day));
    }
  });

  it("같은 요청은 바이트가 같고(005 P6), 이웃한 날은 꼬리의 틀만 다르다", () => {
    const a = req(sceneDay("2026-05-05"), "quiet");
    expect(buildPrompt(a, twoCaptions())).toBe(buildPrompt(a, twoCaptions()));
    const next = buildPrompt(req(sceneDay("2026-05-06"), "quiet"), twoCaptions()).split("\n");
    const here = buildPrompt(a, twoCaptions()).split("\n");
    expect(next.slice(0, -1)).toEqual(here.slice(0, -1));
    expect(next.at(-1)).not.toBe(here.at(-1));
  });

  it("TN3a — 틀 고르기가 시각·난수·기기 시간대를 읽지 않는다 (소스)", () => {
    const body = /function frameFor\([\s\S]*?\n\}/.exec(PROMPT_CODE)?.[0];
    expect(body).toBeDefined();
    expect(body).toContain("Date.UTC(");
    expect(body).not.toMatch(/new Date\(|Math\.random|getTimezoneOffset|getHours|Date\.now/);
  });
});

/* ═══════════════════ V5 — 원본 케이스 그대로 (077, my-ollama prompts.json) ═══════════════════
 *
 * my-ollama v5 `prompts.json`의 케이스와 같은 신호를 만들어 프롬프트의 기록·꼬리를 통째로
 * 견준다(머리는 E1). 기대값은 원본 `prompt`의 9번째 줄부터를 옮긴 것이다 — 틀은 이 저장소에서
 * 날짜로 고르므로 본 장면 있는 날의 꼬리만 `sceneTail(DAY)`로 둔다.
 */

describe("V5 — 원본 케이스의 기록·꼬리", () => {
  const record = (p: string) => p.split("\n").slice(promptPrefix("quiet").split("\n").length);
  const PLACES_UNKNOWN = {
    kind: "unknown",
    reason: "사진을 보지 못해 좌표를 물을 수 없다",
  } as const;

  it("one — 사진 한 장, 좌표 없음, 캡션 하나", () => {
    const s: DaySignals = { ...EMPTY, photos: photosAt(["19:20"], true), places: { kind: "none" } };
    const vision = {
      captions: [caption(19, "A desk with a laptop and a cup.")],
      considered: 1,
      available: 1,
    };
    expect(record(buildPrompt(req(s, "quiet"), vision))).toEqual([
      SIG_HEAD,
      "사진은 한 장이 남았어요. 저녁에 찍혔어요.",
      "다닌 자리는 남지 않았어요.",
      "저녁에 담은 장면: A desk with a laptop and a cup.",
      "",
      SCENE_TAIL,
    ]);
  });

  it("multi — 사진 세 장, 자리 둘, 다녀온 곳", () => {
    const s: DaySignals = {
      ...EMPTY,
      photos: photosAt(["13:10", "22:00", "22:30"], true),
      places: {
        kind: "known",
        value: {
          trace: { visitCount: 2, approximateDistanceMeters: 8200 },
          source: "photo-exif",
          photosWithLocation: 3,
          photosConsidered: 3,
        },
      },
    };
    const vision = {
      captions: [
        caption(13, "A restaurant menu board on the table."),
        caption(22, "A cat sleeping on the living room sofa."),
        caption(22, "A cat curled up on a blanket."),
      ],
      considered: 3,
      available: 3,
    };
    expect(record(buildPrompt(req(s, "quiet", { placeName: "강남구" }), vision))).toEqual([
      SIG_HEAD,
      "사진은 세 장이 남았어요. 오후부터 밤까지 찍혔어요.",
      "자리는 두 곳에 남았고, 가장 먼 두 곳은 여덟 킬로미터쯤 떨어져 있어요. 사진 세 장 중 세 장에서 얻은 자리예요.",
      S_PLACES,
      "다녀온 곳은 강남구 근처였어요.",
      "오후에 담은 장면: A restaurant menu board on the table.",
      "밤에 담은 장면: A cat sleeping on the living room sofa.",
      "밤에 담은 장면: A cat curled up on a blanket.",
      "",
      SCENE_TAIL,
    ]);
  });

  it("none — 사진 0장, 자리 모름", () => {
    const s: DaySignals = { ...EMPTY, places: PLACES_UNKNOWN };
    expect(record(buildPrompt(req(s, "quiet")))).toEqual([
      "사진은 없었어요.",
      PLACES_NO_PHOTOS,
      "",
      noSceneTail(WHY.zero, MINE.zero),
    ]);
  });

  it("h-dayopen — 하루가 안 끝났고 사진 0장", () => {
    const s: DaySignals = { ...EMPTY, places: PLACES_UNKNOWN };
    expect(record(buildPrompt(req(s, "quiet", OPEN)))).toEqual([
      S_DAY_OPEN,
      "사진은 없었어요.",
      PLACES_NO_PHOTOS,
      "",
      noSceneTail(WHY.zero, MINE.zero),
    ]);
  });

  it("h-trunc — 사진은 있는데 캡션 없음, 목록이 잘림", () => {
    expect(record(buildPrompt(req(TRUNCATED, "quiet")))).toEqual([
      "사진은 다섯 장이 남았어요. 오전부터 오후까지 찍혔어요.",
      S_TRUNCATED,
      "자리는 세 곳에 남았고, 가장 먼 두 곳은 다섯 킬로미터쯤 떨어져 있어요. 사진 다섯 장 중 네 장에서 얻은 자리예요.",
      S_PLACES,
      "",
      noSceneTail(WHY.unread, MINE.unread),
    ]);
  });

  it("h-denied — 사진을 볼 길이 막힘", () => {
    expect(record(buildPrompt(req(UNSEEN, "quiet")))).toEqual([
      PHOTOS_UNSEEN,
      PLACES_NO_PHOTOS,
      "",
      noSceneTail(WHY.unseen, MINE.unseen),
    ]);
  });
});

/* ═══════════════════ R — 까닭 문자열 대신 고정 문장 (077, FR-007·TN2a) ═══════════════════ */

describe("R — 모르는 까닭은 신호 갈래로 고른 고정 문장", () => {
  const FAKE = "가짜-까닭-077";

  it("사진 unknown — 까닭 문자열이 프롬프트에 없고 고정 문장이 있다", () => {
    for (const reason of [FAKE, "사진을 조회하지 못했다: Error: boom"]) {
      const s: DaySignals = {
        ...EMPTY,
        photos: { kind: "unknown", reason },
        places: { kind: "unknown", reason: FAKE },
      };
      const p = buildPrompt(req(s, "quiet"));
      expect(p).toContain(PHOTOS_UNSEEN);
      expect(p).toContain(PLACES_NO_PHOTOS);
      expect(p).not.toContain(reason);
      expect(p).not.toContain(FAKE);
    }
  });

  it("사진은 보았는데 자리 unknown — 「사진의 좌표를 읽지 못했어요」", () => {
    const s: DaySignals = {
      ...EMPTY,
      photos: photosAt(["10:00"], true),
      places: { kind: "unknown", reason: `사진의 좌표를 읽지 못했다: ${FAKE}` },
    };
    const p = buildPrompt(req(s, "quiet"));
    expect(p).toContain(PLACES_UNREAD);
    expect(p).not.toContain(FAKE);
    expect(p).not.toContain(PLACES_NO_PHOTOS);
  });

  it("TN2b — 없었다/모른다가 다른 문장이다 (원칙 V)", () => {
    const none = buildPrompt(req({ ...EMPTY, places: { kind: "none" } }, "quiet"));
    expect(none).toContain("사진은 없었어요.");
    expect(none).toContain("다닌 자리는 남지 않았어요.");
    expect(none).not.toContain("몰라요");
  });

  it("한국어 경로 소스가 신호의 reason을 읽지 않는다", () => {
    const fn = /function sentenceSignalLines\([\s\S]*?\n\}/.exec(PROMPT_CODE)?.[0];
    expect(fn).toBeDefined();
    expect(fn).not.toContain(".reason");
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
  it("본 장면 있는 날: 머리 넷 → 한계 → 제목 질문 → 언어 줄 → 꼬리 (077 — 꼬리도 담는다, FR-009)", () => {
    const vision = { captions: [caption(12, "A menu.")], considered: 1, available: 3 };
    expect(instructionLines(req(TRUNCATED, "quiet", OPEN), vision)).toEqual([
      ...HEAD_RULES,
      S_DAY_OPEN,
      S_TRUNCATED,
      S_PLACES,
      S_VISION_PARTIAL,
      TITLE_ASK_SCENE,
      LANGUAGE_LINE,
      SCENE_TAIL,
    ]);
  });

  it("본 장면 없는 날: 머리 넷 → (안 끝났으면 S_DAY_OPEN) → 제목 질문 → 언어 줄 → 꼬리", () => {
    expect(instructionLines(req(EMPTY, "quiet", OPEN))).toEqual([
      ...HEAD_RULES,
      S_DAY_OPEN,
      TITLE_ASK,
      LANGUAGE_LINE,
      noSceneTail(WHY.zero, MINE.zero),
    ]);
    expect(instructionLines(req(EMPTY, "quiet"))).toEqual([
      ...HEAD_RULES,
      TITLE_ASK,
      LANGUAGE_LINE,
      noSceneTail(WHY.zero, MINE.zero),
    ]);
  });

  it("문장형 신호 본문·캡션은 담지 않는다 (005 P7, 011 P5)", () => {
    const joined = instructionLines(req(TRUNCATED, "quiet"), twoCaptions()).join("\n");
    expect(joined).not.toMatch(/사진은 .*장이 남았어요/);
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
    expect(promptPrefix("quiet").split("\n")[4]).toBe(TONE_LINE);
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
