/**
 * 캐릭터 → 모델 자산 매핑.
 *
 * 계약: specs/003-character-model-files/contracts/roster.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 파일이 헌법 원칙 III의 유일한 통과 지점이다.**
 *
 * 001의 `policy.ts`가 원칙 I의 방어선을 한 곳에 모은 것과 같은 구조다. 캐릭터와 모델
 * 파일이 이어지는 곳이 저장소 전체에서 **여기 하나뿐**이어야 한다. 다른 곳에서 매핑을
 * 다시 만들면 방어선이 둘로 갈라지고, 갈라진 순간 한쪽이 화면으로 샌다.
 *
 * **여기서 지키는 것**:
 *  1. 매핑은 코드 안쪽에만 있다(FR-002). `process.env`·원격 설정·사용자 설정에서 읽지
 *     않는다. 001이 `process.env`를 `environment.ts`에만 두게 한 것보다 강해서,
 *     여기서는 **어디서도 읽지 않는다**
 *  2. 한 방향으로만 흐른다(FR-003). 캐릭터 → 자산은 있고 자산 → 캐릭터는 없다
 *  3. `allAssets()`를 두지 않는다(FR-010). 있으면 "다섯을 다 받자"가 한 줄로 가능해지고,
 *     그것이 헌법 로스터가 금지한 구조다
 *  4. 표시 이름과 설명 문안이 없다(FR-004a, FR-005c). 헌법이 "캐릭터 이름은 사람이
 *     짓는다"고 했고, 설명은 실측 관측에 근거해야 하는데 그 관측은 이 저장소의 몫이
 *     아니다(원칙 IV)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { CHARACTERS, type Character } from "../diary/types";
import type { ModelAsset } from "./types";

export { CHARACTERS };
export type { Character };

/**
 * 캐릭터별 자산.
 *
 * **`key`가 캐릭터 식별자와 다른 것이 의도적이다**(FR-004). 파일명이 `quiet.gguf`이면
 * 파일 관리자에서 캐릭터가 드러나고, 거꾸로 캐릭터로 파일을 찾을 수 있다 — 매핑이
 * 기기에 드러난 것이다. 그래서 뜻을 알 수 없는 값을 쓴다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **값의 출처 — 실측이며 짐작이 아니다**(헌법 원칙 V).
 *
 * `url`은 옆 저장소(`../my-ollama/mobile/config/mobile-roster.ts`)가 실기기 벤치에 쓴
 * 것을 그대로 옮겼다. **2026-08-14에 다섯 개 전부 HTTP 200을 확인했다.**
 *
 * `expectedBytes`는 그 응답의 `Content-Length`이며, **기기에 남아 있던 옛 GGUF 파일의
 * 바이트 수와 다섯 개 모두 정확히 일치했다.** 두 경로가 같은 값을 주었으므로 이 숫자는
 * 관측된 사실이다.
 *
 * **`md5`는 아직 비어 있고, 그것이 의도된 상태다.** HuggingFace의 ETag는 sha256이라
 * 그대로 쓸 수 없고, 미리 적는 지문은 어디서 왔든 짐작이다. **첫 내려받기에서 받은
 * 파일의 지문을 채록하고**(contracts/readiness.md 「기준값이 아직 없을 때」), 그 값을
 * 여기 옮겨 적으면 그때부터 진짜 검증이 된다.
 *
 * 그래서 `roster.test.ts`의 R3이 아직 빨간불이다 — "아직 재지 않았다"를 드러내는 장치이며,
 * 통과시키려고 아무 문자열이나 넣는 순간 원칙 V가 깨진다.
 *
 * **양자화는 전부 Q4_K_M이고 우리가 만든 것이 없다.** gemma3·qwen3는 unsloth,
 * exaone은 LG 공식, hyperclovax·kanana는 커뮤니티 배포본이다(공식이 GGUF를 내지 않음).
 * 직접 양자화한 것은 옆 저장소의 Ollama 데스크톱 쪽이었고 모바일 GGUF는 기성품이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const ASSETS: Readonly<Record<Character, ModelAsset>> = {
  quiet: {
    key: "a1",
    url: "https://huggingface.co/DevQuasar/kakaocorp.kanana-1.5-2.1b-instruct-2505-GGUF/resolve/main/kakaocorp.kanana-1.5-2.1b-instruct-2505.Q4_K_M.gguf",
    expectedBytes: 1_522_796_768,
    // 실측 (2026-08-14, SM-G986N): 실기기에서 받아 채록한 값이다. 이 값이 들어왔으므로
    // 이 캐릭터는 이제 **채록이 아니라 검증**을 한다 — 크기가 같아도 내용이 다르면 걸린다.
    md5: "d8506380fd1f0fdb8e4318a01b8b8e34",
  },
  narrative: {
    key: "a2",
    url: "https://huggingface.co/LGAI-EXAONE/EXAONE-3.5-2.4B-Instruct-GGUF/resolve/main/EXAONE-3.5-2.4B-Instruct-Q4_K_M.gguf",
    expectedBytes: 1_644_918_272,
    md5: "",
  },
  imaginative: {
    key: "a3",
    url: "https://huggingface.co/rippertnt/HyperCLOVAX-SEED-Text-Instruct-1.5B-Q4_K_M-GGUF/resolve/main/hyperclovax-seed-text-instruct-1.5b-q4_k_m.gguf",
    expectedBytes: 1_133_974_368,
    // 실측 (2026-08-17, SM-G986N): 기기에 받아 둔 파일에서 채록했다. 003의
    // `state.json`에 `passed: true`로 남아 있던 검증 결과의 지문이며, 크기도
    // `expectedBytes`와 정확히 일치했다. 이제 이 캐릭터는 **채록이 아니라 검증**을 한다.
    md5: "4a3b9821b970df32e3d201a208f8ee14",
  },
  chinese: {
    key: "a4",
    url: "https://huggingface.co/unsloth/Qwen3-1.7B-GGUF/resolve/main/Qwen3-1.7B-Q4_K_M.gguf",
    expectedBytes: 1_107_409_472,
    md5: "",
  },
  english: {
    key: "a5",
    url: "https://huggingface.co/unsloth/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf",
    expectedBytes: 806_058_272,
    md5: "",
  },
};

/**
 * 캐릭터가 쓰는 자산.
 *
 * **돌려받은 값을 화면 쪽으로 넘기지 않는다**(FR-003). 다른 모듈은 필요한 조각만 인자로
 * 받는다 — 검증 모듈은 "이 경로의 파일이 이 지문과 맞는가"를 묻지 자산을 받지 않는다.
 */
export function assetFor(character: Character): ModelAsset {
  return ASSETS[character];
}

/**
 * 모델 표시 이름 (014, 진단 전용).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`src/ui/`가 이 파일을 import할 수 없다**(007 헌법 검사, `UI_TOUCHES_MODEL`).
 * 이 함수는 `src/diagnostics/report.ts`만 부른다 — 그 경로가 배포 빌드에서 닿지
 * 않는 것(001 SC-013)이 유일한 방어선이다.
 *
 * **값은 헌법 「로스터」 본문에서 그대로 옮긴 것이다** — 새로 짓지 않는다. 캐릭터별
 * `md5` 채록 주석 위에 이미 적혀 있던 모델명 문자열과 같다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const DISPLAY_NAMES: Readonly<Record<Character, string>> = {
  quiet: "kanana-1.5-2.1b",
  narrative: "exaone-3.5-2.4b",
  imaginative: "hyperclovax-seed-1.5b",
  chinese: "qwen3-1.7b",
  english: "gemma3-1b",
};

/** 캐릭터의 모델 표시 이름을 찾는다(진단 전용). */
export function displayName(character: Character): string {
  return DISPLAY_NAMES[character];
}
