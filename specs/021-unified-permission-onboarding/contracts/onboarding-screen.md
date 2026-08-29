# Contract: 온보딩 화면 + 설정 "권한" 섹션 (`src/ui/`)

관련: FR-005~008, FR-013~020, SC-001·003·004·005·006·008. `src/ui/`이므로 007 헌법
검사(`models/roster`·`ModelAsset` 금지)의 대상.

## S1 — `OnboardingScreen`

```ts
export type OnboardingScreenProps = {
  platform: "android" | "ios";
  requirements: readonly PermissionRequirement[];
  flag: OnboardingFlag;                       // 이미 로드된 값 (App.tsx가 읽어 넘김)
  ports: {
    photo: PhotoPort;
    notification: NotificationPort;
    battery: BatteryExceptionPort;
    location: LocationPermissionPort;
    osSettings: OsSettingsPort;
  };
  /** 모든 단계를 마치거나 건너뛰고 [시작하기]를 누르면. batteryNoticeShown 최종값 포함. */
  onComplete: (flag: OnboardingFlag) => void;
};
```

### S1.1 — 렌더 규칙

- 마운트 시 각 권한 상태를 통로로 조회(`Promise.all`) → `planOnboardingSteps` →
  `nextStep`.
- `nextStep`이 있으면 그 단계 하나만 크게 표시: `requirement.rationale` + [허용] +
  [건너뛰기].
  - 단계가 `blocked`면 [허용] 대신 [설정 열기](`osSettings.openAppSettings()` 또는
    battery는 `battery.openSettingsList()`) + [건너뛰기].
- `nextStep`이 `null`이면 요약 화면 + [시작하기].
- **뒤로 가기 UI 없음**(spec Clarifications). 헤더에 "N / M단계" 정도의 진척 표시는
  가능하나 정밀도 암시 없이.
- **생성 중 문구·진행률 없음** — 이 화면은 생성을 트리거하지 않는다(원칙 IV, research §5).

### S1.2 — [허용] 동작

| 단계 key | 호출 |
|---|---|
| `photos` | `ports.photo.requestPhotoPermission()` |
| `photo-location` | `ports.photo.requestLocationPermission()` (예외 시 denied 취급) |
| `location` | `ports.location.request()` |
| `notifications` | `ports.notification.ensureChannel()` → `requestPermission()` |
| `battery-exception` | `ports.battery.requestException()` → 로컬 상태 `batteryNoticeShown=true` |

- 호출 후 **권한 상태를 다시 조회**하고 `planOnboardingSteps` 재실행 → 다음 단계로.
- `battery-exception`은 조회할 상태가 없으므로 `requestException()` 반환(void) 후 무조건
  `batteryNoticeShown=true`로 진행(FR-009 — 1회 제시로 충분).

### S1.3 — [건너뛰기] 동작

- 그 key를 `skippedThisSession`에 추가 → 재판정 → 다음 단계.
- 아무 상태도 안 바꾸고 아무 통로도 안 부른다.

### S1.4 — [시작하기] 동작

- `onComplete({ completed: true, batteryNoticeShown: <현재값> })`.
- App.tsx가 `saveOnboardingFlag` 후 탭 UI로 전환.

## S2 — `PermissionsSection` (020 "설정" 탭 안)

```ts
export type PermissionsSectionProps = {
  platform: "android" | "ios";
  requirements: readonly PermissionRequirement[];
  ports: { /* S1과 동일 */ };
  /** [온보딩 다시 하기] — App.tsx가 온보딩 화면을 강제 마운트 */
  onRestartOnboarding: () => void;
};
```

### S2.1 — 렌더 규칙

- 각 `requirement`를 행으로. 현재 플랫폼의 `platforms`에 없는 항목은 행을 안 그림
  (FR-003 — android에서 `location`이 `["ios"]`면 안 보임).
- 행 = `rationale` 축약 + 현재 상태 문구 + 동작 버튼:
  - `granted` → "허용됨", 버튼 없음.
  - `limited` → "일부만 허용됨 — 그날의 사진 전부를 보지 못할 수 있다" + [전체 허용]
    (`osSettings.openAppSettings()`) (FR-015).
  - `denied`/`undetermined` → [허용] (S1.2와 같은 호출).
  - `blocked` → "설정에서 직접 바꿔야 한다" + [설정 열기] (FR-016).
  - `battery-exception` → 상태 조회 불가하므로 항상 설명 + [배터리 예외 설정]
    (`battery.openSettingsList()`) **상시 표시** (FR-018).
- 섹션 하단: [온보딩 다시 하기] → `onRestartOnboarding()` (FR-019).
- `PermissionPanel`(진단, dev 전용)과 별개 — 이 섹션은 prod에도 있다.

### S2.2 — 포그라운드 복귀 재조회 (FR-020, SC-006)

- `AppState`의 `change` 이벤트 구독. `nextAppState === "active"`이면 모든 권한 상태
  재조회 후 리렌더.
- 언마운트 시 구독 해제.

## S3 — 거부된 기능의 정직한 안내 (FR-014, SC-004)

각 기능 화면이 관련 권한 상태를 읽어 안내를 띄운다. 최소:

| 화면 | 조건 | 문구(초안) |
|---|---|---|
| `AutoDiarySettingsScreen` | 알림 권한 denied/blocked | "알림 권한이 없어 완성을 바로 알릴 수 없습니다." (020 N8 — 이미 `applyToggleOn`의 `notificationDenied`로 존재, 유지) |
| `AutoDiarySettingsScreen` | 배터리 안내 미제시 or 예외 없음 | "자동 생성이 정한 시간보다 늦어질 수 있습니다. [배터리 예외 설정]" (020 US1 시나리오 3) |
| 일기 목록/설정 | 사진 권한 denied/blocked | "사진을 볼 수 없어 일기는 사진 없이 쓰입니다." |
| 일기 목록/설정 | 위치 권한 denied (android에서 해당 시) | "장소명 없이 씁니다." |

- 이 안내들의 문구는 `PERMISSION_REQUIREMENTS[key].ifDenied`에서 가져온다(중복 정의
  금지).
- **관측 못 하는 것을 단언하지 않는다**(원칙 II) — "사진이 없습니다"가 아니라 "사진을
  볼 수 없어 …". SC-008 리뷰 대상.

## S4 — App.tsx 진입 게이트

```
AppFrame():
  const [flag, setFlag] = useState<OnboardingFlag | null>(null)
  const [forceOnboarding, setForceOnboarding] = useState(false)
  useEffect(() => { loadOnboardingFlag(port).then(setFlag) }, [])

  if (flag === null) return null            // 로딩 (짧음)
  if (!flag.completed || forceOnboarding)
    return <OnboardingScreen flag={flag} ...
             onComplete={(f) => { saveOnboardingFlag(port, f); setFlag(f);
                                  setForceOnboarding(false) }} />
  return <탭 UI ...>  // 기존
```

- `forceOnboarding`은 [온보딩 다시 하기]가 켠다 — `completed`는 그대로 두고 화면만
  다시 보여준다(재실행 후에도 플래그는 `completed: true` 유지).
- `ensureAutoDiaryTaskDefined()`·`clearStaleLocksOnStart()`·알림 라우팅 useEffect는
  게이트와 무관하게 유지(온보딩 중에도 백그라운드 태스크 등록·죽은 잠금 청소는 돌아야
  함).

## S5 — 화면 테스트 (`__tests__/onboarding-screen.test.tsx`, `permissions-section.test.tsx`)

1. `OnboardingScreen`: 모든 상태 `undetermined`로 마운트 → 첫 단계(`photos`) 표시 →
   [허용] mock이 `granted` 반환 → 다음 단계(`photo-location`)로.
2. [건너뛰기] → 통로 호출 0회, 다음 단계로.
3. 마지막 단계까지 건너뛰면 [시작하기] 표시 → `onComplete({ completed: true, ... })`.
4. `blocked` 단계 → [허용] 대신 [설정 열기], `osSettings.openAppSettings` 호출.
5. `platform: "ios"` + `location.platforms: ["android"]` → 위치 단계 안 나옴.
6. `PermissionsSection`: `limited` 행에 [전체 허용] 버튼, `blocked` 행에 [설정 열기].
7. `PermissionsSection`: [온보딩 다시 하기] → `onRestartOnboarding` 호출.
8. `AppState` `change` → `"active"` → 권한 재조회 mock이 다시 불림(SC-006).
9. `OnboardingScreen`/`PermissionsSection`이 `expo-*`를 import하지 않음(소스 검사).
10. 두 화면이 `models/roster`·`ModelAsset`을 import하지 않음(007 헌법 검사가 이미
    잡지만 테스트로도 확인).
