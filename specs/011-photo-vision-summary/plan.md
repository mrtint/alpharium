# Implementation Plan: 사진의 내용을 보고 일기의 재료로 준다

**Branch**: `011-photo-vision-summary` | **Date**: 2026-08-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/011-photo-vision-summary/spec.md`

## Summary

**휴대폰이 눈을 뜬다.** 004가 사진의 장수와 좌표만 세던 것을, 사진을 보는 모델이 **한 장씩
읽어 짧은 문장**으로 옮기고 그것이 005의 프롬프트를 거쳐 일기의 재료가 된다.

핵심 설계는 **두 단계를 시간축에서 분리하는 것**이다. `llama.rn`의 엔진 계약 E1이 「한 번에
하나만 열린다」를 요구하므로(GB 단위 모델 둘이면 기기가 죽는다), 사진 보는 모델과 캐릭터
모델이 동시에 열릴 수 없다. 그래서 순서가 이렇게 고정된다:

```
사진 5장 → [VLM 열기 → 장별 캡션 → VLM 닫기] → 텍스트 → [캐릭터 모델 열기 → 일기]
```

**파이프라인에 단계 하나가 늘고**(`vision`), 그 단계가 실패해도 「보지 않음」으로 낮추지
않는다(005 FR-022의 판단을 잇는다). 003의 캐릭터 로스터는 **열지 않는다** — 사진 보는
모델은 캐릭터와 무관한 하나이므로 캐릭터→모델 매핑이 바뀌지 않는다.

## Technical Context

**Language/Version**: TypeScript ~6.0.3 (기존 그대로)

**Primary Dependencies**: Expo SDK ~57.0.13, React Native 0.86.2, `llama.rn` ^0.12.8
(설치본 0.12.9 — `initMultimodal`·`releaseMultimodal`·`getMultimodalSupport`·
`media_paths`가 **설치본 타입에 실재함을 확인했다**, research.md §1),
`expo-media-library` ~57.0.4, `expo-file-system` (기존). **새 의존 0개.**

**Storage**: `expo-file-system`. 사진 보는 모델 파일 2개(본체+mmproj)가 003의 모델 저장
자리에 나란히 들어간다. 사진 설정은 `files/preferences/`에 007의 캐릭터 선택과 같은 방식.

**Testing**: Jest + `@testing-library/react-native` (기기 불필요, 항상 돈다) / Maestro
(실기기). 기기 없는 검증이 주된 그물이고 **SC-016이 실기기 확인을 성공 기준에 올렸다.**

**Target Platform**: Android 13 (SM-G986N에서 검증), arm64-v8a. development build 및
release APK.

**Project Type**: Mobile app (단일 프로젝트, Expo/React Native)

**Performance Goals**: 사진 5장 캡션 **약 10초**(옆 저장소 2026-08-10 실측: 같은 기기,
LFM2.5-VL 450M, 적재 1,046ms + 장당 약 1,856ms). 그 뒤 글 생성이 붙는다(`quiet` 2.4초 ~
`narrative` 콜드 242초). **이 저장소에서 다시 재지 않았다**(원칙 V — quickstart D1이 잰다).

**Constraints**:
- **E1: 한 번에 모델 하나만 열린다.** VLM과 캐릭터 모델이 동시에 열리지 않는다 —
  005의 `engine-port.ts`가 이미 요구하는 불변식이며 이 기능이 그것을 지켜야 한다.
- **`n_ctx` 2048** — 005 실측에서 충분했으나 **그때는 사진 요약이 없었다.** 캡션 5줄이
  더해지므로 `context_full` 위험이 처음으로 실재한다(research.md §5).
- 오프라인 동작. 원격 API 없음(헌법 원칙 I).

**Scale/Scope**: 하루 최대 **5장**(FR-007). 사진 설정 3갈래 × 캐릭터 5 = 15조합이나
**요약은 캐릭터와 무관하므로 실제 갈래는 3이다**(FR-013).

## Constitution Check

*GATE: Phase 0 앞에서 통과해야 하고 Phase 1 뒤에 다시 본다.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| **I. 온디바이스가 제품이다** | ✅ 통과 | 사진도 캡션도 기기 밖으로 나가지 않는다(FR-002). 사진은 가장 사적인 신호이므로 데스크톱 서버 경로를 **열지 않는다**(Out of Scope). **캡션을 저장해 다시 쓰지 않는다** — 같은 하루를 다시 쓰면 다시 본다(Out of Scope). 이것이 「미리 만들어 둔 응답」 금지의 같은 사례다 |
| **II. 화자는 휴대폰이고 시야는 좁다** | ✅ 통과 + **이 기능의 핵심** | 재료를 주어 지어내기의 원인(분량 압력)을 없앤다. **불확실성을 언어로 전달하지 않기로 했다**(FR-011) — 휴대폰은 그 사진을 **실제로 보았으므로** 캡션은 004의 장수·좌표와 같은 자격의 관측이다. 「틀릴 수 있다」를 붙이면 005가 관측한 얼버무리기 압력이 돌아온다 |
| **III. 모델은 캐릭터다** | ✅ 통과 + **구조로 강화** | 사진 보는 모델이 캐릭터와 **별개**이므로 캐릭터→모델 매핑이 바뀌지 않는다. FR-013(요약이 캐릭터를 가리지 않는다)이 규율이 아니라 **구조**가 됐고 SC-001a가 검증한다. 모델명·파일명·크기는 화면에 나가지 않는다(FR-031a) — 003의 안쪽/바깥쪽 타입 구분을 그대로 쓴다 |
| **IV. 측정 장치를 들이지 않는다** | ⚠️ **이 기능의 최대 위험 — 방어 셋** | ① `initMultimodal`이 `image_min_tokens`/`image_max_tokens`를 받고 `completion()`이 `timings`를 돌려준다 → **`vision-port.ts`가 경계에서 버린다**(005의 `llama-port.ts`와 같은 구조). ② 「LFM2.5 대 SmolVLM」 비교표·캡션 품질 점수를 **옮기지 않는다** — 옮긴 것은 「무엇을 쓰는가」와 「몇 초인가」뿐. ③ **헌법 검사에 규칙을 더한다**(아래) |
| **V. 관측과 추측을 구분한다** | ✅ 통과 | 「읽지 못했다」가 「사진이 없다」와 갈린다(FR-005) — 004가 `none`/`unknown`을 가른 것이 한 겹 위에서 반복된다. 「몇 장을 보았는가」(FR-006)와 「하루의 어느 때인가」(FR-007b)가 값에 붙어 다닌다. **5장 10초는 옆 저장소 실측이며 여기서 재지 않았음을 명시한다** |
| **사진과 시각 처리** | ✅ 통과 | 설정이지 캐릭터가 아니다 — `VisionSetting`이 002부터 그 모양이었고 이 기능이 안을 채운다. **시각 인코더를 고르게 하지 않는다**(FR-016) — 사용자가 보는 것은 「보지 않음/빠르게 봄/자세히 봄」뿐 |
| **한 축 파고들기 금지** | ✅ 통과 — **이 계획의 핵심 선택** | 004가 VLM을 005로 미루고 신호를 사진 하나로 좁힌 것과 같은 판단. **얼굴 인식·동영상·캡션 캐싱·데스크톱 경로·품질 비교를 전부 뺐다.** 남긴 것은 「사진을 읽어 재료로 준다」 하나 |

### 헌법 검사에 규칙을 더한다 (원칙 IV)

010이 `scripts/seed*`의 일기 접근을 막은 것과 같은 자리다. 이 기능에서 **아주 자연스럽게
떠오르는 위반**이 둘 있다:

1. **「캡션이 일기 품질을 올렸는지 재 보자」** — 옆 저장소가 이미 잰 것이며(3.62 대 3.31),
   이 저장소로 옮기면 측정 장치가 된다.
2. **「LFM2.5와 SmolVLM 중 어느 쪽이 나은지 앱에서 견줘 보자」** — FR-033이 금지한다.

그래서 `scripts/constitution-rules.ts`에 규칙을 더한다:

- `src/vision/`이 `diary/store`·`DiaryEntry`에 닿지 않는다 — 캡션 만드는 자리가 일기를
  읽으면 비교의 시작점이다
- `src/vision/`과 `src/ui/`에 캡션 품질·점수·비교를 뜻하는 식별자가 없다
- **`VisionRunResult`에 시간·토큰 필드가 없다**(선언을 `readFileSync`로 직접 읽는다 —
  007이 배운 「타입 방어는 `tsc`에만 있었다」의 교훈)

### Complexity Tracking

**정당화가 필요한 위반이 없다.** 다만 「복잡도가 늘었다」고 볼 수 있는 자리 둘을 적는다:

| 늘어난 것 | 왜 필요한가 | 더 단순한 대안을 버린 까닭 |
| --- | --- | --- |
| 파이프라인 단계 `vision` 추가 (7→8) | 어느 단계에서 멈췄는지 말할 수 있어야 한다(002 FR-019). 사진 읽기 실패와 생성 실패는 사용자가 할 일이 다르다 | 생성 단계 안에 넣으면 「사진을 못 봤다」가 「생성 실패」로 뭉개진다 — 003이 `model-not-ready`를 따로 둔 것과 같은 이유 |
| `src/vision/` 새 폴더 | 기기에 닿는 자리(포트)와 순수 판정(고르기·요약 조립)이 함께 있어야 하고, `src/inference/`에 넣으면 그곳의 「캐릭터 모델을 돌린다」는 성격이 흐려진다 | `src/signals/`에 넣는 안도 있었으나, 004의 수집은 **메타데이터**이고 이것은 **추론**이다. 같은 폴더에 두면 「사진 신호」의 뜻이 둘로 갈린다 |

## Project Structure

### Documentation (this feature)

```text
specs/011-photo-vision-summary/
├── plan.md              # 이 파일
├── research.md          # Phase 0 — 설치본 타입 확인, E1 순서, 균일 선택, n_ctx
├── data-model.md        # Phase 1 — PhotoVision, VisionReadiness, 값의 흐름
├── quickstart.md        # Phase 1 — 실기기 검증 절차 (D1~D8)
├── contracts/
│   ├── vision-engine.md #   사진 보는 엔진 계약 (E1 순서·경계에서 버리기)
│   ├── selection.md     #   5장을 하루에 걸쳐 균일하게 고르는 규칙
│   └── prompt.md        #   캡션이 프롬프트에 들어가는 모양 (005 계약의 확장)
├── checklists/
│   └── requirements.md  # 이미 있음 (16/16)
└── tasks.md             # /speckit-tasks의 몫 — 이 명령이 만들지 않는다
```

### Source Code (repository root)

```text
src/
├── config/
│   └── policy.ts              # 손대지 않는다
├── vision/                    # ★ 새로 생긴다
│   ├── types.ts               #   PhotoVision, PhotoCaption, VisionDepth
│   ├── select.ts              #   ★ 하루에 걸쳐 균일하게 5장 고르기 (순수 함수)
│   ├── caption.ts             #   장별 캡션 조립·실패 처리 (순수에 가까움)
│   ├── vision-port.ts         #   ★ 기기에 닿는 유일한 자리 + 원칙 IV의 경계
│   └── roster.ts              #   ★ 사진 보는 모델의 출처 (캐릭터 로스터와 별개)
├── inference/
│   ├── engine-port.ts         # 손대지 않는다
│   ├── llama-port.ts          # 손대지 않는다
│   └── on-device.ts           # ← vision !== "none" 분기를 실제 동작으로 교체
├── signals/                   # 손대지 않는다 (004의 수집은 그대로)
├── diary/
│   ├── types.ts               # ← DaySignals에 곁들이지 않고 별도 값으로 흐른다
│   ├── prompt.ts              # ← 캡션 줄이 들어가는 자리 (원칙 II의 유일한 통과 지점)
│   └── pipeline.ts            # ← 단계 `vision` 추가
├── models/
│   ├── roster.ts              # ★ 손대지 않는다 — 003의 캐릭터 매핑은 그대로
│   ├── types.ts               # 재사용 (ModelReadiness·DownloadProgress)
│   └── expo-port.ts           # 재사용 (내려받기·검증·삭제)
└── ui/
    ├── DiaryHomeScreen.tsx    # ← 사진 설정 고르는 자리
    └── CharacterListScreen.tsx# ← 사진 보는 모델 준비 자리

__tests__/
├── vision/                    # ★ select·caption·port 대역 검증
├── diary/                     # ← prompt·pipeline 확장 검증
└── ui/                        # ← 사진 설정 화면 검증

.maestro/
└── photo-vision.yml           # ★ 실기기 흐름 — FLOWS에 등록해야 돈다
```

**Structure Decision**: 기존 단일 프로젝트 구조를 그대로 쓰고 **`src/vision/`만 새로
연다.** 004가 `src/signals/`를, 005가 `src/inference/`의 생성 경로를 채운 것과 같은
방식이며, 각 축이 **기기에 닿는 포트 하나 + 순수 판정 여럿**으로 나뉘는 형태를 반복한다.

**003의 `src/models/roster.ts`를 손대지 않는 것이 이 구조의 핵심이다.** 사진 보는 모델의
출처는 `src/vision/roster.ts`에 따로 두며, 두 파일이 서로를 import 하지 않는다 —
합치면 「캐릭터가 사진을 본다」는 잘못된 모양이 코드에 생긴다.

## Phase 0: Research

**Output**: [research.md](research.md)

해소할 것 여섯:

1. `llama.rn` 0.12.9의 멀티모달 API가 실제로 무엇을 주는가 (설치본 타입 직접 확인)
2. E1(한 번에 하나) 아래에서 두 모델을 어떤 순서로 여닫는가
3. 「하루에 걸쳐 균일하게」를 어떻게 정의하는가 (004의 `slice`와 다르다)
4. 「깊이」를 무엇으로 조절하는가 (FR-019가 남긴 것)
5. `n_ctx` 2048에 캡션 5줄이 들어가는가
6. 사진 보는 모델의 URL·파일명 (옆 저장소에서 옮겨 오되 무엇만 옮기는가)

## Phase 1: Design & Contracts

**Output**: [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

- **data-model.md** — `PhotoVision`이 `DaySignals` 안에 들어가지 않고 **나란히 흐르는**
  까닭, 「본 수/있는 수」가 붙어 다니는 구조, `VisionReadiness`가 003의 것을 재사용하는 방식
- **contracts/vision-engine.md** — 적재·캡션·정리의 계약. **`VisionRunResult`에 자리가
  둘뿐인 것이 원칙 IV의 방어**(005의 `RunResult`와 같은 판단)
- **contracts/selection.md** — 균일 선택의 규칙과 결정성. 시각·난수를 읽지 않는다
- **contracts/prompt.md** — 005 계약의 확장. 캡션 줄의 모양과 **되뱉기 판정에 넣지 않는
  까닭**(캡션은 신호가 든 줄이므로 오탐이 된다)
- **quickstart.md** — 실기기 검증 D1~D8. 010의 도구로 사진 있는 하루를 심어 검증한다

## Post-Design Constitution Re-check

**Phase 1 산출 뒤 다시 확인했다 (2026-08-22). 통과.**

| 확인 | 결과 | 어디에 |
| --- | --- | --- |
| `VisionRunResult`에 시간·토큰 자리가 없는가 (원칙 IV) | ✅ **자리가 `text` 하나뿐**이다. 테스트가 선언을 직접 읽는다(V1) | vision-engine.md |
| `src/vision/`이 `models/roster`에 닿지 않는가 (원칙 III) | ✅ 별도 `vision/roster.ts`이며 서로 import 하지 않는다 | data-model.md |
| 캡션이 저장되는 경로가 생기지 않았는가 (원칙 I) | ✅ `PhotoVision`을 저장하지 않는다. 같은 하루를 다시 쓰면 다시 본다 | data-model.md 「저장되는 것」 |
| 「읽지 못함」과 「사진 없음」이 타입에서 갈리는가 (원칙 V) | ✅ `captions.length === 0`과 004의 `none`이 **프롬프트에서 다른 문장**이 된다 | prompt.md P3 |

### 설계 중에 새로 찾은 것 넷

1. **⚠️ `SAMPLING` 재사용이 원칙 I을 조용히 깨뜨린다** (research §7). 캡션이
   `src/inference/sampling.ts`를 같이 쓰면, 캡션을 위해 `temperature`를 낮추는 순간
   **일기 생성의 파라미터가 함께 바뀐다.** 게다가 값이 정반대여야 한다 — 일기 0.8(감상),
   캡션 0.1(관찰). **캡션 값을 `src/vision/`에 따로 둔다.**
2. **⚠️ `DownloadProgress`가 `character: Character`에 묶여 있다** (data-model). 사진 보는
   모델은 캐릭터가 아니므로 그대로 못 쓴다. `DownloadTarget` 갈래로 넓히며,
   **`{ kind: "vision" }`에 식별자가 없는 것이 방어**다(FR-031a). 008의 `DownloadView`·
   `DownloadRejection`에도 번진다.
3. **★ 캡션을 되뱉기 판정에 넣으면 성공한 일기가 거부된다** (prompt.md P5). 005가
   「신호가 들어간 줄은 넣지 않는다」고 이미 적었고, **캡션은 신호 그 자체다.**
   「창가에 놓인 커피잔」이 일기에 나오는 것이 **정확히 우리가 원하는 것**이다.
4. **★ 5장 상한이 `n_ctx` 위험도 함께 막고 있다** (research §5). 캡션은 장당 한 줄이라
   상한이 없으면 컨텍스트를 넘긴다. 004의 200장은 프롬프트에서 한 줄로 요약되므로
   같은 문제가 없었다 — **FR-007이 두 가지 이유로 필요하다.**

### 여전히 위험한 자리 (구현이 조심할 곳)

- **E1 순서를 호출자가 지킨다.** 두 엔진은 서로를 모르며, `on-device.ts`가 VLM을 완전히
  닫은 뒤 캐릭터 모델을 연다. **어기면 기기가 죽는다** — quickstart D3가 잰다.
- **`unload()`가 `finally`에 있어야 한다.** 005의 E2보다 결과가 나쁘다 — 그때는 다음
  요청이 죽었고 여기서는 **같은 요청 안에서** 죽는다.
