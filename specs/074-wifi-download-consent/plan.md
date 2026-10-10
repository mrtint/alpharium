# Implementation Plan: 첫 실행 모델 내려받기 — 모바일 데이터면 알리고 고르게 하기

**Branch**: `074-wifi-download-consent` | **Date**: 2026-10-11 | **Spec**: [spec.md](spec.md)

**Input**: `specs/074-wifi-download-consent/spec.md`, 설계 `docs/superpowers/specs/2026-10-11-wifi-download-consent-design.md`, 조사 `docs/superpowers/specs/2026-10-11-wifi-download-research.md`

## Summary

첫 실행의 `download-consent` 단계에서 연결 종류를 읽어(3초 한도) 모바일 데이터로 **확인될 때만** 모바일 동의(「모바일 데이터로 받기」 / 「나중에 받기」 + 받을 양)를 보인다. 그 밖은 지금의 표준 동의 그대로.
「나중에 받기」는 저장하지 않는 세션 상태이고 대기 화면(「다시 확인하기」 + 전경 복귀 재판정)으로 간다. `resolveFirstRunStage()`·`flag.ts`·`network-port.ts`는 건드리지 않는다.
판정·시간 한도·상태 전이는 `src/app/`의 순수 모듈과 훅 하나로 뽑고, App.tsx의 `download-consent` 분기는 그 훅을 쓰는 얇은 조립만 한다(App.tsx는 이미 매우 크다).

## Technical Context

**Language/Version**: TypeScript(Expo SDK 57, RN 0.86, React Compiler 규칙 적용)

**Primary Dependencies**: 신규 없음 — `expo-network`(059가 이미 들임, `network-port.ts` 한 곳), RNR 대화상자(`ConfirmDialog`·`DialogActionButton`, 050)

**Storage**: 없음(FR-012). `onboarding.json`의 `downloadConsented`는 기존 그대로, 「나중에 받기」는 메모리뿐

**Testing**: jest `logic`(`.ts`) — 순수 판정·시간 한도·소스 계약, jest `ui`(`.tsx`) — 대화상자 두 갈래·대기 화면·`AppFrame.firstrun` 흐름, 실기기 dev(SM-G986N, **시험 전 소유자 확인**)

**Target Platform**: Android 실기기(iOS 시뮬레이터는 같은 코드 경로, 실측 범위 밖)

**Project Type**: 모바일 앱(Expo)

**Performance Goals**: 동의 단계 진입 후 3초 안에 어느 대화상자든 뜬다(SC-003a)

**Constraints**: 모르는 것을 모바일로 단정하지 않는다(원칙 V), 새 저장 필드·권한·네이티브 의존성 0(FR-012), 화면 문구는 카탈로그(062), 모델 식별자·바이트·진행률 노출 없음(FR-011), React Compiler 규칙(render 중 ref 접근·effect 안 setState 금지)

**Scale/Scope**: 새 소스 파일 약 4개(순수 모듈 1·훅 1·컴포넌트 2), 수정 4개(App.tsx 분기·`DownloadConsentDialog`·카탈로그 index·골든 허용 목록), 테스트 약 5개

## Constitution Check

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I 온디바이스가 제품 | 통과 | 추론 경로를 건드리지 않는다 |
| II 화자는 휴대폰 | 해당 없음 | 프롬프트·출력 무관 |
| III 캐릭터는 모델 위 | 통과 | 화면은 「사진을 읽는 모델」·「글을 쓰는 모델」 역할 이름만(모델 식별자 비노출). 최초 실행 기본 캐릭터를 받는 것은 허용 조항 그대로 — 시점만 사용자가 고른다 |
| IV 측정 장치 없음 | 통과 | 3초 한도는 사용자 대기를 끊는 UX 가드이지 측정이 아니다. 받을 양 표시는 정상 UX(헌법 원칙 IV의 UX 예외 문단) |
| V 관측/추측 구분 | 통과 | `cellular`로 확인될 때만 모바일 갈래, 읽기 실패·한도 초과·모름은 표준 동의. 받을 양을 못 읽으면 지어내지 않는다. 핫스팟 한계·실측 값은 문서에 적고 못 본 갈래는 「미확인」 |
| 개발 방식 | 통과 | 계약·테스트 먼저, 한국어 커밋, 브랜치 `074-…` |

위반 없음 → Complexity Tracking 비어 있음. 단 **045 FR-002a(거부 조작 없음)의 범위 좁힘**이 있다 — 헌법이 아니라 045 설계 결정이므로 개정 불요, 스펙 FR-004·FR-006에 범위를 명시했다. 설계 뒤 재점검: 같음.

## Project Structure

### Documentation (this feature)

```text
specs/074-wifi-download-consent/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── consent-gate.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── consent-gate.ts          # 신규 순수: withTimeout(), consentVariantOf(connection), gate 상태 전이(reducer)
│   └── use-consent-gate.ts      # 신규 훅: 연결·받을 양 읽기(통로 주입), AppState active 재판정, 「다시 확인하기」
├── ui/
│   ├── DownloadConsentDialog.tsx     # 무변경 — 표준 동의(045). 소스 어휘까지 잠근 계약 테스트가 있어 선택지를 더하지 않는다
│   ├── CellularConsentDialog.tsx     # 신규: 모바일 동의 (구현 중 정함 — 표준 동의에 variant를 더하는 대신 따로 둔다)
│   ├── DownloadConsentGate.tsx       # 신규: 훅 + 세 화면 조립 (App.tsx에서 떼어 jest에서 실제로 그린다; 통로는 props)
│   └── DownloadDeferredScreen.tsx    # 신규: 대기 화면 (문자열·핸들러만 받는다)
└── i18n/catalogs/ko/
    ├── consent-gate.ts               # 신규: consentGate 영역 (cellular·deferred 문구). 기존 download.ts는 무변경
    └── index.ts                      # 수정: consentGate 등록
App.tsx                               # 수정: download-consent 분기가 <DownloadConsentGate>를 그리고 readConnection·readConsentSizeLabel을 주입
__tests__/i18n/ko-golden.test.ts      # 수정: ADDED_AFTER_GOLDEN에 새 리터럴 추가 (골든 json은 다시 쓰지 않는다)
__tests__/
├── app/consent-gate.test.ts
├── app/use-consent-gate.test.tsx
├── ui/download-consent-dialog.test.tsx (확장), download-deferred-screen.test.tsx
├── ui/AppFrame.firstrun.test.tsx (확장)
└── firstrun/consent-gate-source.test.ts   # 소스 계약
```

**Structure Decision**: 기존 계층을 따른다 — 순수 판정은 `src/app/`, 화면은 문자열·핸들러만 받고 기기 통로(`readConnection`·`readEssentialRemainingBytes`)는 조립부(App.tsx)가 훅에 주입한다. `src/firstrun/progress.ts`·`src/onboarding/flag.ts`·`src/app/network-port.ts`·`src/app/redownload-plan.ts`는 무변경이다(FR-009·FR-010).

## Complexity Tracking

없음.
