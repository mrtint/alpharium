# Contract: `TypewriterText` 컴포넌트 + `grapheme-slice` 유틸

**Feature**: 038-typewriter-diary-reveal | **Date**: 2026-09-11

테스트를 먼저 쓴다(헌법 「개발 방식」). 각 규칙 끝의 `[Cn]`/`[Gn]`은 계약 테스트
식별자다. `TypewriterText` 테스트는 `.tsx`(jest-expo), `grapheme-slice` 테스트는
`.ts`(test:logic).

---

## A. `grapheme-slice.ts` — 코드포인트 경계 안전 분할 (순수)

### 인터페이스

```ts
export function graphemeUnits(text: string): string[];
export function graphemeSlice(text: string, count: number): string;
export function graphemeLength(text: string): number;
```

- `graphemeUnits` = `Array.from(text)` (코드포인트 배열). 새 의존성 없음.
- `graphemeSlice(text, n)` = `graphemeUnits(text).slice(0, Math.max(0, n)).join("")`.
- `graphemeLength(text)` = `graphemeUnits(text).length`.

### 규칙

- **G1** — `graphemeSlice("가나다라", 2) === "가나"` (한글 NFC 완성형은
  코드포인트 하나).
- **G2** — `graphemeSlice("a👍b", 2) === "a👍"`. 서로게이트 쌍(👍 = U+1F44D)을
  반으로 자르지 않는다(FR-009). `"a👍b"[1]`이 깨진 반쪽을 주는 것과 대비된다.
- **G3** — `graphemeSlice(text, 0) === ""`, `graphemeSlice(text, -5) === ""`
  (음수는 0으로 clamp).
- **G4** — `graphemeSlice(text, 99999) === text` (count가 길이 이상이면 전체).
- **G5** — `graphemeLength("a👍b") === 3` (문자열 `.length`는 4).
- **G6** — `graphemeSlice("", n) === ""` for any `n`.
- **G7** — `graphemeUnits`를 순서대로 이어 붙이면 원문과 같다:
  `graphemeUnits(t).join("") === t` (임의의 한국어+이모지 혼합 표본).

### 위반 주입 (방어 확인)

- `Array.from` 대신 `text.slice(0, n)`을 쓰도록 바꾸면 **G2·G5가 FAIL**한다
  (서로게이트 쌍 분리).

---

## B. `TypewriterText` — 완성 문자열을 글자 단위로 흘리는 표시 컴포넌트

### Props

```ts
type TypewriterTextProps = {
  text: string;                       // 완성 문자열 (판정 통과·저장 완료분)
  charMs: number;                     // 글자당 노출 간격(ms). 호출부가 REVEAL.charMs 전달
  skipToEnd: boolean;                 // false→true 순간 즉시 전체 + onDone
  onDone: () => void;                 // 전체 노출 완료 시 정확히 1회
  variant?: TextVariant;             // AppText의 TextVariant 전체 ("title" | "body" 등), 기본 "body"
  style?: import("react-native").TextStyle;  // AppText style 오버라이드
  testID?: string;
};
```

**타이포 일치 (I1)**: `variant`를 `"title" | "body"`로 좁히지 않고 `AppText`의
`TextVariant` 전체를 받는다. `DiaryDetailScreen`이 현재 쓰는 값을 그대로 통과
시켜야 하기 때문이다 — 제목은 `variant="title"`, 본문은
`variant="body"` + `style={{ fontSize: 16, lineHeight: 26 }}`
(`DiaryDetailScreen.tsx:443·452`와 동일). 계약 테스트 C-TYPO 참조.

### 렌더 규칙

- **C1** — 화면에는 `graphemeSlice(text, n)` 결과를 담은 단일 `<AppText>`를
  렌더한다. `variant`·`style` prop을 `<AppText>`에 그대로 위임한다. `n`은 내부
  노출 카운터. 반쪽 글자가 나타나지 않는다(A의 `graphemeSlice` 사용, FR-009).
- **C2** — 마운트 시 `n = 0`. 이후 `charMs`마다 `n += 1`. `jest.useFakeTimers()`
  + `act(() => jest.advanceTimersByTime(charMs * k))` 후 노출 길이가 `k`만큼
  늘어난다(FR-001). **테스트는 `charMs`를 임의 양수(예: 10)로 주입**해 타이밍
  로직을 검증한다 — `REVEAL.charMs === 15`는 별도 상수 테스트(T003)가 잠근다(A1).
- **C3** — `n`이 `graphemeLength(text)`에 도달하면 `onDone`을 **정확히 1회**
  호출하고 타이머를 정지한다(FR-004의 상단 절 트리거).
- **C4** — `skipToEnd`가 `false`에서 `true`로 바뀌면 다음 렌더에서 즉시 전체
  텍스트를 노출하고, 아직 `onDone`을 안 불렀으면 1회 호출한다(FR-005). 이미
  `onDone`을 불렀으면 재호출하지 않는다.
- **C5** — `text` prop이 다른 값으로 바뀌면 `n = 0`으로 리셋하고 `onDone`
  재무장(다시 완료되면 또 1회). `text`가 같은 값으로 재전달되면 리셋하지 않는다.
- **C6** — 언마운트 시 진행 중이던 타이머를 정리한다. 언마운트 후
  `advanceTimersByTime`으로 `setState`가 더 불리지 않는다(FR-014, "act() 경고 없음").
- **C7** — `text === ""`이면 타이머를 만들지 않고 마운트 직후(첫 effect)
  `onDone`을 1회 호출한다(FR-002의 "제목 없는 일기"와 무관하게, 방어적).
- **C8** — `onDone`은 어떤 경로(자연 완료 C3 / skip C4 / 빈 문자열 C7)로도
  **총 1회**만 불린다. 같은 `text` 생애에서 두 번 불리지 않는다.

### 위반 주입 (방어 확인)

- `skipToEnd`를 무시하도록(그 분기 삭제) 바꾸면 **C4가 FAIL**한다.
- `onDone` 중복 가드를 제거하면 **C8이 FAIL**한다(자연 완료 직후 `skipToEnd`가
  참이 되는 순서에서 두 번 호출).
- 언마운트 시 `clearTimeout`/`clearInterval`을 빼면 **C6이 FAIL**한다(RNTL의
  act 경고 또는 "state update on unmounted component").

---

## C. 성능·지표 경계 (원칙 IV)

- **C9** — `TypewriterText`의 props·상태·렌더 출력 어디에도 **경과 시간·토큰
  수·글자 수 표시·속도 비교** 값이 없다. `charMs`는 입력 상수일 뿐 화면에
  렌더되지 않는다. (소스 `readFileSync` 검사: `charMs`가 JSX 텍스트로 안 나옴,
  `Date`·`performance`·`Date.now` 토큰 없음.)

### 타이포 위임 (I1)

- **C-TYPO** — `<TypewriterText variant="title" text="가나" />`로 렌더하면
  내부 `<AppText>`가 `variant="title"`을 받는다. `<TypewriterText variant="body"
  style={{ fontSize: 16 }} />`로 렌더하면 `<AppText>`가 그 `style`을 받는다
  (렌더된 노드의 스타일에 `fontSize: 16` 포함). `variant` 기본값은 `"body"`.
