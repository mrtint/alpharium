# Phase 0: Research — 손에 쥐는 첫 빌드

**Feature**: 006-first-diary-app | **Date**: 2026-08-18

이 문서의 모든 결정은 **저장소 코드나 설치본 타입을 직접 열어 확인한 것**에 근거한다.
확인하지 않은 것은 「미확인」으로 적었다(헌법 원칙 V).

---

## §1. 서명 설정을 어디에 두는가

**Decision**: **Expo config plugin(`plugins/with-release-signing.js`)으로 선언한다.**
`android/app/build.gradle`을 직접 고치지 않는다.

**Rationale**:

`.gitignore` 16행이 `/android`를 무시하고, `git ls-files android/`가 **비어 있다.**
즉 `android/`는 추적되지 않는 생성물이다. 직접 편집하면:

- 저장소에 남지 않아 다음 사람이 재현할 수 없다(FR-006 위반)
- `npx expo prebuild --platform android --clean`에 **지워진다**

**AGENTS.md에 이미 같은 사고가 기록되어 있다** — 004에서 `expo run:android`만으로는
매니페스트가 갱신되지 않아 `READ_MEDIA_IMAGES`가 빠진 APK가 설치됐다. 그 교훈이
「네이티브 설정은 선언으로 남겨야 한다」이며, 서명은 매니페스트보다 잃었을 때의 비용이
크다(키가 바뀌면 덮어 설치가 끊기고 일기가 사라진다).

**확인한 것**: `@expo/config-plugins` **57.0.8**이 설치되어 있고
`withAppBuildGradle`·`withGradleProperties`를 export 한다
(`build/plugins/android-plugins.d.ts` 74·88행). Expo가 관리하는 전이 의존이므로
새 패키지를 들이지 않는다.

**Alternatives considered**:

| 대안 | 기각 이유 |
| --- | --- |
| `build.gradle` 직접 편집 | `prebuild --clean`에 지워지고 저장소에 남지 않는다 |
| `android/`를 gitignore에서 빼고 커밋 | 생성물 전체가 저장소에 들어와 diff가 무의미해진다. Expo 프로젝트 관례에 어긋난다 |
| `expo-build-properties` | **미설치**이고, 이 패키지는 빌드 속성용이지 서명 설정을 다루지 않는다 |
| EAS Build의 관리형 서명 | 계정·과금·원격 빌드 축이 따라온다(Out of Scope) |

---

## §2. 키와 비밀번호를 어디에 두는가

**Decision**: **키 파일은 저장소 밖(또는 gitignore된 경로), 비밀번호는 gitignore된
환경 파일에 두고 gradle이 읽는다.** 값을 plugin 소스에 박지 않는다.

**Rationale**:

`.gitignore`가 이미 막아 주는 것을 확인했다:

- 24행 `*.jks` — 키스토어 파일
- 36행 `*.env.secret` — 비밀번호를 둘 자리
- 17~20행 `*.apk`/`*.aab` — 빌드 산출물

**즉 FR-004(키·비밀번호 비커밋)는 절반이 이미 충족되어 있다.** 남은 것은 「plugin이
값을 하드코딩하지 않게 하는 것」이며, plugin은 **경로와 별칭만 알고 실제 비밀번호는
gradle 실행 시점에 읽도록** 한다.

**미확인 — 계획 단계에서 정할 것이 아니라 구현에서 확인할 것**: gradle이 어느 파일에서
비밀번호를 읽게 할지(`~/.gradle/gradle.properties` vs 프로젝트 루트의 gitignore된
파일). 둘 다 성립하며, **문서화(FR-006)가 더 중요하다.**

**Alternatives considered**:

| 대안 | 기각 이유 |
| --- | --- |
| plugin에 비밀번호 하드코딩 | 저장소에 커밋된다. FR-004·SC-005 정면 위반 |
| debug 키를 계속 쓴다 | Story 4의 존재 이유. 나중에 바꾸면 덮어 설치가 끊기고 일기가 사라진다 |
| 키를 저장소에 커밋하고 비밀번호만 분리 | 키 파일 자체가 비밀이다. `*.jks` 무시 규칙이 이미 그 판단을 담고 있다 |

---

## §3. release 빌드에 환경을 어떻게 주입하는가

**Decision**: **`NODE_ENV=production`으로 빌드해 `.env.production`이 로드되게 한다.**
새 메커니즘을 만들지 않는다.

**Rationale**:

**`@expo/env`의 파일 선택 규칙을 설치본에서 직접 읽었다**
(`node_modules/@expo/env/build/index.js` 95~125행):

```js
function getEnvFiles({ mode = process.env.NODE_ENV, silent } = {}) {
  ...
  return [`.env.${mode}.local`, mode !== 'test' && `.env.local`,
          `.env.${mode}`, `.env`].filter(Boolean);
}
```

**핵심: 파일 선택은 `NODE_ENV`로 한다. `EXPO_PUBLIC_APP_ENV`가 아니다.**
`EXPO_PUBLIC_APP_ENV`는 파일 *안의 값*이지 파일을 고르는 열쇠가 아니다.

따라서:

- `NODE_ENV=production` → `.env.production` 로드 → `EXPO_PUBLIC_APP_ENV=prod` → 앱이
  `prod`로 판정 → 온디바이스 강제(`policy.ts`). **원하는 결과다.**
- Expo CLI는 release 번들링에서 `NODE_ENV`를 `production`으로 둔다. **다만 그것이
  실제로 그런지는 빌드해서 확인해야 한다**(FR-002, SC-002) — 규칙을 읽은 것과 빌드가
  그대로 도는 것은 다른 사실이다(원칙 V).

**`KNOWN_MODES`에 없는 모드는 경고를 낸다**(115행). 이것이 §4의 근거가 된다.

**Alternatives considered**:

| 대안 | 기각 이유 |
| --- | --- |
| gradle `buildConfigField`로 주입 | Expo의 env 통로를 우회하는 두 번째 메커니즘이 생긴다. 001 FR-009a의 「단일 판정」 정신에 어긋난다 |
| plugin에서 `EXPO_PUBLIC_APP_ENV`를 박아 넣는다 | 빌드는 하나여야 한다(AGENTS.md). 박으면 dev·prod 빌드가 갈라진다 |
| 기본값 `prod`로 떨어뜨린다 | **명확화에서 기각됨**(FR-035). 001이 거부한 「기본값으로 떨어지기」이며 원칙 V 위반 |

---

## §4. `.env.dev`가 죽어 있다

**Decision**: **`.env.dev`가 자동 로드되지 않는다는 사실을 문서에 남긴다.** 파일을
지울지는 구현에서 정하되, **지운다면 실기기 절차 문서를 함께 고친다.**

**Rationale**:

§3의 규칙을 `.env.dev`에 적용하면: 로드되려면 `NODE_ENV=dev`여야 하고, `dev`는
`KNOWN_MODES`(`development`/`test`/`production`)에 없어 **경고가 난다.**

**실제로 이 저장소는 그것을 우회하고 있다.** AGENTS.md의 실기기 절차가
`EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client`로 **환경 변수를 직접 준다** —
`.env.dev` 파일을 읽어서가 아니다. 즉 **파일은 있지만 아무도 읽지 않는다.**

이것이 위험한 이유는 다음 사람이 「`.env.dev`가 있으니 dev 빌드는 알아서 되겠지」라고
읽는 것이다. 원칙 V가 경계하는 「있는 것처럼 보이지만 아닌 상태」다.

**⚠️ 지우기 전에 확인할 것**: `.env.development`도 같은 문제인지 — 이쪽은
`NODE_ENV=development`가 `KNOWN_MODES`에 있으므로 **로드된다.** 즉 `local` 환경은
정상이고 **`.env.dev`만 죽은 파일이다.**

**Alternatives considered**:

| 대안 | 기각 이유 |
| --- | --- |
| 그냥 둔다 | 다음 사람이 오해한다. 이 기능이 배포물을 다루므로 env 통로를 정리할 적기다 |
| `.env.dev`를 로드되게 만든다 | `NODE_ENV=dev`는 비표준 모드 경고를 낸다. dev는 애초에 실기기 개발 빌드이며 명시적 주입이 맞다 |

---

## §5. 화면 전환을 무엇으로 하는가

**Decision**: **상태 하나(`AppScreen`)로 가른다.** 네비게이션 라이브러리를 들이지 않는다.

**Rationale**:

화면이 셋뿐이고(목록·상세·쓰는 중) 전이가 단순하다. `react-navigation`이나
`expo-router`는:

- 네이티브 의존을 더한다 → **release 빌드에서 처음 도는 것을 확인해야 할 표면이
  넓어진다**(이 기능의 가장 큰 위험, §6 참조)
- 별개 축이다(Assumptions에 명시)

**전이를 순수 함수로 두면 기기 없이 전 갈래를 검증할 수 있다**(SC-023). 002가
`readinessOf`를, 005가 `acceptance`를 순수 함수로 둔 것과 같은 판단이다.

**Alternatives considered**:

| 대안 | 기각 이유 |
| --- | --- |
| `expo-router` | 파일 기반 라우팅은 앱 구조 전체를 바꾼다. 화면 셋에 과하다 |
| `react-navigation` | 네이티브 의존 추가. release 검증 표면이 넓어진다 |
| 뒤로 가기 하드웨어 버튼 처리 | 상세→목록만 있으면 되고, RN의 `BackHandler`로 충분. 라이브러리 불필요 |

---

## §6. `GenerationProbe`를 어떻게 고치는가

**Decision**: **컴포넌트를 지우지 않고 계약만 바꾼다** — `backend`를 받던 자리에
`pipeline`을 받게 한다.

**Rationale**:

명확화에서 「진단 화면도 파이프라인을 거친다」로 정했다(FR-010a). 지금 `GenerationProbe`는
`backend.generate()`를 직접 부르고 `setText()`로 화면 상태에만 담는다 — **이것이 저장이
끊긴 원인이다.**

컴포넌트를 지우지 않는 이유: **005가 이 컴포넌트에 원칙 IV·I 방어를 이미 새겨 놓았다.**

- `busy`가 불리언 하나 → 진행률이 들어갈 자리가 없다
- 토큰 콜백을 넘기지 않는다 → 스트리밍 경로가 코드에 없다
- `describeFailure()`가 실패를 「할 수 있는 것」으로 옮긴다 → 원칙 III 방어

**이 방어들은 사용자 경로에도 그대로 필요하다.** 지우고 새로 만들면 다시 짜야 하고,
그때 하나를 빠뜨리면 방어가 사라진다. `describeFailure()`는 **사용자 경로에서 재사용
한다.**

**바뀌는 것**: `props.backend` → `props.pipeline`, `generate()`가 `pipeline.run()`을
부르고 `PipelineResult`를 다룬다.

**Alternatives considered**:

| 대안 | 기각 이유 |
| --- | --- |
| `GenerationProbe`를 지운다 | 명확화의 옵션 C였고 기각됨. 005의 방어 코드를 잃는다 |
| 그대로 두고 사용자 경로만 파이프라인 | 명확화의 옵션 A였고 기각됨. 저장 안 하는 경로가 남아 본보기가 된다 |
| 진단용 파이프라인을 따로 만든다 | 파이프라인이 둘이 되면 「저장까지 가는가」를 두 번 검증해야 한다 |

---

## §7. release 빌드에서 무엇이 깨질 수 있는가 (미확인 위험)

**Decision**: **release 빌드를 구현 초기에 한 번 뽑아 본다.** 마지막에 확인하지 않는다.

**Rationale**:

**이것이 이 기능의 가장 큰 미확인 영역이다.** 005까지의 모든 실기기 확인이 debug
빌드였다. `android/gradle.properties`를 읽어 확인한 release 관련 설정:

```
newArchEnabled=true
hermesEnabled=true
reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64
expo.useLegacyPackaging=false
```

release에서만 켜지는 것(`build.gradle` 112~121행): `minifyEnabled`,
`shrinkResources`, ProGuard.

**깨질 수 있는 자리 (전부 짐작이며 확인 필요)**:

| 자리 | 왜 위험한가 | 확인 방법 |
| --- | --- | --- |
| 동적 `import` | `expoFileSystemPort`·`onDeviceBackend`·`expoPhotoPort`가 전부 지연 import. minify가 건드리면 debug는 멀쩡하고 release만 죽는다 | release APK에서 저장·생성·사진이 도는지 |
| `llama.rn` 네이티브 심볼 | ProGuard가 JNI 심볼을 지우는 것은 네이티브 모듈의 흔한 실패 | release에서 모델 적재가 되는지 |
| 4개 ABI 포함 | APK 크기가 커진다. arm64만 필요 | 크기를 본다. **줄이는 것은 이 기능 밖일 수 있다** |

**이 표의 「왜 위험한가」는 일반적 실패 양상이지 이 저장소에서 관측된 것이 아니다.**
관측되면 그때 사실로 기록한다(원칙 V).

**Alternatives considered**:

| 대안 | 기각 이유 |
| --- | --- |
| 기능 끝에 release 검증 | 그때 깨지면 되돌릴 것이 많다. 초기에 뽑으면 문제가 좁을 때 드러난다 |
| ProGuard를 끈다 | 문제를 덮는 것이며, 켠 상태로 도는 것이 FR-007의 요구다 |
| ABI를 arm64만 남긴다 | **지금 정하지 않는다.** 크기가 실제 문제인지 확인 안 됨. 미리 줄이면 다른 기기에서 안 도는 APK가 된다 |

---

## 정리 — 이 기능에서 「짐작」으로 남는 것

원칙 V에 따라 명시한다. **아래는 확인되지 않았으며, 확인 전까지 사실로 쓰지 않는다.**

| 값 | 지금 | 성질 |
| --- | --- | --- |
| release에서 동적 import가 도는가 | 모름 | **미확인.** 빌드해서 확인 |
| debug에서 동적 import가 도는가 | **돈다** | **실측 2026-08-20** — 저장·생성·사진이 전부 동작 |
| debug에서 저장이 실제로 일어나는가 | **일어난다** | **실측 2026-08-20** — `files/diary/2026-08-19.json` |
| 앱 종료 뒤에도 일기가 남는가 | **남는다** | **실측 2026-08-20** — force-stop 뒤 목록에 그대로 |
| 프롬프트 교정 뒤 단언이 사라지는가 | 모름 | **미확인.** 교정은 했으나 실기기 재확인 안 함 |
| release에서 `llama.rn`이 도는가 | 모름 | **미확인.** 005는 debug에서만 확인 |
| Expo CLI가 release에 `NODE_ENV=production`을 주는가 | 그럴 것 | **규칙은 읽었으나 빌드로 미확인** |
| APK 크기 | 모름 | 미확인. 4 ABI가 들어간다는 것만 안다 |
| 덮어 설치에서 일기가 보존되는가 | 그럴 것 | Android 관례상 앱 데이터는 유지되나 **이 앱에서 미확인** |
| 기기 재부팅 뒤에도 일기가 남는가 | 모름 | **미확인.** 재부팅은 했으나 잠금 해제 전이라 확인 못 함 |
| 생성 중 앱이 뒤로 갈 때의 끊김 | 미확인 | 005에서도 미확인으로 남았다(30초라 홈 다녀오면 끝나 버림) |
