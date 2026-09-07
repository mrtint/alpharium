# Phase 0 — Research: 캐릭터 화면 이관 + 눌림 피드백

**Feature**: 033-character-screen-press-feedback | **Date**: 2026-09-07

이 스펙의 미지수는 대부분 **빌드·테스트 파이프라인**에 있었다. 화면 이관 자체는
032가 다섯 번 해 본 일이고 계약도 있다 — 새로운 것은 reanimated를 **처음 실제로
쓴다**는 것뿐이며, 그 하나가 R1·R2 두 함정을 낳았다.

---

## R1 — ★ `babel.config.js`에 worklets 플러그인이 없다 (최우선)

**Decision**: `babel.config.js`의 `plugins`에 `react-native-worklets/plugin`을
추가하고, 이를 배제한다고 적힌 **스테일 주석을 교체**한다.

**실측 근거** (2026-09-07):

현재 `babel.config.js`는 다음과 같이 적고 있다:

> ⚠️ **`nativewind/babel` 프리셋을 넣지 않는다**(research.md R8, 실측 2026-09-03).
> v4.2의 `nativewind/babel`은 `react-native-worklets/plugin`을 끌어들이는데 **이
> 플러그인이 설치돼 있지 않다**(reanimated 계열 — spec FR-005가 배제).

**이 주석은 스테일이다.** 확인한 사실:

| 확인 항목 | 결과 |
|---|---|
| `node_modules/react-native-worklets/plugin/index.js` | **존재한다** |
| `react-native-worklets` 설치 버전 | `0.10.1` |
| `react-native-reanimated` 설치 버전 | `4.5.1` |
| `babel.config.js`의 `plugins` 항목 | **없음** (presets만) |

032가 진행 중 reanimated·worklets를 SDK 57 정합 버전으로 **명시 핀**했고
(커밋 `565957e`), 그 뒤 주석이 갱신되지 않았다. 032 spec **FR-005는
reanimated를 명시적으로 예외 허용**했으므로(“NativeWind 도입이 곧 reanimated
도입”) 주석의 "FR-005가 배제" 서술도 사실과 다르다.

**왜 치명적인가**: reanimated 4.x는 `useAnimatedStyle`·`withTiming` 안의 함수를
**worklet으로 컴파일**해 UI 스레드에서 돌린다. babel 플러그인이 없으면 이 변환이
일어나지 않는다. 그리고 이 실패는 **조용하다** — 011의 `has_media=0`,
013의 URI 계약 불일치, 020의 헤드리스 `defineTask` 미등록과 **같은 계열**이다.
기기 없는 테스트는 목을 쓰므로 전부 초록이고, 실기기에서 애니메이션만 안 돈다.

**Alternatives considered**:
- *`nativewind/babel` 프리셋으로 전환* — 그것이 worklets 플러그인을 끌어온다.
  기각: 032가 `jsxImportSource`만으로 동작함을 실측했고, 프리셋 전환은 className
  변환 경로 전체를 바꿔 032 회귀 위험을 만든다. 플러그인 한 줄이 최소 변경.
- *RN 코어 `Animated`로 대신* — 플러그인 불필요. 기각: 이 스펙의 존재 이유가
  "이미 치른 reanimated 비용을 쓴다"인데 코어 `Animated`를 쓰면 비용은 그대로
  두고 아무것도 안 쓰는 상태가 유지된다. 로드맵 21번의 요지와 어긋난다.

**검증 방법**: `npm test` 두 프로젝트 GREEN → **실기기 육안이 유일한 최종 확인**.
jest는 이 결함을 구조적으로 못 잡는다(R2가 목을 쓰기 때문).

---

## R2 — ★ reanimated는 jest `ui` 프로젝트에서 그대로 못 쓴다 (실측)

**Decision**: `jest/setup-ui.ts`에 **손으로 쓴 모듈 목**을 추가한다.
`react-native-reanimated/mock`을 쓰지 않는다.

**실측 근거** (2026-09-07, 실제 프로브 테스트를 만들어 돌려 확인):

| 시도 | 결과 |
|---|---|
| 목 없이 `import Animated from "react-native-reanimated"` | ❌ `TypeError: Cannot read properties of undefined (reading 'loadUnpackers')` — `react-native-worklets/src/WorkletsModule/NativeWorklets.native.ts:411` |
| `jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"))` | ❌ 같은 실패 — reanimated의 공식 `mock.js`가 `src/mock.ts:20`에서 **실제 index를 다시 import**한다 |
| `jest/setup-ui.ts`에 손으로 쓴 모듈 목 | ✅ **33 suites / 400 tests 전부 GREEN** |

즉 **공식 목이 이 조합(reanimated 4.5.1 + worklets 0.10.1 + jest-expo 57)에서
동작하지 않는다.** jest-expo 프리셋에도 reanimated 목이 없다(`moduleMocks` 확인).

목이 제공해야 하는 표면(프로브로 확인한 최소 집합):

- `default` — `View`/`createAnimatedComponent`
- `useSharedValue(v)` → `{ value: v }`
- `useAnimatedStyle(fn)` → `{}` (스타일 계산 결과를 테스트가 검사하지 않는다)
- `withTiming(v)` → `v`

**이것이 의미하는 것**: 기기 없는 테스트는 **눌림 반응이 "존재하도록 배선됐는가"만
검증할 수 있고, "실제로 움직이는가"는 검증할 수 없다.** 계약 테스트는 전자만
잠그고, 후자는 FR-022 실기기 육안이 유일한 통로다. 이것을 계약 문서에 명시한다
(PF7) — 초록불을 "동작한다"로 읽는 것이 이 저장소가 반복해 겪은 실패다.

**Alternatives considered**:
- *`transformIgnorePatterns`에 reanimated 추가로 실변환* — 기각: 네이티브 모듈
  (`NativeWorklets`)이 jest에 없으므로 변환해도 같은 자리에서 죽는다.
- *`ui` 프로젝트를 하나 더 쪼개기* — 기각: jest 2프로젝트 분리는 032·007이 세운
  구조이고 `jest-projects.test.ts` 가드가 파일 수를 센다. 셋으로 늘리면 그 가드와
  AGENTS.md 관례를 함께 고쳐야 한다 — 이 스펙의 범위를 크게 넘는다.

---

## R3 — `ListRow.label`을 넓히는 것은 뒤로 호환된다

**Decision**: `label: string` → `label: string | React.ReactNode`. 문자열이면
지금처럼 `<AppText variant="body">`로 감싸고, 노드면 그대로 그린다.

**근거**: `__tests__/ui/list-row.test.tsx`의 기존 6개 케이스가 **전부 문자열
label**을 넘긴다(`"사진"`·`"설정"`·`"읽기전용"`·`"토글행"`·`"비활성"`·`"이동"`).
따라서 문자열 경로를 그대로 두면 기존 테스트가 **무수정 GREEN**이다(SC-002).

**왜 필요한가**: 캐릭터 행의 좌측은 **이름 + 소개 + 상태 + (조건부) 저장공간**이
세로로 쌓인 구조다. `label: string` 하나로는 담기지 않는다 — 032 T062가
"구조가 안 맞는다"고 판단한 이유가 정확히 이것이다. 타입을 넓히면 그 판단의
전제가 사라진다.

**Alternatives considered**:
- *`ListRow`에 `sublabel`·`caption` prop을 따로 추가* — 기각: 캐릭터 행은 최대
  4줄이고 조건부(저장공간은 `bytes > 0`일 때만)라, prop을 줄 수만큼 만들면
  컴포넌트가 이 화면 전용이 된다. ReactNode 하나가 더 일반적이고 계약이 작다.
- *`ListRow`를 안 쓰고 화면에서 직접 조립* — 기각: 사용자가 A안(공용 컴포넌트
  적용)을 선택했고, FR-009가 "실제로 적용"을 요구한다.

---

## R4 — 눌림 반응의 세기·시간 값

**Decision**: `scale: 0.97`, `durationMs: 120`. `tokens.ts`에 `PRESS` 상수로.

**근거**: **사람이 정한 상수다**(헌법 원칙 V). 사용자 조사나 측정에 근거하지
않으며, 근거를 만들려 하면 그것이 곧 측정 장치다(원칙 IV). 012의
`USER_VISIBLE_SIGNAL_AXES`, 021의 `PERMISSION_REQUIREMENTS`, 023의
`BUCKET_COUNT`, 032의 `COLORS`가 전부 같은 성격이다.

선택의 성격: `0.97`은 **눈에 띄지만 요란하지 않은** 범위다. `0.90` 이하면 버튼이
튀는 인상이고, `0.99`면 있는지 모른다. `120ms`는 손을 떼고 돌아오는 것이 즉각적으로
느껴지는 범위다. 실기기 육안에서 어색하면 이 값만 고친다 — **한 자리이므로 한 줄
수정**이다(SC-008).

**Alternatives considered**:
- *opacity 변화* — 기각: `TouchableOpacity`가 이미 하던 것이고, RN 코어가 공짜로
  주는 것을 reanimated로 다시 만드는 것은 비용만 늘린다. scale은 코어가 안 준다.
- *scale + opacity 동시* — 기각: 둘을 겹치면 과해지고, 이 스펙이 "가벼운 마감"으로
  그은 선을 넘는다.

**⚠️ spec FR-013이 처음에 "크기·불투명도 같은 시각 속성"으로 적혀 이 결정과
어긋났다**(`/speckit-analyze` F3이 잡음, 2026-09-07 정정). FR-013은 이제 **크기만**
허용하고 불투명도를 명시적으로 배제한다 — 계약 PF4("transform뿐")와 일치한다.

---

## R5 — 032의 화면 이관 계약을 그대로 재사용할 수 있다

**Decision**: `specs/032-nativewind-ui-system/contracts/screen-migration.md`의
**공통 원칙 절을 그대로 상속**하고, 이 스펙의 `contracts/character-screen-migration.md`는
`CharacterListScreen` 고유의 불변식(CS1~CS9)만 더한다.

**근거**: 032 공통 원칙은 이 화면에 그대로 적용된다 —

- 기존 `testID`·`accessibilityRole`·한국어 문안 **문자 그대로 유지** → FR-002·003
- **"className + 토큰 style 병행" 패턴** → NativeWind 변환이 Metro 시점이라
  jest에 없으므로 둘 다 준다. `AppText`·`Button`·`ListRow`가 이미 내부에서 병행
  중이므로, 그것들로 바꾼 자리는 화면 코드가 색·타이포를 안 만진다.
- SC-001의 "원시 색값 0"은 `#rrggbb` 리터럴이 화면 소스에 없다는 뜻 —
  `COLORS.border` 참조는 위반 아님
- `checkSourceFile` 위반 0
- 기존 `__tests__/ui/*.test.tsx` 초록
- Maestro 흐름 실기기 1회

032 SM1~SM5가 각 화면 고유 불변식을 적었듯, 이 스펙은 SM6에 해당하는 것을
자기 `contracts/`에 CS1~CS9로 적는다.

**Alternatives considered**:
- *032 contracts 파일을 직접 수정해 SM6 추가* — 기각: 머지된 스펙의 산출물을
  나중 스펙이 고치면 032의 기록이 사후 변조된다. 이 저장소는 각 스펙의 결론을
  그 스펙 디렉터리에 남기는 관례다.

---

## R6 — 032 이월 실기기 잔여의 처리

**Decision**: **이 스펙에서 닫지 않는다**(사용자 결정, FR-023). 다만 032
`tasks.md`의 T059 잔여 (2)(release 빌드 1회) 항목에 **"눌림 반응이 배포 빌드에서
동작하는가"를 확인 항목으로 추가 기록**한다.

**근거**: 사용자가 "별도로 유지"를 선택했다. 이 스펙의 실기기 검증은 SM-S901N
(One UI 7, dev debug) 1회로 충분하다 — 012에서 확립된 "최소 한 번이지 debug와
release를 매번 둘 다가 아니다" 기준.

**다만 남는 위험을 명시한다**: 이 스펙이 worklets babel 플러그인을 **처음
활성화**하므로, R8·minify가 켜질 때(로드맵 4번) worklet 함수가 트리셰이킹·
난독화에 어떻게 반응하는지는 미확인이다. 027이 확인한 대로 **현재 release는
minify OFF**(`android.enableMinifyInReleaseBuilds` 미설정)이므로 당장의 위험은
낮지만, 032 잔여의 release 확인에서 눌림 반응을 함께 보면 비용 없이 닫힌다.

**Alternatives considered**:
- *이 스펙에서 release까지 닫기* — 사용자가 명시적으로 기각했다. 빌드에 19분이
  걸리고(027 실측) 모델 재배치가 필요해 세션이 길어진다.

---

## 미해결로 남기는 것

| 항목 | 왜 지금 안 정하는가 |
|---|---|
| worklet이 R8·minify ON에서 살아남는가 | 현재 release는 minify OFF(027). 로드맵 4번이 켤 때의 일이다 |
| One UI 8.5(SM-S928N)에서 눌림 반응 인상 | 032 이월 잔여와 함께 (FR-023) |
| 눌림 반응의 접근성(동작 줄이기) 대응 | 반응이 극히 짧고 이동이 없어 전정계 자극과 무관하다고 본다(spec Assumptions). 필요해지면 후속 |

---

## R7 — ★ 관련 Maestro 흐름은 `diary-character-select.yml`이 **아니다** (실측 정정)

**Decision**: 이 스펙의 회귀 대상 흐름은 **`download-conflict.yml`·
`parallel-model-download.yml`·`photo-vision.yml`** 셋이다.

**실측 근거** (2026-09-07, 흐름 파일과 `App.tsx`를 직접 읽어 확인):

spec 초안과 로드맵 21번이 "기존 흐름(`diary-character-select.yml` 등) 갱신으로
충분한가"를 물었으나, **그 흐름은 `CharacterListScreen`을 전혀 건드리지 않는다.**
029가 캐릭터 **선택**을 설정 탭의 `AuthorPicker`로 옮겼고, 그 흐름은
`author-picker`·`author-option-<i>`만 조회한다.

`CharacterListScreen`의 `testID`를 실제로 조회하는 흐름:

| 흐름 | 조회하는 testID |
|---|---|
| `download-conflict.yml` | `pause-english`, `download-notice` |
| `parallel-model-download.yml` | `pause-english`, `pause-chinese`, `download-notice` |
| `photo-vision.yml` | `vision-row`, `action-vision` |

**화면이 어디에 사는가**: `CharacterListScreen`은 `App.tsx`의 `ModelSection`
안에서 렌더되고, `ModelSection`은 **설정 탭**의 `VisionPicker`·
`GeocodingSettingToggle` **아래**에 있다(029 SS4가 "캐릭터" 탭을 흡수). 즉
이 화면은 설정 탭 하단을 스크롤해야 나온다.

**이것이 왜 위험한가**: 세 흐름이 전부 `scrollUntilVisible`에 크게 의존한다.
025가 실측한 것 — `scrollUntilVisible`이 **컨테이너 상단에서 멈춰** 그 아래
요소가 화면 밖에 남는다. `ListRow`·`Button` 이관으로 **행 높이가 바뀌면**
(`ListRow`는 `paddingVertical: 14`, 현재 행은 `12`) 스크롤 도달 지점이 달라져
흐름이 깨질 수 있다. 문안·`testID`가 불변이어도 **레이아웃 변화만으로 깨지는**
경로다.

**대응**: 실기기에서 세 흐름을 **실제로 돌리는 것이 유일한 확인**이다. 깨지면
032 공통 원칙대로 **흐름이 아니라 구현을 고친다**(행 높이를 현행에 맞춘다).
그래도 안 되면 흐름의 스크롤 타겟만 조정하고 그 사실을 기록한다 — spec SC-004의
"무갱신 통과"가 깨지는 경우이므로 명시적으로 보고한다.

**Alternatives considered**:
- *`ListRow`의 `paddingVertical`을 12로 바꿔 현행 높이 유지* — 채택 후보.
  다만 `ListRow`는 다른 화면이 쓸 공용 컴포넌트이므로 이 화면 하나 때문에
  값을 바꾸지 않는다. 화면 쪽에서 `style` prop으로 덮는 길이 있다(`ListRow`가
  이미 `style`을 받는다).
