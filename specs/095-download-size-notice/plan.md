# Implementation Plan: 첫 실행 다운로드 크기 공지 — App Store 4.2.3(ii)

**Branch**: `ccr-f53e093e-45ulrl` (스펙 095) | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/095-download-size-notice/spec.md`

## Summary

첫 실행 표준 동의(Wi-Fi·연결 모름)에 074가 이미 만드는 받을 양 문자열(`readSizeLabel`)을 보인다. 동의 게이트 훅이 연결과 양을 **동시에** 읽어(각 3초 한도) 둘 다 끝난 뒤 한 번에 갈래를 정하고, 표준 동의 화면은 양을 prop으로만 받아 카탈로그 함수 `download.consent.body(size)`로 문장을 만든다. 못 읽으면 지금 문장 그대로다. 045 FR-003(용량 비노출)을 대체하며 헌법은 고치지 않는다.

## Technical Context

**Language/Version**: TypeScript 5.x, React Native 0.86 (Expo SDK 57)

**Primary Dependencies**: 기존만 — `@testing-library/react-native` 14(테스트), RNR 대화상자(`ConfirmDialog`, 050). 새 의존성 없음.

**Storage**: N/A (동의 저장 통로는 바뀌지 않는다)

**Testing**: jest 두 프로젝트 — `logic`(`.ts`)·`ui`(`.tsx`). 훅 테스트는 `__tests__/app/use-consent-gate.test.tsx`(ui 프로젝트).

**Target Platform**: iOS 26+·Android (두 플랫폼 같은 화면)

**Project Type**: mobile-app

**Performance Goals**: 동의 안내가 뜨기까지 최악 3초(지금과 같음 — 표준 갈래는 지금 최악 3초, 모바일 갈래는 지금 최악 6초 → 3초로 줄어든다)

**Constraints**: 원칙 V — 양을 못 읽으면 지어내지 않는다. `src/ui/`는 `essential-assets`·`network-port`에 닿지 않는다(074 CG14).

**Scale/Scope**: 화면 1개·훅 1개·카탈로그 항목 1개와 그 테스트.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I 온디바이스 | 통과 | 추론 경로 무관 |
| II 화자 | 통과 | 일기 내용 무관 |
| III 캐릭터는 모델 위에 | 통과 | 받을 양은 모델 식별자·파라미터 수·양자화가 아니다. 화면은 역할 이름(사진을 읽는/글을 쓰는 모델)과 양만 말한다. 자산 키·식별자 노출 금지는 유지(FR-005) |
| IV 측정 장치 금지 | 통과 | 2.0.0이 「다운로드 상태 표시」를 금지 대상에서 뺐다. 속도·처리량·진행률 계산 없음 |
| V 관측과 추측 | 통과 | 못 읽으면 숫자 없음(FR-002). 실기기 확인은 quickstart에 소유자 몫으로 명시 |
| 개발 방식 | 통과 | 계약(contracts/consent-size.md) → 테스트 먼저 |

헌법 개정: 불필요(research R1).

## Project Structure

### Documentation (this feature)

```text
specs/095-download-size-notice/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/consent-size.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/i18n/catalogs/ko/download.ts      # consent.body → (size: string | null) => string
src/ui/DownloadConsentDialog.tsx      # sizeLabel prop, 머리 주석 095
src/ui/DownloadConsentGate.tsx        # 표준 동의에 sizeLabel 전달, 머리 주석
src/app/use-consent-gate.ts           # 연결·양 동시 읽기, 두 갈래 모두 sizeLabel

__tests__/i18n/download-consent-body.test.ts    # 새 파일 — 카탈로그 DS1(logic)
__tests__/ui/download-consent-dialog.test.tsx   # FR-003 단언 교체(DS-UI)
__tests__/app/use-consent-gate.test.tsx         # CG6 교체·동시 읽기(DS-H)
__tests__/ui/download-consent-gate.test.tsx     # 표준에서 양 읽음(DS-G)
__tests__/i18n/ko-golden.test.ts                # ADDED_AFTER_GOLDEN
```

**Structure Decision**: 074의 구조(순수 판정 `consent-gate.ts` · 훅 `use-consent-gate.ts` · 화면은 prop만)를 그대로 따른다. 새 소스 파일을 만들지 않는다(새 파일은 카탈로그 계약 테스트 하나뿐). `consent-gate.ts`(순수)·`App.tsx`(`readConsentSizeLabel` 배선)·`CellularConsentDialog.tsx`는 바뀌지 않는다.

## Complexity Tracking

없음.
