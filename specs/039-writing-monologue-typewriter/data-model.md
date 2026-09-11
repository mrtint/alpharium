# Data Model: 생성 중 독백 문구 타자기 연출

**Feature**: 039-writing-monologue-typewriter | **Date**: 2026-09-11

이 기능은 새 엔티티·새 저장 필드를 만들지 않는다. 기존 값의 "화면
렌더 방식"만 바꾼다.

## 관련 기존 타입 (무변경)

### `AppScreen`의 `writing` 케이스 (`src/app/state.ts`)

```ts
{ kind: "writing"; stage?: ProgressStage; branch?: MonologueBranch; line?: string }
```

- `line`: 이 기능이 다루는 유일한 값. `pickMonologue()`가 고른 문구
  문자열, 또는 첫 진행 신호 전에는 `undefined`.
- **이 기능은 이 타입을 확장하지 않는다** — 새 필드(예: "현재 노출된
  글자 수")를 `AppScreen`에 추가하지 않는다. 노출 진행 상태는
  `TypewriterText` 내부의 로컬 `useState`(038이 이미 구현)에만 있다.

### `TypewriterTextProps` (`src/ui/components/TypewriterText.tsx`, 038)

```ts
type TypewriterTextProps = {
  text: string;
  charMs: number;
  skipToEnd: boolean;
  onDone: () => void;
  variant?: "title" | "body";
  style?: object;
  testID?: string;
};
```

- 이 기능에서 넘기는 값: `text={screen.line ?? "쓰고 있다"}`,
  `charMs={REVEAL.charMs}`, `skipToEnd={false}`(항상, US2),
  `onDone={() => {}}`(결정 3 — 무시), `variant="body"`.
- `key`는 `screen.line`(또는 폴백 문자열) 자체 — 값이 바뀔 때마다
  `TypewriterTextInner`가 리마운트되어 초기값(`count: 0`)부터 다시
  시작한다(038의 "Resetting state with a key" 패턴, research 결정 4).

## 상태 다이어그램 (컴포넌트 로컬, 038 재사용)

```
[line 값 A] --(리마운트, key 변경)--> [count: 0, 타이핑 시작]
     |                                        |
     |                              (charMs 간격으로 count 증가)
     |                                        |
     |                                        v
     |                              [count === length(A)]
     |                                        |
     |                              (완료 상태 유지, 결정 3)
     |                                        |
     v                                        v
[line 값 B로 갱신] ---------------------> [리마운트, 처음부터 B 시작]
```

- `line`이 `A`에서 완료되지 않은 채로 `B`로 바뀌어도(FR-002), key 변경이
  즉시 이전 인스턴스를 언마운트하고 새 인스턴스를 마운트하므로 "이어서
  채우기"가 구조적으로 불가능하다 — 038의 언마운트 시 `clearInterval`
  정리(C6 계약)가 그대로 적용된다.
