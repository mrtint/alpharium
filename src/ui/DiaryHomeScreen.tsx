/**
 * 사용자 경로의 화면 전환.
 *
 * 계약: specs/006-first-diary-app/contracts/screens.md, data-model.md §3
 *       specs/029-writing-flow-simplification/contracts/home-screen.md (H1~H7)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **네비게이션 라이브러리를 들이지 않는다**(research.md §5). 화면이 셋뿐이고 전이가
 * 단순하다.
 *
 * **판단은 `src/app/state.ts`가 하고 여기서는 그리기만 한다.**
 *
 * **★ 029 — 캐릭터·사진 설정·장소명 위젯이 사라졌다**(FR-001·006). "일기 쓰기"가
 * 눌리면 상위(`DiarySection`)가 준 `resolve(day)` 콜백이 배선 계층의 순수 함수
 * (`resolveGenerationParams`)를 불러 네 값을 정한다(FR-007) — 화면은 그 결과만 받아
 * `generate()`에 넘긴다. 날짜 셀렉트(009)와 정오 게이트 안내(012)는 유지한다.
 *
 * **048 — 홈이 보드 `1d`가 됐다.** 이 화면은 고른 날의 쓸 수 있음(`writePromptFor`)에 따라
 * 쓰기를 막고(FR-034 둘째 겹), 쓸 수 있게 되는 시각에 한 번 다시 판정하며(FR-035), 고른 날의
 * 신호 요약을 읽어 신호 줄에 넘긴다(US3). 고른 날은 밖(`App.tsx`)에서 들고 있을 수 있다(Q4).
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
  stripCellsFor,
  toList,
  writePromptFor,
  type AppScreen,
  type DayPreview,
  type DiaryListItem,
} from "../app/state";
import type { ResolveOutcome, ResolvedParams } from "../app/resolve-generation";
import type { DayDate } from "../config/day-boundary";
import type { EnvironmentResolution } from "../config/types";
import { pickMonologue } from "../diary/monologue";
import { PERSONA_NAMES } from "../diary/persona";
import type { Pipeline } from "../diary/pipeline";
import type { DiaryStore } from "../diary/store";
import { listDiaries } from "../diary/store";
import type { Character, VisionSetting } from "../diary/types";
import type { VisionOutcome } from "../vision/types";
import { BuildErrorScreen } from "./BuildErrorScreen";
import { DiaryDetailScreen } from "./DiaryDetailScreen";
import { DiaryListScreen, type PreviewState } from "./DiaryListScreen";
import type { HomeMenuItem } from "./HomeMenu";
import { OverwriteConfirmScreen } from "./OverwriteConfirmScreen";
import { AppText } from "./components/Text";
import { TypewriterText } from "./components/TypewriterText";
import { COLORS, REVEAL } from "./theme/tokens";

export type DiaryHomeScreenProps = {
  resolution: EnvironmentResolution;
  /** 조립이 실패했으면 없다 — 그때는 `build-error`로 간다(FR-035a) */
  pipeline?: Pipeline;
  store: DiaryStore;
  /**
   * ★ 029 — "일기 쓰기"가 눌린 하루에 대해 생성 파라미터를 정하는 콜백 (FR-007).
   *
   * **판정은 이 콜백 안(배선 계층의 `resolveGenerationParams`)에서 일어난다** — 화면은
   * 자기 `chosenDay`를 넘기고 결과만 받는다. 화면이 캐릭터·사진 설정·장소명을 정하지
   * 않는다(FR-006·FR-007 MUST NOT).
   */
  resolve: (day: DayDate) => ResolveOutcome;
  /**
   * 생성이 성공한 직후 실제로 쓴 캐릭터를 기록하는 콜백 (029 FR-008a).
   *
   * 옮겨졌으면 옮겨진 쪽(`params.character`). 실패 경로에서는 부르지 않는다(원칙 I).
   */
  onGenerated?: (character: Character) => void;
  /** 거부된 권한으로 제한되는 기능의 정직한 안내 (021 FR-014). 부모가 계산해 넘긴다 */
  deniedNotices?: readonly string[];
  /** 생성을 끊는 통로(005 FR-014b). 앱이 앞을 벗어날 때 쓴다 */
  stop?: () => Promise<void>;
  /**
   * 캐릭터·날짜가 정해지면 미리 준비를 시작하는 통로 (018). **읽을 사진이 없는 날에만**
   * 부른다 (FR-005). 옵셔널 — 배선이 끊겨도 "느릴 뿐" 정상 동작한다(FR-007).
   */
  prepare?: (character: Character) => Promise<void>;
  /** 준비해 둔 것을 놓아준다 (018, FR-008). */
  release?: () => Promise<void>;
  /** 사진만 미리 읽는 통로 (018 2단계, FR-006). */
  captionDay?: (
    day: DayDate,
    character: Character,
    vision: VisionSetting,
  ) => Promise<VisionOutcome>;
  /** "지금". 밖에서 받아야 경계값을 테스트할 수 있다(002 FR-018a) */
  now?: () => Date;
  /** 설정 탭으로 가는 길 (029 FR-014 — no-ready-character일 때). */
  onGoToSettings?: () => void;
  /** 알림을 눌러 열렸으면 그 하루 (020, FR-006·SC-004). */
  initialDay?: DayDate | null;
  /** 그 하루의 일기를 사용자가 확인했음을 기록한다 (020, FR-007 (2)). */
  onAcknowledge?: (day: DayDate) => void;
  /**
   * 캐릭터 → 지금 부르는 이름 (035 FR-018).
   *
   * **조립부가 `displayNameOf()`로 만든 문자열만 받는다** — 화면은 사용자 지정
   * 이름이 어디 저장되는지도, 폴백 규칙도 모른다(FR-017의 단일 통과 지점).
   * 주지 않으면 `personaOf()`의 기본 이름을 쓴다.
   */
  characterNames?: Readonly<Partial<Record<Character, string>>>;
  /**
   * 고른 하루를 밖에서 들고 있는다 (048 Clarification Q4, FR-005a).
   *
   * 설정·개발자 화면에 다녀오면 이 화면이 언마운트된다. 고른 하루를 여기 로컬 상태에만 두면
   * 돌아왔을 때 기본값으로 돌아가 [일기 쓰기]가 엉뚱한 날을 쓸 수 있다 — 그래서 `App.tsx`가
   * 들고 있는다(파일에는 남기지 않는다, 009). **둘 다 주지 않으면 지금처럼 로컬 상태다.**
   */
  chosenDay?: DayDate | null;
  onChooseDay?: (day: DayDate) => void;
  /**
   * 고른 날의 신호 요약을 읽는 통로 (048 US3). 조립부가 `wiring.previewDay`를 넘긴다.
   *
   * **`DaySignals`가 아니라 개수로 좁혀진 `DayPreview`다**(FR-020). 없으면 신호 줄은 「모름」.
   */
  previewDay?: (day: DayDate) => Promise<DayPreview>;
  /** `⋯` 메뉴 항목 (048 US4). 무엇을 넣을지는 조립부가 환경으로 정한다(FR-003) */
  menuItems?: readonly HomeMenuItem[];
};

/**
 * 쓸 수 있게 되는 시각에 걸린 타이머가 1초 늦게 울리게 한다 (048 R4).
 *
 * `setTimeout`이 그 밀리초에 정확히 울리면 `now()`가 아직 11:59:59.999일 수 있다 — 그러면
 * 다시 판정해도 쓸 수 없어 버튼이 안 나타난다. **사람이 정한 여유다**(원칙 V).
 */
const WRITABLE_TIMER_SLACK_MS = 1000;

/**
 * 이 캐릭터를 지금 뭐라 부르는가 (035 FR-018).
 *
 * **화면은 사용자 지정 이름의 저장·검증을 모른다** — 조립부가 이미 만든 문자열을
 * 받아 쓰고, 안 받았으면(옛 호출자·테스트) `personaOf()`의 기본 이름을 쓴다.
 * 규칙의 유일한 자리는 `diary/character-name.ts`의 `displayNameOf()`이며 이
 * 함수는 그 결과를 고르기만 한다.
 */
function nameOf(
  character: Character,
  names: Readonly<Partial<Record<Character, string>>> | undefined,
): string | undefined {
  return names?.[character] ?? PERSONA_NAMES[character];
}

export function DiaryHomeScreen({
  resolution,
  pipeline,
  store,
  resolve,
  onGenerated,
  deniedNotices,
  stop,
  prepare,
  release,
  captionDay,
  now = () => new Date(),
  onGoToSettings,
  characterNames,
  initialDay,
  onAcknowledge,
  chosenDay: controlledDay,
  onChooseDay,
  previewDay,
  menuItems,
}: DiaryHomeScreenProps) {
  const [screen, setScreen] = useState<AppScreen>(() => initialScreen(resolution, []));

  /**
   * 사용자가 고른 하루 (009 FR-006). `null`이면 고른 적이 없다는 뜻이고 그때
   * 기본값(마지막으로 닫힌 하루)을 쓴다(FR-007).
   *
   * **파일에 남기지 않는다**(009 FR-010, H6) — 매 렌더 재판정.
   *
   * **048 — 밖에서 들고 있을 수 있다**(Q4). `chosenDay` prop이 오면 그것이 기준이고,
   * 안 오면 로컬 상태를 쓴다(옛 호출자·테스트 무변경).
   */
  const [localDay, setLocalDay] = useState<DayDate | null>(null);
  const chosenDay = controlledDay !== undefined ? controlledDay : localDay;
  const setChosenDay = useCallback(
    (day: DayDate) => {
      if (onChooseDay !== undefined) onChooseDay(day);
      else setLocalDay(day);
    },
    [onChooseDay],
  );

  /**
   * 다시 판정하라는 신호 (048 R4). 쓸 수 있게 되는 시각의 타이머와 `AppState` 복귀가 올린다.
   *
   * 판정 자체는 매 렌더 `writePromptFor(now())`가 하므로 **값을 저장하지 않는다** — 렌더를
   * 일으키기만 하면 된다(009가 되돌림을 저장하지 않은 것과 같은 판단).
   */
  const [tick, setTick] = useState(0);

  /**
   * 신호 줄 (048 US3) — **도착한 마지막 결과**만 담는다. 「읽는 중」은 저장하지 않고 렌더에서
   * 가른다: 담긴 결과의 날이 지금 고른 날과 다르면 그것은 읽는 중이다(아래 `shownPreview`).
   */
  const [preview, setPreview] = useState<DayPreview | undefined>(undefined);

  /** 방금 생성에서 캐릭터가 옮겨졌으면 그 안내 문구 (029 FR-014). */
  const [movedNotice, setMovedNotice] = useState<string | undefined>(undefined);

  /** 지금 도는 생성이 있는가. `AppState` 구독이 본다 */
  const running = useRef(false);

  /** 사용자가 그만두었는가 (007 FR-014a). */
  const cancelled = useRef(false);

  /** 덮어쓰기 확인을 통과하면 쓸 params (012 흐름). */
  const pendingParams = useRef<ResolvedParams | null>(null);

  /** 목록을 다시 읽는다. 성공·실패 뒤 돌아올 때마다 부른다(FR-022) */
  const refresh = useCallback(async (): Promise<DiaryListItem[]> => {
    try {
      return await listDiaries(store);
    } catch {
      return [];
    }
  }, [store]);

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
   */
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        if (running.current) {
          void stop?.().catch(() => {});
        } else {
          void release?.().catch(() => {});
        }
      } else {
        // 048 — 잠든 동안 전환 타이머가 밀렸을 수 있다. 돌아오면 다시 판정한다(FR-035).
        setTick((t) => t + 1);
      }
    });
    return () => subscription.remove();
  }, [stop, release]);

  /**
   * 캐릭터·날짜가 정해지면 미리 준비를 시작한다 (018, FR-005).
   *
   * 029 — 목록 화면에 있을 때, 고른 하루에 사진 신호가 없으면 자동 판정 캐릭터로
   * 준비를 데운다. `resolve(day)`가 `no-ready-character`면 준비할 것이 없다.
   *
   * **같은 (캐릭터+하루)에 대해 두 번 부르지 않는다** — `resolve`가 매 렌더 새
   * 클로저일 수 있으므로(테스트·설정 변경) `preparedFor` 표식으로 막는다.
   */
  const preparedFor = useRef<string | null>(null);
  useEffect(() => {
    if (screen.kind !== "list") return;
    if (captionDay !== undefined) return; // 사진 있는 날 경로(아래)가 담당

    const { day, writable } = writePromptFor(screen.items, now(), chosenDay);
    // 048 — 쓸 수 없는 날에는 미리 준비하지 않는다(FR-036). 쓸 수 있게 되면 `tick`이 다시 돌린다.
    if (!writable) return;
    const outcome = resolve(day);
    if (outcome.kind !== "resolved") return;
    // 042 — 판별자가 「사진 설정이 none인가」에서 「이 하루에 사진이 있는가」로 바뀌었다.
    // 설정이 사라져도 **두 갈래는 그대로 갈려야 한다**(FR-011) — 합쳐지면 사진을 미리
    // 읽지 않거나(느려질 뿐 오류 없음), 캡션 전에 모델을 열어 018 E1이 깨진다.
    if (outcome.params.hasPhotos) return;

    const key = `${outcome.params.character}@${day}`;
    if (preparedFor.current === key) return;
    preparedFor.current = key;

    void prepare?.(outcome.params.character).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- screen.items는 매 렌더 새 배열이라 넣으면 무한 루프. day 판정 입력만 의존성으로.
  }, [screen.kind, chosenDay, prepare, resolve, now, captionDay, tick]);

  /**
   * 사진이 있는 날의 미리 읽기 (018 2단계, FR-006).
   */
  const captionRef = useRef<{ day: DayDate; promise: Promise<VisionOutcome> } | null>(null);

  useEffect(() => {
    if (screen.kind !== "list") return;
    if (captionDay === undefined) return;

    const { day, writable } = writePromptFor(screen.items, now(), chosenDay);
    // 048 — 쓸 수 없는 날에 VLM을 돌리지 않는다(FR-036).
    if (!writable) return;
    const outcome = resolve(day);
    if (outcome.kind !== "resolved") return;
    // 042 — 위 1단계와 정확히 반대 갈래다(FR-011·FR-012).
    if (!outcome.params.hasPhotos) return;
    if (captionRef.current?.day === day) return;

    const character = outcome.params.character;
    const promise = captionDay(day, character, "quick");
    captionRef.current = { day, promise };

    void promise
      .then(() => {
        if (captionRef.current?.day !== day) return;
        return prepare?.(character);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 위와 같은 이유.
  }, [screen.kind, chosenDay, captionDay, prepare, resolve, now, tick]);

  /**
   * 쓸 수 있게 되는 시각의 전환 (048 R4, FR-035).
   *
   * **아직 쓸 수 없는 오늘을 보는 동안에만** 그 시각에 한 번 울리는 타이머를 건다. 울리면
   * `tick`을 올려 다시 판정하게 한다 — 판정은 여전히 `writePromptFor(now())` 하나다. 다른 날을
   * 고르거나 화면을 떠나면(`screen.kind`가 바뀌거나 언마운트) 정리 함수가 지운다.
   */
  const listItems = screen.kind === "list" ? screen.items : null;
  const listPrompt = listItems !== null ? writePromptFor(listItems, now(), chosenDay) : null;
  const opensAtMs = listPrompt?.writableAt?.getTime();
  useEffect(() => {
    if (opensAtMs === undefined) return;
    const wait = Math.max(0, opensAtMs - now().getTime()) + WRITABLE_TIMER_SLACK_MS;
    const timer = setTimeout(() => setTick((t) => t + 1), wait);
    return () => clearTimeout(timer);
    // `now`는 주입된 시계 — 바뀌지 않는다. 걸 시각(opensAtMs)과 틱만 본다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opensAtMs, tick]);

  /**
   * 신호 줄 미리보기 (048 US3, FR-018·019).
   *
   * 고른 날이 바뀔 때마다 부른다. **늦게 도착한 이전 날의 결과는 버린다** — 도착한 값의 `day`가
   * 지금 고른 날과 같을 때만 반영한다. 실패하면 두 칸 「모름」(0으로 채우지 않는다, 원칙 V).
   * 캐시를 두지 않는다(FR-022).
   */
  const previewTarget = listPrompt?.day;
  const previewFor = useRef<DayDate | undefined>(undefined);
  useEffect(() => {
    if (previewTarget === undefined || previewDay === undefined) return;
    previewFor.current = previewTarget;
    void previewDay(previewTarget)
      .catch((): DayPreview => ({
        day: previewTarget,
        photos: { kind: "unknown" },
        places: { kind: "unknown" },
      }))
      .then((result) => {
        if (previewFor.current !== previewTarget || result.day !== previewTarget) return;
        setPreview(result);
      });
  }, [previewTarget, previewDay]);
  const shownPreview: PreviewState | undefined =
    previewDay === undefined || previewTarget === undefined
      ? undefined
      : preview !== undefined && preview.day === previewTarget
        ? preview
        : { kind: "loading", day: previewTarget };

  const openItem = useCallback(
    async (item: DiaryListItem) => {
      const entry = item.readable ? await store.load(item.day).catch(() => null) : null;
      const next = toDetail(item, entry);
      setScreen(next);
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
   * **★ 저장 상태를 보지 않는다**(S1, 원칙 I). 목록에 그 하루가 이미 있어도 **언제나**
   * 실제 생성을 돈다.
   *
   * **029 — `params`는 상위가 `resolve(day)`로 정한 것.** `pipeline.run`에는
   * `character`·`vision`만 넘긴다(FR-013 — prompt.ts 불변). `geocodingEnabled`는
   * 배선(`createAppPipeline`)이 이미 파이프라인에 넣어 두었다.
   */
  const generate = useCallback(
    async (params: ResolvedParams) => {
      if (pipeline === undefined) return;

      setScreen({ kind: "writing" });
      running.current = true;
      cancelled.current = false;

      try {
        const at = now();

        let seen: VisionOutcome | undefined;
        if (captionRef.current?.day === params.day) {
          seen = await captionRef.current.promise.catch(() => undefined);
        }
        const seenVision = seen?.kind === "seen" ? seen.vision : undefined;

        const result = await pipeline.run(
          {
            day: params.day,
            now: at,
            character: params.character,
            // 042 — 값이 하나뿐이다. 사진을 볼지는 파이프라인이 그 하루의 신호로 정한다.
            vision: "quick",
            ...(seenVision !== undefined ? { seen: seenVision } : {}),
            // 035 — 프롬프트의 호칭 줄과 저장될 작성자 이름이 같은 값에서 나온다
            // ("두 개의 진실" 금지). 없으면 코드 안 기본 이름이 쓰인다.
            ...(characterNames !== undefined ? { customNames: characterNames } : {}),
            authorName: nameOf(params.character, characterNames),
          },
          (stage, branch) => {
            if (stage === "load" && branch === undefined) return;

            setScreen((s) => {
              if (s.kind !== "writing") return s;
              const characterName =
                stage === "load" ? nameOf(params.character, characterNames) : undefined;
              const line = pickMonologue(stage, branch, s.line, characterName);
              return { ...s, stage, branch, line };
            });
          },
        );

        if (cancelled.current) return;

        // 029 — 생성이 성공했으면 실제로 쓴 캐릭터를 기록한다(FR-008a). 옮겨졌으면
        // 옮겨진 쪽(params.character). 실패면 부르지 않는다(원칙 I).
        if (result.ok) onGenerated?.(params.character);

        setScreen(afterGeneration(result));
      } finally {
        running.current = false;
      }
    },
    // 035 — `characterNames`가 빠지면 세션 중 이름을 바꿔도 옛 이름으로
    // 생성·독백이 돈다(조용히 틀리는 결함).
    [pipeline, now, onGenerated, characterNames],
  );

  /**
   * 「일기 쓰기」를 누른다.
   *
   * **029 — 상위가 준 `resolve(day)`가 네 값을 정한다**(FR-007). `no-ready-character`
   * 면 생성하지 않고 설정 탭으로 안내한다(FR-014). `resolved`면 `movedFrom`을 안내로
   * 옮기고, 012의 덮어쓰기 확인을 거친 뒤 생성한다.
   */
  const write = useCallback(async () => {
    const items = screen.kind === "list" ? screen.items : [];
    const prompt = writePromptFor(items, now(), chosenDay);

    // ─────────────────────────────────────────────────────────────────────────
    // **048 — 쓸 수 없는 날은 여기서 멈춘다**(FR-034 둘째 겹). 화면은 이 날에 쓰기 버튼을
    // 그리지 않지만(첫째 겹), 그것에만 기대지 않는다 — 화면만 막고 아래가 뚫린 것이 이
    // 저장소가 여러 번 겪은 결함이다. 셋째 겹은 파이프라인의 `isDayWritable` 게이트(012).
    // ─────────────────────────────────────────────────────────────────────────
    if (!prompt.writable) return;

    const outcome = resolve(prompt.day);

    if (outcome.kind === "no-ready-character") {
      setScreen(toFailed("일기 작성자를 준비해야 한다"));
      return;
    }

    // 029 — 캐릭터가 옮겨졌으면 화면에 알린다(FR-014). persona 이름으로 문장을 만든다.
    setMovedNotice(
      outcome.params.movedFrom !== undefined
        ? `${nameOf(outcome.params.movedFrom, characterNames)}을(를) 쓸 수 없어 ${nameOf(
            outcome.params.character,
            characterNames,
          )}(으)로 바꿨어요`
        : undefined,
    );

    const next = startWriting(prompt);
    if (next.kind === "confirm-overwrite") {
      setScreen(next);
      // 확인 후 생성할 때 쓸 params를 들고 있는다.
      pendingParams.current = { ...outcome.params, day: prompt.day };
      return;
    }

    await generate({ ...outcome.params, day: prompt.day });
  }, [screen, now, chosenDay, resolve, generate, characterNames]);

  const cancel = useCallback(async () => {
    cancelled.current = true;
    await stop?.().catch(() => {});
    setScreen(toList(await refresh()));
  }, [stop, refresh]);

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
          cells={stripCellsFor(
            screen.items,
            listPrompt ?? writePromptFor(screen.items, now(), chosenDay),
            now(),
          )}
          deniedNotices={deniedNotices}
          items={screen.items}
          menuItems={menuItems}
          movedNotice={movedNotice}
          onOpen={(item) => void openItem(item)}
          onSelectDay={setChosenDay}
          onWrite={() => void write()}
          preview={shownPreview}
          write={listPrompt ?? writePromptFor(screen.items, now(), chosenDay)}
        />
      );

    case "detail":
      return (
        <Frame onBack={() => void backToList()}>
          <DiaryDetailScreen
            currentAuthorName={nameOf(screen.entry.character, characterNames)}
            entry={screen.entry}
          />
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
            if (pendingParams.current !== null) void generate(pendingParams.current);
          }}
        />
      );

    case "unreadable":
      return (
        <Frame onBack={() => void backToList()}>
          <View style={styles.notice}>
            <AppText variant="caption">{screen.day}</AppText>
            <AppText variant="body">이 날의 일기를 읽을 수 없다.</AppText>
            <AppText variant="caption">파일이 손상됐다. 그 하루를 다시 쓸 수 있다.</AppText>
          </View>
        </Frame>
      );

    case "writing": {
      // 032 — 표현만 바꿨다. 회전 표시 + "그만두기"만. 진행률 숫자·경과 시간·
      // 생성 중인 글은 여전히 없다(005 FR-028b, 015·016, SM3).
      //
      // 039 — 독백 문구도 038의 TypewriterText로 글자 단위 노출한다. `key`를
      // 문구 문자열 자체로 줘서, `line`이 바뀔 때마다(단계 전환 또는 같은
      // 단계 안에서 branch만 바뀌는 경우) 리마운트되어 처음부터 다시
      // 타이핑한다(FR-002) — 이어서 채우지 않는다. `skipToEnd`는 항상
      // `false`(탭 건너뛰기 없음, US2, FR-004). `onDone`은 무시한다 — 이
      // 화면에 완료를 관찰해 분기하는 로직이 없다(research 결정 3).
      // 완료 후에는 `TypewriterText` 자체가 이미 완성된 텍스트를 계속
      // 렌더하므로 별도 처리 없이 정지 상태가 유지된다(FR-002a).
      const monologueLine = screen.line ?? "쓰고 있다";
      return (
        <View className="flex-1 items-center justify-center bg-bg" style={styles.center}>
          <ActivityIndicator accessibilityLabel="쓰고 있다" size="large" color={COLORS.accent} />
          <TypewriterText
            key={monologueLine}
            text={monologueLine}
            charMs={REVEAL.charMs}
            skipToEnd={false}
            onDone={() => {}}
            variant="body"
          />
          <Pressable accessibilityRole="button" onPress={() => void cancel()} style={styles.link}>
            <AppText variant="body">그만두기</AppText>
          </Pressable>
        </View>
      );
    }

    case "written":
      // 038 — 생성 직후 첫 표시에서만 타자기 연출(FR-001). 목록에서 여는
      // `case "detail"`은 `reveal`을 넘기지 않아 이 기능 도입 전과 동일하다
      // (FR-007, SC-004).
      return (
        <Frame onBack={() => void backToList()}>
          <DiaryDetailScreen
            currentAuthorName={nameOf(screen.entry.character, characterNames)}
            entry={screen.entry}
            saved={screen.saved}
            overwrote={screen.overwrote}
            reveal
          />
        </Frame>
      );

    case "failed":
      return (
        <Frame onBack={() => void backToList()}>
          <View style={styles.notice}>
            <AppText variant="body">{screen.message}</AppText>

            {/* 029 — 작성자를 준비해야 하는 실패면 설정 탭으로 가는 길을 준다(FR-014). */}
            {onGoToSettings !== undefined && /준비/.test(screen.message) && (
              <Pressable accessibilityRole="button" onPress={onGoToSettings} style={styles.link}>
                <AppText variant="body">설정에서 작성자 준비하기</AppText>
              </Pressable>
            )}
          </View>
        </Frame>
      );
  }
}

/** 뒤로 갈 수 있는 화면의 껍데기. */
function Frame({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <ScrollView
      className="bg-bg"
      contentContainerStyle={styles.frame}
      style={{ backgroundColor: COLORS.bg }}
    >
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}>
        <AppText variant="body">← 목록</AppText>
      </Pressable>
      {children}
    </ScrollView>
  );
}

// 032 — 색은 tokens.ts에서. 레이아웃 숫자만 남는다(SM3). 생성 중 뷰에 진행률·
// 경과 시간·글 조각 없음.
const styles = StyleSheet.create({
  frame: { paddingTop: 12 },
  back: { paddingHorizontal: 20, paddingVertical: 8, alignSelf: "flex-start" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  notice: { padding: 20, gap: 12 },
  link: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
});
