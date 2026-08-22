# Implementation Plan: 사진을 보기 전에 줄인다

**Branch**: `013-photo-resize-caption` | **Date**: 2026-08-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/013-photo-resize-caption/spec.md`

## Summary

011의 사진 캡션이 5장에 약 129초 걸린다. 실측(AGENTS.md 「VLM 캡션 60초의 원인」)이
원인을 특정했다 — 사진 한 장이 IMAGE 청크 7~9개를 만들고, 그 개수를 정하는 것은
해상도다. `src/vision/vision-port.ts`가 사진 보는 모델에 경로를 넘기기 전에
`src/vision/resize.ts`(신규)가 그 경로를 앱 전용 디렉터리 안의 리사이즈 사본 경로로
바꾼다. `expo-image-manipulator`(신규 의존, SDK 57 공식 릴리스)로 줄이고,
`expo-file-system`(기존 의존)의 `File.move()`로 그 결과를 캐시가 아닌 앱 문서
디렉터리로 옮긴다 — clarify에서 "OS가 건드리지 않는 자리"로 정했기 때문이다.

## Technical Context

**Language/Version**: TypeScript ~6.0.3, React Native 0.86.2, Expo SDK 57

**Primary Dependencies**: `expo-image-manipulator` (신규, `~57.x`), `expo-file-system`
`~57.0.4`(기존, 이동에 사용)

**Storage**: 파일 시스템. 원본은 미디어 라이브러리(읽기 전용), 리사이즈 사본은
앱 전용 문서 디렉터리(`Paths.document` 하위, 신설 서브폴더)

**Testing**: `npm run test:logic`(순수 함수, node 환경) + `npm run test:device`
(Maestro, 실기기) — 이 저장소의 기존 두 갈래를 그대로 쓴다

**Target Platform**: Android 실기기(개발 대상 유일 플랫폼, 헌법 원칙 I)

**Project Type**: Mobile app (기존 구조에 `src/vision/resize.ts` 한 파일 추가)

**Performance Goals**: SC-001 — 사진 5장의 캡션 시간을 기존(129초)의 절반 이하로

**Constraints**:
- 원본 사진은 읽기만 한다(FR-006) — 쓰기·삭제·이동 금지
- 리사이즈 사본은 앱 전용 디렉터리에만(FR-007), 캡션이 끝나면 치운다(FR-008)
- 화면에 리사이즈 관련 수치를 노출하지 않는다(FR-013~015, 헌법 원칙 III·IV)
- 판정 갈래를 늘리지 않는다(FR-019, 헌법 원칙 IV)

**Scale/Scope**: 하루 최대 5장(011의 `selectForVision()` 상한, 변경 없음)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 관련 조항 | 이 기능의 적용 | 통과 |
| --- | --- | --- | --- |
| I. 온디바이스가 제품이다 | 추론은 기기에서 돈다 | 리사이즈도 기기 안에서 한다(FR-001). 서버 전송 없음 | ✅ |
| I. 미리 만들어 둔 응답 금지 | MUST NOT | 리사이즈는 입력 전처리이지 캐싱된 출력이 아니다. 캡션은 여전히 매번 실행된다 | ✅ |
| II. 화자는 휴대폰 | 프롬프트는 `diary/prompt.ts` 하나 | 이 기능은 `src/vision/`에만 있고 `diary/prompt.ts`를 열지 않는다(FR-016 유지) | ✅ |
| III. 모델 설정 비노출 | 사용자 화면에 파라미터 노출 금지 | 목표 해상도·리사이즈 여부를 화면에 두지 않는다(FR-013) | ✅ |
| III. `src/ui/`가 모델 자산에 안 닿음 | 헌법 검사 규칙 | 리사이즈는 `src/vision/`·`src/inference/`에만 있고 `src/ui/`를 건드리지 않는다 | ✅ |
| IV. 측정 장치를 이 저장소에 두지 않는다 | 캡션 품질 비교 금지 | 품질 하한 탐색은 Out of Scope(spec)로 명시적으로 뺐다 | ✅ |
| IV. 지표를 담을 자리를 두지 않는다 | RunResult류 타입 제약 | 리사이즈 결과 타입에 시간·크기 필드를 두지 않는다(FR-015) — data-model.md에서 확정 | ⏳ Phase 1에서 확정 |
| IV. 판정 갈래를 늘리지 않는다 | acceptance.md 넷 고정 | 리사이즈 실패는 캡션 판정에 안 들어간다. 「못 읽음」으로만 다룬다(FR-011·012) | ✅ |
| V. 실측/짐작 구분 | 코드에 근거를 남긴다 | 목표 해상도 1024px은 Assumptions에 실측 근거와 함께(FR-020). 기기 안 리사이즈 비용은 quickstart에서 실측(FR-021) | ✅ |
| V. 코드가 축소 판정을 하지 않음 | (직접 해당 조항 없음, 유사 원칙) | 목표 크기는 사람이 정한 상수 하나(FR-002) — 코드가 상황별로 계산하지 않는다 | ✅ |

**Gate 결과: 통과.** 위반 없음 — Complexity Tracking 불필요.

### Post-Design Re-check (Phase 1 이후)

data-model.md·contracts/resize.md 작성 후 다시 확인했다:

- **IV. 지표를 담을 자리를 두지 않는다** — `ResizeResult`가 `{ ok: true; path } |
  { ok: false }`로 확정됐다(data-model.md). 시간·크기 필드가 없다. **⏳ → ✅**
- **IV. 판정 갈래를 늘리지 않는다** — contracts/resize.md가 리사이즈 실패를
  011의 기존 "경로를 못 얻음" 분기에 합류시키는 것으로 확정했다(C2, 호출자 쪽
  계약). 005의 acceptance 넷 갈래는 그대로다. ✅ 유지
- **새로 발견된 확인 사항**: `ResizeResult`의 `ok: true` 분기에서 `path`가 원본과
  같을 수 있다(C1 — 이미 작은 사진). 이것이 「리사이즈된 것처럼 보이지만 실은
  원본」이라는 혼동을 만들 여지가 있는지 검토했다 — **문제 없음**: 호출자는
  `path`가 어디서 왔는지 구분할 필요가 없다(그저 캡션에 넘길 경로일 뿐이며,
  FR-006이 원본을 읽기만 하는 것은 이 경로에서도 지켜진다 — 쓰기는 여전히
  일어나지 않는다).

**Gate 결과(재확인): 통과.**

## Project Structure

### Documentation (this feature)

```text
specs/013-photo-resize-caption/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── contracts/
│   └── resize.md         # Phase 1 output — 리사이즈 계약
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── vision/
│   ├── resize.ts          # 신규 — 목표 크기 상수 + resizePhoto() 계약
│   ├── vision-port.ts      # 수정 — caption() 전에 resize 경로를 거친다
│   ├── caption.ts          # 수정 — resizePhoto 실패를 「못 읽음」으로 흡수(E4 유지)
│   └── types.ts            # 변경 없음 — VisionRunResult는 이미 { text } 하나뿐
├── inference/
│   └── on-device.ts         # 수정 — resizePhoto의 실제 구현(expo-image-manipulator +
│                             #        expo-file-system)을 주입하는 자리
└── signals/
    └── expo-port.ts          # 변경 없음 — filePathOf()는 그대로, resize는 그 뒤 단계

__tests__/
└── vision/
    └── resize.test.ts        # 신규 — 순수 판정 로직(목표 크기 이하는 그대로,
                               #        치우기 신호, 실패가 값으로 옴)

.maestro/
└── (신규 흐름 없음 — 011의 캡션 흐름이 이 기능도 지나가므로 quickstart가
    거기에 시간 측정을 얹는다. 새 화면이 없으므로 새 Maestro 파일이 불필요하다)
```

**Structure Decision**: 011이 이미 세운 `src/vision/` 경계를 그대로 쓴다. **새 폴더를
만들지 않는다** — `resize.ts` 하나가 011의 `select.ts`·`caption.ts`와 같은 층위에
들어간다. `on-device.ts`가 기기에 닿는 유일한 자리라는 규칙(005·011이 세움)을 따라,
`expo-image-manipulator`·`expo-file-system`을 직접 부르는 코드는 `on-device.ts`
안에만 두고 `resize.ts`는 그 구현을 주입받는 순수 계약으로 둔다 — 011의
`VisionLoader` 주입 패턴과 동일하다.

## Complexity Tracking

*(No violations — table omitted)*
