/**
 * 헌법 경계 검사 — quickstart.md B~E절을 테스트로 옮긴 것.
 *
 * quickstart는 사람이 grep으로 확인하라고 적었지만, **사람의 주의력에 기대지 않는 편이
 * 낫다.** 001의 `check-constitution.mts`가 설정 파일에 같은 판단을 한 것과 같은 이유이며,
 * 되돌리기의 원인이 "잘못된 것이 쌓여도 아무도 못 본 것"이었다.
 *
 * **이 파일은 모델 출력을 재지 않는다**(원칙 IV). 소스에 금지된 것이 있는지만 본다 —
 * `constitution-rules.ts` 주석이 그은 경계와 같다.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SRC = join(__dirname, "../../src");

/** 주석을 걷어낸 소스. 규칙을 **설명하는 것**과 **코드로 쓰는 것**은 다르다. */
function codeOf(...segments: string[]): string {
  return readFileSync(join(SRC, ...segments), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

function filesIn(dir: string): string[] {
  return readdirSync(join(SRC, dir)).filter((name) => name.endsWith(".ts") || name.endsWith(".tsx"));
}

describe("원칙 III — 매핑이 화면으로 새지 않는다", () => {
  // quickstart C-2. 화면은 Character와 ModelReadiness만 안다
  it("화면이 자산을 만지지 않는다", () => {
    for (const name of filesIn("ui")) {
      const code = codeOf("ui", name);
      expect(code).not.toContain("ModelAsset");
      expect(code).not.toContain("assetFor");
      expect(code).not.toContain("assetKey");
      expect(code).not.toMatch(/from\s+["'].*models\/roster["']/);
    }
  });

  /**
   * 화면이 **그리는 값**에 자산이 섞이지 않는다.
   *
   * `App.tsx`는 배선을 하므로 자산을 만질 수밖에 없다 — 파일 상태를 읽으려면 자산키가
   * 필요하다. 그러나 그 값이 화면 컴포넌트로 **건네지면** 안 된다. 그래서 App은
   * 예외로 두되, **`CharacterListScreen`이 받는 props에 자산이 없다는 것**으로 경계를
   * 지킨다 — 배선과 표시를 가르는 자리가 여기다.
   */
  it("목록 화면이 받는 값에 자산이 없다", () => {
    const code = codeOf("ui", "CharacterListScreen.tsx");
    const props = code.slice(code.indexOf("CharacterListProps"), code.indexOf("function statusText"));
    expect(props).not.toMatch(/asset|url|md5|expectedBytes/i);
  });

  // quickstart C-1. 자산을 만드는 곳이 roster.ts 하나다
  it("자산의 속살이 roster 밖에 없다", () => {
    for (const name of filesIn("models")) {
      if (name === "roster.ts" || name === "types.ts") continue;
      const code = codeOf("models", name);
      // 자산 필드를 직접 쓰는 곳은 계약이 정한 자리(acquisition·verification)뿐이며,
      // 그곳도 roster가 준 값을 쓸 뿐 새로 만들지 않는다.
      expect(code).not.toMatch(/url:\s*["']http/);
    }
  });

  // quickstart C-4. 001이 process.env를 environment.ts에만 둔 것보다 강하다 (FR-002)
  it("models가 환경 변수를 읽지 않는다", () => {
    for (const name of filesIn("models")) {
      expect(codeOf("models", name)).not.toContain("process.env");
    }
  });

  // 설계 중 찾은 누출 경로 — totalBytes가 곧 모델 크기다
  it("진행률 타입에 바이트가 없다", () => {
    const code = codeOf("models", "types.ts");
    const progress = code.slice(
      code.indexOf("DownloadProgress"),
      code.indexOf("DownloadFailure"),
    );
    expect(progress).not.toMatch(/bytes/i);
  });
});

describe("원칙 IV — 측정 장치를 들이지 않는다", () => {
  // quickstart D. 무해해 보이지만 모델 비교의 시작점이다 (FR-034)
  it("models가 속도를 재지 않는다", () => {
    for (const name of filesIn("models")) {
      const code = codeOf("models", name);
      expect(code).not.toMatch(/Date\.now|performance\.now|elapsed|bytesPerSecond|tokensPerSecond/);
    }
  });

  it("검증 결과에 시각이 없다", () => {
    const code = codeOf("models", "types.ts");
    const verdict = code.slice(
      code.indexOf("VerificationVerdict"),
      code.indexOf("PausedDownload"),
    );
    expect(verdict).not.toMatch(/verifiedAt|timestamp|duration/);
  });
});

describe("원칙 I — 대체 모델로 조용히 바꿔치기하지 않는다", () => {
  // quickstart B. 타입 수준에서 대체가 불가능해야 한다 (FR-035)
  it("실패 갈래에 대체 자산 자리가 없다", () => {
    const code = codeOf("models", "types.ts");
    const failure = code.slice(code.indexOf("DownloadFailure"), code.indexOf("StorageUsage"));
    expect(failure).not.toMatch(/fallback|substitute|alternative|url/i);
  });
});

describe("경계 유지 — 001·002를 손대지 않는다", () => {
  // FR-031
  it("models가 001의 판정 지점을 부르지 않는다", () => {
    for (const name of filesIn("models")) {
      const code = codeOf("models", name);
      expect(code).not.toMatch(/config\/policy|config\/environment|inference\/select/);
    }
  });

  // FR-030 — 모델 파일과 일기는 별개다
  it("models가 일기 저장에 닿지 않는다", () => {
    for (const name of filesIn("models")) {
      const code = codeOf("models", name);
      expect(code).not.toContain("DiaryStore");
      expect(code).not.toMatch(/diary\/store/);
    }
  });

  // FR-032, FR-009 — "받았으니 돌려보자"를 막는다
  it("models가 추론을 실행하지 않는다", () => {
    for (const name of filesIn("models")) {
      const code = codeOf("models", name);
      expect(code).not.toMatch(/llama|initLlama|completion|prompt/i);
    }
  });
});
