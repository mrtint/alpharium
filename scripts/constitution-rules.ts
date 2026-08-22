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
 *
 * **006이 소스 검사를 더했다**(FR-010, SC-008b). 같은 경계가 그대로 적용된다 —
 * 소스에 **어떤 호출이 있는지**만 보며, 코드를 돌리지도 출력을 만들지도 재지도 않는다.
 * 「어느 화면이 더 빠른가」·「어느 프롬프트가 나은가」는 여기 들어올 수 없다.
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

/* ─────────────────────────── 소스 검사 (006) ─────────────────────────── */

/**
 * 추론 어댑터를 직접 부르는 것을 잡는다 (006 FR-010, SC-008b).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * **왜 런타임 테스트로 부족한가**: 테스트는 「이 경로가 저장까지 간다」를 확인할 뿐,
 * **저장소 어딘가에 남아 있는 다른 직접 호출**을 잡지 못한다. 005에서 정확히 그 일이
 * 있었다 — 파이프라인 테스트는 전부 초록불이었는데 화면이 어댑터를 직접 불러
 * `store.save()`가 기기에서 한 번도 돌지 않았다.
 *
 * **왜 `src/inference/`는 검사하지 않는가**: 어댑터를 구현하고 고르는 자리이므로
 * `generate`가 당연히 나온다. 금지 대상은 **그것을 건너뛰고 쓰는 쪽**이다.
 * ─────────────────────────────────────────────────────────────────────────
 */
const DIRECT_GENERATE = /\b(?:backend|adapter|engine)\s*\.\s*generate\s*\(/;

/** 어댑터를 직접 만드는 것. `wiring.ts`가 `select.ts`를 거치도록 강제한다(FR-026) */
const DIRECT_BACKEND_FACTORY = /\b(?:onDeviceBackend|createDesktopServerBackend)\s*\(/;

/**
 * 화면이 모델 내부에 닿는 것 (007 FR-007·026, 원칙 III).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * **화면은 캐릭터만 알아야 하고 모델은 몰라야 한다.**
 *
 * 003의 `CharacterListScreen`과 007의 `CharacterPicker`가 `roster.ts`·`ModelAsset`을
 * import 하지 않는 것으로 이 방어를 세웠다 — **조심해서 안 쓰는 것이 아니라 쓸 수
 * 없는 것**이 방어이며, 그 성질을 사람의 주의력이 아니라 검사로 지킨다.
 *
 * 닿는 순간 자산키·주소·크기·지문에 접근할 수 있고, 그것이 화면에 새면 사용자가
 * 모델을 역추적할 수 있다.
 *
 * **`App.tsx`는 이 검사의 대상이 아니다** — 준비 상태를 읽으려면 `roster.ts`가
 * 필요하고, 그것은 화면이 아니라 조립이다. 검사 대상은 `src/ui/`뿐이다.
 *
 * **⚠️ `models/types`는 막지 않는다.** `ModelReadiness`·`DownloadProgress`는
 * **「쓸 수 있는가·받는 중인가」이지 모델이 무엇인가가 아니다** — 003의
 * `CharacterListScreen`이 준비 상태를 그리려면 필요하고, 그것을 막으면 화면이
 * 상태를 말할 수 없다. 막아야 할 것은 **자산에 닿는 길**이다.
 * ─────────────────────────────────────────────────────────────────────────
 */
const UI_TOUCHES_MODEL = /\bfrom\s+["'][^"']*models\/(?:roster|assets|expo-port|storage)["']/;

/** 자산 자체를 다루는 이름. import 경로를 우회해 닿는 것도 잡는다 */
const UI_TOUCHES_ASSET = /\b(?:ModelAsset|assetFor|allAssets)\b/;

/**
 * 진단 경로가 사용자 화면의 축 제외 상수를 보는 것 (012, 헌법 원칙 V).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * **`SignalProbe.tsx`는 다섯 축을 전부 그려야 한다**(FR-009) — 사용자 화면에서
 * 걸음·배터리·연결이 빠지는 것과 저장소가 값을 잊는 것은 다르다. `USER_VISIBLE_
 * SIGNAL_AXES`를 이 파일이 import하면 진단 경로도 조용히 같은 축을 숨기게 되고,
 * 그러면 개발자가 실기기에서 그 값을 다시는 볼 수 없다.
 *
 * 008이 "주석을 걷어내고 검사한다"로 세운 것과 같은 이중 방어다 — 화면 테스트
 * (`signal-probe.test.tsx`)가 런타임을, 이 검사가 소스 자체를 본다.
 * ─────────────────────────────────────────────────────────────────────────
 */
const DIAGNOSTICS_HIDES_AXES = /\bUSER_VISIBLE_SIGNAL_AXES\b/;

/**
 * 소스 파일 하나를 검사한다.
 *
 * **경로로 판단한다.** `src/ui/`와 `src/app/`은 화면과 조립이며, 추론 어댑터를 직접
 * 다룰 이유가 없다. `wiring.ts`만 예외로 `select.ts`의 결과를 받는다.
 */
export function checkSourceFile(fileName: string, contents: string): Violation[] {
  // 윈도우 경로 구분자를 맞춘다. 정규식 대신 split/join을 쓰는 편이 읽기 쉽다.
  const normalized = fileName.split("\\").join("/");
  const watched = normalized.startsWith("src/ui/") || normalized.startsWith("src/app/");
  if (!watched) return [];

  const violations: Violation[] = [];

  for (const [index, line] of contents.split(/\r?\n/).entries()) {
    // 주석은 규칙을 설명하는 자리다. 설명이 위반으로 잡히면 아무도 설명을 쓰지 않는다.
    const code = line.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");

    if (DIRECT_GENERATE.test(code)) {
      violations.push({
        file: `${normalized}:${index + 1}`,
        key: code.trim(),
        rule: "추론 어댑터 직접 호출 — 파이프라인을 거쳐야 저장이 일어난다 (006 FR-010)",
      });
    }
    if (DIRECT_BACKEND_FACTORY.test(code)) {
      violations.push({
        file: `${normalized}:${index + 1}`,
        key: code.trim(),
        rule: "추론 어댑터 직접 생성 — select.ts를 거쳐야 한다 (006 FR-026, 원칙 I)",
      });
    }

    // **화면만 검사한다.** `src/app/`은 조립이므로 준비 상태를 읽을 수 있다.
    if (
      normalized.startsWith("src/ui/") &&
      (UI_TOUCHES_MODEL.test(code) || UI_TOUCHES_ASSET.test(code))
    ) {
      violations.push({
        file: `${normalized}:${index + 1}`,
        key: code.trim(),
        rule: "화면이 모델 자산에 닿는다 — 캐릭터만 알아야 한다 (007 FR-007, 원칙 III)",
      });
    }

    // **`SignalProbe.tsx`만 검사한다.** 다른 화면(DiaryDetailScreen 등)은 이 상수를
    // import해서 사용자 화면에 축을 숨기는 것이 맞는 동작이다 — 문제는 진단 경로뿐이다.
    if (normalized === "src/ui/SignalProbe.tsx" && DIAGNOSTICS_HIDES_AXES.test(code)) {
      violations.push({
        file: `${normalized}:${index + 1}`,
        key: code.trim(),
        rule: "진단 화면이 축 제외 상수를 본다 — 다섯 축을 전부 보여야 한다 (012 FR-009, 원칙 V)",
      });
    }
  }

  return violations;
}

/* ─────────────────────── 심는 도구 검사 (010) ─────────────────────── */

/**
 * 심는 도구가 일기에 닿는 것을 잡는다 (010 FR-003·022, 헌법 원칙 IV).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * **왜 이 검사가 필요한가**: 010의 도구는 「가상의 하루」를 기기에 심는다. 그
 * 자리에서 **「심은 하루로 캐릭터를 비교해 보자」가 아주 자연스럽게 떠오른다** —
 * 하루를 통제할 수 있으니 출력을 견줄 조건이 갖춰진 것처럼 보이기 때문이다.
 *
 * 그것이 정확히 원칙 IV가 금지한 「측정 장치」이며, 되돌리기의 이유였다. 게다가
 * 합성 하루로 품질을 재는 것은 원칙 V의 「합성 데이터로 모델 품질을 평가하지
 * 않는다」도 함께 어긴다.
 *
 * **도구는 심고 끝난다.** 생성된 일기를 읽는 코드가 있으면 여기서 걸린다 —
 * 사람의 주의력이 아니라 검사로 막는다.
 *
 * **경계는 위 주석과 같다**: 이 검사는 **소스에 어떤 import·호출이 있는지**만 본다.
 * 모델을 부르지 않고, 출력을 만들지 않고, 품질을 재지 않는다.
 * ─────────────────────────────────────────────────────────────────────────
 */
const SEED_TOUCHES_DIARY =
  /\bfrom\s+["'][^"']*(?:diary\/(?:store|pipeline|acceptance|prompt)|inference\/)[^"']*["']/;

/** 일기 파일에 직접 닿는 것. import를 우회해도 잡는다 */
const SEED_TOUCHES_DIARY_FILES = /files\/diary|listDiaries|readDiary|loadDiary/;

/** 추론을 부르는 것 — 도구는 일기를 만들지 않는다(FR-003) */
const SEED_GENERATES = /\bgenerate\s*\(|initLlama|completion\s*\(/;

/**
 * 소스 파일 하나가 심는 도구인지 보고, 맞으면 위 규칙을 적용한다.
 *
 * **`scripts/seed*`가 대상이다.** 진입점(`seed-day.mts`)과 모듈(`seed/*.ts`) 둘 다다.
 */
export function checkSeedFile(fileName: string, contents: string): Violation[] {
  const normalized = fileName.split("\\").join("/");
  const isSeed = /(^|\/)scripts\/seed/.test(normalized);
  if (!isSeed) return [];

  const violations: Violation[] = [];

  for (const [index, line] of contents.split(/\r?\n/).entries()) {
    // 주석은 규칙을 설명하는 자리다. 설명이 위반으로 잡히면 아무도 설명을 쓰지 않는다.
    const code = line.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");

    if (SEED_TOUCHES_DIARY.test(code) || SEED_TOUCHES_DIARY_FILES.test(code)) {
      violations.push({
        file: `${normalized}:${index + 1}`,
        key: code.trim(),
        rule: "심는 도구가 일기에 닿는다 — 심고 끝나야 한다 (010 FR-022, 원칙 IV)",
      });
    }
    if (SEED_GENERATES.test(code)) {
      violations.push({
        file: `${normalized}:${index + 1}`,
        key: code.trim(),
        rule: "심는 도구가 추론을 부른다 — 일기를 만들지 않는다 (010 FR-003, 원칙 I)",
      });
    }
  }

  return violations;
}

/* ─────────────────────── 사진 읽기 검사 (011) ─────────────────────── */

/**
 * 사진 읽는 자리가 일기에 닿는 것을 잡는다 (011 FR-033, 헌법 원칙 IV).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * **왜 이 검사가 필요한가**: 011은 캡션이 일기의 재료가 되게 한다. 그 자리에서
 * **「캡션이 일기 품질을 올렸는지 재 보자」가 아주 자연스럽게 떠오른다** — 캡션이
 * 있는 일기와 없는 일기를 견줄 조건이 갖춰진 것처럼 보이기 때문이다.
 *
 * **옆 저장소가 이미 쟀고**(2026-08-10: SmolVLM 3.62 대 LFM2.5 3.31), 그 결과를
 * 이 저장소로 옮기면 측정 장치가 된다. 010의 심는 도구가 같은 이유로 막힌 자리이며,
 * 같은 방식으로 막는다.
 *
 * **사진 읽는 자리는 캡션을 만들고 끝난다.** 일기를 읽는 코드가 있으면 여기서 걸린다.
 *
 * **경계는 위 주석들과 같다**: 소스에 어떤 import·호출이 있는지만 본다. 모델을
 * 부르지 않고, 출력을 만들지 않고, 품질을 재지 않는다.
 * ─────────────────────────────────────────────────────────────────────────
 */
const VISION_TOUCHES_DIARY =
  /\bfrom\s+["'][^"']*diary\/(?:store|pipeline|acceptance|entry)[^"']*["']/;

/** 일기 파일에 직접 닿는 것. import를 우회해도 잡는다 */
const VISION_TOUCHES_DIARY_FILES = /files\/diary|listDiaries|readDiary|loadDiary|DiaryEntry/;

/**
 * 캡션 샘플링이 일기 샘플링을 함께 쓰는 것을 잡는다 (011 research §7, 헌법 원칙 I).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * **원칙 I이 조용히 깨지는 경로다.**
 *
 * `src/inference/sampling.ts`는 「온디바이스와 데스크톱이 동일한 샘플링 파라미터」를
 * 지키는 자리다(원칙 I). **캡션이 그것을 같이 쓰면**, 캡션을 위해 `temperature`를
 * 낮추는 순간 **일기 생성의 파라미터가 함께 바뀐다.**
 *
 * 게다가 값이 정반대여야 한다 — 일기는 0.8(감상), 캡션은 0.1(관찰). 같은 자리에 둘
 * 수 없는 값이며, 그래서 캡션 값은 `src/vision/sampling.ts`에 따로 둔다.
 * ─────────────────────────────────────────────────────────────────────────
 */
const VISION_SHARES_SAMPLING = /\bfrom\s+["'][^"']*inference\/sampling["']/;

/**
 * 소스 파일 하나가 사진 읽는 자리인지 보고, 맞으면 위 규칙을 적용한다.
 *
 * **`src/vision/`이 대상이다.**
 */
export function checkVisionFile(fileName: string, contents: string): Violation[] {
  const normalized = fileName.split("\\").join("/");
  if (!normalized.startsWith("src/vision/")) return [];

  const violations: Violation[] = [];

  for (const [index, line] of contents.split(/\r?\n/).entries()) {
    // 주석은 규칙을 설명하는 자리다. 설명이 위반으로 잡히면 아무도 설명을 쓰지 않는다.
    const code = line.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");

    if (VISION_TOUCHES_DIARY.test(code) || VISION_TOUCHES_DIARY_FILES.test(code)) {
      violations.push({
        file: `${normalized}:${index + 1}`,
        key: code.trim(),
        rule: "사진 읽는 자리가 일기에 닿는다 — 캡션을 만들고 끝나야 한다 (011 FR-033, 원칙 IV)",
      });
    }
    if (VISION_SHARES_SAMPLING.test(code)) {
      violations.push({
        file: `${normalized}:${index + 1}`,
        key: code.trim(),
        rule: "캡션이 일기의 샘플링을 함께 쓴다 — 고치면 일기가 함께 바뀐다 (011 research §7, 원칙 I)",
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
