/**
 * 추론 어댑터 계약.
 *
 * 일기 생성 코드가 보는 유일한 문이다. 구현체가 어디서 도는지 호출자는 모른다(FR-025).
 * 계약: specs/001-project-skeleton-setup/contracts/inference.md
 *
 * 헌법 원칙 I — 어느 구현체도 미리 만들어 둔 응답이나 대체 응답을 반환하지 않는다.
 * 서버에 닿지 못하면 닿지 못했다는 사실이 결과이지, 대신 만든 답이 결과가 아니다.
 */

/** on-device: 기기의 네이티브 추론 모듈 / desktop-server: 개발자 기계의 추론 서버 */
export type InferenceLocation = "on-device" | "desktop-server";

/**
 * 네이티브 모듈 적재 상태.
 *
 * `unavailable`과 `failed`를 뭉뚱그리지 않는다. 시뮬레이터에서 모듈이 없는 것은
 * 예상된 상태이고(local), 실기기에서 없는 것은 문제다(dev). 같은 값이면 둘을 구분할 수 없다.
 */
export type ModuleStatus =
  { kind: "loaded" } | { kind: "unavailable"; reason: string } | { kind: "failed"; reason: string };

/**
 * 추론 어댑터.
 *
 * 이 기능의 범위는 `isAvailable()`까지다. 실제 추론 호출(텍스트 생성)은 다음 기능에서
 * 추가한다 — 지금 만들면 일기 생성 축으로 파고드는 것이다(헌법 「개발 방식」).
 */
export interface InferenceBackend {
  readonly location: InferenceLocation;
  isAvailable(): Promise<ModuleStatus>;
}

/** 추론 위치 선택이 거부된 까닭. */
export type SelectionFailure = "environment-unresolved" | "location-forbidden";
