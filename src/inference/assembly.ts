/**
 * 조립 주체가 정하는 값 (079).
 *
 * 계약: specs/079-bg-auto-write-threads/contracts/assembly.md A1~A3
 *
 * 쓰기 파이프라인을 **누가 조립했는가**(화면 / 백그라운드 자동 쓰기)에 따라 모델을 여는 값 하나와
 * 생성 시간 한도가 갈린다. 주체는 `wiring.ts`가 등록부의 칸에 싣는 값(`lockOwner`, 020 L5 → 080)과 같은
 * 변수에서 온다 — 칸의 주체와 추론 조립 주체가 따로 놀지 않는다.
 *
 * **이 파일은 기기를 읽지 않는다**(A2). 코어 수·앱 상태를 보고 값을 정하는 순간 그것이 재는
 * 코드가 된다(원칙 IV). 값은 사람이 실측을 읽고 정한 상수이고, 플랫폼은 부르는 쪽이 넘긴다.
 */

import { BACKGROUND_GENERATION_TIMEOUT_MS, GENERATION_TIMEOUT_MS } from "./sampling";

/**
 * 쓰기 파이프라인을 조립한 쪽.
 *
 * 살아 있는 쓰기 등록부(`src/diary/live-write.ts`, 080)가 칸의 주체로 이 타입을 그대로 쓴다 —
 * `wiring.ts`가 한 변수를 두 자리(등록부·백엔드 선택)에 넘긴다.
 */
export type AssemblyOwner = "screen" | "background";

/**
 * 안드로이드 백그라운드 조립이 모델을 여는 스레드 수.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **실측이다**(2026-10-13, SM-S901N · Android 16 · dev, 어제 사진 4장, 강제로 돌린 잡).
 *
 * `llama.rn`은 스레드 수를 주지 않으면 4스레드를 최고 주파수 코어 4개에 고정한다. 잡으로 도는
 * 프로세스는 백그라운드 cpuset(이 기기 CPU 0–2)에 있어 고정이 실패하고, 4스레드가 작은 코어
 * 3개를 나눠 쓴다.
 *
 * | 백그라운드 | 사진 읽기 | 본문 | 전체 |
 * | --- | --- | --- | --- |
 * | 4 (기본) | 204.7초 | 1,264.7초 | 26분 7초 |
 * | 3 | 25.4초 · 40.4초 | 98.2초 · 136.1초 | 2분 36초 · 3분 33초 |
 * | 2 | 30.8초 | 151.0초 | 3분 42초 |
 *
 * 3과 2의 차이는 실행 간 편차 안이다. 2로 둔 것은 백그라운드 코어가 더 적은 기기에서도 넘치지
 * 않게 하려는 소유자 결정이다(실행 도중 이 기기의 코어도 0–2와 0–3을 오갔다).
 *
 * **한계**: 한 기기, 조건당 1~2회. 다른 기기의 백그라운드 코어 수는 모른다.
 *
 * **전경에는 주지 않는다** — 전경에서 줄이면 본문이 느려진다(4스레드 23.8초, 2스레드 43.6초).
 * **iOS에는 주지 않는다** — 재지 않았다(원칙 V).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const BACKGROUND_THREADS = 2;

/**
 * 이 조립이 모델을 열 때 줄 스레드 수. `undefined`면 주지 않는다(라이브러리 기본값).
 *
 * 본문 모델과 사진 모델이 같은 값을 쓴다.
 */
export function inferenceThreadsFor(
  owner: AssemblyOwner,
  platform: "android" | "ios",
): number | undefined {
  return owner === "background" && platform === "android" ? BACKGROUND_THREADS : undefined;
}

/**
 * 이 조립의 생성 시간 한도(ms). **플랫폼으로 가르지 않는다** — 한도는 속도를 바꾸지 않는다.
 *
 * 본문 생성에 한 번, 제목 질문에 같은 값으로 한 번 더 쓰인다(061).
 */
export function generationTimeoutFor(owner: AssemblyOwner): number {
  return owner === "background" ? BACKGROUND_GENERATION_TIMEOUT_MS : GENERATION_TIMEOUT_MS;
}

/**
 * 091 — 백그라운드 실행을 깨운 iOS 요청. `power`는 외부 전원을 요구하는 요청(CPU 감시 없음, 090), `battery`는 요구하지 않는 요청이다.
 * 부르는 쪽(백그라운드 태스크)이 네이티브에서 읽어 넘긴다 — 이 파일은 기기를 읽지 않는다(A2).
 */
export type BackgroundWake = "power" | "battery";

/**
 * 091 — 「느린 쓰기」의 값. 배터리 요청은 iOS CPU 감시 아래에서 돈다 — 「60초 동안 CPU 48초(코어 하나의 80%)」를 넘으면 앱이 죽는다
 * (090 실측 `cpu_resource_fatal`, CPU 시간은 모든 스레드의 합).
 *
 * - `threads` 1 — CPU 시간 ≈ 벽시계 시간이 되어 쉼 비율로 평균을 다룰 수 있다.
 * - `pauseRatio` 0.5 — 모델 호출 하나가 `t` 걸리면 `t × 0.5`를 쉰다: 평균 1/1.5 ≈ 67%(한도 80% 아래). 사람이 정한 값, 실측으로 조정.
 * - `chunkTokens` 32 — 본문·제목을 이만큼씩 나눠 생성하고 사이에 쉰다. 한 번의 생성 호출이 쉼 없이 48초를 넘지 않게 짧게.
 * - `timeoutMs` 30분 — 느린 쓰기를 감당하는 생성 시간 한도(사람이 정한 값). 실제 상한은 iOS의 예산 만료다(090 `expired`).
 */
export type Pacing = {
  readonly threads: number;
  readonly pauseRatio: number;
  readonly chunkTokens: number;
  readonly timeoutMs: number;
};

const BATTERY_PACING: Pacing = {
  threads: 1,
  pauseRatio: 0.5,
  chunkTokens: 32,
  timeoutMs: 1_800_000,
};

/** 091 — 느린 쓰기를 할 조립인가. 백그라운드·iOS·배터리 요청만 값을 주고, 그 밖은 `undefined`(종전 경로 — 바이트 같은 인자). */
export function pacingFor(
  owner: AssemblyOwner,
  platform: "android" | "ios",
  wake: BackgroundWake | undefined,
): Pacing | undefined {
  return owner === "background" && platform === "ios" && wake === "battery"
    ? BATTERY_PACING
    : undefined;
}
