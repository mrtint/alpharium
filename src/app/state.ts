/**
 * 사용자 경로의 화면 상태와 전이.
 *
 * 계약: specs/006-first-diary-app/data-model.md §2·§3, contracts/screens.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **순수 함수만 둔다**(SC-023). 기기에 닿지 않으므로 전 갈래가 기기 없이 검증된다 —
 * 002의 `readinessOf`, 005의 `acceptance`와 같은 구조다.
 *
 * **005의 `PipelineStage`와 다르다.** 그것은 생성 *안쪽*의 단계이고 이것은 사용자가
 * 보는 화면이다. 둘을 섞으면 생성 내부 사정이 화면 구조로 새어 나온다.
 *
 * **타입이 곧 방어다**:
 *  - `writing`에 필드가 없는 것이 원칙 IV의 방어다 — 진행률·시간·토큰을 담을 자리가 없다
 *  - `failed`에 `text`가 없는 것이 FR-030·SC-014의 방어다 — 거부된 글이 화면에 못 오른다
 *  - `build-error`에 필드가 없는 것이 원칙 III의 방어다 — 환경 변수 이름이 샐 자리가 없다
 *
 * **자리가 없으면 담을 수 없다.** 005의 `RunResult`가 `{ text, ending }` 둘뿐인 것과
 * 같은 판단이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { dayOf, isDayWritable, shiftWeek, weekOf, type DayDate } from "../config/day-boundary";
import type { EnvironmentResolution } from "../config/types";
import type { PipelineResult } from "../diary/pipeline";
import type { DiaryEntry } from "../diary/types";
import type { MonologueBranch, ProgressStage } from "../inference/types";
import { describeStage } from "./failure-text";

/**
 * 목록의 한 줄 (data-model.md §1).
 *
 * **전문을 담지 않는다.** 목록에서 전부 읽으면 일기가 늘수록 느려지고, 읽지도 않을 글을
 * 전부 역직렬화한다.
 *
 * **`readable`이 두 갈래인 이유**(FR-017a, 원칙 V): 읽을 수 없는 파일이 있는 날짜를
 * 조용히 빼면 「그날 일기가 없다」와 구분이 사라진다. 날짜는 파일 이름에서 오므로
 * **내용이 깨져도 어느 날인지는 안다** — 그것이 이 갈래를 만들 수 있는 이유다.
 */
export type DiaryListItem = {
  day: DayDate;
  readable: boolean;
  photos: PhotoHint;
  /** 일기 제목 (014, 옵셔널). `diary/store.ts`의 같은 이름 타입과 짝을 이룬다 */
  title?: string;
};

/**
 * 그날 일기가 사진을 얼마나 보고 쓰였는가 (007 FR-018·019, data-model.md §5).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 세 갈래를 그대로 옮긴다**(원칙 V). `SignalValue<T>`의 셋과 일대일이며,
 * **불리언으로 뭉개지 않는다** — `hasPhotos: boolean`이면 `none`과 `unknown`이
 * 같은 `false`가 되고, 그것이 정확히 004가 값에서 지킨 구분을 화면에서 무너뜨린다.
 *
 * 권한이 없어 모르는 것을 「사진 없음」으로 적으면 **화면이 거짓을 말한다.**
 *
 * **사진만 싣는다**(FR-018a). 자리·걸음·배터리·연결은 전부 `unknown`이라(004의 결론)
 * 줄마다 「모른다」가 반복되어 정보가 아니라 소음이 된다 — 상세 화면은 셋을 그대로
 * 보인다(006 FR-032).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export type PhotoHint = { kind: "known"; count: number } | { kind: "none" } | { kind: "unknown" };

/**
 * 사용자가 지금 어디에 있는가 (data-model.md §2).
 *
 * `build-error`는 **막다른 길이다**(FR-035a) — 일기 기능이 막힌다. 다만 앱은 뜬다
 * (FR-035c): 시작 시점에 죽으면 원인을 알 길이 없다.
 */
export type AppScreen =
  | { kind: "build-error" }
  | { kind: "list"; items: DiaryListItem[] }
  | { kind: "detail"; day: DayDate; entry: DiaryEntry }
  | { kind: "unreadable"; day: DayDate }
  /**
   * 이미 있는 하루를 다시 쓰려 한다 (012 US3, FR-011~013).
   *
   * **일기 본문을 담지 않는다** — 007의 `toWriting()`이 인자를 받지 않는 것과 같은
   * 방어다(원칙 I). 기존 일기의 본문·글자 수·미리보기를 담으면 이 확인이 「확인 대신 미리
   * 보기」로 미끄러질 수 있다.
   *
   * **050 — `items`가 더해졌다.** 확인은 이제 전체 화면이 아니라 **홈 위의 대화상자**다(보드
   * `2d`). 뒤에 홈(스트립·헤더·목록)을 그려야 하므로 목록 요약을 싣는다. `DiaryListItem`은
   * 목록이 이미 보이는 요약(날짜·제목·읽을 수 있는가·사진 요약)이라 위 방어를 깨지 않는다 —
   * `DiaryEntry`는 여전히 싣지 않는다(050 data-model §3).
   */
  | { kind: "confirm-overwrite"; day: DayDate; items: DiaryListItem[] }
  /**
   * 015 — `stage`·`line` 둘 다 옵셔널이다. 화면이 뜬 직후, 첫 진행 신호가
   * 오기 전에는 둘 다 `undefined`일 수 있다(FR-011).
   *
   * **016 — `branch`가 더해졌다.** 모델 로드(콜드/핫)·사진 보기(많음/보통)
   * 단계에서 문구 풀을 다시 가르는 하위 갈래다 — `stage`가 바뀌지 않아도
   * `branch`만 갱신될 수 있다(사진 전환 신호, data-model.md 「AppScreen
   * 확장」 갱신 규칙).
   *
   * **타입 자체가 진행률·시간을 막는다** — `stage`는 `ProgressStage`,
   * `branch`는 `MonologueBranch`(둘 다 문자열 리터럴 유니온)뿐이고 `line`은
   * `string`뿐이다. 숫자·객체가 들어올 자리가 없다(data-model.md 「AppScreen
   * 확장」, 원칙 IV).
   */
  | { kind: "writing"; stage?: ProgressStage; branch?: MonologueBranch; line?: string }
  | { kind: "written"; entry: DiaryEntry; saved: boolean; overwrote: boolean }
  | { kind: "failed"; message: string };

/**
 * 「일기 쓰기」를 누르면 무슨 일이 일어나는가 (007 FR-023·024, data-model.md §4).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 이것을 안다는 것과 이것으로 갈리는 것은 다르다.**
 *
 * `overwrites`는 「이미 있다」를 **알리는 데만** 쓰인다. `toWriting()`은 여전히
 * 인자를 받지 않으므로 **쓰기를 시작하는 함수는 이 값을 볼 수 없고**, 따라서
 * 「이미 있으면 그것을 보여주자」로 갈릴 수 없다(FR-025, 원칙 I).
 *
 * **`AppScreen`에 싣지 않는다.** 화면 상태는 「어디에 있는가」이고 이것은 「무엇을 하게
 * 되는가」다. 섞으면 `list` 갈래가 목록 밖의 사정을 지고 다닌다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export type WritePrompt = {
  /**
   * 쓰게 될 하루 — **사용자가 고른 날**, 고른 적이 없으면 오늘(049 FR-010a).
   *
   * 006에서는 언제나 마지막으로 닫힌 하루였고, 009에서 사흘 중 고른 하루가 됐고, 049부터는
   * **지난 날 전부** 중 고른 하루다. 미래는 올 수 없다(P1 — 들어오면 오늘로 떨어진다).
   */
  day: DayDate;
  /** 그 하루에 이미 일기가 있는가 — 누르면 덮어쓴다(FR-024) */
  overwrites: boolean;
  /*
   * **049가 걷어낸 필드**: `selectable`(사흘 목록 — 화면은 이제 사흘을 모른다),
   * `revertedFrom`(되돌림 — 지난 날을 모두 고를 수 있어 밀려날 곳이 없다),
   * `writableAt`(정오 전환 — 쓸 수 없는 오늘이 없다), **`writable`**(고른 날은 미래면 오늘로
   * 떨어지므로 언제나 참이 됐다 — 구현 중 발견). 도달할 수 없는 자리를 타입에 남기면 그것은
   * 계약이 아니라 거짓말이다(042 `skipped`의 교훈). 미래 날의 마지막 방어는 파이프라인의
   * `isDayWritable` 게이트 하나로 남는다.
   */
};

/**
 * 화면이 받는 개수 요약 (048, data-model.md §2).
 *
 * **`SignalValue`의 세 갈래를 그대로 옮긴다**(원칙 V) — 없음과 모름을 0으로 뭉개지 않는다.
 * `PhotoHint`와 모양은 같지만 뜻이 다르다: `PhotoHint`는 **그 일기가 본 것**, 이것은
 * **지금 쓰면 볼 것**이다. 하나로 합치지 않는다.
 */
export type CountHint = { kind: "known"; count: number } | { kind: "none" } | { kind: "unknown" };

/**
 * 신호 줄 — 화면이 받는 하루 신호의 전부 (048).
 *
 * **화면은 `DaySignals`를 모른다**(009 이후 경계). 신호 원형을 이 모양으로 좁히는 것은
 * `app/day-preview.ts`이고, 이 파일은 신호 계층을 import하지 않는다(DP8).
 * `day`를 싣는 이유: 늦게 도착한 이전 날의 결과를 화면이 대조해 버린다(FR-019).
 */
export type DayPreview = { day: DayDate; photos: CountHint; places: CountHint };

/**
 * 스트립 칸 하나 (048).
 *
 * `hasDiary`는 7칸 전부의 **읽기 전용** 정보이고, 누를 수 있는지는 `selectable`이 따로 말한다 —
 * 흐린 칸에 쓴 일기가 있어도 스트립에서 그것을 열지 않는다(읽기는 목록이 맡는다).
 */
export type StripCell = {
  day: DayDate;
  hasDiary: boolean;
  /** 오늘인가 — 숫자 밑줄 (049). 헤더에는 「오늘」 글자가 없고 이 밑줄로만 구분한다 */
  isToday: boolean;
  /** 누를 수 있는가 — 미래가 아니다(049). 거짓이면 흐림 */
  selectable: boolean;
  selected: boolean;
};

/**
 * 지금 쓰면 무엇이 되는지 정한다 (049 contracts/day-picking.md WP).
 *
 * **「지금」을 인자로 받는다**(002 FR-018a). 안에서 `new Date()`를 부르면 자정 경계를
 * 테스트할 수 없다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **049 — 사흘을 모른다.** 지난 날은 전부 고를 수 있으므로 고른 날이 범위 밖으로 밀려나는
 * 일이 없다(009의 되돌림이 도달할 수 없게 됐다). 고른 적이 없으면 **오늘**이다(048 D9를
 * 뒤집음 — 앱을 열면 오늘). `selectableDays()`는 백그라운드·알림·미리 준비의 범위이고
 * 이 파일은 그것을 부르지 않는다(DB13).
 *
 * 고른 날이 미래면(정상 경로로는 오지 않는다) 조용히 오늘로 떨어진다 — 그래서 고른 날은
 * 언제나 쓸 수 있고, 「쓸 수 있는가」를 따로 싣지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function writePromptFor(
  items: readonly DiaryListItem[],
  now: Date,
  chosenDay?: DayDate | null,
): WritePrompt {
  const today = dayOf(now);
  const day = chosenDay != null && chosenDay <= today ? chosenDay : today;

  return {
    day,
    // **덮어쓰기는 「고른 하루」를 따른다**(I5). 읽을 수 없는 일기도 그 하루를 차지한다
    // (원칙 V, 007에서 세운 규칙).
    overwrites: items.some((item) => item.day === day),
  };
}

/**
 * 한 날의 칸 판정 (050 data-model §1, contracts/dialogs.md CAL5·CAL6).
 *
 * **스트립(049)과 달력(050 `2j`)이 같은 판정 하나를 쓴다** — 복제하지 않는다(FR-017). 두 곳이 따로
 * 계산하면 스트립과 달력이 서로 다른 날을 「오늘」로 볼 수 있다. 「오늘」·「미래가 아니다」는
 * `day-boundary.ts`에서만 온다(049 DB11).
 */
export function cellFor(
  day: DayDate,
  items: readonly DiaryListItem[],
  selectedDay: DayDate,
  now: Date,
): StripCell {
  return {
    day,
    // 읽을 수 없는 일기도 그 하루를 차지한다(006 FR-017a).
    hasDiary: items.some((item) => item.day === day),
    isToday: day === dayOf(now),
    selectable: isDayWritable(day, now),
    selected: day === selectedDay,
  };
}

/**
 * 홈 스트립의 7칸 — **고른 날이 든 일~토 주** (049 SW1·SW2, 보드 `1d`).
 *
 * **날짜 계산은 `weekOf()`가 한다** — 하루 경계가 이 파일로 새지 않는다. 칸 하나의 판정은
 * `cellFor()`다(050). 스트립(`DayPicker`)은 판정하지 않고 이 결과만 그린다.
 */
export function weekCellsFor(
  items: readonly DiaryListItem[],
  prompt: WritePrompt,
  now: Date,
): StripCell[] {
  return weekOf(prompt.day).map((day) => cellFor(day, items, prompt.day, now));
}

/** 스트립을 넘기는 방향 — 오른쪽으로 끌면 이전 주, 왼쪽이면 다음 주 */
export type SwipeDirection = "previous" | "next";

/**
 * 주를 넘긴 뒤 고를 날 (049 SW3~SW5, data-model §5).
 *
 * 요일을 유지한 채 7일 옮긴다. **오늘이 든 주에서는 다음 주가 없다**(`null` — 화면은 튕김만
 * 보인다). 오늘이 든 주로 돌아올 때 유지한 요일이 오늘 이후면 오늘로 맞춘다(FR-006).
 */
export function swipeWeek(selected: DayDate, direction: SwipeDirection, now: Date): DayDate | null {
  if (direction === "previous") return shiftWeek(selected, -1);

  const today = dayOf(now);
  if (weekOf(selected).includes(today)) return null;
  const next = shiftWeek(selected, 1);
  return next > today ? today : next;
}

/** 다음 주로 넘길 수 있는가 — 거짓이면 화면이 끌림에 저항을 건다(러버밴드) */
export function canSwipeNext(selected: DayDate, now: Date): boolean {
  return swipeWeek(selected, "next", now) !== null;
}

/**
 * 날짜 조각 (048). 표기 조립은 `ui/home-text.ts`가 한다 — 여기는 숫자만 준다.
 *
 * `YYYY-MM-DD`를 기기 시간대의 달력 날짜로 읽는다. `weekday`는 0이 일요일이다.
 */
export function dayParts(day: DayDate): {
  year: number;
  month: number;
  date: number;
  weekday: number;
} {
  const [year, month, date] = day.split("-").map(Number);
  return { year, month, date, weekday: new Date(year, month - 1, date).getDay() };
}

/**
 * 첫 화면을 정한다.
 *
 * **환경을 모르면 일기 기능을 막는다**(FR-035a). 저장된 일기가 있어도 마찬가지다 —
 * 추론 위치를 고를 수 없으므로 새 일기를 쓸 수 없고, 그 상태를 감추면 사용자는
 * 빈 화면 앞에서 원인을 짐작하게 된다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **020 — 알림을 눌러 열렸으면 목록을 건너뛰고 그 하루의 상세로 간다**(FR-006,
 * SC-004). `opts.initialDay`가 그 하루이고, `opts.entry`는 화면이 미리 읽은
 * 일기다(이 함수는 순수하므로 스스로 읽지 않는다 — 006의 `initialScreen`이
 * `EnvironmentResolution`만 받는 성질을 지킨다).
 *
 * `initialDay`가 목록에 없거나(지워졌거나) 읽히지 않으면 조용히 목록으로
 * 떨어진다 — `routeFromNotification`이 형식 불명 응답에 `null`을 주는 것과
 * 같은 원칙(모르면 정상 시작).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function initialScreen(
  resolution: EnvironmentResolution,
  items: DiaryListItem[],
  opts: { initialDay?: DayDate | null; entry?: DiaryEntry | null } = {},
): AppScreen {
  if (!resolution.ok) return { kind: "build-error" };

  const { initialDay, entry } = opts;
  if (initialDay != null) {
    const item = items.find((i) => i.day === initialDay);
    if (item !== undefined && item.readable && entry != null) {
      return { kind: "detail", day: initialDay, entry };
    }
    // 목록에 없거나 못 읽으면 목록으로 — 알림 라우팅이 조용히 실패한다(원칙 V).
  }

  return { kind: "list", items };
}

/** 목록으로 돌아간다. 돌아올 때마다 새로 읽은 목록을 받는다(FR-022) */
export function toList(items: DiaryListItem[]): AppScreen {
  return { kind: "list", items };
}

/**
 * 목록의 한 줄을 연다.
 *
 * **읽지 못하면 빈 일기를 지어내지 않는다**(FR-017a). `entry`가 `null`이면
 * `unreadable`로 가며, 그것은 「일기가 없다」와 다른 상태다(원칙 V).
 *
 * 목록을 만든 뒤 파일이 깨졌을 수 있으므로 `readable: true`인 항목도 `null`을 받을 수
 * 있다 — 그때도 같은 자리로 간다.
 */
export function toDetail(item: DiaryListItem, entry: DiaryEntry | null): AppScreen {
  if (!item.readable || entry === null) return { kind: "unreadable", day: item.day };
  return { kind: "detail", day: item.day, entry };
}

/**
 * 일기 쓰기를 시작한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 인자가 없는 것이 원칙 I의 방어다**(S1, FR-045).
 *
 * 저장 상태를 인자로 받으면 「이미 있으면 그것을 보여준다」가 한 줄로 가능해지고,
 * 그 순간 저장된 것이 생성을 대신한다. **볼 수 없으면 그것으로 갈릴 수 없다.**
 *
 * 003이 `allAssets()`를 두지 않은 것과 같은 판단이다 — 있으면 잘못된 일이 쉬워진다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function toWriting(): AppScreen {
  return { kind: "writing" };
}

/**
 * 「일기 쓰기」를 눌렀을 때 갈 곳을 정한다 (012 US3, contracts/overwrite-confirm.md §1).
 *
 * **`WritePrompt.overwrites`를 재사용한다** — 새 판정을 만들지 않는다(C4). 007이
 * 세운 "누르기 전 예고"(`overwrites`)와 이 함수가 만드는 "누른 뒤 확인"이 같은
 * 사실을 본다.
 *
 * 이미 있으면 `confirm-overwrite`로 가서 곧바로 생성을 시작하지 않는다(FR-011).
 * 없으면 지금처럼 바로 `writing`이다.
 */
export function startWriting(prompt: WritePrompt, items: DiaryListItem[]): AppScreen {
  if (prompt.overwrites) {
    // 050 — 대화상자 뒤에 그릴 홈의 목록을 함께 든다. 취소는 이것으로 돌아간다(다시 읽지 않는다).
    return { kind: "confirm-overwrite", day: prompt.day, items };
  }
  return toWriting();
}

/**
 * 덮어쓰기 확인에서 취소한다 (012, FR-012).
 *
 * 기존 일기는 그대로 남고 아무것도 생성되지 않는다 — 목록으로 돌아갈 뿐이다. 050 — 화면은
 * 대화상자가 들고 있던 `items`를 넘긴다. 취소는 아무것도 바꾸지 않았으므로 다시 읽지 않는다.
 */
export function cancelOverwrite(items: DiaryListItem[]): AppScreen {
  return toList(items);
}

/**
 * 덮어쓰기 확인에서 확인한다 (012, FR-011).
 *
 * **`toWriting()`은 여전히 인자를 받지 않는다**(C3) — `confirm-overwrite`가 들고
 * 있던 날짜를 그대로 파이프라인에 넘길 뿐이며, "이미 있는 일기를 보여주는" 지름길이
 * 생기지 않는다.
 */
export function confirmOverwrite(): AppScreen {
  return toWriting();
}

/**
 * 쓰기 전에 막힌다 (007 FR-006).
 *
 * **`failed`에 `text`가 없는 것은 그대로다**(006 FR-030) — 여기 실리는 것은 사용자가
 * 할 수 있는 말이지 생성된 글이 아니다.
 *
 * 006은 고른 캐릭터가 없을 때 `"quiet"`으로 채워 파이프라인이 `model-not-ready`로
 * 멈추게 두었다. **그것은 고르지도 않은 캐릭터로 쓰려 든 것이며**, 007은 그 앞에서
 * 가른다(FR-008).
 */
export function toFailed(message: string): AppScreen {
  return { kind: "failed", message };
}

/**
 * 생성 결과를 화면으로 옮긴다 (data-model.md §5).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **`storage` 실패만 `failed`가 아니다**(FR-012a).
 *
 * 6단계(저장)에 도달했다는 것 자체가 5단계(생성) 성공을 뜻하므로 **보여줄 글이 있다.**
 * 30초를 들인 글이고 다시 생성해도 같은 글이 나오지 않으므로 읽을 기회를 빼앗지 않는다.
 *
 * 다만 `saved: false`로 **남지 않는다는 것을 함께 전한다**(FR-012b) — 성공처럼 보이면
 * 사용자는 일기가 남은 줄 안다(SC-008c).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function afterGeneration(result: PipelineResult): AppScreen {
  if (result.ok) {
    return { kind: "written", entry: result.entry, saved: true, overwrote: result.overwrote };
  }

  // 저장 실패인데 글이 있다 — 보여주되 남지 않는다고 말한다.
  if (result.entry !== undefined) {
    // 쓰기가 실패했으므로 기존 일기는 그대로 남아 있다(002 FR-023b) — 덮어쓴 것이 아니다.
    return { kind: "written", entry: result.entry, saved: false, overwrote: false };
  }

  // **거부된 글은 여기 오지 않는다** — 애초에 결과에 없다(002 FR-012).
  return { kind: "failed", message: describeStage(result.stage, result.reason) };
}
