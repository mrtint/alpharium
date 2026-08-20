# Contract: release 빌드와 서명

**Feature**: 006-first-diary-app | **Date**: 2026-08-18

**이 계약을 어기면 되돌릴 수 없다.** 키가 바뀌면 이미 설치된 앱을 덮어쓸 수 없고,
그때 사용자의 일기가 함께 사라진다.

---

## §1. 불변식

| # | 불변식 | 근거 |
| --- | --- | --- |
| R1 | release가 **debug 키로 서명되지 않는다** | FR-003, SC-004 |
| R2 | 서명 키·비밀번호가 **저장소에 없다** | FR-004, SC-005 |
| R3 | 서명 설정이 **저장소에 남는다** — `prebuild --clean` 뒤에도 살아남는다 | FR-006, SC-007 |
| R4 | release가 **Metro 없이 돈다** | FR-001, SC-002 |
| R5 | release가 **`prod`로 판정된다** | FR-002 |
| R6 | 환경 판정이 실패하면 **`prod`로 간주하지 않는다** | FR-035, SC-002a |
| R7 | **최적화가 켜진 채로** 온디바이스 생성까지 돈다 | FR-007, SC-003 |
| R8 | 같은 키로 서명한 다음 빌드가 **덮어 설치되고 일기가 남는다** | FR-005, SC-006 |
| R9 | 아이콘·스플래시를 **바꾸지 않는다** | FR-008 |

---

## §2. 서명 — config plugin으로 선언한다

**`android/`는 gitignore되어 추적되지 않는다**(확인: `.gitignore` 16행,
`git ls-files android/`가 빔). 따라서 `android/app/build.gradle`을 직접 고치면:

- 저장소에 남지 않아 다음 사람이 재현할 수 없다 → **R3 위반**
- `npx expo prebuild --platform android --clean`에 **지워진다**

**004에서 같은 성질의 사고가 있었다** — `expo run:android`가 prebuild를 건너뛰어
권한이 빠진 APK가 설치됐다. 네이티브 설정은 **선언으로 남겨야** 한다.

### 계약

`plugins/with-release-signing.js`가 `withAppBuildGradle`로 release `signingConfig`를
넣는다. (`@expo/config-plugins` 57.0.8이 이 export를 제공하는 것을 확인했다.)

**plugin이 아는 것**: 키스토어 **경로**와 **별칭**
**plugin이 모르는 것**: **비밀번호** — 빌드 시점에 gradle이 읽는다

```
app.json > expo.plugins 에 등록
  ["./plugins/with-release-signing", { ... }]
```

**지금 상태 (고쳐야 할 것)** — `android/app/build.gradle` 112~115행:

```gradle
release {
    // Caution! In production, you need to generate your own keystore file.
    signingConfig signingConfigs.debug     // ← R1 위반
}
```

### R2를 이미 지켜 주는 것

`.gitignore`가 확인된 상태:

| 행 | 규칙 | 막는 것 |
| --- | --- | --- |
| 24 | `*.jks` | 키스토어 파일 |
| 36 | `*.env.secret` | 비밀번호를 둘 자리 |
| 17~19 | `*.apk`·`*.aab` | 빌드 산출물 |

**R2는 절반 충족 상태다.** 남은 것은 plugin이 값을 하드코딩하지 않는 것.

---

## §3. 환경 주입

**확인한 규칙** (`node_modules/@expo/env/build/index.js` 95~125행):

```js
function getEnvFiles({ mode = process.env.NODE_ENV }) {
  return [`.env.${mode}.local`, `.env.local`, `.env.${mode}`, `.env`]
}
```

**파일을 고르는 열쇠는 `NODE_ENV`다. `EXPO_PUBLIC_APP_ENV`가 아니다** —
후자는 파일 *안의 값*이다.

| `NODE_ENV` | 로드되는 파일 | `EXPO_PUBLIC_APP_ENV` | 앱 환경 |
| --- | --- | --- | --- |
| `production` | `.env.production` ✅ 커밋됨 | `prod` | prod → 온디바이스 강제 |
| `development` | `.env.development` ✅ 커밋됨 | `local` | local |
| (없음) | `.env.local`, `.env` | 없음 | **판정 실패 → R6** |

**`.env.dev`는 어떤 모드에도 매칭되지 않아 자동 로드되지 않는다.** 실기기 dev 절차는
`EXPO_PUBLIC_APP_ENV=dev`를 **직접 주는** 방식이며(AGENTS.md), 파일을 읽어서가 아니다.
**이 사실을 문서에 남긴다** — 남기지 않으면 다음 사람이 「파일이 있으니 되겠지」로
오해한다(원칙 V).

### R5·R6의 관계

R5는 **성공 경로**, R6은 **실패 경로**다. 둘 다 필요하다:

- R5: `.env.production`이 실제로 박히는가 → **빌드해서 확인해야 안다**(원칙 V —
  규칙을 읽은 것과 빌드가 그렇게 도는 것은 다른 사실)
- R6: 안 박혔을 때 `prod`로 간주하지 **않는가** → `selectBackend()`가 이미
  `environment-unresolved`를 반환한다. `wiring.ts`가 그것을 `build-error`로 옮긴다

---

## §4. 빌드 절차 (FR-006 — 문서에 남아야 한다)

```
1. 키 만들기 (최초 1회)
   keytool -genkeypair -v -keystore <경로>.jks \
     -alias <별칭> -keyalg RSA -keysize 2048 -validity 10000

   ⚠️ 이 파일을 잃으면 덮어 설치가 영영 끊긴다. 저장소 밖에 백업한다.

2. 비밀번호를 gitignore된 자리에 둔다

3. prebuild — 선언을 네이티브에 반영
   npx expo prebuild --platform android --clean

4. release 빌드
   (gradle assembleRelease 또는 expo run:android --variant release)

5. 설치
   adb install -r <apk>
```

**⚠️ 3번을 건너뛰면 plugin이 반영되지 않는다.** 004의 교훈 — 빌드 성공이 설정이
맞다는 뜻은 아니다.

### 확인 방법 (빌드 성공을 믿지 않는다)

| 무엇 | 어떻게 |
| --- | --- |
| R1 — debug 키가 아닌가 | `apksigner verify --print-certs <apk>` — debug 인증서(`CN=Android Debug`)가 아니어야 한다 |
| R4 — Metro 없이 도는가 | **Metro를 끄고 USB를 뽑고** 앱을 연다 |
| R5 — prod로 판정되는가 | 앱이 정상 동작하고 `build-error` 화면이 아니다 |
| R7 — 최적화 켜고 도는가 | release APK에서 모델 적재 → 생성 → 저장까지 |
| R8 — 덮어 설치 | 일기 쓴 뒤 `versionCode` 올려 재빌드 → `adb install -r` → 일기 확인 |

---

## §5. release에서만 깨질 수 있는 것 (전부 미확인)

**005까지의 모든 실기기 확인이 debug였다. release는 처음이다.**

`android/gradle.properties`에서 확인한 것: `newArchEnabled=true`,
`hermesEnabled=true`, ABI 4개. `build.gradle` 112~121행에서 release만 켜지는 것:
`minifyEnabled`, `shrinkResources`, ProGuard.

| 위험 | 왜 | 드러나는 모양 |
| --- | --- | --- |
| 동적 `import` 실패 | `expoFileSystemPort`·`onDeviceBackend`·`expoPhotoPort`가 전부 지연 import | debug 멀쩡, release만 죽음 |
| `llama.rn` JNI 심볼 제거 | ProGuard가 네이티브 심볼을 지우는 것은 흔한 실패 | release에서만 모델 적재 실패 |
| APK 크기 | ABI 4개 포함 | 설치는 되나 큼 |

**위 「왜」는 일반적 실패 양상이지 이 저장소에서 관측된 것이 아니다**(원칙 V).
관측되면 그때 사실로 기록한다.

**그래서 release 빌드를 구현 초기에 한 번 뽑는다.** 마지막에 확인하면 되돌릴 것이
많아진다.

**⚠️ 원칙 IV**: release가 debug보다 빠른지 느린지 **재지 않는다.** 도는지만 본다.

---

## §6. 범위 밖

- 스토어 등록·심사·개인정보 처리방침
- AAB (스토어용). APK로 간다
- iOS 빌드·서명
- EAS Build·CI 자동 빌드
- OTA(expo-updates)
- ABI 줄이기 — **크기가 실제 문제인지 확인되지 않았다.** 미리 줄이면 다른 기기에서
  안 도는 APK가 된다
- 아이콘·스플래시 교체(R9)
