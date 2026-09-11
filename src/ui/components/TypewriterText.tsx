/**
 * 038 — 완성된 문자열을 글자 단위로 흘리는 순수 표시 컴포넌트.
 *
 * 계약: specs/038-typewriter-diary-reveal/contracts/typewriter-text.md B (C1~C9,
 *       C-TYPO)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **연출 대상은 이미 판정 통과·저장 완료된 문자열이다** — 헌법 원칙 IV(005
 * FR-028b)가 금하는 "생성 중인 글"이 아니다. 이 컴포넌트는 그 사실을 모르고
 * `text` 문자열 하나만 받는다(모델·도메인 import 0).
 *
 * `graphemeSlice`로 글자를 자른다 — 코드포인트 경계 안전(FR-009). `setState` +
 * 타이머로 충분하다(reanimated 불필요, research 결정 2) — 투명도·변형 전환이
 * 아니라 표시 문자열의 교체이기 때문이다.
 *
 * **`text`가 바뀌면 내부 컴포넌트를 `key`로 다시 마운트한다**(C5) — React
 * 공식 패턴("Resetting state with a key", react.dev). 렌더 중 `ref` 비교로
 * 리셋하거나 effect 안에서 무조건 `setCount(0)`을 부르는 방식은 각각 eslint
 * `react-hooks/refs`·`react-hooks/set-state-in-effect`에 걸린다(실측) — 둘 다
 * "state를 prop에서 파생시키는" React 안티패턴의 증상이었다. `key`가 진짜
 * 해법이다: 새 `text`마다 완전히 새로운 인스턴스로 시작해 초기값 계산만으로
 * 리셋이 성립한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from "react";
import type { TextStyle } from "react-native";

import { graphemeLength, graphemeSlice } from "../text/grapheme-slice";
import { AppText, type TextVariant } from "./Text";

export type TypewriterTextProps = {
  /** 완성 문자열 (판정 통과·저장 완료분). */
  text: string;
  /** 글자당 노출 간격 (ms). 호출부가 `REVEAL.charMs`를 넘긴다. */
  charMs: number;
  /** 참이 되는 순간 즉시 전체 노출 + `onDone` 1회. */
  skipToEnd: boolean;
  /** 전체 노출이 끝났을 때(자연 완료 또는 skip) 정확히 1회 호출된다. */
  onDone: () => void;
  /** `AppText`의 `TextVariant` 전체를 받는다 — "title"/"body"로 좁히지 않는다(C-TYPO). */
  variant?: TextVariant;
  style?: TextStyle;
  testID?: string;
};

export function TypewriterText(props: TypewriterTextProps) {
  // key={text} — text가 바뀌면 아래 내부 컴포넌트가 통째로 새로 마운트된다.
  return <TypewriterTextInner key={props.text} {...props} />;
}

function TypewriterTextInner({
  text,
  charMs,
  skipToEnd,
  onDone,
  variant,
  style,
  testID,
}: TypewriterTextProps) {
  const [count, setCount] = useState(0);
  const doneRef = useRef(false);
  const total = graphemeLength(text);

  // 빈 문자열은 타이머 없이 즉시 완료(C7). 마운트당 한 번만 — `text`는 이
  // 컴포넌트 생애 동안 안 바뀐다(부모가 `key`로 리마운트를 대신하므로).
  useEffect(() => {
    if (text === "" && !doneRef.current) {
      doneRef.current = true;
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // skipToEnd → 즉시 전체 + onDone(C4).
  useEffect(() => {
    if (skipToEnd && !doneRef.current && text !== "") {
      setCount(total);
      doneRef.current = true;
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipToEnd]);

  // 타이머 진행(C1·C2). 완료되면 정지, 언마운트 시 정리(C6).
  useEffect(() => {
    if (text === "" || doneRef.current || skipToEnd) return;

    const id = setInterval(() => {
      setCount((prev) => Math.min(prev + 1, total));
    }, charMs);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charMs]);

  /*
   * 완료 판정·`onDone` 호출은 별도 effect에서(C3) — `setCount`의 updater
   * 함수 안에서 다른 컴포넌트의 setState(`onDone`)를 부르면 React가 "렌더
   * 중 다른 컴포넌트를 갱신했다"고 경고하고(실측), fake timer 환경에서는
   * updater가 동기로 실행된다는 보장도 없다(C13 통합 테스트에서 실측). `count`
   * 값 자체를 effect로 관찰하는 편이 React 렌더 사이클과 맞는다.
   */
  useEffect(() => {
    if (text !== "" && count >= total && !doneRef.current) {
      doneRef.current = true;
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, total]);

  return (
    <AppText variant={variant} style={style} testID={testID}>
      {graphemeSlice(text, count)}
    </AppText>
  );
}
