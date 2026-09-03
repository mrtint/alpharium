# Contract: 온보딩 photo-location 단계 제거 (②)

관련 요구사항: FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, SC-002, SC-003, SC-005, SC-006.

---

## OB1 — `PERMISSION_REQUIREMENTS` (상수, `src/onboarding/requirements.ts`)

| 속성 | 값 |
|---|---|
| 항목 수 | **4** (전: 5) |
| `key` 목록 (정렬) | `["battery-exception", "location", "notifications", "photos"]` (전: + `"photo-location"`) |
| `order` 배열 (정렬) | `[1, 2, 3, 4]` (전: `[1,2,3,4,5]`) |
| `order`별 키 | photos=1, location=2, notifications=3, battery-exception=4 |
| `PermissionKey` 타입 | `"photos" \| "location" \| "notifications" \| "battery-exception"` |

- `photos` 항목의 `rationale`/`ifDenied` — **무변경**. 사진 위치를 언급하는 문구를 더하지 않는다(사용자가 인지할 필요 없는 자동 처리, research R2).
- `location`·`notifications`·`battery-exception`의 문안·`platforms`·`neededBy` — 무변경. `order`만 1씩 감소.
- `requirements.ts` 상단 주석의 `PermissionKey` 설명(현재 `photo-location — ACCESS_MEDIA_LOCATION (조회 API 없음...)` 줄)과 R2 갈래 설명을 갱신 — "이 권한은 `getLocation()` 호출 시 시스템이 사진 권한에 종속해 처리하므로 온보딩에서 별도로 묻지 않는다"를 명시.

**계약 테스트 (`__tests__/onboarding/requirements.test.ts` 갱신)**:

| # | 검사 | 기대 |
|---|---|---|
| R2-a | `order` 정렬 배열 | `[1, 2, 3, 4]` |
| R2-b | `key` 목록 정렬 | 위 4개, `photo-location` 없음 |
| R2-c | `byOrder` (order순 key) | `["photos", "location", "notifications", "battery-exception"]` |
| R2-d | android 포함 목록 | `["photos", "location", "notifications", "battery-exception"]` — `photo-location` 제거 |
| R2-e | `readonly` 선언 유지 | 소스 regex |
| R2-f (신규, 위반 주입) | 소스에 `"photo-location"` 문자열이 `PermissionKey`·`PERMISSION_REQUIREMENTS` 정의 안에 없다 | 부재 |

## OB2 — `decision.ts` (무변경 확인)

`statusOf`·`planOnboardingSteps`·`nextStep` 로직은 **한 줄도 안 고친다**. `planOnboardingSteps`가 `input.requirements`를 순회하므로, `requirements`에서 `photo-location`이 빠지면 그 단계가 자동으로 생성되지 않는다.

**계약 테스트 (`__tests__/onboarding/decision.test.ts` 갱신)**:
- 현재 `photo-location`을 `states`/`skippedThisSession`에 쓰는 케이스(line ~175·186·199·215)를 `location` 또는 `notifications`로 대체. 판정 로직 자체를 검증하는 케이스이므로 키만 바꾸면 됨.
- **신규**: `planOnboardingSteps({requirements: PERMISSION_REQUIREMENTS, states: {photos:"granted"}, ...})` → 반환된 steps에 `photo-location` key가 **없다**. 사진 granted 후 `nextStep`이 `location`을 가리킨다(무한 루프 부재 — SC-002).

## OB3 — `OnboardingScreen.tsx`

- `readStates()`: `ports.photo.locationPermission()` 호출과 `"photo-location": photoLocation` 키 제거. `Promise.all` 배열에서 그 줄 삭제.
- `allow()` switch: `case "photo-location":` 삭제. (switch가 `PermissionKey` union을 다루므로 타입이 exhaustive면 `tsc`가 남은 키를 강제 — `photo-location`이 union에서 빠졌으므로 case도 빠져야 통과.)
- `OnboardingPorts` 타입의 `photo.requestLocationPermission`·`photo.locationPermission` — **다른 사용처 확인 후 판단**. `PermissionsSection`도 쓰므로(OB4) 지금은 타입에 남길 수 있음. tasks에서 "두 화면 다 안 쓰면 타입에서도 제거" 결정.

**계약 테스트 (`__tests__/ui/onboarding-screen.test.tsx` 갱신)**:
- `onboarding-step-photo-location` testID 단언(line ~138·150) 제거. 대신 사진 허용 후 `onboarding-step-location`이 뜨는지.
- `photoLocation` prop / mock override(line ~26·42·208·257) 제거.
- **신규**: 사진 "허용" → 다음 렌더에서 `onboarding-step-location` 나타남, `onboarding-step-photo-location`은 `queryByTestId`로 null.

## OB4 — `PermissionsSection.tsx` (설정 탭 "권한" 섹션)

- `readStates()`: `photoLocation` 조회·`"photo-location"` 키 제거.
- `describe()` — 무변경(상태→문자열 매핑, 키 무관).
- `requestFor()` switch: `case "photo-location":` 삭제.
- 렌더: `requirements`를 순회하므로 `photo-location` 항목이 상수에서 빠지면 행이 자동으로 안 그려짐.

**계약 테스트**: 설정 "권한" 섹션 렌더 시 `permission-row-photo-location` testID가 `queryByTestId`로 null (SC-005).

## OB5 — `App.tsx` `deniedNotices`

`src/App.tsx:~317-340` 부근:
```js
const req = (key: string) => PERMISSION_REQUIREMENTS.find((r) => r.key === key);
if (isDenied(photo)) notices.push(req("photos")?.ifDenied ?? "");
const locReq = req("location");
if (isDenied(photoLoc) || ...) notices.push(req("photo-location")?.ifDenied ?? "");  // ← 이 블록 제거
```

- `req("photo-location")` 참조 제거. `photoLoc` 조회(`onboardingPorts.photo.locationPermission()`) 정리 — `location` 권한 안내는 별도 경로가 있으면 유지, 없으면 함께 정리(tasks에서 `location` 안내 현황 확인).
- **계약 테스트 (`__tests__/ui/denied-guidance.test.tsx` 갱신)**: `photo-location`의 `ifDenied` 단언(line ~54) 제거. `photos`·`location` 거부 안내는 유지.

## OB6 — 매니페스트·플러그인 (무변경, FR-011)

- `app.json` `android.permissions`의 `"android.permission.ACCESS_MEDIA_LOCATION"` — **그대로**.
- `expo-media-library` 플러그인의 `isAccessMediaLocationEnabled: true` — **그대로**.
- **계약 테스트**: `app.json` 소스에 위 두 항목이 여전히 있다(회귀 방지).

## OB7 — 신호 수집 무변경 (FR-010, SC-006)

- `src/signals/collect.ts`·`expo-port.ts`의 `locationOf()`·`places` 판정 — **한 줄도 안 고친다**.
- `expo-port.ts`의 `locationPermission()`·`requestLocationPermission()` 함수 자체는 남길 수 있음(다른 곳에서 안 쓰면 dead code — tasks에서 제거 여부 판단, 단 `collect.ts`가 안 쓰는 것 확인).
- **실기기 확인 (quickstart)**: 사진 좌표 있는 하루 생성 → 위치 권한 있을 때 지명, 없을 때 비움 — 수정 전후 동일.

## OB8 — Maestro (`unified-permission-onboarding.yml`)

- `photo-location` 단계를 밟던 스텝 제거. 온보딩이 4단계(사진·위치·알림·배터리 예외) + 에셋으로 흐르도록 갱신.
- `id: "onboarding-step-.*"` skip-all 루프(021에서 이미 이렇게 고침)는 그대로 — 단계가 하나 줄어도 루프가 알아서 처리.
- 사진 "허용"(또는 부분 허용) 후 **다음이 `onboarding-step-location`**인지 assert 추가.
- `FLOWS`에 이미 등록됨 — 재등록 불필요.

## 실기기 확인점 (quickstart, SC-002·SC-003·SC-005)

**S24U 완전 새 설치** (`adb uninstall` → `adb install`):
1. 온보딩 1단계 = 사진. "모두 허용" → **다음 화면 = "위치"(장소명) 단계** (`onboarding-step-location`), **≠ "사진 위치"**.
2. 위치 "허용"/"건너뛰기" → 알림 단계. → 배터리 예외 단계. → 에셋 다운로드 단계 도달.
3. 거친 권한 단계 수 = 4 (SC-002·SC-003).
4. 온보딩 후 설정 탭 "권한" 섹션: 행이 4개(사진·위치·알림·배터리 예외), "사진에 담긴 위치" 행 없음 (SC-005).
5. `deniedNotices`: 사진/위치 거부 시 안내는 뜨되, "사진의 위치를 읽지 못해..." 문구는 안 뜸.

**S22 회귀**: 같은 흐름 4단계 정상, 갇힘 없음.
