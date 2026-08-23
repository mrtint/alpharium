# Research: 쓰는 중 독백

## §1. 콜백은 어느 계층에 두는가

**결정**: `InferenceBackend.generate()`에 옵셔널 두 번째 인자로 `onStage:
(stage: ProgressStage) => void`를 추가한다. `pipeline.ts`는 이것을 그대로
받아 백엔드에 넘기고, 자신은 3단계(신호 가져오기) 직전에 `"signals"`만
스스로 보낸다.

**근거**: `src/inference/on-device.ts`의 `generate()`를 읽으면(155~337행)
vision(`readPhotos`)과 글쓰기(`engine.run`)의 순서를 실제로 아는 것은 이
함수뿐이다. `pipeline.ts`의 `runStages()`는 `deps.backend.generate(request)`
한 줄만 부르고 그 안에서 무슨 일이 일어나는지 모른다(002 FR-017 "추론
어댑터를 파이프라인이 직접 고르지 않는다"와 같은 경계 — 파이프라인이 vision
유무를 스스로 판단해 신호를 지어내면 그 경계를 깨는 것이다).

**기각한 대안**: 파이프라인이 `request.vision !== "none"`을 보고 스스로
"vision 신호를 보낼지" 판단하는 방법. `on-device.ts`의 253행
(`if (request.vision !== "none" && vision === undefined) return
{ kind: "not-implemented" }`)이 보여주듯 vision 설정이 켜져 있어도 실제로
읽지 못하는 경우(엔진 없음, 사진 0장)가 있다 — 파이프라인이 설정값만 보고
신호를 보내면 "실제로 하지 않는 일을 말한다"(FR-012 위반)가 된다. 오직
`readPhotos()`를 실제로 부르는 지점만 진실을 안다.

## §2. 옵셔널 확장이 기존 계약을 깨지 않는가

**결정**: 003의 `isModelReady?: (character) => Promise<boolean>`
(`pipeline.ts` PipelineDeps), 012의 `buildRequest(signals, character, vision,
day?, now?)`가 이미 같은 패턴을 썼다 — 새 매개변수를 옵셔널로 추가하고 "안
주면 이전과 같은 동작"을 유지한다.

**검증 방법**: `pipeline.test.ts`의 기존 테스트가 `onProgress`를 넘기지 않고
호출하는 채로 남아 있어야 하며, 그대로 통과해야 한다. `on-device.test.ts`도
동일 — `onStage`를 안 넘긴 기존 호출이 그대로 성공해야 한다.

## §3. desktop-server.ts는 신호를 낼 수 있는가

**확인**: `src/inference/desktop-server.ts`(001~002가 만든 개발용 어댑터)는
`generate()`가 옵셔널 콜백을 무시해도 무방하다 — local 환경 전용이고, 이
기능의 화면은 dev/prod(온디바이스 전용) 경로에서만 검증 대상이다(AGENTS.md
「환경은 셋이다」). desktop-server가 콜백을 아예 받지 않아도 타입 에러가 나지
않도록, `InferenceBackend.generate()`의 두 번째 인자는 함수 시그니처
레벨에서 옵셔널로 선언한다 — desktop-server 구현체는 이 인자를 그냥
선언하지 않아도 된다(TypeScript 구조적 타이핑상 문제 없음, 003
`isModelReady?`도 같은 방식으로 데스크톱 경로가 신경 쓰지 않는다).

## §4. "신호 확인" 단계는 실제로 관측 가능한 시간을 갖는가

**짐작이며 실측 아님**(원칙 V). `loadSignals()`는 004 이후 실제 미디어
라이브러리 조회이므로 사진이 많은 하루에서는 짧지만 0은 아닐 가능성이 크다.
다만 이 스펙의 SC-001("3초 이상 걸리는 경우 최소 세 문구")은 전체 생성
시간을 기준으로 하지, 신호 확인 자체가 3초를 채워야 한다는 뜻이 아니다 —
신호 확인이 순식간에 지나가도 User Story 2(빠르게 지나가는 단계)가 이미 그
경우를 다룬다.

**남은 확인 사항**: 실기기에서 "signals" 단계 문구가 사람 눈에 보일 만큼
머무는지는 quickstart 단계에서 관측한다. 너무 짧으면 User Story 2의
"스쳐 지나가도 무방하다"가 그대로 적용되므로 실패가 아니다.

## §5. 콜백 호출 빈도와 화면 리렌더

**결정**: 단계 전환 신호(`onProgress`)는 최대 3회(signals→vision→generation)
또는 2회(vision 생략 시) 호출된다. 여기에 §6의 사진 전환 신호가 사진 장수만큼
더 얹힌다 — 사진이 5장이면 최대 5회 추가 리렌더가 생긴다. `useState`로 받아
리렌더하는 비용은 여전히 무시할 수준이다(011 실측 기준 캡션 한 장이 최소
1.3초 걸리므로, 그 사이의 리렌더 1회는 프레임 예산에 전혀 부담을 주지 않는다)
— 성능 목표를 별도로 정하지 않는다(plan.md Technical Context).

## §6. 사진 장 전환은 어디서 관측 가능한가

**결정**: `src/vision/caption.ts`의 `captionAll()` 안, `for (const photo of
photos)` 루프의 매 반복 시작 지점에 옵셔널 `onPhotoStart?: () => void`
콜백을 추가한다.

**근거**: `on-device.ts`의 `generate()`는 `readPhotos()` 하나만 부르고, 그
안에서 `captionAll()`이 사진을 한 장씩 순회한다(`caption.ts` 72행). 사진이
몇 장인지, 지금 몇 번째를 처리 중인지 아는 것은 이 루프뿐이다 —
`on-device.ts`는 `readPhotos()`가 끝날 때까지 그 진행을 전혀 모른다.

**콜백은 인자를 받지 않는다**(`() => void`, 데이터 없음). `caption.ts`의
루프 인덱스나 `photo.id`를 콜백 인자로 넘기면, 화면이 그 정보로 "N번째
사진"을 계산해 문구에 넣을 길이 열린다 — spec Clarifications 3차("순번을
넘기지 않는다")를 타입 시그니처 자체로 막는다.

**전달 경로**: `readPhotos()`가 `vision.resolvePath`처럼 `captionAll()`에
넘기는 인자 하나를 추가로 받아야 한다 — `on-device.ts`의 `readPhotos()`가
자신이 받은 `onStage`(vision 신호와 같은 콜백일 필요는 없다)를 사진 전환
전용 콜백으로 감싸 `captionAll()`에 전달한다. 콜백 종류가 늘어나므로, 다음
Phase 1에서 `on-device.ts`가 `onStage`를 "vision"/"generation" 신호와
"사진 전환" 신호 두 갈래로 어떻게 나눠 보낼지(같은 콜백을 다른 인자로
부르는지, 별도 콜백 두 개를 받는지)를 `contracts/photo-advance.md`가
확정한다.

**기각한 대안**: `on-device.ts`가 `readPhotos()` 호출 전에 사진 장수를 미리
세어(`photos.length`) 그 수만큼 타이머로 문구를 순환시키는 방법. 실제 캡션
완료 시점과 타이머가 어긋나면 "지금 하는 일"이 아니라 "지금쯤 하고 있을
일"을 보여주는 것이 되어 원칙 II(화자가 실제로 아는 것만 말한다)와 충돌할
위험이 있다 — 실제 진행에 맞춰 신호를 내는 쪽이 더 정직하다.

## §7. 문구를 어떻게 순환/무작위로 고르고 서술어 중복을 막는가

**결정**: `monologue.ts`에 두 가지를 둔다.

1. **문구 후보 테이블** — `Record<ProgressStage, readonly [string, string,
   ...string[]]>`(최소 2개 원소 튜플). 각 배열은 서로 다른 서술어로 쓰인
   문구 2~4개를 담는다(예: `vision`: ["사진을 들여다보는 중…", "또 한 장을
   살펴보는 중…", "찬찬히 눈에 담는 중…"]).
2. **선택 함수** `pickMonologue(stage: ProgressStage, previous: string |
   undefined): string` — 후보 중에서 `previous`(직전에 보여준 문구)와
   다른 것을 무작위로 고른다.

**★ 2026-08-23 `/speckit-analyze` C3 정정**: 처음에는 "후보가 하나뿐이면
그대로 돌려주는 안전판"을 뒀으나(`Record<ProgressStage, readonly
string[]>`, 원소 개수 무제한), `contracts/monologue.md`가 "최소 2개
이상"으로 별도로 요구하면서 두 문서의 타입 강도가 어긋났다. **최소 2개
원소 튜플 타입으로 통일**하고 안전판 분기를 제거했다 — 이 스펙에서 후보가
1개인 단계는 애초에 존재하지 않으므로, 안전판은 테스트도 못 짤 도달
불가능한 코드였다.

**"서술어가 겹치지 않는다"의 구현 방법**: 엄밀한 형태소 분석은 과하다 —
**문구 후보 배열 자체를 만들 때 사람이 서술어를 겹치지 않게 미리 쓴다**
(예: "들여다보는"/"살펴보는"/"담는"처럼 각기 다른 동사). 선택 함수는
"직전과 같은 문자열을 연속으로 고르지 않는다"만 보장하면 되고, 그것으로
FR-014("연속된 두 번의 갱신에서 같은 서술어가 반복되어서는 안 된다")가
충족된다 — 후보 배열의 서술어가 애초에 전부 다르므로, "같은 문자열만 아니면
같은 서술어도 아니다"가 후보 설계 단계에서 보장된다.

**무작위 vs 순서대로 순환**: 무작위를 택한다(사용자가 "무작위로 돌려가며"를
직접 언급). `Math.random()`은 헌법 원칙 IV(측정 코드 금지)와 무관하다 —
그 조항이 금지하는 것은 모델 출력을 채점·비교하는 코드이지, UI 문구를
고르는 데 쓰는 난수는 해당하지 않는다. 다만 계약 테스트에서 결정론적으로
검증하려면 `pickMonologue()`가 선택 함수(난수 생성기)를 옵셔널로 주입받게
설계한다(테스트에서는 고정 시퀀스를 주입해 "직전과 다른 것을 고른다"를
검증한다) — 001의 `probe` 주입, 005의 `engine` 주입과 같은 테스트 가능성
패턴이다.

**기각한 대안**: 서술어를 문자열에서 추출해 프로그램적으로 비교하는 방법
(예: 형태소 분석 라이브러리 도입). 새 의존을 늘리고, 한국어 형태소 분석은
정확도가 완벽하지 않아 오히려 예측 불가능한 실패를 만든다 — "후보 문구
자체를 사람이 서로 다르게 쓴다"는 훨씬 단순하고 확실한 방법이다.
