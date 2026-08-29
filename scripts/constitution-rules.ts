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
 * 화면이 프롬프트 조립에 직접 닿는 것 (022 FR-008, 원칙 II).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * **022가 진단 화면에 입력 프롬프트 원본을 보여준다.** 그 문자열은 진단 계층이
 * `buildPrompt()`를 불러 조립해 `DiagnosticReport.promptPreviews`에 담고, 화면은
 * 그 문자열만 받는다 — 014의 `characterModels`와 같은 경로다.
 *
 * 화면이 `diary/prompt`를 직접 import하면 미리보기용 조립 로직이 화면에 생기고,
 * 그 순간 프롬프트가 두 곳이 되어(005 FR-013b — 프롬프트는 `prompt.ts` 한 곳)
 * 원칙 II가 조용히 깨진다. **조심해서 안 부르는 것이 아니라 부를 수 없게 한다.**
 *
 * **신호 타입(`signals/*`)은 여기서 막지 않는다** — `DiaryDetailScreen`이 저장된
 * `signalsUsed`를 그리고 `SignalProbe`가 신호를 수집하는 것은 이미 정당한 기존
 * 동작이며, 022는 그 경계를 건드리지 않는다. 022가 새로 더하는 위험은 "프롬프트
 * 조립이 화면에 복제되는 것" 하나뿐이다.
 * ─────────────────────────────────────────────────────────────────────────
 */
const UI_TOUCHES_PROMPT = /\bfrom\s+["'][^"']*diary\/prompt["']/;

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

    // 022 — 화면은 진단 리포트의 프롬프트 문자열만 받는다. `diary/prompt`를 직접
    // import하면 미리보기용 조립이 화면에 생겨 프롬프트가 두 곳이 된다(원칙 II).
    if (normalized.startsWith("src/ui/") && UI_TOUCHES_PROMPT.test(code)) {
      violations.push({
        file: `${normalized}:${index + 1}`,
        key: code.trim(),
        rule: "화면이 프롬프트 조립에 닿는다 — 진단 리포트의 문자열만 받아야 한다 (022 FR-008, 원칙 II)",
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
 * 사진 분류·선별이 픽셀·이미지 채점에 닿는 것을 잡는다 (023 FR-023, 헌법 원칙 IV).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * **왜 이 검사가 필요한가**: 023의 분류는 파일 경로의 폴더 이름 문자열 대조뿐이다.
 * 그 자리에서 **「스크린샷 말고 검은 화면·흐린 사진도 걸러 보자」가 아주 자연스럽게
 * 떠오른다** — 픽셀을 디코드해 밝기·엔트로피·선명도를 재면 그것이 이미지 채점이며,
 * 이 저장소가 되돌리기의 이유로 삼은 「측정 장치」(원칙 IV)다.
 *
 * **`resize.ts`를 오탐하지 않는다**: 리사이즈는 `ResizeExecutor` 주입으로 격리돼
 * 순수 계약에 픽셀 어휘가 없다. 아래 토큰은 디코드·채점에 특정된 것만 골랐다 —
 * "resize"·"maxLongEdge"는 포함하지 않는다.
 * ─────────────────────────────────────────────────────────────────────────
 */
const VISION_SCORES_IMAGE =
  /\b(?:decodePixels|getImageData|pixelData|imageEntropy|blurScore|qualityScore|sharpness|isBlankImage|isBlackImage|Jimp|canvas\.getContext)\b|\bfrom\s+["']sharp["']/;

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
    if (VISION_SCORES_IMAGE.test(code)) {
      violations.push({
        file: `${normalized}:${index + 1}`,
        key: code.trim(),
        rule: "사진 분류가 픽셀·이미지 채점에 닿는다 — 폴더 이름 대조로 끝나야 한다 (023 FR-023, 원칙 IV)",
      });
    }
  }

  return violations;
}

/* ─────────────────── 사진 통로가 분류를 하는 것 (023) ─────────────────── */

/**
 * 기기 통로(`expo-port.ts`)가 잡사진 판정을 하는 것을 잡는다
 * (023, spec Clarification 2026-08-29).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * **경계**: 폴더 이름을 뽑는 것(마지막 "/" 앞 세그먼트)까지가 `expo-port.ts`의
 * 몫이다. 그 이름이 스크린샷·다운로드 폴더인지 대조하는 것은 `select.ts`만
 * 한다 — `NON_CAMERA_FOLDERS`를 import하거나 "잡사진/스크린샷 판정" 어휘가
 * 여기 나오면 분류가 기기 계층으로 샌 것이다. 분류를 화면 쪽에 두면 다음
 * 화면이 그 틈으로 들어온다는 015·022의 교훈이 한 겹 아래에서 반복되는 자리다.
 * ─────────────────────────────────────────────────────────────────────────
 */
const PORT_CLASSIFIES_PHOTO =
  /\bNON_CAMERA_FOLDERS\b|\bfrom\s+["'][^"']*vision\/(?:select|classify)["']|\b(?:isScreenshot|isNonCamera|classifyPhoto)\b/;

/**
 * 소스 파일 하나가 사진 통로인지 보고, 맞으면 위 규칙을 적용한다.
 *
 * **`src/signals/expo-port.ts` 한 파일이 대상이다.**
 */
export function checkPhotoPortFile(fileName: string, contents: string): Violation[] {
  const normalized = fileName.split("\\").join("/");
  if (normalized !== "src/signals/expo-port.ts") return [];

  const violations: Violation[] = [];

  for (const [index, line] of contents.split(/\r?\n/).entries()) {
    const code = line.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");

    if (PORT_CLASSIFIES_PHOTO.test(code)) {
      violations.push({
        file: `${normalized}:${index + 1}`,
        key: code.trim(),
        rule: "기기 통로가 잡사진을 판정한다 — 폴더 이름 추출까지만, 대조는 select.ts (023, spec Clarification)",
      });
    }
  }

  return violations;
}

/**
 * 독백 문구 선택이 캐릭터 로스터에 닿는 것을 잡는다 (015, 원칙 III).
 *
 * `src/diary/monologue.ts`는 캐릭터를 인자로 받지 않는다(spec Assumptions —
 * 캐릭터별 어조는 범위 밖). `roster.ts`·`persona.ts`·`Character`를 import하면
 * "화면 진행 문구가 캐릭터 성격을 흉내 낸다"가 한 줄로 가능해지고, 그것이
 * 원칙 III(모델은 캐릭터, 성격은 관측되지 않은 것을 지어내지 않는다) 위반이다.
 */
const MONOLOGUE_TOUCHES_ROSTER =
  /\bfrom\s+["'][^"']*(?:models\/roster|\/persona)["']|\bCharacter\b/;

/**
 * 독백 문구 파일인지 보고, 맞으면 위 규칙을 적용한다.
 *
 * **`src/diary/monologue.ts`와 `src/diary/particle.ts` 둘이 대상이다.**
 * 016이 조사 선택을 별도 파일로 뺐지만, `monologue.ts`가 그 파일을
 * import해 쓰는 이상 같은 격리(원칙 III)를 지켜야 한다 — 대상에서 빠지면
 * `particle.ts`를 거쳐 로스터에 닿는 우회로가 생긴다.
 */
export function checkMonologueFile(fileName: string, contents: string): Violation[] {
  const normalized = fileName.split("\\").join("/");
  if (normalized !== "src/diary/monologue.ts" && normalized !== "src/diary/particle.ts") {
    return [];
  }

  const violations: Violation[] = [];

  for (const [index, line] of contents.split(/\r?\n/).entries()) {
    // 주석은 규칙을 설명하는 자리다. 설명이 위반으로 잡히면 아무도 설명을 쓰지 않는다.
    const code = line.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");

    if (MONOLOGUE_TOUCHES_ROSTER.test(code)) {
      violations.push({
        file: `${normalized}:${index + 1}`,
        key: code.trim(),
        rule: "독백 문구가 캐릭터 로스터에 닿는다 — 진행 문구는 캐릭터를 모른다 (015, 원칙 III)",
      });
    }
  }

  return violations;
}

/**
 * 스케줄·알림·잠금의 순수 판정 코드가 제품 계층에 직접 닿는 것을 잡는다
 * (020, contracts/background-generation.md B3·B8, 원칙 III·IV).
 *
 * `src/schedule/`는 백그라운드 자동 생성의 순수 판정(`decision`·`retry`·
 * `notify`·`lock`)과 기기 통로(`*-port`)를 모으는 자리다. 019의
 * `checkSpikeFile`을 개명·재활용했다(그때는 `src/spike/`가 대상이었다).
 *
 * **막는 것**:
 *  - `models/roster` — 캐릭터→모델 매핑. 스케줄 코드가 캐릭터 로스터를
 *    알 이유가 없다(원칙 III). 자동 생성은 007이 저장한 선택을 읽기만
 *    한다(`app/selection-store`를 통해서).
 *  - `diary/prompt` — 화자 규칙. 자동 생성도 같은 프롬프트를 쓰지만
 *    그것은 `pipeline.run()` 안에서 일어난다.
 *  - `diary/acceptance` — 판정 4갈래. 자동이라고 갈래를 늘리거나
 *    완화하지 않는다(FR-011) — `pipeline.run()`이 보장한다.
 *  - `backend.generate()` 직접 호출 — 006의 실패(파이프라인을 건너뛰어
 *    `store.save()`가 한 번도 안 돎)를 반복하지 않는다.
 *
 * **일부러 빼는 것**:
 *  - `diary/store` — `src/schedule/task.ts`가 `wiring.ts`를 거쳐
 *    `store.listDays()`를 읽어야 한다(background-generation.md B2 —
 *    "지금 자동 생성을 돌려야 하는가"는 일기 존재 여부로 판정한다).
 *    직접 import 금지는 과하다. 단 `task.ts`는 wiring 경유로만 store에
 *    닿아야 하며, 순수 판정 파일(`decision`·`retry`·`notify`·`lock`)은
 *    애초에 store를 import할 이유가 없다.
 */
const SCHEDULE_TOUCHES_PRODUCT_LAYER =
  /\bfrom\s+["'][^"']*(?:models\/roster|diary\/prompt|diary\/acceptance)["']|\b(?:backend|adapter|engine)\s*\.\s*generate\s*\(/;

/**
 * 스케줄 판정 파일인지 보고, 맞으면 위 규칙을 적용한다.
 *
 * **`src/schedule/`가 대상이다.** `src/app/notification-routing.ts`는
 * 대상이 아니다 — 순수 라우팅 판정이며 `diary/*`를 import하지 않는다는
 * 것을 그 파일의 계약 테스트가 검사한다(contracts/notification.md N5).
 */
export function checkScheduleFile(fileName: string, contents: string): Violation[] {
  const normalized = fileName.split("\\").join("/");
  if (!normalized.startsWith("src/schedule/")) return [];

  const violations: Violation[] = [];

  for (const [index, line] of contents.split(/\r?\n/).entries()) {
    const code = line.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");

    if (SCHEDULE_TOUCHES_PRODUCT_LAYER.test(code)) {
      violations.push({
        file: `${normalized}:${index + 1}`,
        key: code.trim(),
        rule: "스케줄 판정이 제품 계층에 직접 닿는다 — wiring.ts → pipeline.run()만 거쳐야 한다 (020, 원칙 III·IV)",
      });
    }
  }

  return violations;
}

/**
 * 온보딩 판정이 제품 계층에 닿는 것 (021, plan.md Constitution Check, 원칙 III·IV).
 *
 * `src/onboarding/`은 통합 권한 온보딩의 순수 판정(`requirements`·`decision`·`flag`)과
 * 기기 통로(`*-port`)를 모으는 자리다. `checkScheduleFile`을 본떴다.
 *
 * **막는 것**:
 *  - `models/roster` — 캐릭터→모델 매핑. 권한 온보딩이 로스터를 알 이유가 없다(원칙 III).
 *  - `diary/prompt` — 화자 규칙.
 *  - `diary/acceptance` — 판정 4갈래.
 *  - `schedule/settings` — 020의 자동 생성 설정. `flag.ts`는 `auto-diary.json`을
 *    경로 하드코딩으로 직접 읽지(F2·§7), `settings.ts`를 import하지 않는다 —
 *    `onboarding/`이 `schedule/`에 의존하면 두 기능이 얽힌다.
 *  - `backend.generate()` 직접 호출 — 온보딩은 생성을 트리거하지 않는다(research §5).
 */
const ONBOARDING_TOUCHES_PRODUCT_LAYER =
  /\bfrom\s+["'][^"']*(?:models\/roster|diary\/prompt|diary\/acceptance|schedule\/settings)["']|\b(?:backend|adapter|engine)\s*\.\s*generate\s*\(/;

/**
 * `flag.ts`가 이력 로그로 자라는 것 (021, data-model.md §3, 원칙 IV).
 *
 * 020의 `AutoDiarySettings`가 "필드는 셋뿐"을 못 박은 것과 같은 이유 — 온보딩 플래그는
 * boolean 2개(`completed`·`batteryNoticeShown`)뿐이다. 타임스탬프·시도 횟수·마지막
 * 실행을 넣으면 "언제 온보딩을 봤나"를 재는 측정 장치가 된다.
 */
const FLAG_GROWS_HISTORY = /\b(?:Date|timestamp|history|attemptCount|lastRun|count)\b/;

/**
 * 온보딩 판정 파일인지 보고, 맞으면 위 규칙을 적용한다.
 *
 * **`src/onboarding/`가 대상이다.** `FLAG_GROWS_HISTORY`는 `flag.ts`에만 적용한다 —
 * `decision.ts`나 통로가 `Date`를 쓸 일은 없지만, 이력 금지의 취지는 플래그가
 * 자라는 것을 막는 것이다.
 */
export function checkOnboardingFile(fileName: string, contents: string): Violation[] {
  const normalized = fileName.split("\\").join("/");
  if (!normalized.startsWith("src/onboarding/")) return [];

  const isFlag = normalized === "src/onboarding/flag.ts";
  const violations: Violation[] = [];

  for (const [index, line] of contents.split(/\r?\n/).entries()) {
    const code = line.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");

    if (ONBOARDING_TOUCHES_PRODUCT_LAYER.test(code)) {
      violations.push({
        file: `${normalized}:${index + 1}`,
        key: code.trim(),
        rule: "온보딩 판정이 제품 계층·schedule 설정에 직접 닿는다 (021, 원칙 III·IV)",
      });
    }

    if (isFlag && FLAG_GROWS_HISTORY.test(code)) {
      violations.push({
        file: `${normalized}:${index + 1}`,
        key: code.trim(),
        rule: "온보딩 플래그가 이력·타임스탬프를 갖는다 — boolean 2개뿐이어야 한다 (021, 원칙 IV)",
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
