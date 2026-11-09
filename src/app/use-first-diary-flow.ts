/**
 * 첫 일기 흐름의 상태와 조립 (111, 규칙 문서 0장 D1·L2).
 *
 * 계약: specs/111-first-diary-branch/contracts/first-diary-flow.md HK1~HK4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `step === "done"`이 흐름의 끝을 읽는 **유일한 값**이다(AS5) — 다음 묶음(G4, 자동 쓰기 설정 창)은 이 값이 이번 실행에서 `done`이 된 때만
 * 보면 된다. 작명을 이번 실행에 하지 않은 실행은 `before`에 머문다.
 *
 * 쓰기는 파이프라인을 직접 돌리지 않고 **홈에 요청을 올린다**(`requestWrite`) — 혼잣말·그만두기·이어 하기·실패 기록을 홈이 그대로 갖는다.
 *
 * `entered`는 이 실행이 첫 일기 흐름에 들어갔다는 표식이다. 앱 열기 자동 쓰기(057)가 확인창 아래서 시작하지 않게 한다 — 첫 실행이 이긴다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { DayDate } from "../config/day-boundary";
import type { PipelineResult } from "../diary/pipeline";
import {
  firstDiaryNext,
  INITIAL_FIRST_DIARY,
  type FirstDiaryEvent,
  type FirstDiaryStep,
} from "../firstrun/first-diary";
import {
  firstWriteOutcome,
  type FirstDiaryMaterial,
  type FirstWriteSettled,
} from "./first-diary-material";

export type FirstDiaryRequestMark = { silencesFailure: (result: PipelineResult) => boolean };

export type FirstDiaryFlowDeps = {
  /** 재료를 읽는다. 던지면 못 읽은 것으로 본다 */
  readMaterial: () => Promise<FirstDiaryMaterial>;
  /** 홈에 쓰기 요청을 올리고 번호표를 돌려준다 */
  requestWrite: (day: DayDate, firstDiary: FirstDiaryRequestMark) => number;
  /** 첫 실패 — 정상 동작 확인을 다시 돌린다 */
  onRollBack: () => void;
};

export type FirstDiaryFlow = {
  step: FirstDiaryStep;
  entered: { readonly current: boolean };
  livenessPassed: () => void;
  livenessSkipped: () => void;
  confirm: () => void;
  later: () => void;
  onWriteSettled: (id: number, settled: FirstWriteSettled) => void;
};

export function useFirstDiaryFlow({
  readMaterial,
  requestWrite,
  onRollBack,
}: FirstDiaryFlowDeps): FirstDiaryFlow {
  const [step, setStep] = useState<FirstDiaryStep>(INITIAL_FIRST_DIARY.step);
  // 콜백이 렌더를 기다리지 않고 지금 상태를 읽는다 — 홈의 `silencesFailure`는 쓰기가 끝나는 그 차례에 물어 온다
  const state = useRef(INITIAL_FIRST_DIARY);
  const dispatch = useCallback((event: FirstDiaryEvent) => {
    state.current = firstDiaryNext(state.current, event);
    setStep(state.current.step);
    return state.current;
  }, []);

  const entered = useRef(false);
  const material = useRef<FirstDiaryMaterial | null>(null);
  const requestId = useRef<number | null>(null);

  const readRef = useRef(readMaterial);
  const rollBackRef = useRef(onRollBack);
  useEffect(() => {
    readRef.current = readMaterial;
    rollBackRef.current = onRollBack;
  }, [readMaterial, onRollBack]);

  useEffect(() => {
    if (step !== "reading") return;
    let alive = true;
    void readRef
      .current()
      .catch(() => null)
      .then((read) => {
        if (!alive) return;
        material.current = read;
        dispatch({ kind: "material-read", canAsk: read?.canAsk === true });
      });
    return () => {
      alive = false;
    };
  }, [step, dispatch]);

  const livenessPassed = useCallback(() => {
    entered.current = true;
    dispatch({ kind: "liveness-passed" });
  }, [dispatch]);

  const livenessSkipped = useCallback(() => {
    dispatch({ kind: "liveness-skipped" });
  }, [dispatch]);

  const silencesFailure = useCallback(
    (result: PipelineResult) =>
      firstWriteOutcome({ kind: "finished", result }) === "failed" && !state.current.rolledBack,
    [],
  );

  const confirm = useCallback(() => {
    const read = material.current;
    if (state.current.step !== "asking" || read === null) return;
    dispatch({ kind: "confirmed" });
    requestId.current = requestWrite(read.day, { silencesFailure });
  }, [dispatch, requestWrite, silencesFailure]);

  const later = useCallback(() => {
    dispatch({ kind: "later" });
  }, [dispatch]);

  const onWriteSettled = useCallback(
    (id: number, settled: FirstWriteSettled) => {
      if (requestId.current !== id) return;
      requestId.current = null;
      const next = dispatch({ kind: "write-settled", outcome: firstWriteOutcome(settled) });
      if (next.step === "before") rollBackRef.current();
    },
    [dispatch],
  );

  return { step, entered, livenessPassed, livenessSkipped, confirm, later, onWriteSettled };
}
