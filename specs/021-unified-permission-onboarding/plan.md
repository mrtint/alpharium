# Implementation Plan: 앱 요구 권한 실측 및 통합 신청 절차

**Branch**: `021-unified-permission-onboarding` | **Date**: 2026-08-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/021-unified-permission-onboarding/spec.md`

## Summary

020이 `POST_NOTIFICATIONS`·배터리 최적화 예외를 새로 도입하면서 앱이 요구하는 런타임 권한이
여러 기능에 흩어졌고, 새 release APK 설치 시 모든 권한이 꺼진 채로 사진 없는 일기가 조용히
생성되는 문제가 실기기에서 관측됐다. 이 기능은 **앱 최초 진입부에 통합 온보딩 흐름**을 두어
필요한 권한(사진 → 사진 좌표 → 알림 → 배터리 최적화 예외, 고정 순서)을 한자리에서 순차
안내·요청하고, 거부·부분 허용을 정직하게 드러내며, 020의 "설정" 탭에 "권한" 섹션을 신설해
재요청 경로를 모은다.

기술 접근:

- **새 네이티브 모듈 0개.** `expo-media-library`(사진·좌표), `expo-location`(위치),
  `expo-notifications`(알림), `expo-intent-launcher`(배터리 예외) — 020까지 이미 들어온
  것만 재사용한다. 따라서 실기기 검증은 debug 1회로 충분하고 release 재확인 불필요
  (AGENTS.md 「테스트」 기준, 012에서 확립).
- **순수 판정과 기기 통로 분리.** `src/onboarding/` 신설 — `requirements.ts`(필수 권한
  목록 상수, 사람이 못 박음), `decision.ts`(온보딩을 띄울까 + 다음 단계 + 각 단계 완료
  여부, 전부 순수 함수), `flag.ts`(온보딩 완료 플래그 + 배터리 안내 1회 제시 플래그의
  영속화·시드). 기기에 닿는 조회·요청은 `*-port.ts`.
- **권한 통로 통합.** 기존 `PhotoPort`(사진·좌표), `NotificationPort`(알림),
  `BatteryExceptionPort`(배터리)를 재사용하고, **위치 권한 조회·요청 통로**(`LocationPermissionPort`)와
  **OS 설정 이동 통로**(`OsSettingsPort` — 앱 상세 화면 열기)를 추가한다. 온보딩 화면과
  설정 "권한" 섹션은 이 통로들의 조합만 받는다.
- **완료 플래그는 `preferences/` 아래 새 JSON 파일** `onboarding.json` —
  020의 `auto-diary.json`·`notified.json`과 같은 층위, 같은 원자적 쓰기 패턴
  (`notified-store.ts` 복제). 최초 초기화 시 옛 `auto-diary.json`의
  `batteryExceptionPrompted`를 1회 읽어 "배터리 안내 제시함" 값을 시드한다(FR-010a).
- **020 변경**: `AutoDiarySettings.batteryExceptionPrompted` 필드 제거,
  `settings-effects.ts`의 `applyToggleOn`에서 배터리 예외 요청 로직 제거. 자동 생성 토글은
  더 이상 배터리 인텐트를 띄우지 않는다 — 온보딩과 설정 "권한" 섹션이 유일한 주체.
- **App.tsx 진입 게이트**: `AppFrame`이 마운트 시 온보딩 플래그를 읽어, 없으면 탭 UI
  대신 `OnboardingScreen`을 그린다. "시작하기"로 플래그를 세우면 기존 탭 UI로 전환.
  탭이 둘뿐인 006의 상태 갈림과 같은 방식(research §5).

## Technical Context

**Language/Version**: TypeScript ~6.0.3, React 19.2.3, React Native 0.86.2, Expo ~57

**Primary Dependencies**:

- 기존만 재사용: `expo-media-library ~57`, `expo-location ~57`, `expo-notifications`,
  `expo-intent-launcher`, `expo-file-system ~57`
- **신규 의존 0개** — 이 기능의 핵심 제약(spec Assumptions). `expo-location`은 017이 이미
  들였고 App.tsx에서 지오코딩 토글 시 `requestForegroundPermissionsAsync()`를 부르고
  있다(재사용).

**Storage**: `expo-file-system`(`Paths.document`) 하나. 새 저장 계층 없음.

- 온보딩 플래그: `files/preferences/onboarding.json` — `{ completed: boolean;
  batteryNoticeShown: boolean }`. `auto-diary.json`과 별개 파일.
- 020의 `auto-diary.json`에서 `batteryExceptionPrompted` 필드 제거(1회 시드 후 020 로더가
  알 수 없는 필드로 버림).

**Testing**:

- `npm run test:logic` — 순수 로직: `decision.ts`(온보딩 게이트·다음 단계·단계 완료
  판정, 5개 권한 상태 × 필수 권한 목록의 조합), `flag.ts`(시드·부분 손상 관대성),
  `requirements.ts` 계약 테스트(소스 선언을 `readFileSync`로 읽어 목록·플랫폼 메타데이터
  검사 — 007·009·012·020 관례).
- `npm run test:ui` — `OnboardingScreen`(단계 전이, 허용/건너뛰기, 완료), 설정 "권한"
  섹션(상태 표시, OS 설정 링크, 온보딩 재실행), 거부 시 각 기능 화면의 정직한 안내
  (`AutoDiarySettingsScreen`의 알림 없음 문구 등).
- `npm run test:device` — `.maestro/unified-permission-onboarding.yml`(신규,
  `run-device-tests.mjs`의 `FLOWS`에 등록). **debug 1회 필수**(원칙 V). 새 네이티브
  모듈이 없으므로 release 재확인은 하지 않는다.
- `npm run lint` — eslint + tsc + 헌법 검사 + prettier. 헌법 검사에 `checkOnboardingFile`
  규칙 추가(아래 Constitution Check).

**Target Platform**: Android (실기기, development build). iOS는 이 저장소의 검증 대상이
아니다 — 위치 권한이 iOS 위주로 동작한다는 기존 전제(App.tsx 주석)는 FR-001 실측으로
안드로이드에서의 실제 요구를 확정한다.

**Project Type**: 단일 프로젝트 모바일 앱. `src/` 아래 계층 구조.

**Performance Goals**:

- SC-001: 새 설치 시 온보딩 100% 선행 표시.
- SC-006: OS 설정에서 권한 변경 후 앱 복귀 시 상태가 즉시(포그라운드 복귀 시점) 갱신 —
  `AppState` `change` 리스너에서 재조회.
- SC-007: 순수 판정 함수가 5개 상태(`granted`/`limited`/`denied`/`blocked`/`undetermined`)
  × 필수 권한 목록의 모든 조합을 기기 없이 검증(테스트가 조합을 직접 센다).

**Constraints**:

- 새 네이티브 모듈 금지(위 Assumptions).
- `process.env`는 `src/config/environment.ts`에서만(FR-021).
- `src/ui/`는 `models/roster`·`ModelAsset`에 닿지 않는다(FR-022, 007 헌법 검사).
- 백그라운드 실행 중 권한 취소 감지는 범위 밖(FR-023 — #3 과제).
- 온보딩·설정 문안에 모델 식별자·파라미터·양자화 0건, 관측 불가한 것을 단언하는 문장
  없음(SC-008, 원칙 II·III).

**Scale/Scope**: 화면 2개 신규(`OnboardingScreen`, 설정 "권한" 섹션), 순수 모듈 3개
(`requirements`·`decision`·`flag`), 통로 2개 신규(`LocationPermissionPort`,
`OsSettingsPort`), 020 파일 2개 수정(`settings.ts`·`settings-effects.ts`), App.tsx 진입
게이트. **필수 권한 목록 상수는 5개**(`PermissionKey` 고정, data-model.md §1) —
안드로이드 온보딩에 실제 노출되는 단계는 **4~5개**(위치 항목이 `platforms: ["ios"]`로
확정되면 4개, research.md §2 실측).

## Constitution Check

*GATE: Phase 0 전에 통과해야 한다. Phase 1 설계 후 재확인.*

이 저장소의 헌법은 5개 원칙 + 로스터 + 개발 방식으로 구성된다. 이 기능에 걸리는 게이트:

### 원칙 I — 온디바이스가 제품이다

- **해당 없음(간접).** 이 기능은 추론을 건드리지 않는다. 다만 **거부해도 앱이 죽지
  않는다**(FR-013)가 원칙 I의 "미리 만든 응답 경로를 만들지 않는다"와 같은 정신 —
  권한이 없으면 신호가 `unknown`이 될 뿐, 플레이스홀더 일기를 만들지 않는다. **통과.**

### 원칙 II — 화자는 휴대폰이고, 시야는 좁다

- **게이트 활성.** 온보딩의 권한 설명 문안이 "왜 필요한지"를 말하되, 휴대폰이 관측하지
  못하는 것을 단언하면 위반(FR-007, SC-008). 예: "사진을 보면 당신이 무엇을 했는지
  압니다" ✗ / "사진 몇 장을 살펴 그날을 짐작해 씁니다" ✓.
- 거부된 기능의 영향 표시도 같은 규율 — "알림 권한이 없어 완성을 바로 알릴 수 없다"
  (020 N8)는 사실 서술이지 단언이 아니다. **설계에서 문안 리뷰 필수(quickstart 검증
  항목).**

### 원칙 III — 모델은 캐릭터다

- **게이트 활성.** 온보딩·설정 "권한" 섹션은 `src/ui/` 아래이며 `models/roster`·
  `ModelAsset`에 닿으면 안 된다(FR-022). 헌법 검사 `checkSourceFile`의 `UI_TOUCHES_ASSET`
  규칙이 이미 이걸 막는다 — 새 화면도 자동으로 대상.
- 권한 설명에 모델 식별자·파라미터가 없어야 한다(SC-008) — 소스 검사로 확인.

### 원칙 IV — 측정 장치를 제품에 들이지 않는다

- **게이트 활성.** 온보딩 완료 플래그·배터리 안내 플래그에 **타임스탬프·실행 이력·시도
  횟수를 두지 않는다**(020의 `AutoDiarySettings`가 "필드는 셋뿐" 규칙을 둔 것과 같은
  이유). `flag.ts`는 boolean 2개만.
- 권한 요청 결과를 측정하지 않는다 — `BatteryExceptionPort.requestException()`이 반환값
  없음(원칙 IV)인 것을 그대로 계승. 온보딩의 각 단계도 "허용됨/아님"을 실시간 권한
  상태에서 다시 읽지, "사용자가 무엇을 눌렀나"를 저장하지 않는다.
- **새 헌법 검사 규칙**: `checkOnboardingFile`(`src/onboarding/` 대상) —
  `diary/prompt`·`diary/acceptance`·`models/roster` 직접 import 금지(스케줄 규칙과 동형),
  그리고 `flag.ts`에 `Date`·`timestamp`·`count`·`history` 토큰이 들어오면 위반.

### 원칙 V — 관측된 사실과 추측을 구분해 기록한다

- **게이트 활성.** **어느 권한이 필수인가를 코드가 판정하지 않는다**(FR-002·FR-004) —
  `requirements.ts`의 목록은 사람이 못 박은 상수이고, "안드로이드가 통로를 안 주는 축은
  넣지 않는다"도 사람의 결정이다. 값(권한 상태)을 보고 "이건 빼자"로 정하는 코드가 있으면
  위반. 이는 원칙 V의 "축마다 관측 가능 여부를 사람이 정해 상수로 못 박는다"와 정확히
  같은 구조 — 012의 `USER_VISIBLE_SIGNAL_AXES`가 선례.
- 부분 허용(`limited`)을 `granted`로 뭉개지 않는다(FR-015·FR-016) — `PermissionState`의
  5갈래 구분을 계승. `limited`가 안드로이드에서 실제로 오는지는 004 시점에 미확인이었고
  (research §2 유산), FR-001 실측이 확정한다.
- 실기기 검증 최소 1회(SC-009) — 새 네이티브 모듈 없으므로 debug 1회.

### 개발 방식

- 계약 먼저, 테스트 먼저(contracts/ + `test:logic` 계약 테스트).
- 커밋 메시지 한국어.
- **한 축을 깊게 파지 않는다** — 이 기능은 "권한 온보딩"이라는 한 축이므로, 배터리
  최적화의 제조사별 설정 화면 차이나 Android 버전별 권한 모델 변천사로 파고들지 않는다.
  FR-001 실측은 "이 기기(들)에서 지금 무엇이 필요한가"만 본다.

**게이트 판정: 통과.** 위반 없음. 새 헌법 검사 규칙 1개 추가(방어 강화).

## Project Structure

### Documentation (this feature)

```text
specs/021-unified-permission-onboarding/
├── plan.md              # 이 파일
├── research.md          # Phase 0 출력
├── data-model.md        # Phase 1 출력
├── quickstart.md        # Phase 1 출력
├── contracts/           # Phase 1 출력
│   ├── permission-requirements.md
│   ├── onboarding-decision.md
│   ├── onboarding-flag.md
│   ├── permission-ports.md
│   └── onboarding-screen.md
└── tasks.md             # /speckit-tasks 출력 (이 명령이 만들지 않음)
```

### Source Code (repository root)

```text
src/
├── onboarding/                      # ★ 신설 — 순수 판정 + 기기 통로
│   ├── requirements.ts              # 필수 권한 목록 상수 (사람이 못 박음, FR-001·002·003)
│   ├── decision.ts                  # 순수: 온보딩 띄울까 + 다음 단계 + 단계 완료 판정
│   ├── flag.ts                      # 온보딩 완료·배터리 안내 플래그 영속화 + 시드 (FR-010a·011·012)
│   ├── flag-port.ts                 # 기기 통로: onboarding.json 읽기/쓰기 (notified-store 복제)
│   ├── location-permission-port.ts  # 기기 통로: expo-location 권한 조회/요청
│   └── os-settings-port.ts          # 기기 통로: OS 앱 설정 화면 열기 (Linking.openSettings)
├── ui/
│   ├── OnboardingScreen.tsx         # ★ 신설 — 통합 온보딩 흐름 화면 (FR-005~008, 013~016)
│   ├── PermissionsSection.tsx       # ★ 신설 — 020 "설정" 탭의 "권한" 섹션 (FR-017~020)
│   ├── AutoDiarySettingsScreen.tsx  # 수정 — 알림 없음 안내 일반화 유지, "권한" 섹션 마운트
│   └── PermissionPanel.tsx          # 유지 — 진단 경로 전용 (dev), 손대지 않음
├── schedule/
│   ├── settings.ts                  # 수정 — batteryExceptionPrompted 필드 제거
│   └── settings-effects.ts          # 수정 — applyToggleOn에서 배터리 예외 요청 제거
└── signals/
    └── port.ts                     # PermissionState 재사용 (변경 없음, 필요 시 재export)

App.tsx                              # 수정 — 진입 게이트: 플래그 없으면 OnboardingScreen

scripts/
└── constitution-rules.ts           # 수정 — checkOnboardingFile 규칙 추가
scripts/check-constitution.mts      # 수정 — checkOnboardingFile 호출 등록

__tests__/
├── onboarding-decision.test.ts     # 순수 판정 (조합 커버리지, SC-007)
├── onboarding-flag.test.ts         # 시드·부분 손상
├── onboarding-requirements.test.ts # 계약: 소스 선언 직접 읽기 (목록·플랫폼 메타)
├── onboarding-screen.test.tsx      # 화면 전이
├── permissions-section.test.tsx    # 설정 "권한" 섹션
└── constitution-onboarding.test.ts # checkOnboardingFile 위반 주입

.maestro/
└── unified-permission-onboarding.yml  # 신규 (FLOWS에 등록)
```

**Structure Decision**: 020이 `src/schedule/`를 순수 판정 + `*-port.ts`로 나눈 구조를
그대로 따라 `src/onboarding/`을 신설한다. 화면은 `src/ui/`(007~020 관례), 020 파일 수정은
최소 표면(필드 1개 제거 + 함수 1개에서 로직 제거). App.tsx는 006이 세운 "탭 UI vs. 단일
화면" 상태 갈림 자리에 온보딩 게이트를 하나 더 얹는다.

## Complexity Tracking

> Constitution Check에 위반이 없으므로 비워 둔다.
