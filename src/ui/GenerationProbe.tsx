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

import { dayOf, type DayDate } from "../config/day-boundary";
import type { Character, VisionSetting } from "../diary/types";
import { buildRequest } from "../diary/request";
import type { GenerationResult, InferenceBackend } from "../inference/types";
import { isGenerationFailure } from "../inference/types";
import type { DaySignals } from "../signals/types";

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

export type GenerationProbeProps = {
  /** 끊을 수 있으면 `stop()`을 쓴다(FR-021b). 없어도 시간 한도가 결국 끊는다 */
  backend: InferenceBackend & { stop?: () => Promise<void> };
  loadSignals: (day: DayDate) => Promise<DaySignals | null>;
  character: Character;
  vision?: VisionSetting;
};

export function GenerationProbe({
  backend,
  loadSignals,
  character,
  vision = "none",
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
        void backend.stop?.().catch(() => {});
      }
    });
    return () => subscription.remove();
  }, [backend]);

  const generate = useCallback(async () => {
    setBusy(true);
    setText(null);
    setFailure(null);
    setDiagnosis(null);
    running.current = true;

    try {
      // "지금"을 여기서 읽는다 — 아래 계층은 하루를 인자로 받는다(FR-018a).
      const day = dayOf(new Date());
      const signals = await loadSignals(day);
      if (signals === null) {
        setFailure("그 하루의 신호를 가져오지 못했다");
        return;
      }

      const request = buildRequest(signals, character, vision);
      if (!request.ok) {
        setFailure("캐릭터를 먼저 골라야 한다");
        return;
      }

      const result = await backend.generate(request.request);

      if (isGenerationFailure(result)) {
        // **거부된 글은 어디에도 남지 않는다**(FR-017c) — 애초에 결과에 없다.
        setFailure(describeFailure(result));

        // **진단 경로에는 갈래가 남는다**(FR-017e·FR-027). 사용자에게 가는 말은 「할 수
        // 있는 것」으로 옮기지만, 개발자가 실기기에서 **왜 거부됐는지** 모르면 고칠 수
        // 없다. 이 줄은 화면이 아니라 로그로만 가므로 원칙 III을 어기지 않는다.
        setDiagnosis(
          result.kind === "rejected" ? `rejected: ${result.why}` : result.kind,
        );
        return;
      }

      setText(result.text);
    } finally {
      running.current = false;
      // **성공·실패 어느 쪽으로 끝나도 표시가 사라진다**(FR-028c).
      setBusy(false);
    }
  }, [backend, loadSignals, character, vision]);

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
