/**
 * 108 — 안내·알림 규칙을 소스에서 잠근다 (주석을 걷어낸 뒤 읽는다).
 *
 * 계약: specs/108-notice-unification/contracts/constraint-band.md RL1·RL2, spec FR-001·FR-002·FR-013
 *
 * 홈의 스트립 아래에 안내 줄이 다시 쌓이거나, 안내에 닫기가 다시 생기면 실패한다. 위반은 사람이 하나씩 주입해 이 테스트가 잡는지
 * 확인했다(tasks T021).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../..");

const raw = (file: string) => readFileSync(join(ROOT, file), "utf8");
const code = (file: string) =>
  raw(file)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

describe("RL2 — 홈 화면 소스에 스트립 아래 안내가 없다", () => {
  it.each(["src/ui/DiaryListScreen.tsx", "src/ui/DiaryHomeScreen.tsx"])(
    "%s에 옛 안내 식별자가 없다",
    (file) => {
      const source = code(file);
      // 카탈로그 문구 `text().home.movedNotice(…)`는 토스트 문장을 만드는 쪽이라 허용한다(앞에 점이 붙는다)
      expect(source).not.toMatch(
        /deniedNotices|(?<![.\w])movedNotice|batteryNotice|BatteryNoticeLine/,
      );
      expect(source).not.toMatch(/<Notices\b|function Notices\b/);
    },
  );

  it("App.tsx도 옛 거부 안내 줄글을 홈에 넘기지 않는다", () => {
    expect(code("App.tsx")).not.toMatch(/deniedNotices|setDeniedNotices/);
  });
});

describe("RL2 — 제약 띠에는 닫기가 없다", () => {
  it("ConstraintBand 소스에 닫기 계열 이름이 없다", () => {
    expect(code("src/ui/components/ConstraintBand.tsx")).not.toMatch(/dismiss|onClose/i);
  });

  it("훅과 판정에는 닫은 시각을 저장하는 코드가 없다", () => {
    for (const file of ["src/app/use-constraint-band.ts", "src/app/constraint-band.ts"]) {
      expect(code(file)).not.toMatch(/dismiss|saveDismissed|\.json/i);
    }
  });
});

describe("RL1 — design/DESIGN.md에 규칙이 있다", () => {
  const md = raw("design/DESIGN.md");

  it("「안내·알림 방식」 절과 다섯 분류(A~E)", () => {
    expect(md).toMatch(/^## 안내·알림 방식$/m);
    for (const label of [
      "A 제약 띠",
      "B 지나가는 알림",
      "C 확인이 필요한 질문",
      "D 상태 설명",
      "E 앱 밖 알림",
    ]) {
      expect(md).toContain(`| ${label} |`);
    }
  });

  it("「하지 않는 것」에 스트립 아래 쌓기와 닫기 있는 글자 링크 두 줄", () => {
    const start = md.indexOf("## 하지 않는 것");
    const section = md.slice(
      start,
      md.indexOf("\n## ", start + 1) === -1 ? undefined : md.indexOf("\n## ", start + 1),
    );
    expect(section).toMatch(/스트립 아래에 안내·알림 줄을 쌓지 않는다/);
    expect(section).toMatch(/닫기가 있는 글자 링크/);
  });

  it("공용 부품 표에 ConstraintBand가 있다", () => {
    expect(md).toContain("`src/ui/components/ConstraintBand.tsx`");
  });
});
