# Quickstart: 121 확인 절차

## 기기 없이

```bash
npm test
npm run lint
```

- `__tests__/signals/place-names.golden.test.ts` — 20곳 대조(SC-001).
- `__tests__/config/no-location.test.ts` — 바깥 전송·권한 0건(NX1~NX5, SC-003).
- 위반 주입: `src/`에 `import("expo-location")` 한 줄, `PERMISSION_REQUIREMENTS`에 `location` 한 줄을 넣어 테스트가 깨지는지 보고 되돌린다.

## 데이터 다시 만들기(사람이 필요할 때만)

```bash
brew install osmium-tool
npm run places:build   # 원본을 scripts/places/.cache/에 받고 assets/places/kr-places.bin·meta.json을 쓴다
```

결과 해시가 바뀌면 대조표(PN3)를 다시 돌려 본다.

## 실기기 (dev 빌드, 네이티브 변경이라 prebuild 필요)

1. `npx expo prebuild --platform android --clean` → `adb shell dumpsys package com.a810labs.pocketlog | grep -i location` — `ACCESS_FINE/COARSE/BACKGROUND_LOCATION`이 없고 `ACCESS_MEDIA_LOCATION`은 있다.
2. `npm run sample:seed`(앞뒤 15일) — 표본 날 중 「걸어 다닌 날」·여러 군집 날을 고른다.
3. 그 날을 홈에서 쓴다. 진단 화면 프롬프트 미리보기와 본문에 장소 이름이 시각순으로 나오는지 본다(SC-002). 설정 「끔」으로 바꿔 다시 쓰기 → 이름 줄이 없다.
4. 비행기 모드에서 한 번 더(SC-005).
5. iPhone 14 개발 서명 빌드로 2~3을 반복한다(사진 시딩 `npm run ios:seed`).
6. 시뮬레이터: 첫 실행 권한 단계에 위치가 없다(SC-004), 설정 장소 이름 대화상자 두 칸·글꼴 2.0배.
7. 이름 찾기 시간(SC-007): 개발 빌드에서 진단 로그의 시작~끝 시각(임시 로그, 확인 뒤 걷는다).

## 기록

### 실기기 · 안드로이드 (`SM-S901N`, `R3CTB084WDP`, JS 내장 디버그 `dev` 빌드, 2026-11-21)

- **매니페스트 위치 권한 부재(SC-003)**: `npx expo prebuild --platform android --clean` 후 APK에 `res/raw/assets_places_krplaces.bin`(9,697,799바이트) 포함 확인, `adb shell dumpsys package com.a810labs.pocketlog | grep -i location` 결과 `ACCESS_FINE_LOCATION`·`ACCESS_COARSE_LOCATION`·`ACCESS_BACKGROUND_LOCATION` 없음, `ACCESS_MEDIA_LOCATION`만 존재(`granted=true`).
- **여러 곳 날 일기(SC-002·SC-007)**: `npm run sample:seed`(129장, 6.8초) 후 `2026-11-06`(기존 표본 포함 사진 22장·자리 12곳)을 「켬」 상태로 작성.
  - 임시 `[place-timing]` 로그: `n=12 prepare=72ms names=174ms` (합 **246ms** < 1초).
  - 저장된 `files/diary/2026-11-06.json`: `places` 12항목(시각순·좌표 없음 — `서울특별시청`, `서울함공원`, `강남역`, `서울도서관`, `서울숲` 등), `signalsUsed.places.value.trace.visits` 미저장.
  - 본문: 「오전에는 서울청 근처 작은 방에서 … 오후에는 서울함공원 근처에서 …」(실제 `2026-11-06`의 앞 두 자리가 `서울특별시청`, `서울함공원`이었고 2.1B 모델이 첫 이름을 「서울청 근처」로 줄여 썼다).
- **설정 권한 행·대화상자·글꼴 2.0배**: 설정 「권한」에 사진·알림·배터리만 있고 위치 행 없음. 「장소 이름으로 보기」 대화상자에서 「켬/끔」 두 칸과 고지 문구 확인(`font_scale` `1.0` 및 `2.0` 모두 잘림·겹침 없음 확인 후 `1.0` 복원). 진단 화면 「입력 프롬프트 미리보기」 접근 확인(고정 `SIGNAL_PRESETS`를 씀).
- **「끔」 다시 쓰기**: 설정을 「끔」(`{"mode":"off"}`)으로 바꿔 `2026-11-06` 다시 쓰기 → `[place-timing]` 미호출, 저장 JSON `places` 12항목 모두 `label: null, category: null`, 본문 장소명 없음.
- **실기기에서 발견·수정한 버그**: 설정에서 「끔」→「켬」으로 바꾼 직후 앱 재시작·백그라운드 왕복 없이 홈으로 돌아와 썼을 때 `DiarySection`이 `AppFrame`의 `settingsValues.geocoding`을 받지 않고 독자 `state`로 `AppState active` 때만 읽어 이전 값이 유지되는 버그를 발견. `App.tsx`에서 `AppFrame` 값을 prop으로 내리도록 수정하고 `__tests__/ui/settings-time-place-wiring.test.ts`에 테스트를 추가했다.
- **오프라인(비행기 모드) + 같은 세션 설정 전환 재검증(SC-005)**: 수정본 APK 설치 후 같은 세션에서 「끔」→「켬」 전환 뒤 `cmd connectivity airplane-mode enable` 및 `svc wifi/data disable`(`Active default network: none`) 상태에서 `2026-11-06` 다시 쓰기 → `[place-timing] n=12 prepare=51ms names=167ms`(합 **218ms**), 저장 JSON `places` 12항목 채워짐, 본문 「오전에는 서울특별시청 근처에서 작은 방을, 서울함공원 근처에서는…」 확인 후 네트워크 복구(`Active default network: 104`).

### 실기기 · `iPhone 14` (`00008110-00010D890C81401E`, iOS 27, 개발 서명 Release `dev` 빌드, 2026-11-21)

- **세 곳 날 일기(SC-002·SC-007)**: `ios:seed`로 `2026-09-15`에 사진 6장(판교역·서울숲·망원한강공원 각 2장)을 심고 홈에서 「일기 쓰기」 실행(`Documents/diary/2026-09-15.json`, `createdAt: 2026-11-21T10:15:58.658Z`).
  - 저장된 `places` 3항목(시각순·좌표 없음): `판교역`(2장) → `서울숲`(2장) → `서울함공원`(2장 — 망원한강공원 좌표 `37.5547, 126.8977`이 서울함공원 다각형 안에 있어 선택됨). `signalsUsed.places.value.trace.visits` 미저장.
  - 본문: 「…오전 판교역 근처에서 본 한 사람이 노트에 열심히 글을 쓰는 장면이 가장 기억에 남아요. …」
  - 시간 확인: Release 빌드에서 JS `console.error`는 `devicectl --console`에 출력되지 않았으나, 네이티브 `[continued-write]` 로그 기준 3~4c 단계 전체(사진 6장 EXIF 읽기 + 모델 확인 + `kr-places.bin` 첫 읽기/색인 + 3곳 이름 고르기)가 첫 시도 **1.065초**(`19:15:27.677` → `19:15:28.742`), 재시도 **0.333초**(`19:15:58.660` → `19:15:58.993`) 안에 끝나 이름 찾기 전체가 1초 미만임을 확인했다.

### 시뮬레이터 · `iPhone 17` (`D2871F0D-1490-4F33-834C-AE280A7DE487`, iOS 27.0, Release `dev` 빌드, 2026-11-21)

- **첫 실행 권한 단계(SC-004)**: 앱 재설치 및 `simctl privacy reset all` 후 실행하여 사진 권한 → 허용 → 알림 권한 → 허용 → 다운로드 동의로 직행하고 위치 권한 단계가 없음을 확인.
- **설정 대화상자·큰 글꼴(T049)**: 모델 다운로드 후 설정 → 「장소 이름으로 보기」 대화상자 두 칸(「켬/끔」)과 고지 문구 확인. `accessibility-large`로 새로 띄워 열었을 때 글자 잘림·겹침 없이 확대되고 `DismissibleDialog` 본문 스크롤 안에 배치됨을 확인(`medium`으로 복원; 단 열린 대화상자 위에서 동적으로 `content_size`를 바꿀 때는 리렌더 전 잘림이 보임).

### 못 본 것

- `iPhone 14`에서의 설정 「끔」 다시 쓰기, 비행기 모드, 설정 대화상자 실기기 화면(안드로이드 실기기·iOS 시뮬레이터로 확인).
- 백그라운드 자동 쓰기(`schedule/task.ts`) 실행에서의 장소 이름 삽입 실측(단위/조립 테스트로만 확인).
- 한국 밖 좌표·장소명 없는 시골 좌표에서의 실기기 일기 작성.
- Play Console 「데이터 보안」의 위치 항목 「수집 안 함」 실제 콘솔 입력(소유자 몫).
