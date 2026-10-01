# Data Model: 설정 진입과 화면 틀 (055)

이 조각은 **새 파일을 저장하지 않는다.** 모두 화면 상태이거나 실시간으로 읽는 값이다.

## 하위 화면 겹 상태 (`AppFrame` 로컬)

| 필드 | 값 | 뜻 |
| --- | --- | --- |
| `route` | `"home" \| "settings" \| "developer"` | 지금 열려 있어야 할 겹(048 그대로). `"home"`이면 겹이 없다 |
| `renaming` | `boolean` | 설정 위에 이름 바꾸기 겹이 열려 있는가 (`route === "settings"`일 때만 의미) |
| (겹 내부) `mounted` | `boolean` | 겹이 그려지는가 — 닫히는 240ms 동안 `route`는 이미 `"home"`이지만 `mounted`는 참 |

**파생값**: `homeCovered = route !== "home" || 닫히는 겹이 하나라도 있음`. 홈에 `covered`로 넘긴다.

**전이**

```
home ──점 세 개──▶ settings(열리는 중 → 열림)
settings ──‹ 일기 / 뒤로──▶ home (겹: 닫히는 중 240ms → 언마운트, 그동안 homeCovered = true)
settings ──이름 행──▶ settings + renaming
settings + renaming ──‹ 설정 / 뒤로 / 저장──▶ settings
아무 상태 ──알림 응답──▶ home (020 — 겹이 닫힌다)
```

파일에 남기지 않는다(앱을 새로 열면 `home`). 연타 방지: `route`가 이미 `"settings"`면 다시 열지 않는다.

## PermissionFacts → PermissionTag (`src/app/permission-tags.ts`, 순수)

```ts
type PermissionReading = PermissionState | "unknown";        // 021 PermissionState + 읽기 실패
type PhotoLocationReading = "ok" | "denied" | "no-photo" | "unknown";

type PermissionFacts = {
  photos: PermissionReading;
  photoLocation: PhotoLocationReading;
  location: PermissionReading;
  notifications: PermissionReading;
};

type PermissionTag = "allowed" | "partial" | "denied" | "unread";
type TaggedKey = "photos" | "location" | "notifications";     // 배터리는 꼬리표 없음
```

| 행 | 재료 | 규칙 |
| --- | --- | --- |
| 사진 | `photos`, `photoLocation` | `unknown` → `unread` · `granted`·`limited` 아님 → `denied` · `limited` → `partial` · `granted` + `denied` → `partial` · `granted` + (`ok`·`no-photo`·`unknown`) → `allowed` |
| 위치 | `location` | `granted` → `allowed` · `unknown` → `unread` · 나머지 → `denied` |
| 알림 | `notifications` | 위치와 같다 |

`photoLocation: "unknown"`(좌표 읽기 시도 자체가 실패 — 통로 없음)은 사진 읽기만으로 정한다(FR-021 「재료가 없으면」). 저장하지 않는다.

## VersionText (`src/app/version.ts`, 순수)

`formatVersion(name: string | null, build: string | null): string | null`

- 둘 다 있으면 `"1.0.0 (9)"`, 이름만 있으면 `"1.0.0"`, 이름이 없으면 `null`(행 값 비움 — 지어내지 않는다).

## 문구 (`src/ui/settings-text.ts`)

`SETTINGS_TEXT` — 보드 키 → KO 원문(spec FR-031) + `save: "저장"`, `backToSettings: "설정"`(앞에 ‹), `redownload: "모듈 다시 받기"`.
계약 테스트가 글자 단위로 잠근다(C4).
