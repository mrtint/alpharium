/**
 * 051 — 쓴 날 읽기의 경계 (소스·순수).
 *
 * 계약: specs/051-home-written-day/contracts/written-day.md NR5, REACH1~REACH3, DEL1~DEL4, TXT3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **§2 성립 조건 (원칙 I)**: 「최근」 목록을 지워도 옛 일기에 닿는 길이 있어야 한다 — 049 스트립(과거
 * 한계 없음)과 050 달력(가장 이른 날 한계 없음)이 그 길이다. 여기서 그 사실을 잠근다. 하나라도
 * 무너지면 목록이 없어진 뒤 사흘 밖의 옛 일기가 화면에서 사라진다.
 *
 * 소스를 읽는 검사는 주석을 먼저 걷어낸다 — 이 저장소의 주석은 무엇을 왜 금지하는지 적으므로
 * 금지어가 설명 안에 정당하게 나온다(011·035 관례).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { cellFor, swipeWeek, type DiaryListItem } from "../../src/app/state";
import { WRITTEN_DAY_TEXT } from "../../src/ui/home-text";

const ROOT = join(__dirname, "../..");
const code = (file: string) =>
  readFileSync(join(ROOT, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const NOW = new Date("2026-09-28T16:00:00");

describe("★ 051 NR5 — 알림의 「적용」과 「확인」이 갈린다 (App.tsx)", () => {
  const app = code("App.tsx");

  it("onInitialDayApplied가 알림 경로를 비운다", () => {
    expect(app).toMatch(/onInitialDayApplied=\{\(\) => setPendingRoute\(null\)\}/);
  });

  it("확인 기록 콜백은 알림 경로를 건드리지 않는다 — 옛 onDayOpened가 없다", () => {
    expect(app).not.toMatch(/onDayOpened/);
    const ack = app.match(/const onAcknowledge = useCallback\(([\s\S]*?)\}, \[\]\);/);
    expect(ack).not.toBeNull();
    expect(ack?.[1]).not.toMatch(/setPendingRoute/);
  });
});

describe("★ 051 REACH — 목록 없이도 모든 옛 일기에 닿는다 (§2 성립 조건)", () => {
  it("REACH1 — 1년 전 일기와 읽을 수 없는 일기도 고를 수 있는 칸이고 점이 찍힌다", () => {
    const items: DiaryListItem[] = [
      { day: "2025-09-20", readable: true, photos: { kind: "none" } },
      { day: "2025-09-21", readable: false, photos: { kind: "unknown" } },
    ];
    for (const item of items) {
      const cell = cellFor(item.day, items, "2026-09-28", NOW);
      expect(cell.hasDiary).toBe(true);
      expect(cell.selectable).toBe(true);
    }
  });

  it("REACH2 — 달력에 가장 이른 날 한계가 없다 (050 Q2 재확인)", () => {
    expect(code("src/ui/DateJumpDialog.tsx")).not.toMatch(/minDate/);
  });

  it("REACH3 — 스트립은 과거로 한계 없이 한 주씩 간다 (52주 뒤로)", () => {
    let day = "2026-09-28";
    for (let i = 0; i < 52; i += 1) {
      const previous = swipeWeek(day, "previous", NOW);
      expect(previous).not.toBeNull();
      day = previous as string;
    }
    expect(day < "2025-10-01").toBe(true);
  });
});

describe("★ 051 DEL — 없어지는 것이 정말 없다", () => {
  const src = walk(join(ROOT, "src")).filter((f) => /\.tsx?$/.test(f));

  it("DEL1 — 별도 상세 화면 파일이 없다", () => {
    expect(existsSync(join(ROOT, "src/ui/DiaryDetailScreen.tsx"))).toBe(false);
  });

  it("DEL2 — 025 갤러리·슬라이더·038 첫 표시 타자기의 흔적이 없다", () => {
    for (const file of src) {
      const body = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      expect(body).not.toMatch(/photo-gallery|photo-slider|diary-reveal-skip|PhotoGalleryModal/);
    }
  });

  it("DEL3 — TypewriterText는 없다 (054 — 쓰는 중 독백이 페이드 교체가 되어 마지막 사용처가 사라졌다)", () => {
    const importers = src.filter((f) =>
      /from\s+["'][^"']*components\/TypewriterText["']/.test(readFileSync(f, "utf8")),
    );
    expect(importers).toEqual([]);
  });

  it("DEL4 — 새 의존성이 없다 (main과 dependencies 키가 같다)", () => {
    const now = Object.keys(
      JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).dependencies,
    );
    let before: string[];
    try {
      before = Object.keys(
        JSON.parse(execSync("git show main:package.json", { cwd: ROOT, encoding: "utf8" }))
          .dependencies,
      );
    } catch {
      // main이 없는 환경(얕은 CI 체크아웃 등)에서는 비교할 기준이 없어 이 검사만 건너뛴다.
      // 로컬(main이 있는 곳)에서는 늘 돈다 — 새 의존성은 실기기 검증 전에 여기서 걸린다.
      return;
    }
    // 055 — `expo-application`을 직접 의존성으로 올렸다(research R5 — 버전 표시). `expo-notifications`를 통해 이미 설치·자동
    // 링크돼 있던 모듈이라 새 네이티브 코드가 아니다. 이 브랜치가 main에 들어가면 두 목록이 다시 같아진다.
    const known = new Set(["expo-application"]);
    expect(now.filter((k) => !known.has(k)).sort()).toEqual(
      before.filter((k) => !known.has(k)).sort(),
    );
  });
});

describe("★ 051 TXT3 — 쓴 날 문구는 home-text.ts에만 있다", () => {
  const screens = [
    "src/ui/DiaryHomeScreen.tsx",
    "src/ui/DiaryListScreen.tsx",
    "src/ui/WrittenDayPaper.tsx",
    "src/ui/PhotoCarousel.tsx",
  ];
  const sentences = [
    WRITTEN_DAY_TEXT.rewrite,
    ...WRITTEN_DAY_TEXT.unreadableLines,
    WRITTEN_DAY_TEXT.photoMissing,
    WRITTEN_DAY_TEXT.backToHome,
    "전에 작성",
    "방금 작성",
  ];

  it.each(screens)("%s에 쓴 날 문구 리터럴이 없다", (file) => {
    const body = code(file);
    for (const sentence of sentences) expect(body).not.toContain(sentence);
  });
});
