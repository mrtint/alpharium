/**
 * 069 — 층 1 쓴 날 픽스처 (순수 함수).
 *
 * 오늘부터 연속 사흘이 모두 쓴 날이다(오늘 사진 1장·어제 3장·그제 1장). 틀(`scripts/e2e-fixtures/diary/*.json.tmpl`)의
 * 날짜·시각 자리표시자를 실행 시점의 날로 치환한다. **가짜 추론이 아니다** — 쓰기 경로를 통과하지 않고, 앱의 읽기 경로만 실제 코드를 탄다.
 *
 * 하루 경계는 `src/config/day-boundary.ts` 한 곳이다(DB11). 여기서 시각으로 날을 가르지 않는다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { dayOf, type DayDate } from "../../src/config/day-boundary.ts";

export const FIXTURE_PACKAGE = "com.a810labs.pocketlog";

/** 저장소 루트 기준 픽스처 폴더. 실행기는 저장소 루트에서 돈다. */
export const FIXTURES_DIRECTORY = "scripts/e2e-fixtures";

/** 사진 사본이 놓이는 앱 안의 자리 (013 FR-007, `diary/photo-path.ts`의 `VISION_CACHE_DIRECTORY`) */
const PHOTO_DIRECTORY = `/data/user/0/${FIXTURE_PACKAGE}/files/vision-cache`;

const TEMPLATES = [
  { template: "today", offset: 0, key: "TODAY" },
  { template: "yesterday", offset: 1, key: "YESTERDAY" },
  { template: "day-before", offset: 2, key: "DAY_BEFORE" },
] as const;

export type FixtureFile = { name: string; content: string };

/** 오늘로부터 `offset`일 전의 날. 기기 로컬 정오를 기준으로 건너 일광절약 경계에 흔들리지 않는다. */
function dayBefore(now: Date, offset: number): DayDate {
  return dayOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, 12));
}

/** 그 날의 로컬 `HH:MM`을 ISO 시각으로 */
function instantOf(day: DayDate, hour: number, minute: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, hour, minute).toISOString();
}

type ReadTemplate = (name: string) => string;

function readFromDisk(name: string): string {
  return readFileSync(join(process.cwd(), FIXTURES_DIRECTORY, "diary", `${name}.json.tmpl`), "utf8");
}

/** 틀 하나를 그 날로 치환한다. 남은 자리표시자가 있으면 던진다 — 조용히 틀린 파일이 심기는 것보다 낫다. */
function fill(template: string, days: Record<string, DayDate>): string {
  const filled = template
    .replace(/\{\{PHOTO_DIR\}\}/g, PHOTO_DIRECTORY)
    .replace(/\{\{([A-Z_]+)@(\d{2}):(\d{2})\}\}/g, (_match, key: string, hh: string, mm: string) => {
      const day = days[key];
      if (day === undefined) throw new Error(`알 수 없는 자리표시자: ${key}`);
      return instantOf(day, Number(hh), Number(mm));
    })
    .replace(/\{\{([A-Z_]+)\}\}/g, (_match, key: string) => {
      const day = days[key];
      if (day === undefined) throw new Error(`알 수 없는 자리표시자: ${key}`);
      return day;
    });
  if (/\{\{|\}\}/.test(filled)) throw new Error("치환되지 않은 자리표시자가 남았다");
  return filled;
}

/** 오늘·어제·그제 일기 파일 세 개 (파일 이름은 `YYYY-MM-DD.json`) */
export function buildFixtureDiaries(
  now: Date,
  readTemplate: ReadTemplate = readFromDisk,
): FixtureFile[] {
  const days: Record<string, DayDate> = {};
  for (const t of TEMPLATES) days[t.key] = dayBefore(now, t.offset);
  return TEMPLATES.map((t) => ({
    name: `${days[t.key]}.json`,
    content: fill(readTemplate(t.template), days),
  }));
}

/** 심어야 하는 사진 사본의 파일 이름들 (일기가 가리키는 `resizedPath`의 파일명) */
export function fixturePhotoNames(
  now: Date,
  readTemplate: ReadTemplate = readFromDisk,
): string[] {
  const names: string[] = [];
  for (const file of buildFixtureDiaries(now, readTemplate)) {
    const entry = JSON.parse(file.content) as { photos?: { resizedPath: string }[] };
    for (const photo of entry.photos ?? []) names.push(photo.resizedPath.split("/").pop() ?? "");
  }
  return names;
}
