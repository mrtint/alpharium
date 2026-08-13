/**
 * 하루치 신호의 모양.
 *
 * 계약: specs/002-diary-pipeline-contracts/contracts/signals.md
 *
 * 헌법 원칙 V — 관측한 것과 관측하지 못한 것을 구분한다. 이 파일이 그 구분을 타입으로
 * 강제하는 자리다.
 *
 * **이 기능은 신호를 실제로 수집하지 않는다(FR-005).** 모양만 정하고, 실제 수집(권한·사진
 * ·GPS)은 다음 기능이다. 수집 코드가 여기 들어오면 「범위 밖」을 넘는 것이다.
 */

import type { DayDate } from "../config/day-boundary";

/**
 * 신호 하나의 상태.
 *
 * **"없음"과 "알 수 없음"을 가른다(FR-002).** 사진을 찾아봤는데 0장인 것과, 권한이 없어
 * 보지 못한 것은 다른 사실이다. 앞은 일기의 내용이 되고 뒤는 되지 못한다.
 *
 * `unknown`은 **왜 모르는지**를 담는다. "권한 없음"과 "안드로이드가 제공하지 않음"은 다른
 * 사실이고, 진단에서 구분되어야 한다.
 *
 * **왜 옵셔널(`T | undefined`)로 두지 않는가**: 두 상태를 구분하지 못한다. 읽는 쪽이 매번
 * 관례에 기대야 하고, 관례는 지켜지지 않는다(research.md §1). 001에서 ModuleStatus의
 * unavailable/failed를 가른 것과 같은 이유이며, 같은 패턴을 쓴다.
 *
 * **불변식**:
 *  1. `unknown`은 값을 갖지 않는다 — "모르는데 값이 있다"가 타입으로 불가능하다.
 *  2. `none`과 `unknown`을 뭉개는 헬퍼를 만들지 않는다. `isEmpty()` 같은 함수가 둘을
 *     하나로 만들면 FR-002가 무너진다. 필요하면 각각을 따로 묻는다.
 *  3. **기본값으로 대체하는 함수를 만들지 않는다(FR-003).** `valueOr(signal, 0)` 형태의
 *     편의 함수는 걸음 수를 0으로 만들어 "걷지 않았다"는 거짓을 낳는다. 이 계약이 금지한다.
 *
 * 3번이 이 파일에서 가장 중요하다. 편의를 위해 만들고 싶어지는 함수이며, 만드는 순간
 * 헌법 원칙 V가 깨진다.
 */
export type SignalValue<T> =
  | { kind: "known"; value: T }
  | { kind: "none" }
  | { kind: "unknown"; reason: string };

/** 기기에 남은 사진 하나. 내용 이해는 시각 처리 기능의 몫이며 여기서 다루지 않는다. */
export type Photo = {
  /** 기기 안에서 사진을 가리키는 값. 파일 경로일 수도 미디어 라이브러리 id일 수도 있다 */
  id: string;
  /** 찍힌 시각. 이 값으로 어느 하루에 속하는지 정해진다 */
  takenAt: Date;
};

/** GPS로 본 이동. 좌표의 나열이 아니라 "얼마나 움직였나"의 요약이다. */
export type PlaceTrace = {
  /** 머문 자리의 수. 집에만 있었으면 1이다 */
  visitCount: number;
  /** 하루 동안 움직인 대략의 거리(미터) */
  approximateDistanceMeters: number;
};

/** 배터리의 하루 흐름. 얼마나 썼는지가 활동의 간접 신호가 된다. */
export type BatteryTrace = {
  /** 0~1 */
  startLevel: number;
  /** 0~1 */
  endLevel: number;
  /** 충전한 적이 있는가 */
  charged: boolean;
};

/** 연결 상태의 하루 흐름. */
export type ConnectivityTrace = {
  /** 와이파이에 붙어 있던 대략의 시간(분) */
  wifiMinutes: number;
  /** 셀룰러로 지낸 대략의 시간(분) */
  cellularMinutes: number;
  /** 아무 데도 닿지 못한 시간이 있었는가 */
  wentOffline: boolean;
};

/**
 * 휴대폰이 하루 동안 본 것의 묶음.
 *
 * **모든 신호가 `unknown`이거나 `none`인 하루도 정상이다(FR-005b).** 빈 묶음은 오류가
 * 아니다 — 휴대폰이 아무것도 보지 못한 것 자체가 일기의 내용이 된다(헌법 원칙 II).
 *
 * 신호의 양으로 생성 가능 여부를 가르지 않는다(FR-005a). 집에만 있던 하루도 일기가 된다.
 *
 * `steps`는 안드로이드에서 대개 `unknown`이다 — 기간 걸음 수를 되짚는 통로가 없다
 * (AGENTS.md 실측). 예외가 아니라 정상 상태다.
 */
export type DaySignals = {
  /** 어느 날의 신호인가. 04:00 경계로 정해진다(FR-021). 없으면 만들 수 없다(FR-004) */
  date: DayDate;
  photos: SignalValue<Photo[]>;
  places: SignalValue<PlaceTrace>;
  steps: SignalValue<number>;
  battery: SignalValue<BatteryTrace>;
  connectivity: SignalValue<ConnectivityTrace>;
};
