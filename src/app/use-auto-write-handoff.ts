/**
 * 앱 열기 자동 쓰기 판정이 홈에 넘겨 두는 날 (057 FR-014~FR-022 — 082가 `App.tsx`에서 옮겼다).
 *
 * 계약: specs/082-auto-write-claim-handoff/contracts/auto-write-open.md HO1~HO12
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 쓸 차례가 된 날이 있을 때 앱을 열면 홈이 쓰는 중으로 시작한다(보드 `6c` ③). 078부터 차례가 지난 날(놓친 어제 등)은 시도 창
 * 밖에서 열어도 쓴다 — iOS는 백그라운드가 창 안에 깨운다는 보장이 없어 이 경로가 주 경로다.
 *
 * 백그라운드와 **같은 판정**(`resolveAutoWrite` — 020 시도 창과 차례 · 사흘 중 안 쓴 날 · 사진 권한 · 053 재료)을 처음 그려질 때,
 * 설정이 바뀔 때, 앱이 앞으로 돌아올 때 한다. `AppState`는 「다시 판정할 때」의 신호일 뿐 입력이 아니다(057 FR-022). 쓸 날이
 * 나오면 홈에 넘기고, 홈이 054 제자리 쓰기로 시작한다(`runAutoDiaryTask`를 부르지 않는다 — 혼잣말·그만두기·토스트를 홈이
 * 그대로 갖는다). 사진 권한 건너뜀은 판정 안에서 기록되고 `onSkipped`로 설정의 보조 줄 상태도 바꾼다(057 FR-021).
 *
 * 이 훅은 판정 규칙을 갖지 않는다 — 언제·어느 날을 쓰는가는 `src/schedule/`이 정한다.
 *
 * ★ **넘겨 둔 날은 「지금 설정으로 한 가장 최근 판정」을 따른다**(082). 전에는 판정이 「쓴다」일 때만 값을 세우고 비우는 길이
 * 없었다 — 설정에서 자동 쓰기를 켰다 곧바로 꺼도 그 날이 남아, 설정을 닫는 순간 홈이 쓰기 시작했다(2026-10-14 실기기 재현).
 *  - 판정이 「쓴다」가 아니면 없음을 반영한다.
 *  - **설정이 바뀐 직후의 틈은 렌더에서 막는다**: 반영된 결과를 그 판정을 낳은 설정과 짝지어 들고, 지금 설정과 같은 참조일
 *    때만 돌려준다. 「꺼짐」 판정도 일기 목록을 읽는 비동기라, effect에서 비우기를 기다리면 그 사이 옛 날이 홈에 닿는다.
 *    effect의 의존성이 이미 설정의 참조이므로 「참조가 바뀌면 다시 판정한다」와 「참조가 다르면 옛 결과를 안 쓴다」가 같은
 *    기준이다.
 *  - 넘겨 둔 날이 없어져도 이미 시작한 쓰기는 멈추지 않는다 — 이 값은 홈의 「시작」에만 쓰인다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from "react";
import { AppState } from "react-native";

import type { DayDate } from "../config/day-boundary";
import { resolveAutoWrite } from "../schedule/auto-write";
import type { AutoDiarySettings } from "../schedule/settings";
import type { SkipStorePort } from "../schedule/skip-store";
import {
  attemptOutcomeOf,
  recordAttemptEnd,
  type AutoWriteAttemptPort,
  type LaunchState,
} from "./auto-write-attempts";
import { readLaunchState } from "./launch-state-port";
import type { AppPlatform } from "./platform";
import type { DayPreview } from "./state";

export type AutoWriteHandoffDeps = {
  /** 자동 쓰기 설정. 아직 읽지 못했으면 `null` — 판정하지 않는다 */
  settings: AutoDiarySettings | null | undefined;
  /** 파이프라인과 같은 신호 통로의 미리보기(064 — 흉내 미리보기가 아니다). 조립이 실패했으면 없다 */
  previewDay: ((day: DayDate) => Promise<DayPreview>) | undefined;
  skipPort: SkipStorePort | undefined;
  listDiaryDays: () => Promise<readonly DayDate[]>;
  /** 078 — 시도 기록. 없으면 남기지 않는다 */
  attemptPort?: AutoWriteAttemptPort | undefined;
  /** 사진 권한이 없어 건너뛴 날 */
  onSkipped?: ((day: DayDate) => void) | undefined;
  /** 「지금」 — 테스트가 갈아 끼운다 */
  now?: (() => Date) | undefined;
  /** 090 — 앱이 도는 플랫폼. 조립부가 `appPlatform(Platform.OS)`로 넘긴다(훅은 `Platform`을 읽지 않는다). 없으면 안드로이드 갈래(종전대로) */
  platform?: AppPlatform | undefined;
  /** 090 — 마운트 순간 앱이 앞에 있는가. 테스트가 갈아 끼운다 */
  launchState?: (() => LaunchState | undefined) | undefined;
};

const systemNow = () => new Date();

/** 반영된 판정 — 넘겨 둘 날(없으면 `null`)과, 그 판정을 낳은 설정 */
type Handed = { day: DayDate | null; settings: AutoDiarySettings };

export function useAutoWriteHandoff({
  settings,
  previewDay,
  skipPort,
  listDiaryDays,
  attemptPort,
  onSkipped,
  now = systemNow,
  platform,
  launchState = readLaunchState,
}: AutoWriteHandoffDeps): DayDate | null {
  const [handed, setHanded] = useState<Handed | null>(null);
  useEffect(() => {
    if (settings == null || previewDay === undefined || skipPort === undefined) return;
    let alive = true;
    // 이 effect 안에서 시작한 판정의 차례. 전경 복귀가 잇달아 오면 판정이 겹친다 — 가장 늦게 시작한 것만 반영한다(HO7).
    let latest = 0;
    const check = () => {
      const mine = ++latest;
      const at = now();
      void resolveAutoWrite({
        settings,
        now: at,
        listDiaryDays,
        previewDay,
        skipPort,
      })
        .then((decision) => {
          // 078 — 판정에 들어갔다는 사실을 남긴다. 화면이 닫힌 뒤여도 판정은 일어났으므로 `alive`와 무관하게 쓴다.
          if (attemptPort)
            void recordAttemptEnd(attemptPort, "app-open", at, attemptOutcomeOf(decision));
          if (!alive) return;
          // 건너뜀 알림은 차례(`mine`)를 보지 않는다 — 기록은 이미 디스크에 있고, 설정의 보조 줄은 그것을 따른다(057 그대로).
          if (decision.kind === "skip" && decision.because === "no-photo-access") {
            onSkipped?.(decision.day);
          }
          if (mine !== latest) return;
          // ★ 「쓰지 않는다」도 반영한다 — 앞 판정이 넘겨 둔 날을 지운다(HO4).
          setHanded({ day: decision.kind === "write" ? decision.day : null, settings });
        })
        // 판정이 던지면(일기 목록을 못 읽음) 아무것도 반영하지 않는다 — 앞의 결과가 그대로 선다. 겹친 판정 중 마지막이
        // 던지면 앞서 끝난 판정도 차례에 밀려 버려진 채다. 홈이 시작 직전에 「이미 쓴 날인가」를 자기 목록으로 다시 보므로
        // 남은 날이 덮어쓰기로 이어지지는 않는다.
        .catch(() => {});
    };
    // ★ 090 — iOS가 BGTask로 앱을 새로 띄우면 이 트리가 화면 없이 그려진다. 여기서 판정하면 보이지 않는 홈이 쓰기를 가져가고
    // 백그라운드 태스크는 「다른 쓰기가 진행 중」으로 곧바로 끝나 iOS가 앱을 멈춘다(078·080 남은 위험). 뒤에서 그려졌으면 첫 판정을
    // 앞으로 올 때(아래 `active`)로 미룬다. 안드로이드 헤드리스는 이 트리를 그리지 않으므로 종전대로다(078 — 콜드 스타트의 상태를
    // 재 보지 않았다). 「뒤」로 확실할 때만 미룬다 — 모르면 종전대로 판정한다.
    if (!(platform === "ios" && launchState() === "background")) check();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") check();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, [
    settings,
    previewDay,
    skipPort,
    listDiaryDays,
    attemptPort,
    onSkipped,
    now,
    platform,
    launchState,
  ]);

  // ★ 지금 설정으로 한 판정의 결과만 준다(HO5). 설정이 바뀐 그 렌더부터 새 판정이 반영될 때까지는 없음이다.
  return handed !== null && handed.settings === settings ? handed.day : null;
}
