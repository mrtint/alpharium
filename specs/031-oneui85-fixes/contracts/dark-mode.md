# Contract: 다크 모드에서도 라이트 고정 (①)

관련 요구사항: FR-001, FR-002, FR-003, FR-004, FR-005, SC-001, SC-004.

---

## DM1 — 라이트 고정의 보장 수단

> ⚠️ **실기기 조사(2026-09-03, SM-S928N)로 핵심 수단이 바뀌었다.** 초안은 "`forceDarkAllowed=false`가 One UI force-dark 반전을 차단"이었으나 그것으로는 배경 `#303030`이 안 없어졌다(force-dark가 아니라 `DayNight` 윈도우 배경 해석이 원인). **핵심 수단은 `AppTheme` 부모 테마를 `DayNight` → `Light`로 교체하는 것이다.** research.md R1a.

앱이 시스템 다크 모드와 무관하게 라이트로 그려지는 것은 아래가 **모두** 성립해야 보장된다:

1. **`app.json`에 `userInterfaceStyle: "light"`** — (이미 존재) 앱 레벨 선언.
2. **`expo-system-ui`가 `package.json` `dependencies`에 있다** — 이 선언이 RN `Appearance`/뷰 레벨에 적용되게 하는 패키지. 없으면 `@expo/prebuild-config`가 경고만 내고 무시(research R1).
3. **★ `AppTheme`의 부모가 `Theme.AppCompat.Light.NoActionBar`다** (원래 `Theme.AppCompat.DayNight.NoActionBar`) — `plugins/with-force-light-theme.js`가 `withAndroidStyles`로 `$.parent`를 교체. 시스템 night 모드에서 윈도우 배경이 `#303030`으로 칠해지는 것을 막는다. **이것이 진짜 수정.** `Theme.App.SplashScreen`은 `AppTheme` 상속이라 자동으로 따라옴.
4. **`AppTheme`·`Theme.App.SplashScreen`에 `android:forceDarkAllowed="false"`** — 같은 plugin이 `assignStylesValue`로 주입. Light 테마에도 force-dark를 씌우는 제조사 대비 방어(무해).

**계약 테스트 (`__tests__/plugins/force-light-theme.test.ts`, 소스/함수 검사)**:

| # | 검사 | 기대 |
|---|---|---|
| DM1a | `with-force-light-theme.js`가 순수 함수 `addForceLightItem(styles)`를 export한다 | 함수 존재 (with-battery-exception 패턴) |
| DM1b | **`addForceLightItem`이 `AppTheme`의 `$.parent`를 `Theme.AppCompat.Light.NoActionBar`로 바꾼다** | 결과 styles의 `AppTheme.$.parent` == `LIGHT_PARENT`. 위반 주입: `DayNight`로 되돌리면 FAIL |
| DM1b2 | `addForceLightItem`이 `AppTheme` `<style>`에 `android:forceDarkAllowed` = `false` item을 더한다 (방어) | 결과 styles에 해당 item 존재 |
| DM1c | 이미 `forceDarkAllowed` item이 있으면 중복 추가하지 않는다 (prebuild 여러 번) | item 1개만 |
| DM1d | `Theme.App.SplashScreen`에도 `forceDarkAllowed=false`가 붙고(방어), `Base.*` 등 무관한 `<style>`은 건드리지 않는다 | SplashScreen에 item 존재 + `windowBackground` 보존, 무관 style 무변경 |
| DM1e | `app.json`의 `plugins` 배열에 `./plugins/with-force-light-theme`가 있다 | 소스 검사 |
| DM1f | `app.json`의 `userInterfaceStyle`이 `"light"`다 (회귀 방지 — 누가 automatic으로 바꾸면 안 됨) | 소스 검사 |
| DM1g | `package.json` `dependencies`에 `expo-system-ui`가 있다 | 소스 검사 |

## DM2 — 라이트 모드 회귀 없음 (FR-004)

- `src/ui/` 어느 파일에도 `useColorScheme`·`Appearance`·다크 팔레트 분기가 **새로 생기지 않는다** — 이 스펙은 "라이트 고정"이지 "다크 대응"이 아니다(11번 범위).
- 기존 색상 상수(`StyleSheet.create`의 하드코딩 색)는 무변경.
- **계약 테스트**: `grep`으로 `src/ui/**/*.tsx`에 `useColorScheme`·`Appearance.` 부재 확인(신규 규칙 — `checkSourceFile`에 넣을지는 tasks에서 판단, 최소한 테스트 1개).

## DM3 — 실기기 확인점 (quickstart, SC-001·SC-004)

**One UI 8.5 (SM-S928N)** — `adb shell "cmd uimode night yes"` 강제 후:

| 화면군 | 확인 |
|---|---|
| 온보딩 (`onboarding-screen`) | 배경 밝음, 텍스트·진행률 바·버튼 또렷. 어제 22:03 스크린샷의 dimmed 재현 안 됨 |
| 일기 목록 | 배경 밝음, 날짜·"일기 쓰기" 또렷 |
| 일기 상세 | 제목·본문·사진 슬라이더 밝은 배경. 어제 22:28 스크린샷 대조 |
| 설정 탭 | 섹션·토글·버튼 또렷 |
| 생성 중 화면 | 회전 표시·"그만두기" 보임(배경 밝음) |
| 개발자 탭 (dev만) | 진단 텍스트 또렷 |

→ 6/6 밝은 배경 + 대비 충분 = SC-001 통과. 확인 후 `adb shell "cmd uimode night auto"` 복원.

**release 재확인**: `app-release.apk` 새로 빌드 → S24U 새 설치 → 다크 모드 강제 → 위 6화면 중 대표 3개(온보딩·목록·상세) 확인. `expo-system-ui`가 minify에서 살아남는지(012).

**One UI 8 이하 (SM-S901N)** — 라이트 모드(평시)에서 6화면이 이번 수정 전과 동일 = SC-004 통과.
