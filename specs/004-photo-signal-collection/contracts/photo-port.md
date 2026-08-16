# 계약: 사진 통로 (PhotoPort)

**기능**: 004-photo-signal-collection | **Date**: 2026-08-14

**이 계약이 004에서 기기에 닿는 유일한 자리를 정한다**(FR-017). 003의
`contracts/acquisition.md`가 `ModelFilePort`에 한 것과 같은 구조다.

---

## 왜 통로를 따로 두는가

`expo-media-library`를 판정 코드가 직접 부르면 **기기 없이는 아무것도 검증할 수 없다.**
권한 다섯 갈래 × 신호 세 갈래의 조합을 실기기에서 손으로 만들어 볼 수는 없다 — 「일부만
허용」 상태를 만들려면 시스템 설정을 헤집어야 하고, 「조회 실패」는 재현조차 어렵다.

통로를 주입받으면 그 조합을 전부 대역으로 만들 수 있다(SC-007). 그리고 실기기에서
확인해야 하는 것은 **이 파일 하나의 구현**으로 줄어든다.

---

## 모양

```ts
/** 권한 하나의 지금 상태. 사진과 좌표에 각각 쓴다 */
export type PermissionState =
  | "granted"       // 전체 허용
  | "limited"       // 일부 사진만 허용 (⚠️ research.md §2)
  | "denied"        // 거절. 다시 물을 수 있다
  | "blocked"       // 거절. 다시 물어도 창이 뜨지 않는다
  | "undetermined"; // 아직 묻지 않았다

/** 사진 하나의 메타데이터. 픽셀에 닿지 않고 얻을 수 있는 것만 */
export type PhotoFacts = {
  id: string;
  /** 찍힌 시각(ms). 없으면 null — 버려진다(FR-003) */
  takenAtMs: number | null;
};

/** 좌표를 물었을 때의 결과. 실패도 값이다 */
export type LocationOutcome =
  | { kind: "found"; latitude: number; longitude: number }
  | { kind: "absent" }                      // 사진에 좌표가 없다
  | { kind: "failed"; reason: string };     // 읽지 못했다

export interface PhotoPort {
  photoPermission(): Promise<PermissionState>;
  locationPermission(): Promise<PermissionState>;

  /** 사용자가 시작할 때만 불린다(FR-021). 결과 상태를 돌려준다 */
  requestPhotoPermission(): Promise<PermissionState>;
  requestLocationPermission(): Promise<PermissionState>;

  /**
   * `[from, to)` 구간의 사진 메타데이터를 찍힌 시각 순으로.
   *
   * `limit`장까지 돌려준다. **상한을 넘었는지 알려면 호출자가 `limit + 1`을 준다.**
   */
  photosBetween(fromMs: number, toMs: number, limit: number): Promise<PhotoFacts[]>;

  /** 사진 하나의 좌표. **예외를 던지지 않는다**(FR-012) */
  locationOf(photoId: string): Promise<LocationOutcome>;
}
```

---

## 불변식

### 1. 권한을 스스로 요청하지 않는다 (FR-011)

`photoPermission()`과 `locationPermission()`은 **묻기만 한다.** 상태가 `undetermined`여도
창을 띄우지 않는다. 요청은 `request*` 쪽이며, 그것은 사용자가 버튼을 눌렀을 때만 불린다.

**왜 중요한가**: 신호 수집은 배경에서 돌 수 있는 일이다. 그때 권한 창이 뜨면 사용자는
맥락 없이 창을 만나고, 대개 거절한다. 그러면 `blocked`가 되어 되돌리기 어렵다.

### 2. 픽셀에 닿지 않는다 (FR-005)

`photosBetween`이 돌려주는 것은 `{ id, takenAtMs }`뿐이다. **URI도 파일 경로도 담지
않는다.** 담으면 다음 사람이 그것으로 파일을 열 수 있고, 그 순간 이 경계가 뚫린다.

005(시각 처리)가 URI를 필요로 할 때 이 계약을 넓힌다. 미리 열어 두지 않는다.

### 3. 좌표 실패가 사진을 오염시키지 않는다 (FR-013a)

`locationOf`는 **어떤 경우에도 던지지 않는다.** `expo-media-library`의 `getLocation()`은
안드로이드에서 권한이 없으면 예외를 던지므로(research.md §3), 구현이 그것을 반드시 감싼다.

**감싸지 않으면**: 좌표 권한이 없는 기기에서 사진 신호 전체가 무너진다. `photos`가
`known`이어야 할 자리에 예외가 올라온다.

### 4. 「없다」와 「못 읽었다」를 가른다

`LocationOutcome`의 `absent`와 `failed`가 다른 값인 이유다. 전자는 사진에 좌표가 안 박힌
것(관측된 사실), 후자는 우리가 읽지 못한 것(모름)이다. 뭉개면 `places`의 `none`/`unknown`
판정이 무너진다.

---

## 대역 구현이 만들 수 있어야 하는 상태

기기 없이 검증되어야 하는 조합이다(SC-007).

| # | 사진 권한 | 좌표 권한 | 사진 | 좌표 | 기대 |
| --- | --- | --- | --- | --- | --- |
| 1 | granted | granted | 2장 | 둘 다 있음 | `photos: known`, `places: known` |
| 2 | granted | granted | 2장 | 없음 | `photos: known`, `places: none` |
| 3 | granted | denied | 2장 | — | `photos: known`, `places: unknown` |
| 4 | granted | granted | 0장 | — | `photos: none`, `places: unknown` |
| 5 | denied | granted | — | — | `photos: unknown`, `places: unknown` |
| 6 | limited | granted | 3장 | — | `photos: unknown` (FR-008) |
| 7 | undetermined | undetermined | — | — | 둘 다 `unknown`, 요청 창이 뜨지 않음 |
| 8 | blocked | denied | — | — | 둘 다 `unknown`, 진단이 blocked를 구분해 보임 |
| 9 | granted | granted | 201장 | — | `photos: known`, `complete: false` |
| 10 | granted | granted | 2장 | `failed` | `photos: known`, `places: none` |

**3번과 5번이 이 기능의 핵심**이다. 3번은 한쪽 실패가 다른 쪽을 오염시키지 않음(FR-013a),
5번은 권한 없음이 빈 목록이 되지 않음(FR-007)을 잰다.

**10번이 미묘하다**: 좌표 권한은 있는데 개별 사진의 좌표 읽기가 실패했다. 좌표를 본 사진이
0장이므로 `none`이다 — 권한이 없어 못 본 것과는 다르다. 다만 `photosConsidered`에는
세어지므로 "물어봤지만 못 얻었다"가 값에 남는다.

---

## 다음 기능에 넘기는 것

- **사진의 URI** — 005가 픽셀을 읽으려면 필요하다. 그때 이 계약을 넓힌다.
- **권한 안내 문안** — 004는 진단 경로만 둔다(FR-022).
- **좌표 이외의 EXIF** — 방향·기기·노출은 지금 쓸 데가 없다.
