# Contract: `src/vision/resize.ts`

## 목적

011의 `caption.ts`가 사진 경로를 사진 보는 모델에 넘기기 전에, 그 경로가 가리키는
이미지를 목표 크기 이하로 줄인 사본의 경로로 바꾼다. **이 계약은 순수하다** — 기기를
모르고, 실제 리사이즈 구현은 주입받는다(011의 `VisionLoader` 패턴, 005의 포트 주입과
동일 구조).

## 함수

```ts
export type ResizeExecutor = (sourcePath: string, target: ResizeTarget) => Promise<ResizeResult>;

export async function resizePhoto(
  sourcePath: string,
  execute: ResizeExecutor = defaultExecutor,
): Promise<ResizeResult>;
```

- `sourcePath`: 011의 `PhotoPathResolver`가 이미 돌려준 파일 경로(`filePathOf()`의
  결과). 이 함수는 그 경로가 유효한 파일을 가리키는지 검증하지 않는다 — 검증은
  `execute`(실제 구현)의 몫이다.
- `execute`: 기기에 닿는 실제 리사이즈 함수. 테스트는 이것을 대역으로 주입한다.
  기본값(`defaultExecutor`)은 `on-device.ts`에서만 실제 구현으로 교체된다.

## 규칙

**C1 — 목표 크기보다 이미 작은 사진은 그대로 쓴다(FR-003).**
`resizePhoto()`를 부르기 전에 원본 크기를 알아야 이 규칙을 지킬 수 있다.
**크기 판정은 `execute`(네이티브 리사이즈 구현) 안에서 한다** — 리사이즈
라이브러리가 이미 원본 크기를 읽으므로, 그 값을 이 계약이 다시 읽으면 같은 파일을
두 번 여는 비용이 든다. 이미 작으면 `execute`가 리사이즈를 건너뛰고 **원본
경로를 그대로 담은 `{ ok: true, path: sourcePath }`를 돌려준다** — 이 경우 결과
경로가 원본과 같을 수 있으며, 그것은 실패가 아니다.

**C2 — 예외를 던지지 않는다(FR-012).** `execute`가 예외를 던지면 `resizePhoto()`가
감싸 `{ ok: false }`로 바꾼다 — 011의 `caption.ts`가 이미 "계약을 믿고 감싸지
않으면 계약 위반 한 번에 하루 전체가 무너진다"는 교훈을 남겼으므로(caption.ts
주석), 이 계약도 같은 이중 방어를 한다.

**C3 — 결과 타입에 지표 자리가 없다(FR-015).** `ResizeResult`는 `path` 하나뿐이다
(data-model.md). 리사이즈에 걸린 시간·원본/결과 크기를 요청해도 담을 자리가
없으므로 구현이 그것을 실수로도 밖에 내보낼 수 없다.

**C4 — 방향을 보존한다(FR-005).** `execute` 구현이 EXIF 방향을 적용한 뒤 리사이즈
해야 한다. 이 계약 자체는 방향을 검증하지 않는다(순수 함수라 이미지 내용을 모른다) —
검증은 quickstart의 실기기 확인이 한다.

## 호출자 쪽 계약 — `caption.ts`의 변경

011의 `captionAll()`에서 `path`를 얻은 뒤, `engine.caption(path)`를 부르기 **전에**
`resizePhoto(path)`를 거친다:

```
path = await resolvePath(photo)       // 011 기존
  ↓ (path === null이면 건너뜀 — 기존 그대로)
resized = await resizePhoto(path)      // 013 신규
  ↓ (resized.ok === false이면 건너뜀 — 011의 E4와 같은 분기)
result = await engine.caption(resized.path)   // 011 기존, path만 교체
  ↓ (finally) 그 장의 리사이즈 사본을 지운다   // 013 신규, C1에서 path === sourcePath면 지우지 않는다
```

**리사이즈 실패는 캡션 판정(005의 넷 갈래: `empty`/`echo`/`language`/`unfinished`)에
들어가지 않는다** — 그 장이 아예 캡션 시도 없이 건너뛰어지므로, 011의 "빈 것은
담지 않는다. `considered`와 `captions.length`의 차이가 실패를 말한다"는 기존 규칙이
리사이즈 실패도 그대로 흡수한다. **새 판정 갈래가 생기지 않는다**(FR-019).

## 무엇을 이 계약이 다루지 않는가

- **어느 리사이즈 라이브러리를 쓰는가** — `execute`의 실제 구현(`on-device.ts`)이
  결정한다. 이 계약은 라이브러리를 모른다.
- **리사이즈 사본을 언제 지우는가의 정확한 트리거** — `caption.ts`가 `finally`
  블록에서 호출하는 지우기 함수는 이 계약이 아니라 `caption.ts`의 계약이다(011의
  기존 파일이 확장된다).
