/**
 * 092 — 쓰기의 박동. 실제 일 하나(사진 한 장의 읽기, 글 한 조각·토큰 하나의 생성)가 끝날 때 한 번 낸다.
 *
 * 계약: specs/092-ios-continued-write/contracts/continued-write.md CW7
 *
 * iOS 이어 하기(`BGContinuedProcessingTask`)의 진행 막대가 이것으로만 움직인다 — 시스템은 진행이 멈춘 작업을 끝내고, 타이머로 막대를
 * 움직이면 일이 진행된 척하게 된다(원칙 V). 엔진·사진 엔진은 화면 쓰기보다 먼저 조립되므로 쓰기 하나에 콜백을 줄 수 없어, 앱에 하나인
 * 구독으로 둔다(080 등록부와 같은 「프로세스에 하나」).
 *
 * **박동은 종류뿐이다**(FR-004) — 글·시간·토큰 수를 싣지 않는다(원칙 IV, 005 FR-028b). 듣는 쪽이 던져도 내는 쪽(생성)은 멈추지 않는다.
 */

export type Beat = "photo" | "chunk" | "token";

type Listener = (beat: Beat) => void;

const listeners = new Set<Listener>();

/** 박동 하나를 낸다. 듣는 쪽이 없으면 아무 일도 없다 */
export function beat(kind: Beat): void {
  for (const listener of [...listeners]) {
    try {
      listener(kind);
    } catch {
      // 듣는 쪽의 실패가 쓰기를 무너뜨리지 않는다.
    }
  }
}

/** 박동을 듣는다. 돌려준 함수로 그만 듣는다 */
export function onBeat(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
