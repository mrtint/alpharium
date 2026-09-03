# Research: One UI 8.5+ 다크 모드 dimmed + 온보딩 photo-location

Phase 0 — 두 결함의 원인을 코드·설치본·실기기 로그로 확정하고, 수정 수단의 역할을 나눈다.

---

## R1. ① 다크 모드 — `userInterfaceStyle: "light"`가 Android에서 무시되는 이유

**Decision**: `expo-system-ui`를 설치한다. **추가로 config plugin으로 `AppTheme`의 부모를 `Theme.AppCompat.DayNight.NoActionBar` → `Theme.AppCompat.Light.NoActionBar`로 바꾼다.** (`forceDarkAllowed=false`도 방어로 함께 넣는다.)

> ⚠️ **초안의 원인 진단이 실기기 조사(2026-09-03, SM-S928N)에서 틀린 것으로 확인됐다.** 초안은 "One UI 8.5가 라이트 앱에도 **force-dark 반전**을 씌운다 → `forceDarkAllowed=false`로 막는다"였으나, `forceDarkAllowed=false`를 `AppTheme`·`Theme.App.SplashScreen` 양쪽(+`-v29` variant)에 넣은 debug 빌드에서도 배경이 **정확히 `#303030`**(= `background_material_dark`, rgb(48,48,48))으로 나왔다. force-dark 반전이면 글자·이미지까지 반전됐을 텐데 앱 콘텐츠가 아예 안 그려진 채 `#303030` 단색이었다 — **윈도우 데코 배경을 `DayNight` 테마가 night 리소스로 해석한 것**이다. 진짜 수정은 부모 테마 교체다. 아래 R1a에 상세.

**근거 (설치본 직접 확인, 2026-09-03)**:

`node_modules/@expo/prebuild-config/build/plugins/unversioned/expo-system-ui/withAndroidUserInterfaceStyle.js` 전문:

```js
const withAndroidUserInterfaceStyle = config => {
  return withStringsXml(config, config => {
    const userInterfaceStyle = config.android?.userInterfaceStyle ?? config.userInterfaceStyle;
    if (userInterfaceStyle) {
      WarningAggregator.addWarningAndroid('userInterfaceStyle',
        'Install expo-system-ui in your project to enable this feature.');
    }
    return config;
  });
};
```

→ `expo-system-ui`가 없으면 **경고만 내고 아무 네이티브 변경도 하지 않는다.** `npx expo prebuild`가 출력한 `» android: userInterfaceStyle: Install expo-system-ui in your project to enable this feature.`가 바로 이것.

Expo 공식 문서(context7 `/expo/expo`, `develop/user-interface/color-themes.mdx`):
> For Android development builds, `expo-system-ui` must be installed to enable appearance styles; otherwise, the `userInterfaceStyle` property will be ignored.
> The `userInterfaceStyle` property supports three values: `automatic`, `light`, `dark`.

**`expo-system-ui` 설치 시**: 그 패키지의 자체 config plugin이 Android 네이티브 설정을 넣어 `userInterfaceStyle: "light"`가 실제로 적용된다(RN `Appearance` API가 "light"를 보고, 네이티브 uiMode가 라이트로 고정).

### R1a. 실기기로 확정한 진짜 원인 (2026-09-03, SM-S928N/One UI 8.5, debug)

`adb shell "cmd uimode night yes"` 후 `adb exec-out screencap` 픽셀 샘플:

| 시스템 night 모드 | 앱 배경색 |
|---|---|
| `no` | `rgb(250,250,250)` (라이트, 정상) |
| `yes` | `rgb(48,48,48)` = `#303030` |

`#303030`은 AppCompat의 `background_material_dark` 정확값이다. `dumpsys activity com.anonymous.alpharium`:

- `mCurrentConfig` = `... port night finger ...` → **프로세스 구성에 `night`가 살아 있다**
- `mLastConfigurationFromResources` = `... port finger ...` (**`night` 없음**) → **리소스 해석은 라이트** = `expo-system-ui`의 `setDefaultNightMode(MODE_NIGHT_NO)`는 작동 중

즉:
1. `MainActivity`의 매니페스트 `android:theme` = `Theme.App.SplashScreen` → 부모 `AppTheme` → 부모 `Theme.AppCompat.DayNight.NoActionBar`.
2. 시스템 night 모드에서 **윈도우 데코가 만들어질 때** `DayNight`가 `android:windowBackground`/`colorBackground`를 night 리소스(`#303030`)로 해석해 칠한다.
3. `expo-system-ui`(`AppCompatDelegate.setDefaultNightMode(MODE_NIGHT_NO)`)는 **리소스 해석 계층**만 라이트로 되돌린다. 이미 칠해진 윈도우 데코 배경은 안 고친다.
4. 매니페스트 `android:configChanges`에 **`uiMode`가 포함**돼 있어(`keyboard|...|uiMode|...`), night→resolved-light 전환에도 Activity가 **재생성되지 않는다** → 스테일한 `#303030` 배경이 그대로 남는다.

**이건 force-dark 반전이 아니다.** force-dark였다면 글자·이미지까지 전부 반전됐을 것이고, `forceDarkAllowed=false`(양쪽 테마 + `-v29` variant까지 APK에서 확인)로 막혔을 것이다 — 막히지 않았다.

**수정: `AppTheme`의 부모를 `Theme.AppCompat.Light.NoActionBar`로 바꾼다.** `Light`(비-DayNight) 테마는 시스템 night 모드와 무관하게 윈도우 배경을 라이트로 해석한다. `Theme.App.SplashScreen`은 `AppTheme`을 상속하므로 자동으로 따라온다.

**`forceDarkAllowed=false`도 남긴다 (방어)**:

- `AppTheme`·`Theme.App.SplashScreen` 양쪽에 유지. Light 테마에도 force-dark를 씌우는 제조사(관측된 바 없지만 가능) 대비 무해한 이중 방어.
- `forceDarkAllowed`는 API 29(Android 10)+ 속성이라 aapt2가 자동으로 `-v29` variant로 분리한다. `minSdk 24`이지만 낮은 버전에서는 무시될 뿐 빌드가 깨지지 않는다.

**Alternatives considered**:

| 대안 | 기각 이유 |
|---|---|
| `expo-system-ui`만 설치 | `setDefaultNightMode(MODE_NIGHT_NO)`가 리소스 해석만 되돌리고 이미 칠해진 윈도우 데코 배경은 못 고침(R1a 실측). 배경 `#303030` 잔존. |
| `forceDarkAllowed=false` plugin만 (부모 교체 없이) | **실기기에서 실패 확인**(R1a) — 양쪽 테마 + `-v29`에 넣어도 배경 `#303030`. 원인이 force-dark 반전이 아니라 `DayNight` 윈도우 배경 해석이라 이 속성으로는 안 막힘. |
| `forceDarkAllowed=false` plugin만 (expo-system-ui 없이) | 위에 더해, `userInterfaceStyle: "light"` 경고가 계속 남고 RN `Appearance`가 여전히 시스템을 따라감(다크 모드에서 `useColorScheme()`이 "dark" 반환 — 나중에 11번 NativeWind 작업이 이 값을 보면 어긋남). |
| `styles.xml` 부모를 `Theme.AppCompat.Light`로 교체 | ← **이것이 채택된 수정.** `android/`가 gitignore라 직접 수정은 불가하지만 config plugin(`withAndroidStyles`)으로 `AppTheme`의 `$.parent`를 바꾼다. `Theme.App.SplashScreen`은 `AppTheme` 상속이라 자동으로 따라옴 — 충돌 없음. `expo-system-ui`(RN 뷰 레벨) + Light 부모(윈도우 배경 레벨)로 이중 보장. |
| `react-native-edge-to-edge` / `SystemBars` 도입 | edge-to-edge는 별개 문제(StatusBar 무력화)이고 로드맵 11번 범위. 이번 스펙은 다크 모드만. |
| 앱을 실제 다크 모드 대응(`src/ui/` 다크 팔레트) | 큰 작업, 로드맵 11번(NativeWind UI). 이번 스펙은 "라이트로 고정"까지. |

**plugin 구현 방향**: `@expo/config-plugins`의 `withAndroidStyles`를 쓴다. 순수 함수 `addForceLightItem(styles)`가 (1) `AppTheme` `<style>`의 `$.parent`를 `Theme.AppCompat.Light.NoActionBar`로 바꾸고, (2) `AppTheme`·`Theme.App.SplashScreen`에 `<item name="android:forceDarkAllowed">false</item>`를 더한다(`assignStylesValue`, 중복 덮어쓰기). 순수 함수를 함께 export해 기기·prebuild 없이 jest로 검증 — `with-battery-exception.js`가 `addBatteryExceptionPermissions`를 export한 것과 같은 패턴. 계약 테스트가 `$.parent === "Theme.AppCompat.Light.NoActionBar"`를 잠근다(위반 주입: 부모를 `DayNight`로 되돌리면 FAIL).

---

## R2. ② 온보딩 photo-location — `ACCESS_MEDIA_LOCATION`이 판정 불가능한 이유

**Decision**: `PERMISSION_REQUIREMENTS`에서 `photo-location` 항목을 제거하고, `PermissionKey` 타입에서도 뺀다. `order`를 1..4로 재배치(사진1·위치2·알림3·배터리 예외4). 온보딩·설정·`App.tsx`의 `photo-location` 분기와 계약 테스트를 함께 정리한다.

**근거 (소스 + 021 문서 + 실기기 로그)**:

`src/signals/expo-port.ts:109-118` (`locationPermission()`):
```js
async locationPermission(): Promise<PermissionState> {
  const lib = await import("expo-media-library");
  const photo = toPermissionState(await lib.getPermissionsAsync(false, [...PHOTO_ONLY]));
  if (photo !== "granted") return photo;   // 사진 못 보면 좌표도 확실히 못 봄
  return "undetermined";                    // 사진은 보이지만 좌표 권한은 알 수 없음
}
```

`src/signals/expo-port.ts:95-97` 주석 (021에서 확인):
> `expo-media-library 57`은 `ACCESS_MEDIA_LOCATION`을 **따로 묻는 함수를 주지 않는다.** 패키지 전체에서 이 권한은 `getLocation()`·`getExif()`의 주석에만 등장하며, 조회 API가 없다(설치본 직접 확인, 2026-08-16).

`src/signals/expo-port.ts:125-128` (`requestLocationPermission()`):
```js
async requestLocationPermission(): Promise<PermissionState> {
  const lib = await import("expo-media-library");
  return toPermissionState(await lib.requestPermissionsAsync(false, [...PHOTO_ONLY]));  // ← ACCESS_MEDIA_LOCATION이 아니라 READ_MEDIA_IMAGES 재요청
}
```

**무한 루프의 흐름**:
1. 온보딩 1단계에서 `READ_MEDIA_IMAGES` granted
2. 2단계(`photo-location`)에서 "허용" → `requestLocationPermission()` → `requestPermissionsAsync([READ_MEDIA_IMAGES])` (이미 granted → no-op)
3. One UI: `GrantPermissionsActivity`를 띄웠다 **즉시 destroyed** (요청할 게 없음). 실기기 로그: `SurfaceFlinger ... GrantPermissionsActivity ... destroyed`, `VRI[GrantPermissionsActivity] Not drawing due to not visible`
4. `refresh()` → `locationPermission()` → 사진 granted → `"undetermined"`
5. `decision.ts:59-66` `statusOf("undetermined", false)` → `"actionable"` (line 64-65: undetermined·denied·미조회 → actionable)
6. `nextStep()` → 첫 `actionable` = `photo-location` → **같은 단계 반환, 화면 안 바뀜**
7. 유일한 탈출: `skip()` (`"skipped-eligible"` → `nextStep`이 건너뜀)

**왜 "허용" 버튼이 구조적으로 무의미한가**: `ACCESS_MEDIA_LOCATION`은 (a) 조회 API가 없어 상태를 알 수 없고, (b) 전용 요청 API가 없어 사용자에게 물을 수 없다. 021이 이 제약을 인식하고 `collect.ts`가 "실제로 좌표를 읽어보고 실패하면 `places`를 `unknown`으로" 처리하게 했다(FR-013a). **온보딩에서 이 권한을 별도 단계로 묻는 것은 021 설계와 이미 모순이었다** — 물을 방법이 없는데 단계를 뒀다.

**Alternatives considered**:

| 대안 | 기각 이유 |
|---|---|
| "안내만" 단계로 전환 ("허용" 대신 "다음") | 판정할 수 없는 단계를 화면에 남기는 것 자체가 원칙 V 「통로 없는 축은 화면에서 뺄 수 있다」에 어긋남. 코드도 더 복잡(새 status 갈래 또는 예외 분기). clarify에서 "제거" 확정. |
| 사진 granted면 `photo-location`도 자동 satisfied | `photo-location`을 상수에 남기고 `statusOf`/`planOnboardingSteps`에 특례를 넣는 것 — "코드가 축을 판정하지 않는다"(원칙 V)에 위배. 특례 분기가 다음 결함의 틈. |
| `expo-media-library` 우회해 네이티브로 직접 요청 | 새 네이티브 경계 → release 재확인 확대, 범위 큼. `ACCESS_MEDIA_LOCATION`은 실제로 `getLocation()` 호출 시 시스템이 알아서 처리(사진 권한에 종속) — 별도 요청 자체가 불필요. |
| 아무것도 안 하고 "건너뛰기 안내" 문구만 추가 | 증상 가림. 사용자가 여전히 갇힘(건너뛰기를 눌러야 함). |

**원칙 V 부합 논증 (Constitution Check 보강)**:

`PERMISSION_REQUIREMENTS`는 021이 "**사람이 못 박은 상수**"로 세웠다(`requirements.ts:1-21` 주석, 012 `USER_VISIBLE_SIGNAL_AXES` 선례 명시). 원칙 V 「관측 통로가 없는 축」:
> 관측할 통로가 아예 없어 언제나 `unknown`인 축은 일기 프롬프트와 사용자 화면에서 뺄 수 있다(MAY).
> 어느 축이 「통로가 없는가」를 코드가 판정하지 않는다(MUST NOT). 축마다 관측 가능 여부를 사람이 정해 상수로 못 박고, 통로가 생기면 그 상수를 고친다(MUST).

- `photo-location`은 **조회 통로가 없다**(요청·조회 API 부재, R2 근거). 언제나 `"undetermined"`로만 판정된다.
- 따라서 **화면(온보딩·설정)에서 빼는 것이 MAY**로 허용된다.
- 빼는 주체는 **코드가 아니라 사람**이다 — 이 스펙의 결정으로 `requirements.ts` 상수에서 항목을 제거한다(값을 보고 코드가 빼는 게 아님).
- 「뺀 축은 진단 경로에 남긴다(MUST)」 — `photo-location`은 애초에 **판정값이 없어** 진단에 남길 것이 없다. `collect.ts`가 실제 좌표 읽기 성공/실패를 `DaySignals.places`에 이미 기록하고, `DiagnosticsScreen`/`SignalProbe`가 그것을 보인다 — 이 경로는 무변경.
- `expo-media-library`가 언젠가 `ACCESS_MEDIA_LOCATION` 조회 API를 주면, 그때 사람이 이 상수에 항목을 다시 넣는다("이 조항은 축을 영구히 지우는 것이 아니다").

**위반 주입 검증(계약 테스트가 잡아야 할 것)**:
- `PERMISSION_REQUIREMENTS`에 `photo-location`을 도로 넣으면 → `requirements.test.ts`의 키 목록(4개)·`order` 배열([1,2,3,4]) 단언이 실패해야 한다.
- `PermissionKey` 타입에 `"photo-location"`을 도로 넣으면 → `tsc`가 `OnboardingScreen`·`PermissionsSection`의 switch exhaustiveness에서 잡거나, 계약 테스트가 소스에서 타입 정의를 읽어 잡는다.

---

## R3. 검증 전략

**Decision**: debug 실기기 1회(두 버그) + release 실기기 1회(`expo-system-ui` 새 네이티브 모듈, 012). 다크 모드는 `cmd uimode night yes`로 강제 후 `auto` 복원.

- ① debug: 다크 모드 강제 → 6개 화면군(온보딩·목록·상세·설정·생성중·개발자) 전부 밝은 배경 확인. 어제 22시대 스크린샷과 대조.
- ① release: 같은 확인 1회 (`expo-system-ui`가 R8/minify에서 살아남는지). `app-release.apk` 빌드 → S24U 새 설치 → 다크 모드 강제 → 화면 확인.
- ② debug: S24U 완전 새 설치(uninstall→install) → 온보딩 진행 → 사진 "모두 허용" 후 **다음 화면이 "위치" 단계**인지(≠ "사진 위치") → 4단계 통과 → 에셋 다운로드 도달.
- ② 회귀: 설정 탭 "권한" 섹션에 `photo-location` 행 없음, `deniedNotices`에 좌표 거부 안내 없음.
- S22(One UI 8) 회귀: 라이트 모드 6화면 + 온보딩 4단계 흐름 이상 없음.
- Maestro `unified-permission-onboarding.yml` 갱신(4단계) 후 PASS.
- `npm test`(logic+ui) 전부 통과, lint(eslint·tsc·헌법 검사·prettier) 클린.

**함정 (AGENTS.md)**:
- `expo-system-ui` 버전은 `npx expo install expo-system-ui`로 — `npm view`는 틀린 답.
- `npx expo prebuild --platform android --clean` 후 `cp ~/.alpharium-signing/alpharium.jks android/app/` 잊지 않기(키가 지워짐).
- `cmd uimode night yes` 후 반드시 `auto` 복원.
- Maestro 새 흐름 아님 — `unified-permission-onboarding.yml`은 이미 `FLOWS`에 등록됨. 스텝만 갱신.
- `pm clear` 대신 `uninstall`→`install`로 진짜 새 설치 재현(이번 조사에서 `pm clear`와 재설치가 초기 Activity 상태가 다를 수 있음을 확인).
