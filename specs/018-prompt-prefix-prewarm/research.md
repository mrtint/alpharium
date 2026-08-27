# Research: 일기 대기 시간 단축 (고정 서두 미리 준비)

이 기능은 이례적으로 연구 단계가 짧다 — 근거 문서(`ALPHARIUM-SPEC.md`,
my-ollama 저장소)가 이미 18런·두 벌 재현으로 방안을 실측 검증했고,
alpharium 쪽 코드베이스 구조도 그 문서의 전제와 대부분 일치함을
`/speckit-specify` 단계에서 확인했다. 남은 것은 이 저장소의 기존 계약
(engine-port.ts, on-device.ts, prompt.ts)에 어떻게 최소 침습으로 얹느냐뿐이다.

## 1. 프리필 지연의 원인과 해법

**Decision**: 프롬프트의 고정 서두(화자 규칙 + 이름 + 제목 지시문,
캐릭터가 같으면 날마다 불변, 전체의 69.8%)를 KV 캐시에 미리 채워 둔다.
`n_predict: 1`로 실제 생성 없이 프리필만 수행한다.

**Rationale**: 원 문서 §1의 실측(S22, 교대 설계 18런, 두 벌 재현)에 따르면
- cold(현행): TTFT 20.60초
- preload(가중치만 미리 올림): TTFT 20.60초 — **효과 0**, 병목은 I/O가
  아니라 프리필 연산이다
- prefix(고정 서두 미리 프리필): TTFT **6.55초** — 68% 감소, 재현됨

세 방식 모두 디코드 속도(ms/자)와 출력 글자 수가 동일 — 일기 내용·분량은
변하지 않는다는 것이 실측으로 확인됐다. 이 저장소는 이 수치를 재검증하지
않는다(헌법 원칙 IV — 측정 장치를 제품에 들이지 않는다, 별도 저장소에서
이미 수행됨). 확인 방법은 §6("어떻게 확인하는가")을 그대로 따른다.

**Alternatives considered**: 모델을 미리 로드(preload)만 하는 방안 —
기각. 효과가 0으로 실측됨.

## 2. 계약 확장 지점 — `GenerationEngine.prewarm()`

**Decision**: `src/inference/engine-port.ts`의 `GenerationEngine`
인터페이스에 `prewarm(character: Character): Promise<void>`를 추가한다.
반환값이 없다.

**Rationale**: 이 저장소의 계층 구조상 기기에 닿는 통로는 정확히 셋
(`models/expo-port.ts`, `signals/expo-port.ts`, `inference/llama-port.ts`)
이고, 생성 엔진을 여닫는 계약은 `engine-port.ts` 하나뿐이다. 새 계약을
만들지 않고 기존 계약을 넓히는 것이 "온디바이스에 닿는 유일한 자리"
원칙(AGENTS.md 「지켜야 할 경계」)과 맞는다. 반환값이 없는 것 자체가
원칙 IV의 방어다 — 담을 자리가 없으면 시간을 실을 수 없다(`RunResult`가
`{ text, ending }` 둘뿐인 것과 같은 설계 원리).

**Alternatives considered**:
- 별도 `PrewarmEngine` 계약을 새로 만드는 방안 — 기각. 007이
  `StoppableBackend`로 계약을 분리한 선례가 있지만, 그것은 "데스크톱
  경로에는 없는 기능"이었기 때문이다. `prewarm()`은 온디바이스
  엔진이라면 항상 의미가 있으므로(데스크톱 경로는 이 기능 자체가
  적용되지 않음 — 아래 §3) 굳이 나눌 이유가 없다. 다만 실제 구현체가
  아닌 경로(데스크톱 `desktop-port.ts` 등)에서는 `prewarm()`을 no-op으로
  둘 수 있다 — 계약이 그것을 막지 않는다(반환값이 없으므로 no-op과
  성공한 준비를 밖에서 구분할 수 없고, 그래야 한다).

## 3. 데스크톱 어댑터는 범위 밖

**Decision**: 이번 기능은 온디바이스 어댑터(`llama-port.ts`)에만
`prewarm()`을 실제로 구현한다. 데스크톱 서버 어댑터(`local` 환경, 개발자
튜닝용)는 건드리지 않는다.

**Rationale**: 스펙(spec.md)의 User Story·SC 전부가 "사용자가 실기기에서
체감하는 대기 시간"을 대상으로 한다. `local` 환경은 개발자 튜닝 전용이고
(헌법 원칙 I), 그 경로의 대기 시간 단축은 이 기능의 목표가 아니다.
`GenerationEngine` 인터페이스에 메서드가 추가되므로 데스크톱 어댑터가
있다면 타입 검사를 통과하려면 `prewarm()`을 구현해야 하지만, 구현은
"아무것도 하지 않고 즉시 resolve"로 충분하다 — 계약 위반이 아니다(계약이
"무엇을 해야 한다"를 규정하지 않고 "무엇을 반환하지 않는다"만
규정하므로).

## 4. 프롬프트 접두사 — 복제 대신 공유

**Decision**: `src/diary/prompt.ts`에 `fixedHead(character): string[]`을
추출하고, `promptPrefix(character): string`이 그것을 `join("\n")`한
값을 반환한다. `buildPrompt()`는 자신의 배열 리터럴 대신
`...fixedHead(request.character)`를 재사용한다.

**Rationale**: 원 문서가 이미 경고한 것 — 접두사와 `buildPrompt()`의
서두가 한 글자라도 어긋나면 KV 캐시가 빗나가 이 기능 전체가 "느려질
뿐 오류 없이" 무의미해진다(가장 발견하기 어려운 실패 형태). 같은 배열
리터럴에서 뽑아야 한다는 것이 이 저장소의 기존 관례이기도 하다 —
`instructionLines()`와 `buildPrompt()`가 이미 `SPEAKER_RULES` 등 같은
상수를 공유하는 것과 동일한 패턴(005의 선례).

**Alternatives considered**: 접두사를 별도로 하드코딩하는 방안 — 기각.
원 문서가 명시적으로 경고했고, 이 저장소의 「복제하면 안 된다」 관례와도
어긋난다.

## 5. E1 준수 — 준비와 사진 읽기가 겹치지 않는 자리

**Decision**: 두 단계로 나눈다.
- 1단계: 사진이 없는 날에 한해, 캐릭터·날짜가 정해지는 즉시 화면이
  `prepare(character)`를 부른다(`DiaryHomeScreen.tsx`).
- 2단계: 사진이 있는 날은, 화면이 먼저 사진 캡션을 완료해 그 결과(`seen`)를
  들고 있다가, 그 뒤에만 `prepare(character)`를 부른다. 사용자가 "쓰기"를
  누르면 `generate(request, seen)`이 이미 읽어 둔 `seen`을 받아 다시 읽지
  않는다.

**Rationale**: 원 문서 §2가 이미 이 결론에 도달했다 — "프리워밍은
사용자가 기다리기 시작하기 전이면서 동시에 그 뒤로 VLM이 열리지 않는
자리여야 한다. 현재 구조에는 그런 자리가 없다"(캡션이 `generate()` 안에서
LLM보다 먼저 열리는 기존 순서 때문). 캡션을 `generate()` 밖으로 꺼내
화면이 순서를 제어하는 것이 유일한 해법이다. 이 저장소의 E1 불변식
("두 엔진이 서로를 모르므로 호출자가 순서를 지킨다", `on-device.ts` 주석)이
이미 "호출자 책임"이라는 것을 명시하고 있어, 화면이 그 호출자가 되는 것이
기존 설계와 어긋나지 않는다.

**동시 요청 처리** (Clarification 세션 2026-08-26에서 확정): 사진 읽기가
아직 끝나지 않은 상태에서 사용자가 "쓰기"를 누르면, 진행 중이던 읽기를
취소하거나 병행하지 않고 그것이 끝나기를 기다린 뒤 결과를 이어서 쓴다
(FR-006a). 구현상 이것은 화면이 사진 읽기의 `Promise`를 들고 있다가,
"쓰기"가 눌리면 그 `Promise`를 `await`한 뒤 `generate()`를 부르는 것으로
자연스럽게 만족된다 — 별도의 취소/조율 로직이 필요하지 않다.

**Alternatives considered**:
- `generate()` 안에서 비전이 끝난 뒤 프리필하는 방안 — 기각(원 문서가
  이미 기각: "이득이 0이다. 그 자리는 이미 사용자가 기다리는 구간이다").
- 화면 진입 시 곧바로 프리워밍하는 방안(사진 유무 무관) — 기각. 사진
  있는 날에는 E1을 어겨 두 모델이 동시에 열린다(문서가 명시적으로 경고한
  함정).

## 6. `visionMs` 재측정 방지 (원칙 V 연장)

**Decision**: `generate()`가 이미 읽어 둔 `seen`을 받은 경우, 그 호출
안에서는 `readPhotos()`를 부르지 않으므로 `visionMs`가 자연히 기록되지
않는다 — 새 조건 분기를 추가할 필요가 없다. 기존 T4 불변식("사진을 0장
분석했으면 `visionMs`가 없다", specs/017-diary-body-screen/contracts/
elapsed-time.md)이 "이 호출에서 `readPhotos()`를 부르지 않았다"는
조건으로 이미 이 경우를 포괄한다.

**Rationale**: `on-device.ts`의 기존 코드(`visionMs`는 `readPhotos()`를
실제로 부른 경로에서만 대입됨, [on-device.ts:309-332])가 이미 "안 한 일은
0초 걸린 일이 아니다"라는 원칙 V의 판단을 구현하고 있다. `seen`을 밖에서
주입받는 새 경로를 그 판단 밖에 두면 오히려 예외를 만드는 것이 되므로,
기존 조건문의 자연스러운 결과로 남긴다.

## 7. 헌법 검사(`scripts/constitution-rules.ts`) 신규 규칙 필요 여부

**Decision**: 새 규칙을 추가하지 않는다.

**Rationale**: `src/inference/`는 기존 헌법 검사 스크립트가 명시적으로
검사 대상에서 제외한 영역이다("왜 `src/inference/`는 검사하지 않는가:
어댑터를 구현하고 고르는 자리이므로", constitution-rules.ts 주석). 이
기능이 추가하는 파일은 없고, 기존 파일 다섯 개만 수정한다. `prewarm()`이
반환값을 갖지 못하게 하는 방어는 TypeScript 계약(`Promise<void>`)과
계약 테스트(소스 선언을 직접 읽는 이 저장소의 관례)로 충분하다 — 런타임
검사 규칙을 새로 만들 필요가 없다.

## 8. 테스트 전략

**Decision**: 이 저장소의 기존 관례를 그대로 따른다 — 계약 테스트는
소스 선언을 `readFileSync`로 직접 읽어 타입 위반(`tsc`만 잡는 것)을
jest에서도 방어한다(007·009·012의 반복 관례). 위반 주입으로 새 방어를
검증한다(예: `prewarm()`이 실수로 값을 반환하게 고쳐보고 계약 테스트가
잡는지 확인).

**Rationale**: `npm test`가 이미 두 프로젝트(로직/화면)로 나뉘어 있고,
이 기능의 변경은 대부분 로직 계층(`engine-port.ts`, `llama-port.ts`,
`on-device.ts`, `prompt.ts`)에 속해 `test:logic`(약 7초)으로 빠르게
검증된다. 화면 트리거(`DiaryHomeScreen.tsx`)만 `test:ui`가 필요하다.

## 미해결 사항

없음 — [NEEDS CLARIFICATION] 마커가 spec.md에 남아 있지 않았고, 이
research 단계에서 새로 발견된 미해결 기술 질문도 없다.
