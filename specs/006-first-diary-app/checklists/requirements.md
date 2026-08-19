# Specification Quality Checklist: 손에 쥐는 첫 빌드

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-18
**Updated**: 2026-08-18 — 「패키징」의 뜻이 확정되어 스펙을 다시 씀
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## 헌법 정합성 (이 저장소 고유)

- [x] 원칙 I — 저장된 일기를 생성 대신 보여주지 않는다(FR-038), 미리 만든 응답 자리를 두지 않는다(FR-040), 사용자 경로가 `select.ts`를 거친다(FR-019)
- [x] 원칙 II — 화자 교정이 명시적 목표이며(Story 5), 규칙 자리가 하나로 유지된다(FR-031, SC-021)
- [x] 원칙 III — 모델 정보 비노출(FR-036), 모델 파일을 APK에 넣지 않는다(Assumptions), 캐릭터 문안을 여전히 짓지 않는다
- [x] 원칙 IV — 지표 비노출(FR-037), 판정 갈래를 늘리지 않는다(FR-032, SC-020), 크래시 리포팅·분석을 범위 밖으로 뺐다
- [x] 원칙 V — `unknown`/`none` 구분이 화면까지 간다(FR-025), **release에서 도는 것을 실기기로 확인한다**(FR-007, SC-001·003) — debug에서 돌았다는 것이 release에서 돈다는 뜻이 아니라는 것을 명시
- [x] 001 SC-013 유지 — 배포 빌드에서 진단 화면 도달 경로 0개(FR-041, SC-009)
- [x] 「한 축을 깊게 파지 않는다」 — 디자인·스토어·iOS·EAS·OTA·분석을 전부 범위 밖으로 밀었다

## 검토 중 확인한 것 (validation notes)

### 이 스펙은 다시 쓴 것이다

초안은 「패키징」을 **사용자 경로 만들기**로 읽고 배포물(서명·release 빌드)을 범위 밖으로
밀었다. 사용자가 **2번(배포물)에 가깝다**고 확정했고, 「예쁘게 하는 것은 지금 할 필요
없다」를 덧붙였다. 그에 맞춰 전체를 다시 썼다.

- **Story 1(케이블 뽑아도 도는 앱)과 Story 3(덮어 설치)을 새로 세웠다.** 초안에 없던
  축이며 이제 이것이 기능의 중심이다.
- **Story 2(사용자 경로)는 남겼지만 이유가 바뀌었다.** 초안에서는 그것이 목적이었고,
  지금은 **배포물이 쓸모 있으려면 필요한 것**이다 — 설치는 되는데 일기를 못 쓰는 APK는
  목표가 아니다.
- **Story 5(화자 교정)를 P1에서 P2로 내렸다.** 초안에서는 「첫 인상을 배반한다」를 근거로
  P1이라고 주장했는데, 배포물을 만드는 일 자체를 막지는 않으므로 P2가 맞다. 함께 담되
  이것 때문에 빌드가 늦어지지 않는다.
- **「예쁘게 만들지 않는다」를 FR-008·FR-020과 Out of Scope에 명시했다.** 아이콘도
  기존 것을 그대로 쓴다.

### 저장소를 실제로 확인한 것 (짐작이 아니다)

스펙의 「무엇을 만드는가」에 적은 네 가지는 파일을 열어 확인했다.

- `android/app/build.gradle` — `release` 블록이 `signingConfig signingConfigs.debug`이고
  Expo 템플릿의 "Caution!" 주석이 그대로 있다. **확인함.**
- `src/diagnostics/sink.ts` — `prod`에서 `screen`을 제외한다. 생성 버튼이 그 화면 안에
  있으므로 배포 빌드에 생성 자리가 없다. **확인함.**
- `src/diary/store.ts` — `listDays()`·`load()`가 있으나 부르는 화면이 없다. **확인함.**
- `eas.json` — **없다.** 그래서 로컬 gradle 빌드로 가정했다.
- `.env.production` — **있고 커밋되어 있다.** `EXPO_PUBLIC_APP_ENV=prod`가 들어 있다.
  초안 작성 시점에는 이것을 몰라 「환경 변수가 안 박힐 것」이라 짐작했는데, 실제로는
  파일이 있으므로 **release 빌드가 이것을 집는지 확인하는 문제**로 좁혀진다(FR-002).

### [NEEDS CLARIFICATION]을 쓰지 않은 이유

- **Android만인가 iOS도인가** → Android로 가정했다. 실기기 확인이 전부 Android였고
  iOS는 기기·서명 체계가 다른 별개 축이다. Assumptions에 적었고 뒤집기 쉽다.
- **APK인가 AAB인가** → APK. 손으로 설치하는 것이 목적이고 AAB는 스토어용이다.
- **로컬 빌드인가 EAS인가** → 로컬. `eas.json`이 없고 EAS는 계정·과금·원격 빌드를 끌고
  온다.
- **키를 어디에 보관하는가** → 계획 단계의 판단으로 충분하다. 스펙은 「저장소에 커밋되지
  않는다」(FR-004)와 「문서에 남는다」(FR-006)만 못 박았다.

## Notes

- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`
- 전 항목 통과. `/speckit-plan`으로 갈 수 있다.
- **계획 단계에서 가장 조심할 자리 둘**:
  1. **release에서만 깨지는 것** — `expoFileSystemPort`·`onDeviceBackend`·`expoPhotoPort`가
     전부 동적 `import`를 쓰고, `llama.rn`은 네이티브에 닿는다. minify·R8·ProGuard가
     이것들을 건드리는 것은 흔한 실패다. **release 빌드를 일찍 한 번 뽑아 보는 것**이
     계획에 들어가야 한다 — 마지막에 확인하면 그때 무너진다.
  2. **화면이 생성을 부르는 경로** — 진단 화면은 `onDeviceBackend()`를 직접 부르는
     예외였고(dev에서만 열리므로 성립), 사용자 경로는 그 예외가 성립하지 않는다.
     `selectBackend()`를 거치지 않으면 원칙 I의 검증 지점이 우회된다(FR-019, SC-023).
