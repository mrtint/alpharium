# Implementation Plan: 가상의 하루를 기기에 심는 도구

**Branch**: `010-synthetic-day-fixture` | **Date**: 2026-08-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-synthetic-day-fixture/spec.md`

## Summary

**테스트 기기가 본 하루에는 아무것도 없다.** 그래서 005~009의 실기기 확인이 전부
「사진 없음 + 나머지 모름」인 하루 위에서 이뤄졌고, **신호가 있는 하루의 일기를 아직
한 번도 보지 못했다.**

이 기능은 **개발자의 기계에서 도는 스크립트**로 지정한 하루에 해당하는 사진을 기기의
사진 보관함에 심는다. 앱은 도구가 있었는지 모르고, 평소와 똑같이 미디어 라이브러리를
읽는다 — **앱 코드는 한 줄도 바뀌지 않는다.**

**기술적 접근**(research.md에서 실측으로 확정):

1. 저장소에 둔 **JPEG 템플릿**의 EXIF에서 날짜·좌표 필드만 덮어쓴다. **EXIF를 처음부터
   만들지 않는다** — 손으로 만든 EXIF를 안드로이드가 무시하는 것을 실측했다(§4).
2. `adb push`로 `/sdcard/Pictures/<전용폴더>/`에 넣고 **`content call ... scan_file`**로
   색인한다. 브로드캐스트도 `content update`도 **조용히 실패한다**(§3).
3. **심은 뒤 `datetaken`을 되읽어** 그 하루의 구간 안에 있는지 확인한다. 확인하지
   못했으면 성공이 아니다(FR-018d).

## Technical Context

**Language/Version**: TypeScript (Node 22+ 타입 스트리핑, `.mts`) — `check-constitution.mts`와 같은 방식

**Primary Dependencies**: **없다.** `node:child_process`(adb 호출), `node:fs`(파일), `node:path`만 쓴다. 새 npm 의존 0개

**Storage**: 기기의 `/sdcard/Pictures/<전용폴더>/` (심은 사진) + 개발 기계의 파일 하나(심은 기록)

**Testing**: `jest` (순수 함수 — EXIF 패치, 실행 계획 수립, 결과 판정) + 실기기 수동 확인(quickstart)

**Target Platform**: 개발 기계(Windows/macOS/Linux) → adb로 붙은 Android 기기

**Project Type**: CLI 유틸리티. **앱의 일부가 아니다**(FR-001)

**Performance Goals**: 사진 3장 심기가 실기기 검증 준비 시간을 늘리지 않는다(SC-001). 200장은 재 보지 않았다(research.md 짐작 표)

**Constraints**:
- **앱 소스를 고치지 않는다**(FR-004a, SC-009) — 이 기능의 가장 강한 제약
- **새 의존 0개** — 004~009가 겪었듯 새 의존은 실기기 확인 부채가 된다
- **대화형 금지**(FR-018) — 에이전트가 부른다

**Scale/Scope**: 스크립트 1개 + 순수 모듈 3~4개 + 템플릿 JPEG 1개. 앱 코드 변경 0줄

## Constitution Check

*GATE: Phase 0 전에 통과해야 한다. Phase 1 설계 뒤 재확인.*

### 원칙 I — 온디바이스가 제품이다 ✅

| 조항 | 이 설계가 지키는 방법 |
| --- | --- |
| 일기는 기기에서 생성된다 | **도구는 일기에 손대지 않는다.** `files/diary/`에 쓰지 않고, 일기가 될 글을 만들지 않는다 |
| 미리 만들어 둔 응답 금지 | 심는 것은 **입력(사진)**이다. 같은 사진으로 두 번 생성하면 두 편이 각각 새로 만들어진다 |
| 대체 응답 스위치 금지 | 도구가 앱에 어떤 설정도 넣지 않는다. `.env`를 건드리지 않는다 |

**⚠️ 이 기능이 원칙 I에 가장 가까이 가는 자리**: `src/signals/fake.ts`가 이미 「가짜
신호」이고, 그 파일의 주석이 **「이 모듈을 src/ui/에서 import 하지 않는다」**로 경계를
세워 뒀다. 010은 **그 파일을 건드리지 않고** 기기의 상태만 바꾼다 — 가짜 신호가 제품
경로로 자라는 길을 열지 않는다.

### 원칙 II — 화자는 휴대폰이고 시야는 좁다 ✅ (해당 없음)

도구는 일기의 내용에 관여하지 않는다. 프롬프트도 판정도 건드리지 않는다.

### 원칙 III — 모델은 캐릭터다 ✅ (해당 없음)

도구는 캐릭터도 모델도 모른다. `src/models/`를 import 하지 않는다.

### 원칙 IV — 측정 장치를 제품에 들이지 않는다 ✅

**이 기능이 가장 조심해야 할 자리다.**

- 도구는 **생성된 일기를 읽지 않는다**(FR-022). `files/diary/`를 조회하는 코드가 없다.
- 채점·비교·지어내기 세기가 없다. **심고 끝난다.**
- ⚠️ **자라날 위험**: 「심은 하루로 캐릭터를 비교해 보자」가 자연스럽게 떠오르는 자리다.
  그것이 정확히 원칙 IV 위반이며, **별도 저장소의 몫이다.**

**방어**: 헌법 검사에 규칙을 더해 `scripts/seed-*`가 `diary/store`·`files/diary`에 닿는
것을 막는다(아래 「헌법 검사 확장」).

### 원칙 V — 관측과 추측을 구분한다 ✅

| 조항 | 이 설계가 지키는 방법 |
| --- | --- |
| 실측/짐작 구분 기록 | research.md가 §별로 실측과 짐작을 갈라 적었다 |
| **합성 데이터로 모델 품질을 평가하지 않는다** | **FR-021이 금지하고, 이 계획은 일기를 읽는 코드를 두지 않는다** |
| `unknown`을 기본값으로 채우지 않는다 | 도구가 `none`/`unknown` 판정에 개입하지 않는다(FR-013). 권한도 바꾸지 않는다(FR-014) |
| 통로 없는 축 | 걸음·배터리·연결은 **도구로도 `unknown`이다**(FR-009a). 심는 척하지 않는다 |

**핵심 위험과 방어**: 「심은 하루의 일기가 좋아졌다」는 결론을 내리면 원칙 V 위반이다.
quickstart가 **관측만 적고 결론을 적지 않도록** 안내한다.

### 게이트 판정: **통과**. 정당화가 필요한 위반 없음.

## Project Structure

### Documentation (this feature)

```text
specs/010-synthetic-day-fixture/
├── plan.md              # 이 파일
├── research.md          # Phase 0 — 실기기 실측
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── cli.md           # 도구의 명령 계약 (에이전트가 읽는 것)
│   └── seeding.md       # 심기·확인·되돌리기의 계약
└── tasks.md             # /speckit-tasks가 만든다
```

### Source Code (repository root)

```text
scripts/
├── seed-day.mts              # ★ 진입점. 에이전트가 부르는 것
├── seed/
│   ├── exif.mts              # 템플릿 EXIF의 날짜·좌표를 덮어쓴다 (순수)
│   ├── plan.mts              # 「무엇을 심을까」를 정한다 (순수)
│   ├── shapes.mts            # 미리 정해 둔 하루 모양들 (FR-008)
│   ├── device.mts            # adb에 닿는 유일한 자리
│   └── ledger.mts            # 심은 기록 (개발 기계에 남는다)
└── seed-template.jpg         # 검증된 EXIF를 가진 템플릿

__tests__/seed/
├── exif.test.ts              # 덮어쓴 값이 다시 읽히는가
├── plan.test.ts              # 모양 → 심을 것, 범위 밖 거부
└── result.test.ts            # 부분 성공을 성공으로 보고하지 않는가

specs/010-synthetic-day-fixture/    # 문서
```

**앱 코드(`src/`, `App.tsx`) 변경 0줄.** 이것이 SC-009로 검증된다.

**Structure Decision**: `scripts/` 아래에 둔다. 근거:

1. **FR-001·FR-015를 구조로 보장한다** — `scripts/`는 번들에 들어갈 길이 없다.
   「조심해서 안 넣는 것」이 아니라 「넣을 수 없는 것」이다.
2. `run-device-tests.mjs`·`check-constitution.mts`가 이미 같은 자리에 있다 — 실기기를
   다루는 개발 도구의 정해진 자리다.
3. **기기에 닿는 자리를 `device.mts` 하나로 모은다** — 004의 `expo-port.ts`, 003의
   `expo-port.ts`와 같은 구조다. 나머지는 순수 함수라 기기 없이 검증된다.

## 설계의 핵심 결정

### ① EXIF를 만들지 않고 템플릿을 고친다

research.md §4의 실측이 근거다. **손으로 만든 EXIF는 규격에 맞아도 안드로이드가
무시한다.**

```
템플릿 JPEG (검증된 EXIF 구조)
  → DateTimeOriginal(20바이트) 덮어쓰기
  → DateTimeDigitized(20바이트) 덮어쓰기
  → GPS lat/lon rational(각 24바이트) 덮어쓰기
  → 오프셋이 하나도 안 움직인다 (길이 고정 교체)
```

**길이가 같으므로 IFD를 다시 계산할 필요가 없다.** 이것이 이 방식을 단순하게 만든다.

**좌표를 안 박는 사진**은 GPS 태그를 지우는 대신 **템플릿을 둘 둔다** — GPS IFD가 있는
것과 없는 것. 태그를 지우면 IFD 엔트리 수가 바뀌어 오프셋이 움직인다.

### ② 심은 뒤 반드시 되읽어 확인한다 (FR-018d)

research.md §1이 보여준 것: **`adb push`가 성공해도 `datetaken=NULL`이면 앱은 못 본다.**

```
push → scan_file → datetaken 되읽기 → 그 하루의 [startMs, endMs) 안인가?
                                      ↓ 아니면
                                   실패로 끝낸다 (심은 것 치우고)
```

**「push 성공 = 심겼다」가 거짓인 것을 실측했다.** 이 확인이 없으면 006의 `GenerationProbe`,
007의 끊긴 배선, 008의 버려진 반환값, 009의 `day:` 한 줄과 **같은 종류의 조용한 실패**가
된다.

### ③ 범위 밖 하루는 심기 전에 거부한다 (FR-005a·005b)

`src/config/day-boundary.ts`의 `selectableDays(now)`를 **직접 부른다.** 도구가 「셋」을
다시 세지 않는다 — 그러면 04:00과 3이 두 곳에 생긴다.

```
seed-day.mts → import { selectableDays, dayBounds } from "../src/config/day-boundary"
```

**앱 코드를 import 하지만 앱을 바꾸지는 않는다.** 읽기만 하는 방향이며, 이것이 FR-005b를
「조심해서 맞추기」가 아니라 「어긋날 수 없게」 만든다.

### ④ 결과를 두 겹으로 낸다 (FR-018a·018b, 명확화 Q3)

```
사람이 읽는 줄들 ...
2026-08-20에 3장을 심었다 (좌표 2장). 기기에 남아 있던 것: 0장
...
{"ok":true,"day":"2026-08-20","seeded":3,"withLocation":2,"existing":0}   ← 마지막 한 줄
```

**마지막 한 줄만 기계가 읽는다.** 에이전트는 종료 코드와 그 줄을 본다.

### ⑤ 자동으로 치우지 않는다 (명확화 Q4)

`seed-day.mts`가 심기만 한다. 되돌리기는 **별도 명령**이며 사람이 지시할 때만 돈다.
다만 **심을 때마다 남아 있는 것을 세어 결과에 담는다**(FR-011b) — 008에서 받다 만 모델이
기기에 남아 아무도 모른 자국을 반복하지 않는다.

### ⑥ 헌법 검사 확장 (원칙 IV 방어)

`scripts/constitution-rules.ts`에 규칙을 하나 더한다:

```
seed-* 파일이 `diary/store`·`files/diary`·`generate(`에 닿으면 위반
```

**「심은 하루로 일기를 채점하자」가 코드로 들어오는 것을 사람의 주의력이 아니라 검사로
막는다.** 003의 `roster.ts`, 007의 `src/ui/` 규칙과 같은 구조다.

⚠️ **이것이 원칙 IV의 경계 자체를 넘지 않는지 확인했다**: 이 검사는 **소스에 어떤
import가 있는지**만 본다. 모델을 부르지 않고, 출력을 만들지 않고, 품질을 재지 않는다 —
`constitution-rules.ts` 주석이 정한 경계 안이다.

## Phase 1 산출물

- **[data-model.md](data-model.md)** — 합성 하루, 심은 사진, 심은 기록, 실행 결과
- **[contracts/cli.md](contracts/cli.md)** — 명령·인자·출력·종료 코드
- **[contracts/seeding.md](contracts/seeding.md)** — 심기·확인·되돌리기의 단계와 실패 지점
- **[quickstart.md](quickstart.md)** — 실기기 검증 절차

## Constitution Check (Phase 1 설계 후 재확인)

| 원칙 | 재확인 | 설계가 새로 만든 위험 |
| --- | --- | --- |
| I | ✅ | 없음. 도구가 `files/diary/`에 닿는 코드가 없다 |
| II | ✅ | 해당 없음 |
| III | ✅ | 도구가 `src/models/`를 import 하지 않는다 |
| IV | ✅ | **헌법 검사 규칙을 더해 방어했다.** 설계 단계에서 위험을 식별하고 구조로 막았다 |
| V | ✅ | research.md가 짐작 넷을 표로 남겼다. quickstart가 결론을 적지 않도록 안내한다 |

**재확인 결과: 통과.** Complexity Tracking 표는 채울 것이 없다(정당화가 필요한 위반 0건).

## 앱을 바꾸지 않는다는 것의 검증

이 계획의 가장 강한 주장이므로 검증 방법을 명시한다:

| 무엇 | 어떻게 | 통과 |
| --- | --- | --- |
| 앱 소스 무변경 | `git diff --stat src/ App.tsx` | **변경 0줄** |
| 도구가 번들에 없음 | `scripts/`는 `src/`가 아니다 + release APK에서 확인 | 문자열이 없다 |
| 앱에 도구용 분기 없음 | 헌법 검사 + `git diff` | 분기 0개 |
