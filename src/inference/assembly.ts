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
  /** 092 — 없으면 주지 않는다(조립 주체의 종전 값, `inferenceThreadsFor`) */
  readonly threads?: number;
  readonly pauseRatio: number;
  readonly chunkTokens: number;
  /** 092 — 없으면 조립 주체의 종전 한도(`generationTimeoutFor`) */
  readonly timeoutMs?: number;
  /** 092 — 첫 조각 전 프롬프트를 이 글자 수씩 미리 읽는다(`llama-port.ts` `EnginePacing`). 없으면 미리 읽지 않는다 */
  readonly prefillChars?: number;
  /** 092 — 앱이 앞에 있을 때의 토막 길이(`llama-port.ts` `EnginePacing.prefillCharsActive`) */
  readonly prefillCharsActive?: number;
  /** 092 — 모델을 메모리에 읽어 올린다(`llama-port.ts` `EnginePacing.residentModel`). 없으면 종전(파일 매핑) */
  readonly residentModel?: boolean;
};

const BATTERY_PACING: Pacing = {
  threads: 1,
  pauseRatio: 0.5,
  chunkTokens: 32,
  timeoutMs: 1_800_000,
};

/**
 * 092 CW6 — iOS 화면 쓰기의 조각 생성. 조각 하나·프롬프트 토막 하나가 끝날 때마다 박동이 나가 이어 하기의 막대가 실제 일로 움직인다(FR-003).
 * 앞에 있는지는 쓰기 도중 바뀌므로 조립 때 가를 수 없어 iOS 화면 쓰기 전부가 이 값이다(research R5). 쉼은 없다(CPU 감시의 「배터리 요청」이 아니다).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **실측이다**(2026-10-21, iPhone 14 · iOS 27.0.1 · 개발 환경 Release, 10월 19일 사진 6장).
 *
 * | 조건 | 사진 한 장 | 결과 |
 * | --- | --- | --- |
 * | 앞, 스레드 기본(4) | 약 4.5초 | 71초에 저장 |
 * | 앱 밖(이어 하기), 스레드 기본 | 50~58초 | 사진 뒤 첫 조각에서 진행 없이 59초 → 만료 |
 * | 앱 밖, 스레드 2 | 28~32초 | 사진 뒤 첫 조각에서 진행 없이 39초 → 만료 |
 * | 앱 밖, 스레드 2 · 파일 매핑 · 8토큰 조각 | — | 만료는 없었으나 본문 0.17토큰/초로 600초 시간 초과 |
 * | 앱 밖, 스레드 2 · 모델 메모리 상주 · 32토큰 조각 · 토큰 박동 | 약 26초 | 본문 475초, 약 18분 40초에 저장(run J) |
 *
 * 앱 밖에서는 iOS가 CPU를 크게 줄인다(앞의 6~12배 느림) — 스레드 넷이 줄어든 코어를 나눠 써 더 느렸다(079 안드로이드와 같은 꼴).
 * 파일 매핑이면 모델 데이터가 밀려나 저장소에서 다시 읽히는 것으로 본다(짐작) — 메모리에 읽어 올리면 본문이 약 7배 빨랐다.
 * - `threads` 2 — 앱 밖에서 스레드 기본값보다 약 두 배 빠르다. 앞에서의 대가는 quickstart 「실측」(SC-003).
 * - `prefillChars` 24 — 첫 조각의 프롬프트 읽기를 이 글자 수씩 나눠 토막마다 박동한다(사람이 정한 값). 진행이 멈춘 작업은 만료된다(BGTask.h).
 * - `prefillCharsActive` 240 — 토막을 읽는 순간 앱이 앞에 있으면 이 길이다. 24자 토막만 쓰면 앞에서 프롬프트 읽기가 120초였다(run K,
 *   생성은 26초 — 작은 토막은 토큰당 비용이 크다). 토막 하나를 읽는 도중 앱을 나가도 공백이 짧게 남을 크기다(사람이 정한 값).
 * - `residentModel` — 모델을 파일 매핑 대신 메모리에 읽어 올린다(`use_mmap: false`).
 * - `timeoutMs` 30분 — 앱 밖의 본문이 475초 걸렸다(600초 한도에 너무 가깝다). 091 느린 쓰기와 같은 값.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const SCREEN_IOS_PACING: Pacing = {
  threads: 2,
  pauseRatio: 0,
  chunkTokens: 32,
  prefillChars: 24,
  prefillCharsActive: 240,
  residentModel: true,
  timeoutMs: 1_800_000,
};

/**
 * 조각 생성을 할 조립인가. 091 — 백그라운드·iOS·배터리 요청은 느린 쓰기, 092 — iOS 화면 쓰기는 쉼 없는 조각 생성. 그 밖은 `undefined`
 * (종전 경로 — 바이트 같은 인자, 안드로이드 전부).
 */
export function pacingFor(
  owner: AssemblyOwner,
  platform: "android" | "ios",
  wake: BackgroundWake | undefined,
): Pacing | undefined {
  if (platform !== "ios") return undefined;
  if (owner === "screen") return SCREEN_IOS_PACING;
  return wake === "battery" ? BATTERY_PACING : undefined;
}
