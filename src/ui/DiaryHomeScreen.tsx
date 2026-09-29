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
 * `generate()`에 넘긴다.
 *
 * **048 — 홈이 보드 `1d`가 됐다.** 고른 날의 신호 요약을 읽어 신호 줄에 넘긴다(US3). 고른 날은
 * 밖(`App.tsx`)에서 들고 있을 수 있다(Q4).
 *
 * **049 — 날 고르기.** 스트립을 넘기면 `swipeWeek()`로 다음 날을 정하고, 다음 자정에 한 번 다시
 * 그려 오늘 밑줄만 옮긴다(FR-019). 고른 날은 언제나 쓸 수 있다(정오 제한 폐지). 사흘 밖의 날은
 * 미리 준비하지 않는다(`canPrepare`, FR-020a — 두 모델 동시 적재 방지).
 *
 * **051 — 홈이 곧 상세다.** 목록 카드 → 상세 화면 전이가 사라졌다. 고른 날에 일기가 있으면 그 날의
 * 파일을 읽어 `paperFor()`로 지면 상태를 만들고 `DiaryListScreen`에 넘긴다(늦게 온 결과는 버린다).
 * 쓰기가 성공하면 결과 화면 없이 홈의 그 날로 돌아온다 — 저장에 실패했을 때만 임시 결과 화면
 * (`unsaved`)이다. 알림(020)은 상세가 아니라 **고른 날**이 되고(`initialDay`), 확인 기록은 읽을 수
 * 있는 일기가 실제로 보였을 때 남긴다. 오늘의 일기를 보는 동안 작성 시각을 1분마다 다시 그린다.
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
  toFailed,
  toList,
  canSwipeNext,
  cellFor,
  swipeWeek,
  weekCellsFor,
  writePromptFor,
  type SwipeDirection,
  type AppScreen,
  type DayPreview,
  type DiaryListItem,
} from "../app/state";
import type { ResolveOutcome, ResolvedParams } from "../app/resolve-generation";
import { paperFor, type LoadedEntry } from "../app/written-day";
import { dayOf, nextDayStartAt, type DayDate } from "../config/day-boundary";
import type { EnvironmentResolution } from "../config/types";
import { pickMonologue } from "../diary/monologue";
import { PERSONA_NAMES } from "../diary/persona";
import type { Pipeline } from "../diary/pipeline";
import type { DiaryStore } from "../diary/store";
import { listDiaries } from "../diary/store";
import type { Character, VisionSetting } from "../diary/types";
import type { VisionOutcome } from "../vision/types";
import { BuildErrorScreen } from "./BuildErrorScreen";
import { DateJumpDialog } from "./DateJumpDialog";
import { DiaryListScreen, type PreviewState } from "./DiaryListScreen";
import { WRITTEN_DAY_TEXT, writtenAtText } from "./home-text";
import { decideMaterial, fromCountHint, type MaterialDecision } from "../app/material";
import { MaterialConfirmDialog, SettingsPromptDialog } from "./MaterialDialogs";
import { OverwriteConfirmDialog } from "./OverwriteConfirmDialog";
import { AppText } from "./components/Text";
import { TypewriterText } from "./components/TypewriterText";
import { COLORS, REVEAL } from "./theme/tokens";

/** 사진 권한을 다시 묻거나(`request`) OS 설정을 여는(`openSettings`) 통로 (053) */
export type PhotoAccessPort = {
  request: () => Promise<unknown>;
  openSettings: () => Promise<void>;
};

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
  /**
   * 그 하루의 일기를 사용자가 확인했음을 기록한다 (020 FR-007 (2)).
   *
   * **051 — 읽을 수 있는 일기가 지면에 실제로 보였을 때** 그 날마다 한 번 부른다(알림으로 열었든
   * 스스로 골랐든, FR-028·FR-029). 일기가 없거나 읽을 수 없으면 부르지 않는다.
   */
  onAcknowledge?: (day: DayDate) => void;
  /**
   * 알림의 날(`initialDay`)을 고른 날로 적용했다 (051 FR-027, research R6).
   *
   * 「적용했다」와 「확인했다」는 다르다 — 알림의 날에 일기가 없어도 적용은 끝났으므로 부른다.
   * 조립부는 이때 알림 경로를 비운다(설정 왕복 뒤 그 날로 되돌아가지 않게).
   */
  onInitialDayApplied?: () => void;
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
  /**
   * 사진 권한 요청·설정 열기 통로 (053). 조립부(`App.tsx`)가 021의 통로를 감싸 넘긴다 — 이 화면은 `expo-*`에
   * 닿지 않는다. 없으면 「권한이 없어요 ›」를 눌러도 아무 일도 없다(권한을 강제하지 않는다, FR-012).
   */
  photoAccessPort?: PhotoAccessPort;
  /**
   * 이 날에 미리 준비(018)를 해도 되는가 (049 FR-020a, research R5).
   *
   * **조립부가 「사진 유무를 미리 훑은 날인가」를 넘긴다**(`selectableDays` — 사흘). 사흘 밖의
   * 날은 사진 유무를 모르므로 `resolve()`가 사진 없음으로 떨어지고, 그대로 두면 캐릭터 모델을
   * 미리 연 뒤 쓰기 때 사진 읽기(VLM)가 이어져 **두 모델이 동시에 열린다**(E1·E15 — 기기가
   * 죽는다). 거짓이면 미리 준비를 하지 않고 준비해 둔 것을 놓아준다 — 느려질 뿐 틀리지 않는다.
   * 주지 않으면 언제나 참(옛 호출자·테스트).
   */
  canPrepare?: (day: DayDate) => boolean;
};

/**
 * 자정 타이머가 1초 늦게 울리게 한다 (049 FR-019, 048 R4에서 이어짐).
 *
 * `setTimeout`이 그 밀리초에 정확히 울리면 `now()`가 아직 23:59:59.999일 수 있다 — 그러면
 * 다시 판정해도 오늘이 옮겨지지 않는다. **사람이 정한 여유다**(원칙 V).
 */
const MIDNIGHT_TIMER_SLACK_MS = 1000;

/** 오늘의 일기 작성 시각을 다시 그리는 간격 (051 FR-019 — 「N분 전」이 1분 단위라서) */
const WRITTEN_AT_REFRESH_MS = 60_000;

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
  onInitialDayApplied,
  chosenDay: controlledDay,
  onChooseDay,
  previewDay,
  photoAccessPort,
  canPrepare,
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
  // 049 — 로컬 상태도 **마운트 시점의 오늘**에서 시작한다(FR-010a). `null`에서 시작하면
  // 기본값(오늘)이 자정 뒤 새 오늘을 따라가 「보던 날 유지」(FR-019)가 깨진다.
  const [localDay, setLocalDay] = useState<DayDate | null>(() => dayOf(now()));
  const chosenDay = controlledDay !== undefined ? controlledDay : localDay;
  const setChosenDay = useCallback(
    (day: DayDate) => {
      if (onChooseDay !== undefined) onChooseDay(day);
      else setLocalDay(day);
    },
    [onChooseDay],
  );

  /**
   * 다시 판정하라는 신호 (048 R4). 자정 타이머(049)와 `AppState` 복귀가 올린다.
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

  /**
   * 미리보기를 다시 읽으라는 신호 (053). 권한을 요청한 뒤와 앱이 앞으로 돌아왔을 때 올린다 — 오늘의 수는
   * 홈을 열 때만 갱신하고 화면에 머무는 동안 저절로 늘지 않는다(FR-006).
   */
  const [previewTick, setPreviewTick] = useState(0);

  /** 이미 거부해 다시 물을 수 없을 때의 설정 안내 대화상자가 떠 있는가 (053, 보드 `2m`). 화면 로컬 */
  const [settingsPromptOpen, setSettingsPromptOpen] = useState(false);

  /**
   * 재료 없음 확인 대화상자 (053, 보드 `2f`) — 떠 있는 동안 그 확인 뒤에 쓸 인자를 함께 든다. 화면 로컬,
   * 파일에 남기지 않는다. **인자는 누른 순간 `resolve(day)`가 정한 것 그대로다**(DLG9).
   */
  const [materialConfirm, setMaterialConfirm] = useState<{
    because: Extract<MaterialDecision, { kind: "confirm" }>["because"];
    params: ResolvedParams;
  } | null>(null);

  /** 쓰기 전 판정이 신호를 읽는 동안 다시 눌러도 두 번 시작하지 않는다 */
  const deciding = useRef(false);

  /** 방금 생성에서 캐릭터가 옮겨졌으면 그 안내 문구 (029 FR-014). */
  const [movedNotice, setMovedNotice] = useState<string | undefined>(undefined);

  /**
   * 「날짜로 이동」 달력이 열려 있는가 (050, 보드 `2j`). 화면 로컬 — 파일에 남기지 않는다(FR-020).
   * 날을 고르면 기존 `setChosenDay`(049)로 고른다 — 스트립이 그 날이 든 주로 바뀌는 것은 049가 고른
   * 날에서 주를 계산하므로 저절로 성립한다(FR-018, 새 주 계산 없음).
   */
  const [calendarOpen, setCalendarOpen] = useState(false);

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
      if (!alive) return;
      setScreen(initialScreen(resolution, items));
    })();
    return () => {
      alive = false;
    };
  }, [refresh, resolution]);

  /**
   * 알림의 날을 고른 날로 (051 FR-027, 020 라우팅을 상세에서 옮겼다).
   *
   * 마운트 때와 `initialDay`가 바뀔 때(웜 알림) 한 번씩 — 같은 값을 두 번 적용하지 않는다(부모가
   * 경로를 늦게 비워도 사용자가 고른 날을 되돌리지 않게).
   */
  const appliedInitialDay = useRef<DayDate | null>(null);
  useEffect(() => {
    if (initialDay == null || appliedInitialDay.current === initialDay) return;
    appliedInitialDay.current = initialDay;
    setChosenDay(initialDay);
    onInitialDayApplied?.();
  }, [initialDay, setChosenDay, onInitialDayApplied]);

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
        // 잠든 동안 자정 타이머가 밀렸을 수 있다. 돌아오면 다시 판정한다(049 FR-019).
        setTick((t) => t + 1);
        // 053 — 설정에서 권한을 바꾸고 돌아왔을 수 있다. 다시 센다(FR-009·FR-010).
        setPreviewTick((t) => t + 1);
        // 051 FR-016c — 그 사이 자동 생성이 쓴 일기가 보이도록 목록(→ 그 날의 일기)을 다시 읽는다.
        // **홈일 때만 반영한다** — 읽는 사이 연 덮어쓰기 대화상자를 닫지 않는다(050 OW10).
        void refresh().then((items) => setScreen((s) => (s.kind === "list" ? toList(items) : s)));
      }
    });
    return () => subscription.remove();
  }, [stop, release, refresh]);

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

    const { day } = writePromptFor(screen.items, now(), chosenDay);
    // ★ 049 R5 — 사진 유무를 미리 훑지 않은 날은 미리 준비하지 않는다(FR-020a).
    if (canPrepare !== undefined && !canPrepare(day)) {
      if (preparedFor.current !== null) void release?.().catch(() => {});
      preparedFor.current = null;
      return;
    }
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
  }, [screen.kind, chosenDay, prepare, release, resolve, now, captionDay, canPrepare, tick]);

  /**
   * 사진이 있는 날의 미리 읽기 (018 2단계, FR-006).
   */
  const captionRef = useRef<{ day: DayDate; promise: Promise<VisionOutcome> } | null>(null);

  useEffect(() => {
    if (screen.kind !== "list") return;
    if (captionDay === undefined) return;

    const { day } = writePromptFor(screen.items, now(), chosenDay);
    // ★ 049 R5 — 사흘 밖의 날은 미리 읽지 않는다(FR-020a). 준비해 둔 캐릭터 모델도 놓아준다 —
    // 쓰기 때 `generate()`가 VLM을 열기 전에 두 모델이 겹치지 않게.
    if (canPrepare !== undefined && !canPrepare(day)) {
      if (captionRef.current !== null || preparedFor.current !== null) {
        void release?.().catch(() => {});
      }
      captionRef.current = null;
      return;
    }
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
  }, [screen.kind, chosenDay, captionDay, prepare, release, resolve, now, canPrepare, tick]);

  /**
   * 자정 전환 (049 FR-019·HS2, 048의 정오 전환 타이머를 대체).
   *
   * 목록에 있는 동안 **다음 자정**에 한 번 울리는 타이머를 건다. 울리면 `tick`을 올려 다시
   * 그린다 — 고른 날은 상태로 들고 있으므로 그대로이고, 오늘 밑줄·흐림만 새 오늘을 따른다.
   * 판정은 여전히 매 렌더 `now()` 하나다.
   */
  // 050 — 덮어쓰기 확인은 홈 **위의** 대화상자다. 그동안에도 홈(스트립·헤더·목록)은 같은 목록으로
  // 그려져 있어야 하므로 두 상태를 「홈을 그리는 상태」로 함께 본다.
  const listItems =
    screen.kind === "list" || screen.kind === "confirm-overwrite" ? screen.items : null;
  const listPrompt = listItems !== null ? writePromptFor(listItems, now(), chosenDay) : null;
  const onList = listItems !== null;
  useEffect(() => {
    if (!onList) return;
    const at = now();
    const wait = Math.max(0, nextDayStartAt(at).getTime() - at.getTime()) + MIDNIGHT_TIMER_SLACK_MS;
    const timer = setTimeout(() => setTick((t) => t + 1), wait);
    return () => clearTimeout(timer);
    // `now`는 주입된 시계 — 바뀌지 않는다. 목록 여부와 틱만 본다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onList, tick]);

  /** 스트립을 넘겼다 — 어느 날이 될지는 `swipeWeek()`가 정한다(049 HS1). `null`이면 그대로 */
  const onSwipe = useCallback(
    (direction: SwipeDirection) => {
      const current = writePromptFor(listItems ?? [], now(), chosenDay).day;
      const next = swipeWeek(current, direction, now());
      if (next !== null) setChosenDay(next);
    },
    [listItems, now, chosenDay, setChosenDay],
  );

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
        photoAccess: "ok",
      }))
      .then((result) => {
        if (previewFor.current !== previewTarget || result.day !== previewTarget) return;
        setPreview(result);
      });
  }, [previewTarget, previewDay, previewTick]);
  const shownPreview: PreviewState | undefined =
    previewDay === undefined || previewTarget === undefined
      ? undefined
      : preview !== undefined && preview.day === previewTarget
        ? preview
        : { kind: "loading", day: previewTarget };

  /**
   * 누른 순간의 미리보기 — 「일기 쓰기」·「권한이 없어요 ›」 핸들러가 읽는다. 렌더마다 새로 만들어지는
   * 값을 콜백 의존성에 넣지 않으려고 ref에 둔다(커밋 뒤에 옮기므로 누름은 언제나 최신 값을 본다).
   */
  const shownPreviewRef = useRef<PreviewState | undefined>(undefined);
  useEffect(() => {
    shownPreviewRef.current = shownPreview;
  });

  /**
   * 「권한이 없어요 ›」를 눌렀다 (053, 보드 `2l`·`2m`). **요청하는 것은 사진 권한 하나다**(FR-011).
   *
   * 다시 물을 수 없으면(`blocked`) OS 창이 뜨지 않으므로 설정 안내 대화상자를 띄운다. 그 밖에는 요청하고,
   * 끝나면 — 허용이든 거부든 — 다시 센다(FR-009). 통로가 없으면 아무 일도 하지 않는다.
   */
  const requestPhoto = useCallback(async () => {
    if (photoAccessPort === undefined) return;
    const shown = shownPreviewRef.current;
    if (shown !== undefined && "photoAccess" in shown && shown.photoAccess === "blocked") {
      setSettingsPromptOpen(true);
      return;
    }
    try {
      await photoAccessPort.request();
    } catch {
      // 요청이 실패해도 다시 센다 — 상태는 미리보기가 정직하게 말한다.
    }
    setPreviewTick((t) => t + 1);
  }, [photoAccessPort]);

  /**
   * 고른 날의 일기 (051 US1, FR-016).
   *
   * 목록에 그 날이 있으면(읽을 수 있다고 한 날만) 파일을 읽는다. **늦게 도착한 이전 날의 결과는
   * 버린다** — 신호 줄과 같은 방식. 목록이 새로 읽히면(쓰기 뒤·앱 복귀) 목록 배열이 바뀌므로 그 날도
   * 다시 읽는다. 캐시를 두지 않는다. 「읽는 중」은 상태로 저장하지 않는다 — `paperFor`가 가른다.
   */
  const [loaded, setLoaded] = useState<LoadedEntry | undefined>(undefined);
  const loadFor = useRef<DayDate | undefined>(undefined);
  useEffect(() => {
    if (previewTarget === undefined || listItems === null) return;
    if (!listItems.some((item) => item.day === previewTarget && item.readable)) return;
    loadFor.current = previewTarget;
    void store
      .load(previewTarget)
      .catch(() => null)
      .then((entry) => {
        if (loadFor.current !== previewTarget) return;
        setLoaded({ day: previewTarget, entry });
      });
  }, [previewTarget, listItems, store]);

  const paper =
    listItems !== null && previewTarget !== undefined
      ? paperFor(previewTarget, listItems, loaded)
      : undefined;

  /**
   * 확인 기록 (020 FR-007 (2), 051 FR-028·FR-029) — 읽을 수 있는 일기가 보인 날마다 한 번.
   * `acknowledgeNotified`는 멱등이지만 렌더마다 파일을 건드리지 않게 화면이 한 번으로 줄인다.
   */
  const acknowledgedFor = useRef<DayDate | null>(null);
  const readableDay = paper?.kind === "readable" ? previewTarget : undefined;
  useEffect(() => {
    if (readableDay === undefined || acknowledgedFor.current === readableDay) return;
    acknowledgedFor.current = readableDay;
    onAcknowledge?.(readableDay);
  }, [readableDay, onAcknowledge]);

  /**
   * 오늘의 일기 작성 시각 (051 보드 `2g`, FR-019). **그 일기의 하루가 오늘**일 때만 — 오늘 판정은
   * `cellFor`(049·050)에서 온다(FR-019a, 복제하지 않는다). 보는 동안 1분마다 다시 그린다.
   */
  const showsWrittenAt =
    paper?.kind === "readable" &&
    previewTarget !== undefined &&
    cellFor(previewTarget, listItems ?? [], previewTarget, now()).isToday;
  const writtenAt =
    showsWrittenAt && paper?.kind === "readable"
      ? writtenAtText(paper.entry.createdAt, now())
      : undefined;
  useEffect(() => {
    if (!showsWrittenAt) return;
    const timer = setInterval(() => setTick((t) => t + 1), WRITTEN_AT_REFRESH_MS);
    return () => clearInterval(timer);
  }, [showsWrittenAt]);

  /** 결과·실패 화면에서 홈으로 (051 — 고른 날은 그대로, 목록을 다시 읽는다) */
  const goHome = useCallback(async () => {
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

        // 051 — 성공이면 결과 화면 없이 홈의 그 날로(목록을 다시 읽으면 그 날의 새 일기도 다시
        // 읽힌다). 저장 실패만 임시 결과 화면, 그 밖은 실패 화면.
        const next = afterGeneration(result);
        if (next.kind === "home") setScreen(toList(await refresh()));
        else setScreen(next);
      } finally {
        running.current = false;
      }
    },
    // 035 — `characterNames`가 빠지면 세션 중 이름을 바꿔도 옛 이름으로
    // 생성·독백이 돈다(조용히 틀리는 결함).
    [pipeline, now, onGenerated, characterNames, refresh],
  );

  /**
   * 「일기 쓰기」를 누른다.
   *
   * **029 — 상위가 준 `resolve(day)`가 네 값을 정한다**(FR-007). `no-ready-character`
   * 면 생성하지 않고 설정 탭으로 안내한다(FR-014). `resolved`면 `movedFrom`을 안내로
   * 옮기고, 012의 덮어쓰기 확인을 거친 뒤 생성한다.
   */
  const write = useCallback(async () => {
    if (screen.kind !== "list") return;
    const items = screen.items;
    const prompt = writePromptFor(items, now(), chosenDay);

    // 049 — 고른 날은 언제나 쓸 수 있다(미래는 `writePromptFor`가 오늘로 떨어뜨린다). 미래 날의
    // 마지막 방어는 파이프라인의 `isDayWritable` 게이트(012)다.

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

    // 053 — 이미 쓴 날의 「다시 쓰기」가 아닐 때, 셀 수 있는 재료가 하나라도 있으면 바로 쓰고 없으면 한 번 더
    // 묻는다(보드 `2e`·`2f`). 다시 쓰기는 050의 덮어쓰기 확인이 이미 있다. 미리보기가 아직 안 왔으면 누른 순간
    // 신호를 읽는다 — 읽는 중을 「재료 없음」으로 취급하지 않는다(원칙 V). 통로가 없으면 판정하지 않는다.
    if (!prompt.overwrites && previewDay !== undefined) {
      if (deciding.current) return;
      deciding.current = true;
      let decision: MaterialDecision;
      try {
        const shown = shownPreviewRef.current;
        const settled =
          shown !== undefined && "photos" in shown && shown.day === prompt.day
            ? shown
            : await previewDay(prompt.day).catch(() => undefined);
        decision =
          settled === undefined
            ? { kind: "confirm", because: "unseen" }
            : decideMaterial(fromCountHint(settled.photos), fromCountHint(settled.places));
      } finally {
        deciding.current = false;
      }
      if (decision.kind === "confirm") {
        setMaterialConfirm({
          because: decision.because,
          params: { ...outcome.params, day: prompt.day },
        });
        return;
      }
    }

    const next = startWriting(prompt, items);
    if (next.kind === "confirm-overwrite") {
      setScreen(next);
      // 확인 후 생성할 때 쓸 params를 들고 있는다.
      pendingParams.current = { ...outcome.params, day: prompt.day };
      return;
    }

    await generate({ ...outcome.params, day: prompt.day });
  }, [screen, now, chosenDay, resolve, generate, characterNames, previewDay]);

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

  // 051 — 결과·실패 화면의 안드로이드 뒤로 가기는 「← 일기」와 같다(FR-024a·FR-026).
  useEffect(() => {
    if (screen.kind !== "unsaved" && screen.kind !== "failed") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      void goHome();
      return true;
    });
    return () => subscription.remove();
  }, [screen.kind, goHome]);

  switch (screen.kind) {
    case "build-error":
      return <BuildErrorScreen />;

    case "list":
    case "confirm-overwrite": {
      const items = screen.items;
      const prompt = listPrompt ?? writePromptFor(items, now(), chosenDay);
      return (
        <>
          <DiaryListScreen
            canSwipeNext={canSwipeNext(prompt.day, now())}
            cells={weekCellsFor(items, prompt, now())}
            deniedNotices={deniedNotices}
            items={items}
            movedNotice={movedNotice}
            // 050 — 헤더 날짜 → 날짜로 이동. 덮어쓰기 확인이 떠 있는 동안에는 열지 않는다.
            onPressDate={screen.kind === "list" ? () => setCalendarOpen(true) : undefined}
            onSelectDay={setChosenDay}
            onRequestPhoto={() => void requestPhoto()}
            onSwipe={onSwipe}
            onWrite={() => void write()}
            paper={paper}
            preview={shownPreview}
            write={prompt}
            writtenAt={writtenAt}
          />
          {screen.kind === "list" && (
            <DateJumpDialog
              items={items}
              now={now()}
              onClose={() => setCalendarOpen(false)}
              onPick={(day) => {
                setCalendarOpen(false);
                setChosenDay(day);
              }}
              open={calendarOpen}
              selectedDay={prompt.day}
            />
          )}
          {screen.kind === "list" && settingsPromptOpen && (
            <SettingsPromptDialog
              onCancel={() => setSettingsPromptOpen(false)}
              onOpenSettings={() => {
                setSettingsPromptOpen(false);
                void photoAccessPort?.openSettings().catch(() => {});
              }}
            />
          )}
          {screen.kind === "list" && materialConfirm !== null && (
            <MaterialConfirmDialog
              because={materialConfirm.because}
              onCancel={() => setMaterialConfirm(null)}
              onConfirm={() => {
                const params = materialConfirm.params;
                setMaterialConfirm(null);
                void generate(params);
              }}
            />
          )}
          {screen.kind === "confirm-overwrite" && (
            <OverwriteConfirmDialog
              isToday={cellFor(screen.day, items, screen.day, now()).isToday}
              onCancel={() => setScreen(cancelOverwrite(items))}
              onConfirm={() => {
                setScreen(confirmOverwrite());
                if (pendingParams.current !== null) void generate(pendingParams.current);
              }}
            />
          )}
        </>
      );
    }

    case "unsaved":
      // 051 FR-024a — 글은 나왔으나 남지 않았다. 읽을 기회를 빼앗지 않되 남지 않는다고 말한다(006
      // FR-012a·b). 사진·캐러셀은 없다. 「제자리 쓰기」 조각이 올 때까지의 임시 자리다.
      return (
        <Frame onBack={() => void goHome()}>
          <View style={styles.notice} testID="unsaved-screen">
            <AppText variant="body">{WRITTEN_DAY_TEXT.unsaved}</AppText>
            {screen.entry.title !== undefined && (
              <AppText variant="title">{screen.entry.title}</AppText>
            )}
            <AppText variant="body" style={{ fontSize: 16, lineHeight: 26 }}>
              {screen.entry.text}
            </AppText>
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

    case "failed":
      return (
        <Frame onBack={() => void goHome()}>
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
        <AppText variant="body">{WRITTEN_DAY_TEXT.backToHome}</AppText>
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
