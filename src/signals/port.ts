/**
 * 사진이 바깥 세계에 닿는 통로.
 *
 * 계약: specs/004-photo-signal-collection/contracts/photo-port.md
 *
 * `expo-media-library`를 직접 부르지 않고 이 모양을 주입받는다. 002의 `FileSystemPort`,
 * 003의 `ModelFilePort`와 같은 방식이며, 그래야 기기 없이 테스트할 수 있다.
 *
 * **여기가 004에서 기기에 의존하는 유일한 자리다**(FR-017). 판정은 `collect.ts`에,
 * 좌표 묶기는 `places.ts`에 순수 함수로 떼어 놓았다.
 *
 * 통로를 따로 두는 진짜 이유는 **권한 다섯 갈래를 실기기에서 손으로 만들 수 없기
 * 때문이다.** 「일부만 허용」 상태를 만들려면 시스템 설정을 헤집어야 하고, 「조회 실패」는
 * 재현조차 어렵다. 대역이면 열 가지 조합을 전부 만든다(SC-007).
 */

/**
 * 권한 하나의 지금 상태. 사진과 좌표에 각각 쓴다.
 *
 * **`denied`와 `blocked`를 가른다**(FR-023). 전자는 다시 물을 수 있고 후자는 안드로이드가
 * 창을 띄우지 않는다. 구분하지 않으면 사용자가 버튼을 반복해 누른다.
 *
 * **`limited`가 있는 것은 「일부 사진만 허용」을 `unknown`으로 판정하기 위함이다**(FR-008).
 * ⚠️ **안드로이드가 이 상태를 구분해 주는지 아직 확인되지 않았다**(research.md §2) —
 * 타입에 `accessPrivileges`가 있으나 선택적이고, 근거 구현이 iOS였다. 실기기 확인(T043)
 * 전까지 이 갈래는 「있을 것으로 보이는」 상태다.
 */
export type PermissionState = "granted" | "limited" | "denied" | "blocked" | "undetermined";

/**
 * 사진 하나의 메타데이터. **픽셀에 닿지 않고 얻을 수 있는 것만 담는다**(FR-005).
 *
 * **URI도 파일 경로도 담지 않는다.** 담으면 다음 사람이 그것으로 파일을 열 수 있고, 그
 * 순간 「사진의 내용을 읽지 않는다」는 경계가 뚫린다. 005(시각 처리)가 URI를 필요로 할 때
 * 이 계약을 넓힌다 — 미리 열어 두지 않는다.
 */
export type PhotoFacts = {
  id: string;
  /** 찍힌 시각(ms). 없으면 null — 어느 하루에도 넣을 수 없어 버려진다(FR-003) */
  takenAtMs: number | null;
};

/**
 * 좌표를 물었을 때의 결과. **실패도 값이다** — 예외로 던지지 않는다(FR-012).
 *
 * **`absent`와 `failed`를 가르는 것이 중요하다.** 전자는 사진에 좌표가 안 박힌 것(관측된
 * 사실), 후자는 우리가 읽지 못한 것(모름)이다. 뭉개면 `places`의 `none`/`unknown` 판정이
 * 무너진다 — 002가 `SignalValue`에서 편 것과 같은 구분이 한 겹 아래에 있다.
 */
export type LocationOutcome =
  | { kind: "found"; latitude: number; longitude: number }
  | { kind: "absent" }
  | { kind: "failed"; reason: string };

/**
 * 사진과 그 좌표에 닿는 통로.
 *
 * **조회와 요청이 나뉘어 있다**(FR-011). `photoPermission()`은 묻기만 하고, 상태가
 * `undetermined`여도 창을 띄우지 않는다. 요청은 `request*` 쪽이며 사용자가 버튼을 눌렀을
 * 때만 불린다 — 신호 수집이 배경에서 돌 때 맥락 없는 권한 창이 뜨면 대개 거절당하고,
 * 그러면 `blocked`가 되어 되돌리기 어렵다.
 */
export interface PhotoPort {
  /** 사진 권한의 지금 상태. **요청하지 않는다**(FR-011) */
  photoPermission(): Promise<PermissionState>;
  /** 좌표 접근 권한의 지금 상태. 사진 권한과 **별개다**(FR-013a) */
  locationPermission(): Promise<PermissionState>;

  /** 사용자가 시작할 때만 불린다(FR-021). 결과 상태를 돌려준다 */
  requestPhotoPermission(): Promise<PermissionState>;
  requestLocationPermission(): Promise<PermissionState>;

  /**
   * `[fromMs, toMs)` 구간의 사진 메타데이터를 **찍힌 시각 순으로**(FR-004).
   *
   * `limit`장까지 돌려준다. **상한을 넘었는지 알려면 호출자가 `limit + 1`을 준다** —
   * `limit + 1`장이 오면 잘린 것이다(FR-014a).
   */
  photosBetween(fromMs: number, toMs: number, limit: number): Promise<PhotoFacts[]>;

  /**
   * 사진 하나의 좌표. **어떤 경우에도 던지지 않는다**(FR-012).
   *
   * 구현이 이것을 반드시 감싸야 한다 — `expo-media-library`의 `getLocation()`은
   * 안드로이드에서 권한이 없으면 **`null`이 아니라 예외를 던진다**(research.md §3).
   * 감싸지 않으면 좌표 권한이 없는 기기에서 **사진 신호 전체가 무너지고**, FR-013a(한쪽의
   * 실패가 다른 쪽을 오염시키지 않는다)가 바로 여기서 깨진다.
   */
  locationOf(photoId: string): Promise<LocationOutcome>;

  /**
   * 사진 파일의 실제 경로. **011이 열었다** — 004가 미리 열어 두지 않은 자리다.
   *
   * ─────────────────────────────────────────────────────────────────────────────
   * **★ 004의 주석이 이 확장을 예고했다**: 「URI도 파일 경로도 담지 않는다. (…)
   * 시각 처리가 URI를 필요로 할 때 이 계약을 넓힌다 — 미리 열어 두지 않는다.」
   *
   * **`PhotoFacts`에 담지 않고 함수로 둔다.** 담으면 사진을 세기만 하는 004의 경로가
   * 경로를 함께 들고 다니게 되고, 그때 「사진의 내용을 읽지 않는다」가 규율로만 남는다.
   * 함수로 두면 **부르지 않는 쪽은 경로를 얻을 수 없다** — 011의 캡션 경로만 부른다.
   *
   * **⚠️ 안드로이드에서 `PhotoFacts.id`는 파일 경로가 아니다**(2026-08-22 실기기 실측).
   * `content://media/external/images/media/1000000871` 꼴의 contentUri이며, 네이티브
   * 추론이 그것을 파일로 열지 못한다. **오류가 아니라 빈 캡션으로 조용히 끝나므로**
   * 「일기가 나왔다」로는 결코 드러나지 않는다.
   * ─────────────────────────────────────────────────────────────────────────────
   *
   * **어떤 경우에도 던지지 않는다** — `locationOf()`와 같은 규칙이다. 못 얻으면
   * `null`이며 그 장은 읽히지 않는다(FR-005a). 한 장의 실패가 하루를 무너뜨리지 않는다.
   */
  filePathOf(photoId: string): Promise<string | null>;
}
