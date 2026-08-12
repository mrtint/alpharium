/**
 * 헌법 위반 설정 판정 규칙 (FR-026~FR-029).
 *
 * 계약: specs/001-project-skeleton-setup/contracts/constitution-check.md
 *
 * 금지된 설정이 저장소에 들어오는 것을 **사람의 주의력에 기대지 않고** 막는다.
 * 되돌리기의 원인이 잘못된 설정이 쌓여도 아무도 못 본 것이었다.
 *
 * 순수 함수만 둔다 — 파일 시스템에 닿지 않으므로 기기 없이 테스트된다(FR-021c).
 * 파일을 훑어 이 규칙에 넘기는 것은 scripts/check-constitution.cjs가 한다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 헌법 원칙 IV와의 경계 — 이 파일을 확장하려는 사람이 반드시 읽을 것.
 *
 * 원칙 IV는 "모델 출력을 점수로 매기거나, 여러 모델을 비교하거나, 품질을 자동
 * 채점하는 코드"를 제품에 들이는 것을 금지한다.
 *
 * 이 검사는 **설정 파일에 금지된 키가 있는지**만 본다. 모델을 부르지 않고, 출력을
 * 만들지 않고, 품질을 재지 않는다. 그래서 원칙 IV가 막으려는 "측정 장치"가 아니다.
 *
 * **여기에 넣지 않을 것**: 추론 속도 측정, 출력 품질 점수, 모델 간 비교, 프롬프트 평가.
 * "이미 검사가 있으니 여기에 출력 검사도 넣자"가 정확히 원칙 IV 위반이다.
 * 그런 것이 필요하면 별도 저장소에서 한다.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type Violation = {
  file: string;
  key: string;
  rule: string;
};

/** 데스크톱 서버 주소 키. local에만 허용된다(FR-014). */
const SERVER_URL_KEYS = [/^EXPO_PUBLIC_DESKTOP_INFERENCE_URL$/];

/** 원격 API 추론(외부 모델 API)을 가리키는 키(FR-015, 원칙 I). */
const REMOTE_API_KEYS = [/^EXPO_PUBLIC_AI_API_BASE_URL$/, /^EXPO_PUBLIC_AI_MODE$/];

/** 대체 응답으로 우회하는 스위치(FR-016, 원칙 I). */
const MOCK_FALLBACK_KEYS = [/MOCK_FALLBACK/, /^EXPO_PUBLIC_ENABLE_MOCK/];

/** local 환경 설정 파일. 서버 주소 키가 허용되는 유일한 곳이다. */
const LOCAL_ENV_FILES = new Set([".env.development", ".env.local"]);

const matchesAny = (key: string, patterns: RegExp[]) => patterns.some((p) => p.test(key));

/** .env 형식에서 주석과 빈 줄을 걷어내고 키만 뽑는다. */
export function parseEnvKeys(contents: string): string[] {
  return contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"))
    .map((line) => line.split("=")[0].trim())
    .filter((key) => key !== "");
}

/**
 * 환경 설정 파일 하나를 검사한다.
 *
 * 서버 주소는 **값이 아니라 키의 존재**를 본다. 값을 비워도 키가 있으면 위반이다 —
 * EXPO_PUBLIC_ 값은 배포본에 문자열로 박히고, 키가 있으면 언젠가 값이 채워진다.
 */
export function checkEnvFile(fileName: string, contents: string): Violation[] {
  const isLocal = LOCAL_ENV_FILES.has(fileName);
  const violations: Violation[] = [];

  for (const key of parseEnvKeys(contents)) {
    if (matchesAny(key, REMOTE_API_KEYS)) {
      violations.push({
        file: fileName,
        key,
        rule: "원격 API 추론을 가리키는 설정 (FR-015, 원칙 I)",
      });
    } else if (matchesAny(key, MOCK_FALLBACK_KEYS)) {
      violations.push({ file: fileName, key, rule: "대체 응답 스위치 (FR-016, 원칙 I)" });
    } else if (matchesAny(key, SERVER_URL_KEYS) && !isLocal) {
      // local에는 허용된다(FR-011). 과잉 차단하면 개발이 막힌다.
      violations.push({
        file: fileName,
        key,
        rule: "local이 아닌 환경에 데스크톱 서버 주소 키 (FR-014, 원칙 I)",
      });
    }
  }

  return violations;
}

/** 실패 출력 — 어느 파일의 어느 설정이 왜 걸렸는지 지목한다(FR-029). */
export function formatViolations(violations: Violation[]): string {
  if (violations.length === 0) return "헌법 검사 통과 — 위반 0건";

  const byFile = new Map<string, Violation[]>();
  for (const v of violations) {
    const list = byFile.get(v.file) ?? [];
    list.push(v);
    byFile.set(v.file, list);
  }

  const lines = [`헌법 위반 ${violations.length}건`, ""];
  for (const [file, items] of byFile) {
    lines.push(`  ${file}`);
    for (const item of items) lines.push(`    ${item.key} — ${item.rule}`);
    lines.push("");
  }

  return lines.join("\n");
}
