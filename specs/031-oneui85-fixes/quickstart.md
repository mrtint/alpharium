# Quickstart: One UI 8.5+ fixes 검증

두 버그가 실제로 고쳐졌는지 확인하는 실행 가이드. 계약·데이터 모델 상세는 `contracts/`·`data-model.md` 참조.

## 전제

- One UI 8.5 기기: **SM-S928N / S24 Ultra** (`ro.build.version.oneui = 80500`), USB 연결, 잠금 해제.
- 회귀 기기: **SM-S901N / S22** (One UI 8 이하).
- 개발 기계: Metro dev(`EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client`), `adb reverse tcp:8081 tcp:8081`.
- 서명 키 `~/.alpharium-signing/alpharium.jks` 존재.

## 기기 없는 검증 (항상 먼저)

```bash
npm test            # logic + ui — 2100+ 통과 기대 (photo-location 케이스 갱신 반영)
npm run lint        # eslint + tsc + check:constitution(위반 0) + prettier
```

- `tsc`가 `PermissionKey` union 축소를 `OnboardingScreen`/`PermissionsSection` switch에서 강제하는지 확인(빠뜨린 case가 있으면 여기서 잡힘).
- `__tests__/plugins/force-light-theme.test.ts` 통과(DM1a~g).
- `__tests__/onboarding/requirements.test.ts` `order [1,2,3,4]`·키 4개 통과.

## 위반 주입 (방어 확인)

1. `PERMISSION_REQUIREMENTS`에 `photo-location` 항목을 도로 추가 → `requirements.test.ts` R2-a·b·c·d FAIL 확인 → 되돌린다.
2. `PermissionKey`에 `"photo-location"` 추가(항목 없이) → `tsc` 또는 R2-f FAIL → 되돌린다.
3. `with-force-light-theme.js`가 `AppTheme` 부모를 `DayNight`로 되돌리게 고침 → DM1b FAIL → 되돌린다.
4. `app.json` `userInterfaceStyle`을 `"automatic"`으로 → DM1f FAIL → 되돌린다.

## ① 다크 모드 — debug 실기기 (SM-S928N)

```bash
# dev 빌드 설치 (모델은 이후 배치 또는 온보딩 다운로드)
npx expo run:android -d <S928N-serial>

# 다크 모드 강제
adb -s <S928N> shell "cmd uimode night yes"
adb -s <S928N> shell am force-stop com.anonymous.alpharium
adb -s <S928N> shell monkey -p com.anonymous.alpharium -c android.intent.category.LAUNCHER 1
```

**확인 (DM3 표, SC-001)** — 6개 화면군을 열어 스크린샷:

| 화면 | 통과 기준 |
|---|---|
| 온보딩 | 배경 밝음, 텍스트/진행률 바/버튼 또렷 — 어제 `Screenshot_20260902_220340_alpharium.jpg`의 회색 상태 아님 |
| 일기 목록 | 배경 밝음 |
| 일기 상세 | 제목·본문·사진 슬라이더 밝음 — 어제 `Screenshot_20260902_222822_alpharium.jpg` 대조 |
| 설정 | 또렷 |
| 생성 중 | "그만두기" 보임, 배경 밝음 |
| 개발자 탭 | 진단 텍스트 또렷 |

```bash
adb -s <S928N> shell "cmd uimode night auto"   # ★ 반드시 복원
```

## ② photo-location 제거 — debug 실기기 (SM-S928N, 완전 새 설치)

```bash
adb -s <S928N> uninstall com.anonymous.alpharium
adb -s <S928N> install android/app/build/outputs/apk/debug/app-debug.apk   # 또는 expo run:android
adb -s <S928N> shell monkey -p com.anonymous.alpharium -c android.intent.category.LAUNCHER 1
```

**확인 (OB 표, SC-002·003·005)**:

1. 온보딩 1/4 = 사진 단계. "모두 허용" (또는 "제한된 액세스 허용").
2. **다음 화면 = "위치"(장소명) 단계** — `adb shell uiautomator dump` 후 `onboarding-step-location` 확인. `onboarding-step-photo-location`은 **없어야** 한다.
3. "허용"/"건너뛰기" → 알림(3/4) → 배터리 예외(4/4) → **에셋 다운로드 단계** 도달.
4. 거친 권한 단계 = 4개 (진행률 표시 "N / 4").
5. 온보딩 통과 후 설정 탭 → "권한" 섹션: 행 4개(사진·위치·알림·배터리 예외). `permission-row-photo-location` **없음**.
6. 사진/위치 권한 거부 상태로 홈 → 거부 안내(`deniedNotices`)에 "사진의 위치를 읽지 못해..." 문구 **없음**. 사진/위치 자체 안내는 뜰 수 있음.

**신호 수집 회귀 (OB7, SC-006)**: 사진 좌표 있는 하루(seed 또는 실촬) 생성 →
- 위치 권한 허용: 일기에 지명("강남구" 등).
- 위치 권한 거부(`adb pm revoke ... ACCESS_FINE_LOCATION`): 일기에 지명 없음.
- → 수정 전과 동일해야 한다.

## Maestro

```bash
node scripts/run-device-tests.mjs   # unified-permission-onboarding.yml 갱신본 포함 전체
```

- `unified-permission-onboarding.yml`이 4단계 흐름으로 PASS.
- 회귀: `scheduled-diary-notification.yml`(020), `diary-photo-gallery.yml`(025) 등 온보딩을 거치는 흐름 PASS.

## ① release 재확인 (SM-S928N)

```bash
npx expo prebuild --platform android --clean
cp ~/.alpharium-signing/alpharium.jks android/app/          # ★ prebuild가 지움
cd android && NODE_ENV=production ./gradlew assembleRelease

apksigner verify --print-certs app/build/outputs/apk/release/app-release.apk   # CN=alpharium
adb -s <S928N> uninstall com.anonymous.alpharium
adb -s <S928N> install app/build/outputs/apk/release/app-release.apk
adb -s <S928N> shell "cmd uimode night yes"
# 온보딩·목록·상세 3화면 — 밝은 배경 확인 (expo-system-ui가 minify에서 살아남는지)
adb -s <S928N> shell "cmd uimode night auto"
```

## S22 회귀 (SM-S901N)

- 라이트 모드 평시: 6개 화면군이 수정 전과 동일(SC-004).
- 새 설치 온보딩: 4단계 흐름 정상, 갇힘 없음.

## 완료 기준 (spec SC)

- [~] SC-001: S928N 다크 모드 화면 밝은 배경, dimmed 0건 — **부분 확인(2026-09-03)**: 온보딩 1단계·에셋 다운로드 단계·"1/4" 재게이트 3화면에서 배경 `rgb(250,250,250)` + 대비 또렷, `#303030` 재현 0건. 목록·상세·설정·개발자 탭은 에셋(~2GB 모델) 미준비로 미확인(다음 세션).
- [x] SC-002: 사진 허용 후 "사진 위치" 단계 안 나옴, 온보딩 4단계 — **확인(2026-09-03)**: `uiautomator dump`로 `photos → location → notifications → battery-exception` 순서 확인, `onboarding-step-photo-location` 부재.
- [x] SC-003: 새 설치 온보딩 에셋 다운로드까지 도달 — **확인(2026-09-03)**: 4개 권한 단계 전부 [건너뛰기]로 통과 → `onboarding-step-assets` 도달, 갇힘 없음.
- [ ] SC-004: S901N 라이트 모드·온보딩 회귀 0건 — 기기 미연결
- [~] SC-005: 온보딩·설정 어디에도 `photo-location` 항목 없음 — **온보딩 확인**(위 SC-002), 설정 "권한" 섹션은 에셋 게이트로 미도달
- [ ] SC-006: 사진 좌표→지명 동작 수정 전후 동일 — 에셋 미준비로 미확인
- [ ] release 재확인 1회 (expo-system-ui) — 미수행
- [x] `npm test`·`npm run lint` 클린 — `test:logic` 1825개 통과, lint 0 error, 헌법 검사 위반 0, prettier 클린, `force-light-theme.test.ts` 9개 통과

> **참고**: 다크 모드 수정의 근본 원인이 초안(`forceDarkAllowed=false`로 force-dark 반전 차단)에서 **`AppTheme` 부모를 `DayNight` → `Light`로 교체**로 정정됐다(실기기 조사 2026-09-03, research.md R1a). 커밋 `837b1ef`.
