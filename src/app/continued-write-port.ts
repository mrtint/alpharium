/**
 * 092 — iOS 이어 쓰기(`BGContinuedProcessingTask`)의 네이티브 통로.
 *
 * 계약: specs/092-ios-continued-write/contracts/continued-write.md CW1·CW2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 로컬 Expo 모듈 `modules/pocketlog-continued-write`(iOS)를 `requireOptionalNativeModule`로 읽는다. 모듈이 없으면(안드로이드·jest) 신청은
 * 늘 거절이고 나머지는 아무 일도 없다 — 거절이면 홈은 종전대로 앞을 벗어날 때 쓰기를 끊는다(005 FR-014b). 던지지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Swift `Name(...)`과 같아야 한다 — `__tests__/config/continued-write-module.test.ts`가 대조한다 */
export const CONTINUED_WRITE_MODULE_NAME = "PocketlogContinuedWrite";
/** Swift `Events(...)`와 같아야 한다 */
export const CONTINUED_WRITE_EVENT = "onExpired";

/** 네이티브 모듈의 모양(`PocketlogContinuedWriteModule.swift`) */
export type ContinuedWriteNative = {
  /** 받아들여졌으면 그 신청의 식별자, 아니면 null */
  begin(title: string, subtitle: string): Promise<string | null>;
  report(subtitle: string, completed: number, total: number): void;
  finish(success: boolean): void;
  addListener(event: string, listener: (payload: unknown) => void): { remove(): void };
};

/** 세션(`continued-write.ts`)이 쓰는 통로 */
export type ContinuedWritePort = {
  /** 신청. 받아들여졌으면 참 */
  begin(title: string, subtitle: string): Promise<boolean>;
  report(subtitle: string, completed: number, total: number): void;
  finish(success: boolean): void;
  /** 시스템이 이어 하기를 끝냈다(시간·자원·사용자가 진행 표시에서 취소). 돌려준 함수로 그만 듣는다 */
  onExpired(listener: () => void): () => void;
};

function nativeModule(): ContinuedWriteNative | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { requireOptionalNativeModule } = require("expo-modules-core") as {
    requireOptionalNativeModule<T>(name: string): T | null;
  };
  return requireOptionalNativeModule<ContinuedWriteNative>(CONTINUED_WRITE_MODULE_NAME);
}

export function continuedWritePort(
  load: () => ContinuedWriteNative | null = nativeModule,
): ContinuedWritePort {
  /** 마지막으로 받아들여진 신청의 식별자 — 만료 이벤트를 그 신청 것만 듣는다 */
  let current: string | null = null;
  const native = (): ContinuedWriteNative | null => {
    try {
      return load();
    } catch {
      return null;
    }
  };
  return {
    async begin(title, subtitle) {
      try {
        const module = native();
        if (module === null) return false;
        const identifier = await module.begin(title, subtitle);
        if (typeof identifier !== "string" || identifier === "") return false;
        current = identifier;
        return true;
      } catch {
        return false;
      }
    },
    report(subtitle, completed, total) {
      try {
        native()?.report(subtitle, completed, total);
      } catch {
        // 보고 실패가 쓰기를 무너뜨리지 않는다.
      }
    },
    finish(success) {
      try {
        native()?.finish(success);
      } catch {
        // 닫기 실패가 쓰기를 무너뜨리지 않는다.
      }
    },
    onExpired(listener) {
      try {
        const module = native();
        if (module === null) return () => {};
        // 앞 쓰기의 만료가 늦게 와도 지금 쓰기를 끊지 않는다 — 식별자가 지금 신청과 같을 때만 듣는다(코드 리뷰).
        const subscription = module.addListener(CONTINUED_WRITE_EVENT, (payload) => {
          const identifier = (payload as { identifier?: unknown } | null | undefined)?.identifier;
          if (identifier === current) listener();
        });
        return () => subscription.remove();
      } catch {
        return () => {};
      }
    },
  };
}
