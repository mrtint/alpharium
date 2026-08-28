/**
 * 사용자 경로의 화면 전환.
 *
 * 계약: specs/006-first-diary-app/contracts/screens.md, data-model.md §3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **네비게이션 라이브러리를 들이지 않는다**(research.md §5).
 *
 * 화면이 셋뿐이고(목록·상세·쓰는 중) 전이가 단순하다. `expo-router`나
 * `react-navigation`은 네이티브 의존을 더하고, **그러면 release 빌드에서 처음 도는 것을
 * 확인해야 할 표면이 넓어진다** — 이 기능의 가장 큰 미확인 영역이 바로 거기다.
 *
 * **판단은 `src/app/state.ts`가 하고 여기서는 그리기만 한다.** 그래야 전이 규칙이
 * 기기 없이 검증된다(SC-023) — 002가 `readinessOf`를, 005가 `acceptance`를 순수 함수로
 * 둔 것과 같은 구조다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  afterGeneration,
  cancelOverwrite,
  confirmOverwrite,
  initialScreen,
  startWriting,
  toDetail,
  toFailed,
  toList,
  writePromptFor,
  type AppScreen,
  type DiaryListItem,
} from "../app/state";
import type { SelectionState } from "../app/selection";
import { dayOf, isDayWritable, type DayDate } from "../config/day-boundary";
import type { EnvironmentResolution } from "../config/types";
import { pickMonologue } from "../diary/monologue";
import { personaOf } from "../diary/persona";
import type { Pipeline } from "../diary/pipeline";
import type { DiaryStore } from "../diary/store";
import { listDiaries } from "../diary/store";
import type { Character, VisionSetting } from "../diary/types";
import type { VisionOutcome } from "../vision/types";
import { BuildErrorScreen } from "./BuildErrorScreen";
import { DiaryDetailScreen } from "./DiaryDetailScreen";
import { DiaryListScreen } from "./DiaryListScreen";
import { OverwriteConfirmScreen } from "./OverwriteConfirmScreen";

export type DiaryHomeScreenProps = {
  resolution: EnvironmentResolution;
  /** 조립이 실패했으면 없다 — 그때는 `build-error`로 간다(FR-035a) */
  pipeline?: Pipeline;
  store: DiaryStore;
  /**
   * 누가 쓰는가 (007 FR-002).
   *
   * **`Character`가 아니라 `SelectionState`다** — 「고른 것이 없다」와 「옮겨졌다」가
   * 캐릭터 하나로는 표현되지 않는다. 006은 `character`를 받아 없으면 `"quiet"`으로
   * 채웠는데, **그것이 「말없이 집는 것」의 마지막 흔적이었다**(FR-008).
   */
  selection: SelectionState;
  /** 고를 수 있는 자리들. 고르는 화면에 그대로 넘어간다(FR-007 — 모델 정보가 없다) */
  characters?: readonly { character: Character; ready: boolean }[];
  onSelectCharacter?: (character: Character) => void;
  /** 지금 고른 사진 설정 (011 FR-015). 고른 적이 없으면 「보지 않음」이다(FR-018) */
  vision?: VisionSetting;
  /**
   * 사진 설정을 고른다 (011 FR-015).
   *
   * ⚠️ **이 통로가 끊기면 화면에서 골라도 언제나 「보지 않음」이 쓰인다.** 007의 `stop`,
   * 008의 버려진 반환값, 009의 `day:` 한 줄과 같은 종류의 조용한 실패다 —
   * 오류가 나지 않고 아무 일도 일어나지 않을 뿐이다.
   */
  onSelectVision?: (vision: VisionSetting) => void;
  /**
   * 장소명 설정을 켜고 끈다 (017 FR-004~006).
   *
   * **옵셔널이다** — `onSelectVision?`과 같은 방식으로 계약을 넓힌다.
   */
  onToggleGeocoding?: (enabled: boolean) => void;
  /** 지금 장소명 설정. **기본값은 꺼짐이다**(FR-004) */
  geocodingEnabled?: boolean;
  /** 생성을 끊는 통로(005 FR-014b). 앱이 앞을 벗어날 때 쓴다 */
  stop?: () => Promise<void>;
  /**
   * 캐릭터·날짜가 정해지면 미리 준비를 시작하는 통로 (018,
   * contracts/prewarm-engine.md). **읽을 사진이 없는 날에만 부른다**
   * (FR-005) — `vision === "none"`이면 `generate()`가 VLM을 절대 열지
   * 않으므로 E1을 어길 위험이 없다.
   *
   * **옵셔널이다** — `stop?`과 같은 방식으로 계약을 넓힌다. 배선이 끊겨도
   * 앱이 죽지 않고 "느릴 뿐" 정상 동작한다(FR-007).
   */
  prepare?: (character: Character) => Promise<void>;
  /** 준비해 둔 것을 놓아준다 (018, FR-008). 화면 이탈·백그라운드 전환 시 쓴다 */
  release?: () => Promise<void>;
  /**
   * 사진만 미리 읽는 통로 (018 2단계, FR-006). 사진이 있는 날에는 이 결과가
   * 끝난 뒤에만 `prepare()`를 부른다(E1·E15) — 두 엔진이 동시에 열리지
   * 않게 순서를 이 화면이 지킨다.
   *
   * **옵셔널이다** — `prepare?`와 같은 방식으로 계약을 넓힌다.
   */
  captionDay?: (
    day: DayDate,
    character: Character,
    vision: VisionSetting,
  ) => Promise<VisionOutcome>;
  /** "지금". 밖에서 받아야 경계값을 테스트할 수 있다(002 FR-018a) */
  now?: () => Date;
  /** 캐릭터 준비 화면으로 가는 길 (FR-028). 없으면 안내만 하고 길은 주지 않는다 */
  onGoToCharacters?: () => void;
  /**
   * 알림을 눌러 열렸으면 그 하루 (020, FR-006·SC-004).
   *
   * 주어지면 목록을 건너뛰고 그 하루의 상세를 첫 화면으로 만든다 — 탭 1회로
   * 상세에 도달한다. 목록에 없거나 못 읽으면 조용히 목록으로 떨어진다
   * (`initialScreen`이 판정, 원칙 V).
   */
  initialDay?: DayDate | null;
  /**
   * 그 하루의 일기를 사용자가 확인했음을 기록한다 (020, FR-007 (2)).
   *
   * 상세에 진입하면(알림 경로든 목록 탭이든) 그 날짜의 `notified` 엔트리를
   * `acknowledged: true`로 만들어, 이후 재시도 재생성에도 알림이 뜨지 않게
   * 한다. **옵셔널이다** — 배선이 없어도 앱은 동작한다.
   */
  onAcknowledge?: (day: DayDate) => void;
};

export function DiaryHomeScreen({
  resolution,
  pipeline,
  store,
  selection,
  characters,
  onSelectCharacter,
  vision = "none",
  onSelectVision,
  onToggleGeocoding,
  geocodingEnabled,
  stop,
  prepare,
  release,
  captionDay,
  now = () => new Date(),
  onGoToCharacters,
  initialDay,
  onAcknowledge,
}: DiaryHomeScreenProps) {
  const [screen, setScreen] = useState<AppScreen>(() => initialScreen(resolution, []));

  /**
   * 사용자가 고른 하루 (009 FR-006). `null`이면 고른 적이 없다는 뜻이고 그때
   * 기본값(마지막으로 닫힌 하루)을 쓴다(FR-007).
   *
   * ─────────────────────────────────────────────────────────────────────────
   * **★ 파일에 남기지 않는다**(FR-010, W3). 007의 캐릭터 선택은
   * `files/preferences/`에 남지만 하루는 **의도적으로 다르다** — 시간이 지나면
   * 범위를 벗어나므로 **저장된 값이 오히려 틀린 값이 된다.**
   *
   * **「범위 밖이라 되돌려졌다」를 여기 두지 않는다.** 그것은 상태가 아니라
   * `writePromptFor()`가 매번 다시 계산하는 판정의 결과다(FR-009a).
   * ─────────────────────────────────────────────────────────────────────────
   */
  const [chosenDay, setChosenDay] = useState<DayDate | null>(null);

  /** 지금 도는 생성이 있는가. `AppState` 구독이 본다 */
  const running = useRef(false);

  /**
   * 사용자가 그만두었는가 (007 FR-014a).
   *
   * **끊긴 생성의 결과를 화면에 올리지 않기 위한 표식이다.** `stopCompletion()`이
   * 부분 결과를 담아 정상 resolve하므로, 이것이 없으면 그 글이 `afterGeneration()`을
   * 거쳐 화면에 오를 수 있다.
   */
  const cancelled = useRef(false);

  /** 목록을 다시 읽는다. 성공·실패 뒤 돌아올 때마다 부른다(FR-022) */
  const refresh = useCallback(async (): Promise<DiaryListItem[]> => {
    try {
      return await listDiaries(store);
    } catch {
      // 목록을 못 읽어도 화면이 무너지지 않는다. 빈 목록이 아니라 「없다」로 보인다.
      return [];
    }
  }, [store]);

  // 화면이 뜬 뒤 한 번 읽는다. 언마운트된 뒤에는 반영하지 않는다.
  //
  // 020 — `initialDay`가 있으면(알림을 눌러 열렸으면) 그 하루의 일기를 함께
  // 읽어 `initialScreen`에 넘긴다. `initialScreen`이 목록에 그 하루가 있고
  // 읽혔을 때만 상세를 첫 화면으로 만든다(FR-006). 상세로 갔으면
  // `onAcknowledge`로 확인 처리한다(FR-007 (2)).
  useEffect(() => {
    let alive = true;
    void (async () => {
      const items = await refresh();
      const entry =
        initialDay != null && items.some((i) => i.day === initialDay && i.readable)
          ? await store.load(initialDay).catch(() => null)
          : null;
      if (!alive) return;
      const next = initialScreen(resolution, items, { initialDay, entry });
      setScreen(next);
      if (next.kind === "detail") onAcknowledge?.(next.day);
    })();
    return () => {
      alive = false;
    };
  }, [refresh, resolution, initialDay, store, onAcknowledge]);

  /**
   * 앱이 앞을 벗어나면 끊는다 (005 FR-014b) / 준비를 놓아준다 (018 FR-008).
   *
   * **`stop()`이 생성을 거부시키지 않는다** — 끊김은 `interrupted: true`인 값으로
   * 돌아오고 판정이 거부한다. 여기서는 신호만 보낸다.
   *
   * **018 — 생성이 도는 중에는 release()를 부르지 않는다.** 방금 `prepare()`가
   * 연 컨텍스트를 `generate()`의 `load()`가 재사용해야 하므로, 생성 중에
   * 놓아주면 그 재사용이 무의미해진다 — `running.current`로 가른다.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        if (running.current) {
          void stop?.().catch(() => {});
        } else {
          void release?.().catch(() => {});
        }
      }
    });
    return () => subscription.remove();
  }, [stop, release]);

  /**
   * 캐릭터·날짜가 정해지면 미리 준비를 시작한다 (018, FR-005).
   *
   * **읽을 사진이 없는 날에만 부른다** — `vision === "none"`이면
   * `generate()`가 VLM을 절대 열지 않으므로(on-device.ts의 `request.vision
   * !== "none"` 게이트) 이 준비가 사진 읽기와 겹칠 위험이 없다(E1). 사진이
   * 있는 날의 준비는 2단계(User Story 2)가 사진 읽기 완료 후에 별도로
   * 다룬다.
   *
   * **목록 화면에 있고, 캐릭터를 고른 상태일 때만** 부른다 — 쓰는 중이거나
   * 다른 화면으로 전환된 뒤에는 새로 준비할 이유가 없다.
   */
  useEffect(() => {
    if (screen.kind !== "list") return;
    if (selection.kind === "none") return;
    if (vision !== "none") return;

    void prepare?.(selection.character).catch(() => {});
  }, [screen.kind, selection, vision, chosenDay, prepare]);

  /**
   * 사진이 있는 날의 미리 읽기 (018 2단계, FR-006).
   *
   * **어떤 날짜를 위한 것인지와 함께 들고 있는다.** 진행 중이던 요청의
   * 결과가 나중에 도착해도, 그사이 날짜가 바뀌었으면 버린다(FR-009) —
   * 009가 「범위 밖이면 되돌린다」를 매 렌더 재판정으로 처리한 것과 같은
   * 원리를 여기서는 "이 결과가 지금 day에 대한 것인가"로 재사용한다.
   */
  const captionRef = useRef<{ day: DayDate; promise: Promise<VisionOutcome> } | null>(null);

  useEffect(() => {
    if (screen.kind !== "list") return;
    if (selection.kind === "none") return;
    if (vision === "none") return;
    if (captionDay === undefined) return;

    const { day } = writePromptFor(screen.items, now(), chosenDay);
    if (captionRef.current?.day === day) return; // 이미 이 날짜를 위해 돌고 있다

    const character = selection.character;
    const promise = captionDay(day, character, vision);
    captionRef.current = { day, promise };

    // 사진 읽기가 끝난 뒤에만 준비를 시작한다(E1·E15) — 두 엔진이 동시에
    // 열리지 않게 이 화면이 순서를 지킨다.
    void promise
      .then(() => {
        // 그사이 날짜가 바뀌었으면(이 요청이 stale해졌으면) 준비하지 않는다.
        if (captionRef.current?.day !== day) return;
        return prepare?.(character);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- screen.items는 매 렌더 새 배열이라 넣으면 무한 루프가 된다. day 판정에 필요한 입력(now, chosenDay, screen.kind)만 의존성으로 둔다.
  }, [screen.kind, selection, vision, chosenDay, captionDay, prepare, now]);

  const openItem = useCallback(
    async (item: DiaryListItem) => {
      // **읽지 못하면 빈 일기를 지어내지 않는다**(FR-017a). 판단은 state.ts가 한다.
      const entry = item.readable ? await store.load(item.day).catch(() => null) : null;
      const next = toDetail(item, entry);
      setScreen(next);
      // 020 — 상세를 실제로 열었으면 그 하루의 알림을 확인 처리한다(FR-007 (2)).
      if (next.kind === "detail") onAcknowledge?.(next.day);
    },
    [store, onAcknowledge],
  );

  const backToList = useCallback(async () => {
    setScreen(toList(await refresh()));
  }, [refresh]);

  /**
   * 실제로 생성을 돌린다.
   *
   * **★ 저장 상태를 보지 않는다**(S1, 원칙 I). 목록에 그 하루가 이미 있어도 **언제나
   * 실제 생성을 돈다** — 「이미 있으면 보여준다」는 지름길을 만들면 저장된 것이 생성을
   * 대신하고, 그 순간 헌법 원칙 I이 깨진다.
   *
   * **012 — `write()`(누름 핸들러)와 `confirmOverwrite`(확인 버튼) 둘 다 이것을
   * 부른다.** `day`를 인자로 받되, 그 값의 유일한 출처는 `writePromptFor()`가
   * 돌려준 것이다(009 W1·W2, FR-017) — 이 함수 자체가 하루를 다시 계산하지 않는다.
   */
  const generate = useCallback(
    async (day: DayDate) => {
      if (pipeline === undefined || selection.kind === "none") return;

      setScreen({ kind: "writing" });
      running.current = true;
      cancelled.current = false;

      try {
        const at = now();

        // 018 — 이 날짜를 위해 미리 읽어 둔(또는 아직 읽는 중인) 사진이
        // 있으면 다시 읽지 않고 그 결과를 기다린다(FR-006a, E16). 진행
        // 중이던 읽기를 취소하거나 새로 시작하지 않는다.
        let seen: VisionOutcome | undefined;
        if (captionRef.current?.day === day) {
          seen = await captionRef.current.promise.catch(() => undefined);
        }
        const seenVision = seen?.kind === "seen" ? seen.vision : undefined;

        const result = await pipeline.run(
          {
            day,
            now: at,
            character: selection.character,
            vision,
            ...(seenVision !== undefined ? { seen: seenVision } : {}),
          },
          // 015 — 진행 신호가 오면 독백 문구를 고른다. 예외를 던지지 않는 얇은
          // 콜백이다(contracts/progress-signal.md 불변식 3).
          //
          // 016 — 로드 시작 신호("load", branch 없음)에서는 상태를 갱신하지
          // 않는다(research.md §2) — 아직 콜드/핫을 모르므로 보여줄 문구가
          // 없다, 이전 단계 문구를 그대로 유지한다.
          (stage, branch) => {
            if (stage === "load" && branch === undefined) return;

            setScreen((s) => {
              if (s.kind !== "writing") return s;
              const characterName =
                stage === "load" ? personaOf(selection.character).name : undefined;
              const line = pickMonologue(stage, branch, s.line, characterName);
              return { ...s, stage, branch, line };
            });
          },
        );

        // ─────────────────────────────────────────────────────────────────────
        // **★ 그만두었으면 결과를 버린다**(FR-014a).
        //
        // `stopCompletion()`은 생성을 거부시키지 않고 **거기까지 만들어진 글이 담긴
        // 결과로 정상 resolve된다**(2026-08-17 실측). 「끊었으니 글이 없다」가 성립하지
        // 않으므로 **명시적으로 버려야 한다** — `afterGeneration()`을 부르지 않는다.
        //
        // 판정 계층도 같은 것을 막지만(끊긴 글은 `rejected: unfinished`가 되어
        // `entry`가 실리지 않는다) **이중 방어다.**
        // ─────────────────────────────────────────────────────────────────────
        if (cancelled.current) return;

        setScreen(afterGeneration(result));
      } finally {
        running.current = false;
      }
    },
    [pipeline, selection, vision, now],
  );

  /**
   * 「일기 쓰기」를 누른다.
   *
   * ─────────────────────────────────────────────────────────────────────────
   * **★ 넘길 하루는 판정 함수가 돌려준 것뿐이다**(009 W1·W2, FR-017).
   *
   * 006~008은 여기가 `latestClosedDay(at)`였다. **그대로 두면 화면에서 하루를
   * 골라도 언제나 어제가 쓰이고 오류는 나지 않는다** — 006의 `GenerationProbe`,
   * 007의 끊긴 `stop` 배선과 같은 종류의 조용한 실패다.
   *
   * **`prompt.day`는 정의상 `selectable` 안에 있으므로**(불변식 I1) 범위 밖
   * 하루가 생성으로 갈 통로가 없다. 파이프라인에 `day-too-old` 갈래를 더하지
   * 않은 이유가 이것이다 — 「사흘」은 009의 값이고 파이프라인은 002의 계약이다.
   *
   * **고른 하루가 범위 밖이면 여기서 기본값이 된다.** 말없이 바뀌는 것이
   * 아니라 화면도 같은 판정을 보고 되돌림을 알리고 있다(FR-009).
   *
   * **012 — 이미 있으면 곧바로 생성하지 않고 확인을 거친다**(`startWriting()`,
   * contracts/overwrite-confirm.md §1). `WritePrompt.overwrites`를 재사용한다.
   * ─────────────────────────────────────────────────────────────────────────
   */
  const write = useCallback(async () => {
    // **고른 것이 없으면 쓰지 않는다**(FR-006). 006은 없을 때 `"quiet"`으로 채워
    // 파이프라인이 `model-not-ready`로 멈추게 두었지만, 그것은 **고르지도 않은
    // 캐릭터로 쓰려 든 것**이다. 여기서 먼저 가른다.
    if (selection.kind === "none") {
      setScreen(toFailed("캐릭터를 먼저 준비해야 한다"));
      return;
    }

    // **화면이 그린 것과 같은 재료로 판정한다.** 목록이 아니면 빈 배열이며,
    // 그때는 덮어쓸 일기도 없다 — 고를 수 있는 하루는 `now`만으로 정해진다.
    const items = screen.kind === "list" ? screen.items : [];
    const prompt = writePromptFor(items, now(), chosenDay);
    const next = startWriting(prompt);

    if (next.kind === "confirm-overwrite") {
      setScreen(next);
      return;
    }

    await generate(prompt.day);
  }, [selection, screen, now, chosenDay, generate]);

  /**
   * 생성을 그만둔다 (007 FR-013~015).
   *
   * **결과를 기다리지 않는다**(contracts/screens.md §2). `stop()`이 듣지 않을 수도
   * 있고 그때도 사용자는 목록으로 돌아갈 수 있어야 한다.
   */
  const cancel = useCallback(async () => {
    cancelled.current = true;

    // 예외를 삼킨다 — 이미 끝난 생성을 멈추려는 것은 오류가 아니다(005 engine-port).
    await stop?.().catch(() => {});

    setScreen(toList(await refresh()));
  }, [stop, refresh]);

  /**
   * 생성 중 하드웨어 뒤로 가기 (007 FR-016, contracts/screens.md §3).
   *
   * **말없이 목록으로 빠져나가지 않는다.** 빠져나가면 생성이 화면 뒤에 남아 사용자가
   * 통제할 수 없고, 그러면 「그만두기」를 만든 의미가 없어진다 — 그만두기와 **같은
   * 결과**로 만든다.
   *
   * `true`를 돌려주면 기본 동작(앱 닫기·뒤로)이 막힌다.
   */
  useEffect(() => {
    if (screen.kind !== "writing") return;

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      void cancel();
      return true;
    });
    return () => subscription.remove();
  }, [screen.kind, cancel]);

  switch (screen.kind) {
    case "build-error":
      return <BuildErrorScreen />;

    case "list":
      return (
        <DiaryListScreen
          characters={characters}
          items={screen.items}
          onOpen={(item) => void openItem(item)}
          onSelectCharacter={onSelectCharacter}
          onSelectDay={setChosenDay}
          onSelectVision={onSelectVision}
          onToggleGeocoding={onToggleGeocoding}
          geocodingEnabled={geocodingEnabled}
          onWrite={() => void write()}
          selection={selection}
          // **012 — 새 판정을 만들지 않고 isDayWritable()을 재사용한다**
          // (contracts/day-boundary.md §4 「계산 위치」, 헌법 원칙 II MUST).
          todayNotYetWritable={!isDayWritable(dayOf(now()), now())}
          vision={vision}
          // **쓰기 자리에 무엇이 일어날지 싣는다**(FR-023·024). `onWrite`는 이것을
          // 보지 않으므로 원칙 I의 방어가 유지된다(FR-025).
          write={writePromptFor(screen.items, now(), chosenDay)}
        />
      );

    case "detail":
      return (
        <Frame onBack={() => void backToList()}>
          <DiaryDetailScreen entry={screen.entry} />
        </Frame>
      );

    case "confirm-overwrite":
      return (
        <OverwriteConfirmScreen
          day={screen.day}
          onCancel={() => {
            void refresh().then((items) => setScreen(cancelOverwrite(items)));
          }}
          onConfirm={() => {
            setScreen(confirmOverwrite());
            void generate(screen.day);
          }}
        />
      );

    case "unreadable":
      return (
        <Frame onBack={() => void backToList()}>
          <View style={styles.notice}>
            <Text style={styles.day}>{screen.day}</Text>
            {/* **「일기가 없다」와 다른 상태다**(S3, 원칙 V) */}
            <Text style={styles.noticeText}>이 날의 일기를 읽을 수 없다.</Text>
            <Text style={styles.hint}>파일이 손상됐다. 그 하루를 다시 쓸 수 있다.</Text>
          </View>
        </Frame>
      );

    case "writing":
      return (
        <View style={styles.center}>
          {/*
            **회전 표시는 생성 상태를 담지 않는다**(007 FR-010, 원칙 IV).
            `ActivityIndicator`에는 **진행률을 넣을 파라미터가 없다** — `animating`·
            `color`·`hidesWhenStopped`·`size`뿐이다(2026-08-20 설치본 확인).
            담고 싶어도 담을 자리가 없는 것이 이 선택의 방어다.
          */}
          <ActivityIndicator accessibilityLabel="쓰고 있다" size="large" />

          {/* **수치도 생성 중인 글도 없다**(FR-011·010b·012). 015 — 첫 진행
              신호가 오기 전에는 screen.line이 undefined이므로 기존 문구를
              그대로 보인다(FR-011). */}
          <Text style={styles.writing}>{screen.line ?? "쓰고 있다"}</Text>

          {/* **그만둘 수 있다**(FR-013). 30초를 견디는 데 필요한 나머지 절반이다 */}
          <Pressable accessibilityRole="button" onPress={() => void cancel()} style={styles.link}>
            <Text>그만두기</Text>
          </Pressable>
        </View>
      );

    case "written":
      return (
        <Frame onBack={() => void backToList()}>
          <DiaryDetailScreen
            entry={screen.entry}
            saved={screen.saved}
            overwrote={screen.overwrote}
          />
        </Frame>
      );

    case "failed":
      return (
        <Frame onBack={() => void backToList()}>
          <View style={styles.notice}>
            {/* **거부된 글은 여기 없다**(S2) — 애초에 화면 상태에 담기지 않는다 */}
            <Text style={styles.noticeText}>{screen.message}</Text>

            {/*
              **캐릭터를 준비해야 하는 실패면 그리로 가는 길을 준다**(FR-028).
              「준비해야 한다」고만 말하고 갈 곳을 주지 않으면 사용자가 헤맨다 —
              003의 목록이 이미 있으므로 그것을 가리킨다.
            */}
            {onGoToCharacters !== undefined && /준비/.test(screen.message) && (
              <Pressable accessibilityRole="button" onPress={onGoToCharacters} style={styles.link}>
                <Text>캐릭터 준비하러 가기</Text>
              </Pressable>
            )}
          </View>
        </Frame>
      );
  }
}

/** 뒤로 갈 수 있는 화면의 껍데기. 하드웨어 뒤로 가기는 목록에서만 앱을 닫는다 */
function Frame({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.frame}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}>
        <Text>← 목록</Text>
      </Pressable>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  frame: { paddingTop: 12 },
  back: { paddingHorizontal: 20, paddingVertical: 8, alignSelf: "flex-start" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  writing: { fontSize: 16 },
  notice: { padding: 20, gap: 12 },
  link: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  day: { fontSize: 14, opacity: 0.6 },
  noticeText: { fontSize: 16, lineHeight: 24 },
  hint: { fontSize: 14, opacity: 0.7 },
});
