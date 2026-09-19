# Implementation Plan: 필수 자산 다운로드 동의 안내와 진행 슬라이드

**Branch**: `045-onboarding-download-consent` | **Date**: 2026-09-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/045-onboarding-download-consent/spec.md`

## Summary

권한 확인(043) 직후, 다운로드가 조용히 시작되지 않도록 동의 Dialog(신규,
[확인/시작] 하나만 있음)를 먼저 보이고, 확인 후에는 리뷰 보드 `1o`~`1q`에
대응하는 4장 스토리텔링 슬라이드 + 완료 화면을 보인다. 작명(044
`WelcomeScreen`)은 다운로드가 완전히 끝난 뒤에만 나타나도록 040의 "작명 ∥
다운로드 병렬" 게이트 순서를 되돌린다. 새 화면 둘(`DownloadConsentDialog`,
`DownloadProgressScreen`)을 `src/ui/`에 추가하고, `App.tsx`의
`resolveFirstRunStage`/`firstRunStage` 판정에 동의 여부를 반영하는 것이
핵심 기술 접근이다. 새 저장 값은 "동의했는가" 하나뿐이며, 041의 재개 가능한
다운로드 포트·029의 `essentialDownloadFraction` 계약은 그대로 재사용한다.

## Technical Context

**Language/Version**: TypeScript ~6.0.3, React Native 0.86.2, Expo SDK ~57.0.14

**Primary Dependencies**: React Native 코어(`Modal`·`Animated`·`ScrollView`
등), NativeWind 4.2.6(`className` 스타일), 043이 이관한 `src/ui/theme/tokens.ts`
(`COLORS.*`). 새 네이티브 의존성 추가 없음(spec Assumptions).

**Storage**: 파일 기반 JSON(기존 관례, `expo-file-system`). 새 파일 없음 —
기존 `onboarding.json`(021·035)에 `downloadConsented: boolean` 필드 하나만
추가한다(R1).

**Testing**: `npm run test:logic`(순수 판정, node 환경) + `npm run test:ui`
(`jest-expo`, 화면) + `.maestro/`(실기기, 최소 1회 dev 빌드 확인 — AGENTS.md
"건너뛴 실기기 테스트는 통과가 아니다").

**Target Platform**: Android 실기기(dev/prod), 온디바이스 전용(원칙 I).

**Project Type**: Mobile app (단일 Expo/React Native 프로젝트, `src/ui/`
화면 + `src/app/` 조립 계층 기존 구조 재사용).

**Performance Goals**: 해당 없음(UI 재배치 기능, 추론 경로 무변경).

**Constraints**:
- 새 판정 로직은 순수 함수로 두고 `App.tsx`의 게이트에서만 소비한다(007~044
  전 스펙의 관례).
- 진행 표시는 슬라이드 순서(1~4)만 다루고 바이트·퍼센트·전송 속도를 계산하지
  않는다(원칙 IV, FR-006).
- 동의 Dialog·슬라이드 문구는 사람이 쓴 고정 상수다(원칙 II 데코 아님, FR-005).
- `essential-assets.ts`의 `ESSENTIAL_ASSET_KEYS` 값 변경 금지(FR-012).

**Scale/Scope**: 새 화면 2개(`DownloadConsentDialog`, `DownloadProgressScreen`),
기존 화면 1개 삭제(`WaitingForDownloadScreen` → `DownloadProgressScreen`으로
완전히 대체, R4), `App.tsx` 게이트 로직 수정, 새 순수 판정 함수 1개
(`resolveSlideStage`) + 기존 `OnboardingFlag`에 필드 1개 추가.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 관련 여부 | 판정 |
|------|-----------|------|
| I. 온디바이스가 제품이다 | 무관 | PASS — 추론 경로·모델 실행 위치 변경 없음. 순수 UI/온보딩 순서 재배치. |
| II. 화자는 휴대폰이고 시야는 좁다 | 무관 | PASS — 이 스펙의 문구는 화자(휴대폰)가 아니라 시스템이 사용자에게 보내는 안내다(035 온보딩 문구와 같은 성격, 일기 프롬프트 아님). |
| III. 캐릭터는 모델 위에 선다 | 관련 | PASS — 동의 안내·슬라이드는 "사진을 읽는 모델"/"글을 쓰는 모델"이라는 역할만 말하고 모델 식별자·캐릭터 이름을 노출하지 않는다(FR-003, User Story 1 AC4). |
| IV. 측정 장치를 제품에 들이지 않는다 | **핵심 관련** | PASS (설계 시 반드시 지킬 것) — 슬라이드 진행 표시 4칸은 순서 표시일 뿐 바이트·퍼센트·속도를 계산·노출하지 않는다(FR-006, FR-005a). `essentialDownloadFraction()`(029)의 결과를 화면이 직접 숫자로 보여주지 않고 "완료됐는가"라는 불린 판정에만 쓴다. |
| V. 관측된 사실과 추측을 구분해 기록한다 | 관련 | PASS — 슬라이드 전환 간격(4초)·완료 버튼 문구("시작할게요")·onbProg 대체 문구("받는 중이에요")는 사람이 정한 고정 상수이며 clarify 세션에서 근거와 함께 확정했다(코드가 계산하지 않음). |

**결론**: 게이트 위반 없음. Complexity Tracking 불필요.

### Post-Design Re-check (Phase 1 완료 후)

data-model.md·contracts/download-consent-gate.md·quickstart.md 작성 후
재평가한다.

- **원칙 III**: C9 계약이 `DownloadConsentDialog`·`DownloadProgressScreen`을
  `checkSourceFile`의 `UI_TOUCHES_MODEL` 검사 대상으로 명시했다 — 설계
  단계에서 이미 방어를 계약으로 못 박았으므로 PASS 유지.
- **원칙 IV**: C6·C7 계약이 `resolveSlideStage`의 시그니처를
  `{ downloadReady, elapsedMs }`로 고정해 바이트 진행률이 함수 경계를
  넘지 못하게 했다(research.md R3). 위반 주입(진행률 인자 추가)이 계약
  테스트로 잡히도록 tasks에 반영 예정 — PASS 유지.
- **원칙 V**: data-model.md의 `OnboardingFlag.downloadConsented`가
  boolean 하나뿐이고, `flag.ts`의 기존 "필드는 boolean만" 규율을
  그대로 따른다(R1) — PASS 유지.
- **신규 위반 없음**: Phase 1 설계가 Constitution Check 결론을 바꾸지
  않았다.

### Post-Implementation Note — 040 G8(시간 어휘 전면 금지) 제거

구현 중 `resolveSlideStage()`가 `elapsedMs`를 받는 설계가 040이 세운
`checkFirstRunFile`의 "시간·진행 지표 어휘(`elapsed*` 등) 전면 금지"
검사(G8)와 충돌하는 것을 발견했다. 저장소 소유자 지시(2026-09-19)로 그
검사 자체를 제거했다 — 헌법 원칙 IV 본문("소요 시간의 사후 기록" 절)은
"진행 중 화면에 정밀한 시간·바이트·퍼센트를 노출하지 않는다"만 금지하며
경과 시간 개념 자체를 금지하지 않는다. 040 G8은 이 조항보다 좁게(어휘
기준) 구현돼 있었고, 045의 경과 시간(장식적 4초 슬라이드 타이머)은 그
원 조항이 막으려던 성능 지표 노출과 성격이 다르다. 상세:
`specs/040-onboarding-parallel-setup/contracts/first-run-gate.md` G8
절의 정정 기록, `contracts/download-consent-gate.md` C6 참고.

## Project Structure

### Documentation (this feature)

```text
specs/045-onboarding-download-consent/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/           # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
src/
├── firstrun/                      # 040이 만든 경계 — 순수 판정만
│   ├── progress.ts                 # resolveFirstRunStage() — 이 스펙이 확장
│   └── consent.ts                  # 신규 — SlideStage·resolveSlideStage() 순수 판정만
│                                    # (동의 상태 자체는 새 통로가 필요 없다 — 아래 참고)
├── onboarding/
│   ├── flag.ts                     # OnboardingFlag에 downloadConsented 필드 추가
│   ├── flag-port.ts                # 무변경 — onboarding.json 파일 I/O를 이미 전담
│   └── essential-assets.ts         # 무변경 — ESSENTIAL_ASSET_KEYS 그대로
└── ui/
    ├── DownloadConsentDialog.tsx    # 신규 — Modal 기반 동의 안내
    └── DownloadProgressScreen.tsx   # 신규 — 1o~1q 슬라이드 이관,
                                     # WaitingForDownloadScreen을 완전히 대체(R4, 삭제)

App.tsx                             # 첫 실행 게이트 순서 수정 — 동의 미완료 시
                                     # DownloadConsentDialog, 다운로드 중 DownloadProgressScreen을
                                     # WelcomeScreen보다 먼저 렌더

__tests__/
├── firstrun/
│   └── consent.test.ts             # 신규 — 순수 판정 계약 테스트
└── ui/
    ├── download-consent-dialog.test.tsx   # 신규
    └── download-progress-screen.test.tsx  # 신규

.maestro/
└── download-consent-flow.yml       # 신규 — 실기기 회귀
```

**Structure Decision**: 기존 `src/firstrun/`(040) 경계를 그대로 확장한다 —
새 순수 판정(슬라이드 단계)을 `consent.ts`에 둔다. **동의 상태는 새 저장
통로를 만들지 않는다** — `flag.ts`/`flag-port.ts`(021·035가 이미 세운
`onboarding.json` 담당 통로)에 boolean 필드 하나를 얹는 것으로 충분하다
(R1, `welcomeShown`이 035에서 추가된 방식과 동일). 화면은 `src/ui/`에
신설하되 `essential-assets.ts`·모델 자산에 직접 닿지 않는다(원칙 III,
007 이후 전 화면의 관례).

## Complexity Tracking

*(No violations — table intentionally omitted.)*
