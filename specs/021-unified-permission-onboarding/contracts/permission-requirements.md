# Contract: 필수 권한 목록 (`src/onboarding/requirements.ts`)

앱이 요구하는 런타임 권한을 **사람이 못 박은 상수**. 코드가 항목을 더하거나 빼지 않는다
(FR-001·002·004, 원칙 V). 관련: FR-003, spec Clarifications(고정 순서).

## R1 — `PermissionKey`와 `PermissionRequirement`

data-model.md §1의 타입을 그대로 쓴다. `PermissionKey`는 5갈래:
`"photos" | "photo-location" | "location" | "notifications" | "battery-exception"`.

## R2 — `PERMISSION_REQUIREMENTS` 상수

- `readonly PermissionRequirement[]`로 선언(mutable 배열 금지 — 계약 테스트가 `readonly`
  키워드를 소스에서 확인).
- `order`: `photos`=1, `photo-location`=2, `location`=3, `notifications`=4,
  `battery-exception`=5 (연속, 중복 없음, battery가 최대).
- `location`의 `platforms`는 **research.md §2 실측 후 확정** — `["android","ios"]` 또는
  `["ios"]`. 그 외 항목은 전부 `["android","ios"]`(단 검증 대상은 android).

## R3 — 문안 규칙 (원칙 II·III, SC-008)

- `rationale`·`ifDenied` 문자열에 다음 토큰이 **없어야 한다**(계약 테스트가 정규식으로
  검사): `/kanana|exaone|hyperclovax|qwen3|gemma3|\.gguf|Q4_|Q8_|\b\d+(\.\d+)?B\b/i`.
- 관측 못 하는 것을 단언하는 문장 금지 — 자동 토큰 검사로 못 잡으므로 **quickstart의
  문안 리뷰 항목**으로 강제(사람이 읽고 확인).
- 예시(초안, 구현 시 다듬음):
  - `photos.rationale`: "그날 찍힌 사진 몇 장을 살펴 하루를 짐작해 씁니다."
  - `photos.ifDenied`: "사진을 볼 수 없어, 일기는 사진 없이 쓰입니다."
  - `notifications.ifDenied`: "일기가 완성돼도 바로 알려드리지 못합니다." (020 N8)
  - `battery-exception.rationale`: "기기가 절전에 들어가도 정한 시간대에 일기를 쓰도록
    허용을 요청합니다."
  - `battery-exception.ifDenied`: "자동 생성이 정한 시간보다 많이 늦어질 수 있습니다."

## R4 — 계약 테스트 (`__tests__/onboarding-requirements.test.ts`)

**소스를 `readFileSync`로 읽어 검사한다**(jest는 타입을 지운다 — 007·009·012·020 관례).

1. `order` 값들이 `[1,2,3,4,5]`와 정확히 일치(정렬 후).
2. `battery-exception`의 `order`가 최대.
3. `PermissionKey` 유니온에 정확히 5개 멤버.
4. 모든 `rationale`·`ifDenied`가 R3의 금지 정규식에 매칭되지 않음.
5. 모든 `platforms`가 비어 있지 않고 `"android"`/`"ios"`만 포함.
6. `PERMISSION_REQUIREMENTS`가 `readonly`로 선언됨(소스에 `readonly PermissionRequirement[]`
   또는 `as const`).
7. `requirements.ts`가 `diary/`·`models/`·`schedule/`를 import하지 않음(경계).

## R5 — 확장 규칙

- 새 권한이 필요해지면 이 파일의 상수에 사람이 항목을 더하고 `order`를 재배치한다.
- 안드로이드가 통로를 안 주는 축(기간 걸음 수 등)은 **넣지 않는다**(FR-002). 통로가
  생기면 그때 넣는다(원칙 V — "통로가 생기면 그 상수를 고친다").
