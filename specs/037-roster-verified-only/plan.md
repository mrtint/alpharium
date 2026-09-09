# Implementation Plan: 로스터를 검증된 하나로 축소

**Branch**: `037-narrative-model-measurement` | **Date**: 2026-09-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/037-roster-verified-only/spec.md`

> ⚠️ 스펙 디렉터리 이름(`037-roster-verified-only`)과 체크아웃된 브랜치
> (`037-narrative-model-measurement`)가 다르다. `setup-plan.ps1`의 `BRANCH`
> 필드는 디렉터리 이름이지 브랜치가 아니다(AGENTS.md 「작업 습관」).

## Summary

로스터 다섯 중 넷이 자동 생성에 부적합으로 실측 확정됐다. 헌법 「로스터」
절을 검증된 하나(kanana/금동이)로 줄이고, 원칙 III에 **로스터 진입 기준**을
더한다 — 옆 저장소 벤치가 아니라 이 저장소의 프롬프트로 저장 가능한 일기를
실기기에서 안정적으로 내야 들어온다.

**기술적 접근의 핵심은 `Character` 유니온 타입을 좁히고 `tsc`가 나머지를
짚게 하는 것이다.** 007·009가 "jest는 타입을 지우므로 `tsc`만 잡는 위반이
있다"를 반복 확인했고, 014에서 `tsc`가 `DiaryListItem` 이중 정의를 정확히
짚었다. 이 기능은 그 성질을 **설계의 동력으로** 쓴다: 타입을 좁힌 뒤
`tsc`가 내는 오류 목록이 곧 변경 대상 목록이다.

## Technical Context

**Language/Version**: TypeScript 5.x, React Native 0.86 / Expo SDK 57

**Primary Dependencies**: 변경 없음. 새 의존성 0개. `llama.rn`·
`expo-file-system` 등 기존 것만.

**Storage**: 파일. `files/models/`(모델 자산), `files/diary/<날짜>.json`
(저장된 일기), `preferences/`(선택·설정). **스키마 변경 없음** — 이 기능은
읽는 쪽의 방어만 더한다.

**Testing**: jest 두 프로젝트(`.ts` = `test:logic` / `.tsx` = `test:ui`),
`tsc`, `scripts/check-constitution.mts`, prettier. 실기기는 Maestro.

**Target Platform**: Android 실기기(SM-S901N / Galaxy S22, Android 16),
dev(debug) 빌드. **release 빌드는 만들지 않는다**(2026-09-09 저장소 소유자
지시).

**Project Type**: 모바일 단일 앱(Expo Router). 백엔드 없음.

**Performance Goals**: 회귀 없음이 목표다 — 사진 없는 날 생성이 036 관측
범위(19~22초)에서 크게 벗어나지 않는다(SC-007). 새로 개선할 것은 없다.

**Constraints**: 온디바이스만. 헌법 원칙 IV — 측정·채점 코드를 제품에 넣지
않는다. 판정 갈래는 넷 그대로.

**Scale/Scope**: 캐릭터 5 → 1. `Character`를 참조하는 소스 10개, 테스트
20개, Maestro 흐름 6개가 영향권.

## Constitution Check

*GATE: Phase 0 이전에 통과해야 하고 Phase 1 이후 재확인한다.*

**Phase 1 재확인 (2026-09-09)**: 설계 산출물(data-model·contracts·quickstart)이
새 위반을 만들지 않았다. 새 경계·새 헌법 검사 규칙·새 저장 필드 0개이고,
유일하게 더하는 코드는 옛 일기를 읽을 때의 방어(FR-008)다. 원칙 IV 재확인 —
C2가 "관측 근거는 사람이 판단한다"를 명시해 채점 코드를 만들지 않는다.

| 원칙 | 이 기능이 닿는가 | 판정 |
|---|---|---|
| **I. 온디바이스가 제품이다** | 추론 경로 무변경 | ✅ 위반 없음 |
| **II. 화자는 휴대폰이고 시야는 좁다** | 프롬프트 조립 규칙 무변경(FR-015) | ✅ 위반 없음 |
| **III. 모델은 캐릭터다** | **정면으로 닿는다** — 로스터 조항 개정 | ⚠️ **헌법을 먼저 고친다**(아래) |
| **IV. 측정 장치를 제품에 들이지 않는다** | 판정 갈래 넷 유지, 새 채점 코드 0 | ✅ 위반 없음 |
| **V. 관측된 사실과 추측을 구분** | 삭제 근거가 전부 실측(024·028·037·리포트) | ✅ 충족 |

### 원칙 III — 헌법을 먼저 고친다

현행 헌법은 로스터에 다섯을 못 박고 있다. 코드에서 넷을 빼면 **헌법과
코드가 어긋나며, 그것이 Governance가 금지한 "예외를 코드에 몰래 두는
것"이다.** 그래서 개정이 첫 작업이고 별도 커밋이다(029 v1.3.0 · 035
v1.4.0 · 036 v1.5.0이 세운 패턴).

개정 내용은 FR-001~003. 버전은 **1.6.0**(MINOR — 조항 추가·삭제이며
원칙 자체는 유지).

**Gate 통과**: 헌법 개정이 선행 작업으로 계획에 포함됐으므로 위반이 아니다.
정당화가 필요한 위반이 없으므로 Complexity Tracking은 비운다.

## Project Structure

### Documentation (this feature)

```text
specs/037-roster-verified-only/
├── spec.md              # 완료
├── plan.md              # 이 파일
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── roster-entry.md  # Phase 1 — 로스터 진입 기준의 계약
├── checklists/
│   └── requirements.md  # 완료
└── tasks.md             # /speckit-tasks 산출물
```

### Source Code (repository root)

**`tsc`가 짚어 줄 자리**(타입을 좁히면 오류가 나는 곳):

```text
src/
├── diary/
│   ├── types.ts         # ★ 시작점 — Character 유니온과 CHARACTERS 배열
│   ├── persona.ts       # PERSONAS 레코드 (Record<Character, Persona>)
│   ├── prompt.ts        # LANGUAGE 레코드, 캐릭터별 톤 줄
│   └── acceptance.ts    # isWrongLanguage의 switch (Character 전수)
├── models/
│   └── roster.ts        # ASSETS·DISPLAY_NAMES (Record<Character, …>)
└── ui/
    ├── DiagnosticsScreen.tsx  # PROBE_CHARACTER = "imaginative" ← 타입 오류
    ├── CharacterPicker.tsx    # 주석의 캐릭터 비교
    └── AuthorPicker(설정 탭)   # 한 줄 + [이름 바꾸기]로 축소
```

**주석만 고치면 되는 자리**(타입 오류는 안 나나 사실이 틀어진다):

```text
src/
├── schedule/lock.ts        # STALE_LOCK_MS의 근거가 "narrative가 가장 느리다"
├── vision/select.ts        # VISION_PHOTO_LIMIT 상향 조건이 narrative 완주
└── onboarding/essential-assets.ts  # 기본 캐릭터 선정 근거
```

**테스트·흐름**:

```text
__tests__/        # 20개 파일이 캐릭터 이름을 문자열로 쓴다
.maestro/         # 6개 흐름 — diary-character-select.yml이 핵심
```

**Structure Decision**: 기존 구조를 그대로 쓴다. 새 디렉터리·새 경계·새
헌법 검사 규칙을 만들지 않는다. 이 기능은 **빼는 작업**이며, 유일하게
더하는 것은 옛 일기를 읽을 때의 방어(FR-008)다.

## 핵심 설계 결정

### D1. `Character` 타입을 좁혀 `tsc`를 변경 목록 생성기로 쓴다

`src/diary/types.ts`의 `Character = "quiet"`로 좁히면:

- `Record<Character, …>` 리터럴(`PERSONAS`·`ASSETS`·`DISPLAY_NAMES`·
  `LANGUAGE`)의 남는 키가 **잉여 속성 오류**가 된다
- `isWrongLanguage`의 `switch`에서 도달 불가 `case`가 드러난다
- `DiagnosticsScreen.tsx:61`의 `PROBE_CHARACTER: Character = "imaginative"`가
  **할당 불가 오류**가 된다

즉 손으로 찾아다니지 않는다. **`npm run lint`의 `tsc`가 낸 오류를 0으로
만드는 것이 곧 FR-005·006의 완료 조건이다.**

### D2. 옛 일기 읽기 — 저장된 값을 신뢰하되 조회는 방어한다

`DiaryEntry.character`는 파일에서 오는 값이므로 **좁아진 타입을 만족한다는
보장이 없다**(런타임에는 여전히 `"imaginative"`가 들어 있다). 지금
`DiaryDetailScreen`은 이렇게 되짚는다:

```
entry.authorName ?? currentAuthorName ?? personaOf(entry.character).name
```

`personaOf`가 로스터 밖 캐릭터를 받으면 `undefined`를 돌려주고 `.name`에서
멈춘다. `authorName`은 옵셔널이라(035 이전 일기에 없다) 이 갈래가 실재한다.

**방어를 `personaOf`에 두지 않는다** — 거기서 기본값을 돌려주면 "로스터에
없는 캐릭터에도 페르소나가 있다"가 되어 원칙 III가 흐려진다. 대신:

- **읽는 쪽이 이름을 못 찾을 수 있음을 안다** — 조회 결과가 없으면 화면이
  멈추지 않고 읽을 수 있는 무언가를 보인다(FR-008)
- 저장된 `authorName`이 있으면 그것이 이긴다(이미 그렇다)

정확한 형태(옵셔널 조회 함수를 새로 두느냐, 호출부에서 막느냐)는 Phase 1
`data-model.md`가 정한다.

### D3. 되돌릴 길을 성질로 남긴다 (FR-014)

지우고 싶은 유혹이 큰 자리들이다 — 캐릭터가 하나면 전부 자명해 보인다.

| 남기는 것 | 지우면 생기는 일 |
|---|---|
| 고른 적 없으면 자동으로 안 고르는 규칙(007) | 006의 "말없이 첫 번째를 집는다"가 부활 |
| 캐릭터마다 프롬프트 접두사가 다르다는 계약(018 P11) | 둘째가 들어올 때 KV 캐시 오염 방어가 없음 |
| 캐릭터를 인자로 받아 자산을 찾는 구조 | 둘째를 넣을 때 매핑을 새로 만들어야 함 |
| 캐릭터 언어로 프롬프트 갈래를 정하는 규칙 | 한국어 캐릭터가 늘 때 E2SN 경로가 자동으로 안 붙음 |

계약 테스트가 이것들을 **캐릭터 수와 무관하게** 잠그도록 유지한다.

### D4. `STALE_LOCK_MS`는 값을 바꾸지 않고 근거만 갱신한다

현행 6분의 근거는 "가장 느린 캐릭터(narrative) 완주 170초 × 2 + 여유"다.
그 캐릭터가 로스터에서 나가면 **근거 문장이 사실과 어긋난다.**

- **값은 그대로 둔다** — 6분은 quiet에 대해 넉넉하며, 줄이면 재측정이
  필요하고 그것은 이 기능의 범위 밖이다(원칙 V — 안 잰 값을 쓰지 않는다)
- **근거 주석을 갱신한다** — "narrative 기준으로 정했고, 그 캐릭터는
  1.6.0에서 로스터를 나갔다. 값은 유지한다"를 남긴다

같은 처리를 `vision/select.ts`의 상한 상향 조건에도 적용한다.

### D5. 모델 파일을 지우지 않는다 (FR-011)

로스터에서 빠지면 다운로드 관리 목록에서도 사라지므로 이미 받은 a2~a5
(최대 4.7GB)를 앱으로 지울 수 없게 된다.

- **자동 삭제 경로를 만들지 않는다** — 사용자의 저장 공간에 손대는 일이고,
  "로스터에 없으니 지운다"는 판단을 코드가 하게 된다
- 008이 남긴 "받다 만 모델은 앱으로 못 지운다"와 같은 계열의 **알려진
  빈자리**로 문서에 남긴다

## Complexity Tracking

> Constitution Check에 정당화가 필요한 위반이 없다. 비운다.
