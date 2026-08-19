/**
 * 진단 화면에서 일기를 실제로 생성해 본다.
 *
 * 계약: specs/005-diary-generation/contracts/engine.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **quickstart D2·D3·D5·D6·D8이 이것으로 검증된다** — 실기기에서 일기가 실제로 나오는지,
 * 끊었다 돌아오면 다시 되는지, 얼마나 걸리는지, 사람이 읽었을 때 화자가 휴대폰인지.
 * 그 확인 없이는 이 기능이 검증되지 않은 상태다(헌법 원칙 V).
 *
 * **이 화면이 원칙 IV와 원칙 I을 동시에 어기기 쉬운 자리다**:
 *  - 오래 기다리므로 **「얼마나 남았나」를 넣고 싶어진다** → 그것이 원칙 IV의 지표다
 *    (FR-028a). `busy`가 불리언 하나인 것이 유일한 방어다
 *  - 생성 중인 글을 흘려 보여주고 싶어진다 → **판정을 통과하지 않은 글이 화면에 오른다**
 *    (FR-028b). 엔진이 토큰 콜백을 아예 넘기지 않으므로 그 경로가 코드에 없다
 *
 * **사용자용 화면이 아니다**(FR-027). 일기를 읽는 화면은 다음 기능이며, 여기서는
 * 생성이 도는 것을 확인할 뿐이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";

import { latestClosedDay } from "../config/day-boundary";
import type { Pipeline, PipelineStage } from "../diary/pipeline";
import type { Character, VisionSetting } from "../diary/types";
import type { GenerationResult } from "../inference/types";
import { isGenerationFailure } from "../inference/types";

/**
 * 실패를 **사용자가 할 수 있는 것**으로 옮긴다 (FR-017d·e).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **「되뱉었다」·「언어가 다르다」를 그대로 보이지 않는다**(원칙 III). 그것은 캐릭터 뒤의
 * 모델이 어떻게 실패했는지를 드러내는 말이며, 사용자는 모델을 모른다.
 *
 * 대신 **다시 시도할 만한가**를 말한다 — 003이 `ModelReadiness`를 넷으로 가른 이유가
 * "사용자에게 무엇을 하라고 말할 수 있어야 한다"였고 같은 판단이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function describeFailure(result: GenerationResult): string {
  if (!isGenerationFailure(result)) return "";

  switch (result.kind) {
    case "not-implemented":
      // 시각 설정이 none이 아닐 때다(FR-022).
      return "이 설정으로는 아직 일기를 쓸 수 없다";
    case "backend-unavailable":
      return "이 기기에서 일기를 쓸 수 없다";
    case "model-load-failed":
      return result.reason === "not-found"
        ? "고른 캐릭터를 먼저 준비해야 한다"
        : "고른 캐릭터를 준비하는 데 문제가 있다. 다시 받아야 할 수 있다";
    case "rejected":
      // **네 갈래를 하나로 옮긴다.** 무엇이 잘못됐는지가 아니라 무엇을 할 수 있는지다.
      return "일기가 제대로 나오지 않았다. 다시 시도해 볼 만하다";
    case "timed-out":
      return "시간이 너무 오래 걸려 멈췄다. 다시 시도해 볼 만하다";
    case "interrupted":
      return "앱을 떠나 있는 동안 멈췄다. 다시 시도할 수 있다";
    case "generation-failed":
      return "일기를 쓰는 중에 문제가 생겼다. 다시 시도해 볼 만하다";
  }
}

/**
 * 파이프라인 단계를 사용자가 할 수 있는 말로 옮긴다 (006 FR-029).
 *
 * **`generation`은 `describeFailure()`에 맡긴다** — 005가 이미 원칙 III을 지키도록
 * 갈래를 옮겨 두었고, 여기서 다시 쓰면 그 방어가 둘로 갈라진다.
 */
function describeStage(stage: PipelineStage, reason: string): string {
  switch (stage) {
    case "day-not-closed":
      return "아직 이르다. 하루가 끝나야 그날의 일기를 쓸 수 있다";
    case "already-running":
      return "이미 쓰고 있다";
    case "signals":
      return "그 하루의 신호를 가져오지 못했다";
    case "request-build":
      return "캐릭터를 먼저 골라야 한다";
    case "model-not-ready":
      return "고른 캐릭터를 먼저 준비해야 한다";
    case "storage":
      // **entry가 있으면 여기 오지 않는다** — 위에서 `unsaved` 표시로 갈린다.
      // 이 문구는 글 없이 저장만 실패한 경우의 대비책이다.
      return "일기를 저장하지 못했다. 다시 시도해 볼 만하다";
    case "generation":
      // 파이프라인이 `kind: detail` 꼴로 담아 온다. 005의 문구로 옮긴다.
      return describeGenerationReason(reason);
  }
}

/** `generation` 단계의 reason 문자열을 005의 사용자 문구로 옮긴다 */
function describeGenerationReason(reason: string): string {
  const kind = reason.split(":")[0]?.trim();
  const failures: Record<string, GenerationResult> = {
    "not-implemented": { kind: "not-implemented" },
    "backend-unavailable": { kind: "backend-unavailable", reason },
    "model-load-failed": { kind: "model-load-failed", reason: "load-failed" },
    rejected: { kind: "rejected", why: "empty" },
    "timed-out": { kind: "timed-out" },
    interrupted: { kind: "interrupted" },
    "generation-failed": { kind: "generation-failed", reason },
  };
  const failure = failures[kind ?? ""];
  return failure === undefined
    ? "일기를 쓰는 중에 문제가 생겼다. 다시 시도해 볼 만하다"
    : describeFailure(failure);
}

export type GenerationProbeProps = {
  /**
   * **006이 `backend`를 이것으로 바꿨다**(FR-010a).
   *
   * 어댑터를 직접 부르면 저장을 건너뛴다 — 그것이 일기가 하나도 남지 않은 원인이었다.
   */
  pipeline: Pipeline;
  /** 끊을 수 있으면 쓴다(005 FR-021b). 없어도 시간 한도가 결국 끊는다 */
  stop?: () => Promise<void>;
  character: Character;
  vision?: VisionSetting;
  /** "지금". 밖에서 받아야 경계값을 테스트할 수 있다(002 FR-018a) */
  now?: () => Date;
};

export function GenerationProbe({
  pipeline,
  stop,
  character,
  vision = "none",
  now = () => new Date(),
}: GenerationProbeProps) {
  /**
   * **「쓰고 있다」는 불리언 하나다**(FR-028a·b).
   *
   * 진행률·남은 시간·생성 중인 글을 담을 자리가 없다. **타입에 자리가 하나뿐인 것이
   * 유일한 방어다** — 003이 `DownloadProgress`에 시간 필드를 두지 않은 것과 같다.
   */
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  /**
   * **저장에 실패했는가**(006 FR-012b).
   *
   * `text`가 있는데 이것이 참이면 「보이지만 남지 않는다」는 상태다. 불리언 하나인
   * 이유는 `busy`와 같다 — 담을 자리가 없어야 다른 것이 끼어들지 않는다.
   */
  const [unsaved, setUnsaved] = useState(false);
  /**
   * 개발자용 갈래 표시 (FR-027).
   *
   * **사용자 문구와 분리되어 있다**(FR-017e) — 위의 `failure`는 「할 수 있는 것」이고
   * 이것은 「무엇이 일어났나」다. 진단 화면에만 나오며 사용자 경로가 아니다.
   */
  const [diagnosis, setDiagnosis] = useState<string | null>(null);

  /** 지금 도는 생성이 있는가. `AppState` 구독이 본다 */
  const running = useRef(false);

  /**
   * 앱이 앞을 벗어나면 끊는다 (FR-021b).
   *
   * **`stop()`이 `run()`을 거부시키지 않는다**(research §2) — 끊김은 `interrupted: true`인
   * 값으로 돌아오고, 판정이 `unfinished`로 거부한다. 그래서 여기서는 신호만 보내면 된다.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" && running.current) {
        // 실제 중단은 llama-port의 stop()이 한다. 멈추지 못해도 시간 한도가
        // 결국 끊으므로(FR-021) 실패를 알릴 것이 없다.
        void stop?.().catch(() => {});
      }
    });
    return () => subscription.remove();
  }, [stop]);

  const generate = useCallback(async () => {
    setBusy(true);
    setText(null);
    setFailure(null);
    setDiagnosis(null);
    setUnsaved(false);
    running.current = true;

    try {
      // "지금"을 여기서 읽는다 — 아래 계층은 하루를 인자로 받는다(FR-018a).
      const at = now();

      // **파이프라인이 신호 수집·요청 구성·생성·저장을 다 한다**(006 FR-010).
      // 어댑터를 직접 부르지 않는다 — 그것이 저장을 건너뛴 원인이었다.
      const result = await pipeline.run({
        // **오늘이 아니라 마지막으로 닫힌 하루다**(006 FR-030). `dayOf(at)`은 오늘이고
        // 오늘은 정의상 닫히지 않아 언제나 `day-not-closed`로 멈춘다.
        day: latestClosedDay(at),
        now: at,
        character,
        vision,
      });

      if (result.ok) {
        setText(result.entry.text);
        return;
      }

      // **저장 실패는 글이 있다**(006 FR-012a). 30초를 들인 글이고 다시 생성해도 같은
      // 글이 나오지 않으므로 읽을 기회를 빼앗지 않는다. 다만 남지 않는다는 것을
      // 함께 말한다(FR-012b) — 성공처럼 보이면 사용자는 일기가 남은 줄 안다.
      if (result.entry !== undefined) {
        setText(result.entry.text);
        setUnsaved(true);
        // **저장 실패 문구를 두 번 말하지 않는다.** 아래 `unsaved` 표시가 「저장하지
        // 못했다」와 「나가면 사라진다」를 함께 말하므로, 여기서 또 적으면 같은 말이
        // 화면에 둘이 된다.
        setDiagnosis(`${result.stage}: ${result.reason}`);
        return;
      }

      // **거부된 글은 어디에도 남지 않는다**(FR-017c) — 애초에 결과에 없다.
      setFailure(describeStage(result.stage, result.reason));

      // **진단 경로에는 갈래가 남는다**(FR-017e·FR-027). 사용자에게 가는 말은 「할 수
      // 있는 것」으로 옮기지만, 개발자가 실기기에서 **왜 멈췄는지** 모르면 고칠 수
      // 없다. 진단 화면에만 나오며 사용자 경로가 아니다.
      setDiagnosis(`${result.stage}: ${result.reason}`);
    } finally {
      running.current = false;
      // **성공·실패 어느 쪽으로 끝나도 표시가 사라진다**(FR-028c).
      setBusy(false);
    }
  }, [pipeline, character, vision, now]);

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>일기 생성</Text>

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void generate()}
        style={styles.button}
      >
        <Text>{busy ? "쓰고 있다…" : "일기 쓰기"}</Text>
      </Pressable>

      {/* **수치도 생성 중인 글도 없다**(FR-028a·b). 돌고 있다는 사실 하나뿐이다 */}
      {busy && <Text style={styles.status}>쓰고 있다</Text>}

      {failure !== null && <Text style={styles.failure}>{failure}</Text>}

      {/* **저장하지 못했다는 것과 사라진다는 것을 함께 말한다**(006 FR-012b) */}
      {unsaved && (
        <Text style={styles.failure}>저장하지 못했다. 앱을 나가면 이 일기는 사라진다</Text>
      )}

      {/* 개발자용. 사용자 경로가 아니다(FR-027) */}
      {diagnosis !== null && <Text style={styles.diagnosis}>진단: {diagnosis}</Text>}

      {text !== null && <Text style={styles.diary}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 8, marginTop: 8 },
  title: { fontSize: 12, opacity: 0.6 },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  status: { fontSize: 14, opacity: 0.7 },
  failure: { fontSize: 14 },
  diagnosis: { fontSize: 12, opacity: 0.5 },
  diary: { fontSize: 15, lineHeight: 22 },
});
