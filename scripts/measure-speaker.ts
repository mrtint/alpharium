/**
 * 화자 실측 스크립트 — quickstart 시나리오 8b (004 FR-348)
 *
 * **이것은 앱 코드가 아니라 관측 도구다.** 실제 파이프라인(프롬프트 구성 → 어댑터 →
 * 출력 해석)을 그대로 태워 본문을 모으고, 눈으로 셀 수 있게 파일로 떨군다.
 *
 * 화자 판정은 **일부러 걸지 않는다** — 지금 표지 목록이 비어 있어 전부 통과하므로
 * 재는 의미가 없다. 이 스크립트가 만드는 것은 「자를 만들기 위한 재료」다.
 *
 * 실행:
 *   npx tsx scripts/measure-speaker.ts --count 20 --model exaone3.5:7.8b
 *   npx tsx scripts/measure-speaker.ts --count 20 --model exaone4:1.2b
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { buildPromptInput, composePrompt, DEFAULT_PROMPT_PARAMS } from "../src/inference/prompt";
import { parseDiaryBody } from "../src/inference/parse";
import { createDigest, type DailyDigest } from "../src/signals/digest";
import { createPersona } from "../src/persona/persona";
import { TRAIT_CATALOG } from "../src/persona/catalog";
import { observed, unobserved } from "../src/signals/observation";
import { ScaleVerdict } from "../src/signals/scale";

const BASE_URL = process.env.EXPO_PUBLIC_AI_API_BASE_URL ?? "https://macbook.yattle-mora.ts.net/v1";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const COUNT = Number(arg("count", "20"));
const MODEL = arg("model", "exaone3.5:7.8b");

/**
 * 관측량이 다른 하루 셋. 재료가 적을 때 모델이 사용자 목소리로 미끄러지는지도 함께
 * 본다 — 적은 재료를 메우려 상상하다 화자가 흔들릴 수 있다.
 */
const DAYS: { label: string; digest: DailyDigest }[] = [
  {
    label: "풍부",
    digest: createDigest({
      date: "2026-08-02",
      observedAt: "2026-08-02T22:00:00+09:00",
      steps: observed(9820),
      activePeriods: observed(["아침", "낮", "저녁"]),
      stays: observed([
        { place: "집", period: observed("아침") },
        { place: "성수동 카페", period: observed("낮") },
        { place: "한강공원", period: observed("저녁") },
      ]),
      moved: observed(true),
      photos: observed([
        { period: observed("낮"), place: observed("성수동 카페"), caption: observed("나무 테이블 위 커피잔") },
        { period: observed("저녁"), place: observed("한강공원"), caption: observed("노을 지는 강가") },
      ]),
      events: observed([{ title: "팀 점심", period: observed("낮") }]),
      scale: ScaleVerdict.Normal,
    }),
  },
  {
    label: "보통",
    digest: createDigest({
      date: "2026-08-02",
      observedAt: "2026-08-02T19:00:00+09:00",
      steps: observed(3120),
      activePeriods: observed(["저녁"]),
      stays: observed([{ place: "집", period: observed("저녁") }]),
      moved: observed(false),
      photos: unobserved(),
      events: unobserved(),
      scale: ScaleVerdict.Normal,
    }),
  },
  {
    label: "적음",
    digest: createDigest({
      date: "2026-08-02",
      observedAt: "2026-08-02T14:00:00+09:00",
      steps: observed(420),
      activePeriods: unobserved(),
      stays: unobserved(),
      moved: observed(false),
      photos: unobserved(),
      events: unobserved(),
      scale: ScaleVerdict.Modest,
    }),
  },
];

interface Sample {
  readonly index: number;
  readonly day: string;
  readonly trait: string;
  readonly personaName: string;
  readonly ok: boolean;
  readonly note?: string;
  readonly body?: string;
}

async function callModel(prompt: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }] }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("응답에서 출력을 찾을 수 없다");
  return text;
}

async function main() {
  console.log(`모델: ${MODEL} / 편수: ${COUNT} / 주소: ${BASE_URL}\n`);

  const samples: Sample[] = [];

  for (let i = 0; i < COUNT; i++) {
    // 하루와 성격을 돌려 가며 뽑는다 — 특정 조합에서만 어긋나는지 보기 위해.
    const day = DAYS[i % DAYS.length];
    const trait = TRAIT_CATALOG[i % TRAIT_CATALOG.length];
    const persona = createPersona({ name: "네모", traitId: trait.id });

    const prompt = composePrompt(buildPromptInput(day.digest, persona, DEFAULT_PROMPT_PARAMS));

    try {
      const raw = await callModel(prompt);
      const parsed = parseDiaryBody(raw);

      samples.push(
        parsed.ok
          ? { index: i, day: day.label, trait: trait.id, personaName: persona.name, ok: true, body: parsed.body }
          : { index: i, day: day.label, trait: trait.id, personaName: persona.name, ok: false, note: "형식 실패 — 본문을 찾지 못함" },
      );
      process.stdout.write(parsed.ok ? "." : "F");
    } catch (error) {
      samples.push({
        index: i,
        day: day.label,
        trait: trait.id,
        personaName: persona.name,
        ok: false,
        note: `호출 실패: ${error instanceof Error ? error.message : String(error)}`,
      });
      process.stdout.write("E");
    }
  }

  console.log("\n");

  const outDir = join(process.cwd(), "measurements");
  mkdirSync(outDir, { recursive: true });
  const stamp = MODEL.replace(/[^a-z0-9]+/gi, "-");

  // 눈으로 세는 파일 — 한 편씩 끊어 놓고 판정 칸을 비워 둔다.
  const lines = [
    `# 화자 실측 — ${MODEL}`,
    "",
    `- 뽑은 편수: ${COUNT}`,
    `- 본문이 나온 편수: ${samples.filter((s) => s.ok).length}`,
    "",
    "각 편마다 화자를 적는다: **휴대폰** / **사용자** / **애매**",
    "「사용자」로 적은 편에서 어떤 표현이 걸리는지 밑줄 쳐 둔다 — 그것이 표지 목록이 된다.",
    "",
    "---",
    "",
  ];

  for (const s of samples) {
    lines.push(`## ${s.index + 1}. [${s.day} / ${s.trait}]`);
    lines.push("");
    lines.push(s.ok ? s.body! : `_(${s.note})_`);
    lines.push("");
    lines.push("**화자:** ");
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  const mdPath = join(outDir, `speaker-${stamp}.md`);
  writeFileSync(mdPath, lines.join("\n"), "utf8");
  writeFileSync(join(outDir, `speaker-${stamp}.json`), JSON.stringify(samples, null, 2), "utf8");

  console.log(`본문 ${samples.filter((s) => s.ok).length}/${COUNT}편`);
  console.log(`→ ${mdPath}`);
}

void main();
