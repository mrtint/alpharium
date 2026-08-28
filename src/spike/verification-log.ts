/**
 * 검증 실행 기록.
 *
 * 계약: specs/019-background-diary-feasibility/data-model.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 파일은 제품 코드가 아니다.** 019 기술 검증(스파이크)이 끝나면
 * `src/spike/` 디렉터리 전체와 함께 지워질 수 있다(plan.md 「검증 종료 후
 * 하네스의 운명」).
 *
 * 이 로그가 담는 것은 "OS가 실행을 완주시켰는가"라는 사실뿐이다(원칙 IV —
 * 모델 식별자·토큰 수·네이티브 지표·생성된 일기 본문을 담지 않는다,
 * data-model.md 「이 모델이 의도적으로 갖지 않는 것」).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 한 번의 백그라운드 실행 시도에서 남는 이벤트. data-model.md §VerificationEvent */
export type VerificationEvent =
  | {
      kind: "task-entered";
      /** ISO 8601, Date.toISOString() — 벽시계 기준 */
      at: string;
      /** 이 실행이 대상으로 삼은 하루 */
      day: string;
      /**
       * RN 코어 AppState.currentState를 콜백 진입 시점에 읽은 값
       * (research.md §6a). 정확한 화면-꺼짐·잠금 여부를 알려주지 않는
       * 근사치다 — "active"면 앱 UI가 그 순간 전면에 있었다는 뜻이며,
       * FR-003이 배제하려는 "약한 백그라운드"일 가능성을 시사한다.
       */
      appState: "active" | "background" | "inactive" | "unknown";
    }
  | {
      kind: "permission-checked";
      at: string;
      axis: "photos" | "location";
      /** getLocation() 등 실제 호출 성공 여부 (research.md §3) */
      valid: boolean;
    }
  | {
      kind: "pipeline-stage";
      at: string;
      /** pipeline.ts의 PipelineStage를 그대로 재사용한다 — 새로 만들지 않는다 */
      stage: string;
    }
  | {
      kind: "task-completed";
      at: string;
      /**
       * "ok" — PipelineResult.ok === true
       * "pipeline-failed" — PipelineResult.ok === false
       * "threw" — pipeline.run() 자체가 예외를 던짐
       */
      outcome: "ok" | "pipeline-failed" | "threw";
      reason?: string;
    }
  | {
      kind: "task-result";
      at: string;
      /** BackgroundTask.BackgroundTaskResult로 반환한 값 */
      result: "Success" | "Failed";
    };

/**
 * 기록기가 실제 파일에 닿는 통로.
 *
 * `store.ts`의 `FileSystemPort`와 같은 이유로 주입받는다 — 기기 없이
 * 테스트하기 위해서다. 제품 `FileSystemPort`와는 별개 타입이다(원칙IV —
 * 이 하네스는 제품 저장 경로를 공유하지 않는다).
 */
export interface VerificationLogPort {
  /** 로그 파일 전체 내용을 읽는다. 없으면 null */
  readAll(): Promise<string | null>;
  /** 한 줄(개행 포함)을 파일 끝에 추가한다 */
  append(line: string): Promise<void>;
}

/**
 * 이벤트 하나를 JSON Lines로 기록한다.
 *
 * **실패해도 예외를 던지지 않는다**(H3, contracts/background-harness.md) —
 * 로그 기록 실패가 검증 실행 자체를 막으면 안 된다. 로그 실패 자체는
 * `console.error`로 최선을 다해 남긴다.
 */
export async function appendVerificationEvent(
  event: VerificationEvent,
  port: VerificationLogPort,
): Promise<void> {
  try {
    await port.append(`${JSON.stringify(event)}\n`);
  } catch (error) {
    console.error("검증 로그 기록 실패:", error);
  }
}

/**
 * 로그 파일을 읽어 이벤트 배열로 돌려준다.
 *
 * 파일이 없으면 빈 배열(예외를 던지지 않는다) — 검증 시작 전 상태를
 * 정상 상태로 다룬다(data-model.md 「읽기 계약」).
 *
 * 줄이 깨져 파싱에 실패하면 그 줄만 건너뛴다 — 한 줄의 손상이 나머지
 * 로그 전체를 못 읽게 만들지 않는다(JSON Lines를 고른 이유이기도 하다).
 */
export async function readVerificationLog(port: VerificationLogPort): Promise<VerificationEvent[]> {
  const contents = await port.readAll();
  if (contents === null) return [];

  const events: VerificationEvent[] = [];
  for (const line of contents.split("\n")) {
    if (line.trim() === "") continue;
    try {
      events.push(JSON.parse(line) as VerificationEvent);
    } catch {
      // 깨진 줄은 건너뛴다 — 파일 전체를 무효화하지 않는다.
    }
  }
  return events;
}

/**
 * `expo-file-system` 57로 위 통로를 구현한다.
 *
 * `store.ts`의 `expoFileSystemPort()`와 같은 API 형태(`Directory`·`File`·
 * `Paths`)를 쓴다. **`.text()`는 비동기다**(`Promise<string>`) —
 * `write()`·`exists`는 동기이지만 `.text()`만 그렇지 않다는 것을 실기기
 * 관측(2026-08-27)에서야 확인했다(메모리 노트 「expo-file-system 57
 * API」와 일치). 제품 `DiaryStore`가 쓰는
 * `Paths.document/diary/` 디렉터리와 겹치지 않도록 별도 파일명을 쓴다.
 *
 * 지연 import 하는 이유: 001의 on-device 어댑터와 같다 — 모듈 해석 자체가
 * 실패할 수 있는 환경(웹·테스트)에서 이 파일을 불러오는 것만으로 무너지지
 * 않게 한다.
 */
export function expoVerificationLogPort(fileName = "verification-log.jsonl"): VerificationLogPort {
  return {
    async readAll() {
      const { File, Paths } = await import("expo-file-system");
      const file = new File(Paths.document, fileName);
      return file.exists ? file.text() : null;
    },

    async append(line) {
      const { File, Paths } = await import("expo-file-system");
      const file = new File(Paths.document, fileName);
      // **`file.text()`는 Promise를 돌려준다** — `await` 없이 문자열
      // 결합에 쓰면 `[object Object]`가 로그에 섞여 들어간다(실기기
      // 관측으로 발견, 2026-08-27). `readAll()`은 async 함수가 그 값을
      // 그대로 반환해 자동으로 풀리므로 문제없었지만, 여기서는 `+`
      // 연산자로 직접 이어붙이므로 명시적으로 기다려야 한다.
      const existing = file.exists ? await file.text() : "";
      file.write(existing + line);
    },
  };
}
