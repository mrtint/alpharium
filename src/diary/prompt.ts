/**
 * 프롬프트 구성.
 *
 * 계약: specs/005-diary-generation/contracts/prompt.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **이 파일이 헌법 원칙 II의 유일한 통과 지점이다.**
 *
 * 001의 `policy.ts`가 원칙 I을, 003의 `roster.ts`가 원칙 III을, 004의 `collect.ts`가
 * 원칙 V를 한 곳에 모은 것과 같은 구조다. 화자가 휴대폰이라는 규칙이 저장소 전체에서
 * **여기 하나뿐**이어야 한다(FR-013b).
 *
 * **동시에 원칙 V가 두 번째로 갈리는 자리다.** 004가 「관측한 것」과 「관측하지 못한 것」을
 * 값에서 갈랐고, 이 자리가 그 구분을 **언어로 옮긴다.** 여기서 뭉개면 004가 지킨 것이
 * 무의미해진다 — `unknown`을 「0걸음」으로 적는 순간 일기가 거짓을 쓴다.
 *
 * **여기서 지키는 것**:
 *  1. 화자 규칙이 항상 들어간다(FR-013). 어떤 캐릭터, 어떤 신호에서도
 *  2. 캐릭터에서 오는 것은 **언어뿐이다**(FR-014a). 성격 지시를 넣지 않는다 — 성격은
 *     모델의 성질이지 우리가 만드는 것이 아니다(원칙 III)
 *  3. `known`/`none`/`unknown`이 **서로 다른 말**이 된다(FR-012a·b)
 *  4. 관측의 한계가 함께 간다(FR-012c·d). 004가 값에 붙여 둔 것을 떨어뜨리지 않는다
 *  5. 모델 정보를 담지 않는다(FR-015)
 *  6. **결정적이다**(P6). 시각·난수를 읽지 않는다
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * **평문 문자열 하나로 넘긴다**(research.md §4). `messages` 배열과 채팅 템플릿을 쓰지
 * 않는 이유는 셋이다: 다섯 모델의 템플릿이 서로 달라 최종 문자열이 모델마다 달라지면
 * FR-005·FR-014를 확인할 수 없고, 되뱉기 판정이 「우리가 보낸 문자열」을 알아야 하며,
 * 데스크톱 경로와 맞추기 쉽다.
 */

import type { DaySignals, SignalValue } from "../signals/types";
import type { PhotoVision } from "../vision/types";
import type { Character, DiaryRequest } from "./types";

/* ────────────────────────── 고정 지시문 ────────────────────────── */

/**
 * 화자 규칙 (FR-013·013a, 006 FR-036·037).
 *
 * **"지어내지 마라"가 아니라 "기록에 없는 것을 단언하지 마라"로 쓴다.** 앞은 짐작까지
 * 막고, 짐작은 헌법 원칙 II가 **권장한** 것이다("아마 ~했을 것이다"). 금지 대상은
 * 없는 대상을 등장시키는 것이지 추측 자체가 아니다.
 *
 * 헌법의 예를 그대로 옮기면: "주인이 나비에게서 눈을 떼지 않았다"는 위반이고,
 * "물구나무를 서라는 건지 산을 오르라는 건지 나는 알 수 없었다"는 위반이 아니다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 2026-08-20 실기기(SM-G986N)에서 이 규칙이 부족하다는 것이 드러났다.**
 *
 * 신호가 `photos: none` + 나머지 전부 `unknown`인 하루였는데, 생성된 일기에
 * 날씨·비·세탁기·청소기·인터넷·요리·TV·가족·저녁 식사·음악이 **전부 단언으로** 나왔다.
 * 005의 SC-002a 실패가 되풀이된 것이다.
 *
 * **왜 부족했는가**: 규칙이 「단언하지 마라」라고만 말하고 **무엇을 쓸지는 말하지
 * 않았다.** 모델은 쓸 것이 없으면 채운다 — 빈 종이를 주고 「거짓말하지 마라」만 말하면
 * 거짓말이 나온다. 길이를 채우려는 압력이 지어내기의 원인이다.
 *
 * 그래서 세 줄을 더한다:
 *  1. **본 것만 쓴다** — 금지가 아니라 **무엇을 쓸지**를 말한다
 *  2. **기록이 적으면 짧게 쓴다** — 길이 압력을 없앤다. 이것이 핵심이다
 *  3. **모르는 것을 모른다고 쓰는 것이 좋은 일기다** — 쓸 것이 없을 때의 대안을 준다
 *
 * 그리고 **구체적인 위반 예**를 준다. 추상적 금지만으로는 부족했다.
 *
 * **판정 갈래를 늘리지 않는다**(006 FR-039). 고치는 자리는 프롬프트뿐이며, 「지어냈는가」를
 * 자동으로 재는 코드를 넣는 순간 그것이 점수이고 원칙 IV 위반이다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const SPEAKER_RULES: readonly string[] = [
  "너는 주인의 휴대폰이다. 이 글의 '나'는 휴대폰이며 주인이 아니다.",
  "너는 주머니와 가방 속에 있어 세상을 조금밖에 보지 못한다. 주인이 어디에 있었는지는 알아도 무엇을 했는지는 모른다.",
  "아래에 적힌 기록만이 네가 아는 전부다. 기록에 있는 것만 쓰고, 기록에 없는 사물이나 사건을 있었던 것처럼 단언하지 마라.",
  // ★ 길이 압력을 없앤다. 실기기에서 지어내기의 원인이 이것이었다.
  "기록이 적으면 짧게 써라. 두세 문장이어도 좋다. 분량을 채우려고 없는 일을 만들지 마라.",
  // ★ 쓸 것이 없을 때의 대안. 헌법 원칙 II가 권장한 것이다.
  "다만 짐작은 해도 된다. '아마 ~했을 것이다'처럼 추측하거나, 모르는 것을 모른다고 쓰는 것은 좋다. 모른다고 쓴 일기가 지어낸 일기보다 낫다.",
  // ★ 구체적인 예. 추상적 금지만으로는 부족했다.
  "예를 들어 날씨, 주인이 먹은 것, 만난 사람, 집에서 한 일은 네가 알 수 없는 것이다. 기록에 없으면 쓰지 마라.",
  "정확한 기록이 아니라 하루의 감상을 쓴다.",
];

/** 캐릭터 → 출력 언어 (FR-014a·014b). **캐릭터에서 오는 것은 이것뿐이다** */
const LANGUAGE: Readonly<Record<Character, string>> = {
  quiet: "한국어",
  narrative: "한국어",
  imaginative: "한국어",
  // 헌법 「로스터」가 이 둘에 "한국어로는 쓰지 않는다(MUST NOT)"를 못 박았다.
  chinese: "중국어",
  english: "영어",
};

/** 잘린 사진 목록에 붙는 경고 (FR-012c, 004 FR-014d) */
const TRUNCATED_WARNING =
  "위 사진이 그날의 전부가 아니다. 더 있을 수 있으니 사진의 정확한 수를 단언하지 마라.";

/** 사진에서 얻은 자리에 붙는 한계 (FR-012d, 004 FR-013e) */
const PLACES_LIMITATION =
  "이 자리들은 하루의 궤적이 아니라 사진이 찍힌 지점들이다. 사진을 찍지 않은 곳은 여기 없다.";

/* ──────────────────── 사진의 내용 (011) ──────────────────── */

/**
 * 캡션 묶음에 붙는 한계 (011 FR-012, contracts/prompt.md P3).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **범위에 대한 것이지 정확도가 아니다.**
 *
 * 「다섯 장만 보았다」는 **관측된 사실**이고, 「그 다섯 장을 잘못 읽었을 수 있다」는
 * 여기 오지 않는다(FR-011). 둘을 섞으면 모델이 전부를 얼버무리게 되고, 005가 관측한
 * 것은 **압력이 지어내기를 낳는다**는 것이었다 — 방어를 더하는 것이 오히려 위반을 부른다.
 *
 * **휴대폰은 그 사진을 실제로 보았다.** 캡션은 004의 장수·좌표와 **같은 자격의 관측**이며,
 * 그래서 같은 말투로 적힌다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const VISION_PARTIAL =
  "사진이 더 있었으나 그중 몇 장만 보았다. 위에 적힌 것이 그날의 전부가 아니다.";

/** 고른 것 중 일부를 읽지 못했다 (FR-006) */
const VISION_UNREAD = "보려 한 사진 중 일부는 내용을 보지 못했다.";

/**
 * 사진은 있는데 하나도 읽지 못했다 (FR-005, SC-006).
 *
 * **「사진이 없었다」와 다르다.** 004가 값에서 지킨 `none`/`unknown` 구분이 한 겹
 * 위에서 반복되는 자리이며, 뭉개면 010이 실기기에서 확인한 「없었다 / 모른다」의 성취가
 * 무너진다.
 */
const VISION_NONE_READ = "사진은 있었으나 내용을 하나도 보지 못했다.";

/**
 * 되뱉기 판정이 비교할 지시문 줄 (FR-016b-1, contracts/prompt.md P7).
 *
 * **`buildPrompt()`와 같은 상수에서 나온다.** 각자 문자열을 들고 있으면 프롬프트를
 * 고칠 때 한쪽만 바뀌고, 그 순간 판정이 조용히 무력해진다. `prompt.test.ts`의 P-7이
 * 이 일치를 검사한다.
 *
 * **신호가 들어간 줄은 넣지 않는다.** "사진 세 장"은 일기에 자연스럽게 나올 수 있으므로
 * 비교 대상이면 오탐이 된다(research.md §7).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜 `request`를 받는가 — 구현 중에 드러난 것.**
 *
 * 계약은 이 함수를 「고정 줄」이라 불렀고 인자가 없는 모양을 상정했다. 그런데 경고
 * 두 줄(`TRUNCATED_WARNING`·`PLACES_LIMITATION`)은 **그 하루의 신호에 따라 프롬프트에
 * 들어가기도 하고 빠지기도 한다.** 인자 없이 둘을 늘 반환하면 P-7("모든 줄이 프롬프트에
 * 들어 있다")이 사진이 잘리지 않은 하루에서 깨진다.
 *
 * 둘을 목록에서 빼는 선택지도 있었으나, **그러면 모델이 그 두 줄을 그대로 되뱉어도
 * 잡지 못한다** — 지시문인데 판정에서 빠지는 구멍이 생긴다.
 *
 * 그래서 「그 프롬프트에 실제로 들어간 지시문」을 반환한다. 반환값은 여전히 신호 값을
 * 담지 않으므로(오탐이 나지 않으므로) 계약의 의도는 그대로다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function instructionLines(request: DiaryRequest, vision?: PhotoVision): string[] {
  const lines = [...SPEAKER_RULES];

  if (request.signals.photos.kind === "known" && !request.signals.photos.value.complete) {
    lines.push(TRUNCATED_WARNING);
  }
  if (request.signals.places.kind === "known") {
    lines.push(PLACES_LIMITATION);
  }

  // 011 — **한계 줄만 넣고 캡션 본문은 넣지 않는다**(contracts/prompt.md P5).
  //
  // ⚠️ **캡션을 넣으면 성공한 일기가 거부된다.** 005가 이미 「신호가 들어간 줄은 넣지
  // 않는다」고 적어 두었고, **캡션은 신호 그 자체다** — 「창가에 놓인 커피잔」이 일기에
  // 나오는 것은 **정확히 우리가 원하는 것**이며, 그것을 되뱉기로 판정하면 재료를 쓴
  // 일기가 통째로 버려진다.
  if (vision !== undefined) lines.push(...visionLimitLines(vision));

  return lines;
}

/**
 * 사진을 읽은 결과에 붙는 한계 줄 (FR-012, contracts/prompt.md P3).
 *
 * **범위에 대한 것만이다** — 「몇 장을 보았는가」이지 「잘 읽었는가」가 아니다(FR-011).
 *
 * **`instructionLines()`와 `buildPrompt()`가 같은 함수에서 가져간다.** 각자 문자열을
 * 들고 있으면 한쪽만 고쳐지고, 그 순간 판정이 조용히 무력해진다 — 005가
 * `SPEAKER_RULES`를 한 자리에 둔 것과 같은 판단이다.
 */
function visionLimitLines(vision: PhotoVision): string[] {
  const lines: string[] = [];

  // 있는 것 중 일부만 보았다 (SC-007).
  if (vision.available > vision.considered) lines.push(VISION_PARTIAL);

  if (vision.captions.length === 0) {
    // ★ 사진은 있는데 하나도 못 읽었다 — **「사진이 없었다」가 아니다**(SC-006).
    if (vision.considered > 0) lines.push(VISION_NONE_READ);
  } else if (vision.captions.length < vision.considered) {
    lines.push(VISION_UNREAD);
  }

  return lines;
}

/**
 * 캡션을 프롬프트 줄로 옮긴다 (FR-011, contracts/prompt.md P2).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **있는 그대로 적는다.** 짐작 표시·한계 문구·확신도를 붙이지 않는다.
 *
 * **휴대폰은 그 사진을 실제로 보았다.** 날씨나 커피잔처럼 관측한 적 없는 것과 달리
 * 사진은 진짜 입력이며, 요약은 004의 장수·좌표와 같은 자격의 관측이다. 「틀릴 수 있다」를
 * 덧붙이면 모델이 전부를 얼버무리게 되고, 005의 실측이 가르친 것은 **압력이 지어내기를
 * 낳는다**는 것이었다.
 *
 * **시각을 함께 적는 것이 FR-007b다.** 별도 문장을 더하지 않고 **줄 자체가 그것을
 * 보인다** — 저녁에만 찍은 하루는 `19시·20시·21시`가 나열되어 모델이 스스로
 * 「저녁의 기록만 있다」를 읽을 수 있다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
function visionLines(vision: PhotoVision): string[] {
  if (vision.captions.length === 0) return [];

  return [
    "사진에 담긴 것:",
    ...vision.captions.map((c) => `- ${c.takenAt.getHours()}시: ${c.text}`),
  ];
}

/* ────────────────────────── 신호 → 문장 ────────────────────────── */

/**
 * 신호 하나를 문장으로 옮긴다 (FR-012a·b).
 *
 * **세 갈래가 서로 다른 말이 된다.** `none`은 「없었다」이고 `unknown`은 「모른다」이며,
 * 둘을 같은 문장으로 적으면 004가 지킨 구분이 여기서 무너진다.
 *
 * **`unknown`에 기본값을 넣지 않는다.** 0으로 적으면 일기가 "걷지 않았다"고 쓴다.
 */
function describe<T>(label: string, signal: SignalValue<T>, known: (value: T) => string): string[] {
  switch (signal.kind) {
    case "known":
      return [`${label}: ${known(signal.value)}`];
    case "none":
      // 찾아봤는데 없었다 — 관측된 사실이며 일기의 내용이 된다.
      return [`${label}: 없었다.`];
    case "unknown":
      // 볼 수 없었다 — 일기의 내용이 될 수 없다. **왜 모르는지를 함께 싣는다**
      // (004가 담아 둔 것이며, "권한이 없다"와 "안드로이드가 안 준다"는 다른 사실이다).
      return [`${label}: 모른다. (${signal.reason})`];
  }
}

/** 하루의 신호 전체를 줄들로 옮긴다. */
function signalLines(signals: DaySignals): string[] {
  const lines: string[] = [];

  // 사진 — 004의 PhotoObservation은 목록과 「이것이 전부인가」를 함께 지닌다.
  // **`photos`만 꺼내면 한계가 사라진다**(004 FR-027이 편의 함수를 금지한 이유).
  lines.push(
    ...describe("사진", signals.photos, (observation) => {
      const times = observation.photos.map((photo) => `${photo.takenAt.getHours()}시`).join(", ");
      const count = `${observation.photos.length}장`;
      return observation.photos.length === 0 ? count : `${count} (${times})`;
    }),
  );
  if (signals.photos.kind === "known" && !signals.photos.value.complete) {
    lines.push(TRUNCATED_WARNING);
  }

  // 자리 — PhotoPlaces는 자리와 「어디서 왔는가」를 함께 지닌다.
  lines.push(
    ...describe("다닌 자리", signals.places, (places) => {
      const { visitCount, approximateDistanceMeters } = places.trace;
      return (
        `${visitCount}곳, 대략 ${approximateDistanceMeters}m 떨어져 있다. ` +
        // 좌표를 본 사진 수와 물어본 수가 함께 있어야 뜻이 산다 — 열 장 중 두 장만
        // 봤다면 "하루 종일 한 곳"이 아니라 "본 두 장이 같은 곳"이다.
        `(사진 ${places.photosConsidered}장 중 ${places.photosWithLocation}장에서 얻었다)`
      );
    }),
  );
  if (signals.places.kind === "known") {
    lines.push(PLACES_LIMITATION);
  }

  lines.push(...describe("걸음 수", signals.steps, (steps) => `${steps}걸음`));

  lines.push(
    ...describe(
      "배터리",
      signals.battery,
      (battery) =>
        `${Math.round(battery.startLevel * 100)}%에서 ${Math.round(battery.endLevel * 100)}%로, ` +
        `충전${battery.charged ? "했다" : "하지 않았다"}`,
    ),
  );

  lines.push(
    ...describe(
      "연결",
      signals.connectivity,
      (net) =>
        `와이파이 ${net.wifiMinutes}분, 셀룰러 ${net.cellularMinutes}분` +
        (net.wentOffline ? ", 아무 데도 닿지 못한 때가 있었다" : ""),
    ),
  );

  return lines;
}

/* ────────────────────────── 프롬프트 ────────────────────────── */

/**
 * 프롬프트를 만든다.
 *
 * **입력이 `DiaryRequest` 하나인 이유**: 002가 이미 신호·캐릭터·시각 설정을 묶어 두었다.
 * 따로 받으면 부르는 쪽이 조합을 만들 수 있고, 그러면 파이프라인이 넘긴 것과 다른 것이
 * 모델에 갈 수 있다.
 *
 * **결정적이다**(P6). `new Date()`도 난수도 읽지 않는다 — 되뱉기 판정이 「우리가 보낸
 * 문자열」을 알아야 성립하기 때문이다.
 *
 * **모델 정보를 담지 않는다**(FR-015). 캐릭터 식별자조차 넣지 않는다 — 새면 그것으로
 * 모델을 역추적할 수 있다.
 */
export function buildPrompt(request: DiaryRequest, vision?: PhotoVision): string {
  const language = LANGUAGE[request.character];

  // 011 — 사진을 읽었으면 그 내용과 한계가 신호 뒤에 붙는다.
  //
  // **`vision`이 없으면 005와 바이트 단위로 같은 문자열이 나온다**(P-1, SC-002) —
  // 「보지 않음」인 하루가 이 기능 이전과 똑같이 동작한다는 것의 구현이다.
  const visionPart =
    vision === undefined ? [] : [...visionLines(vision), ...visionLimitLines(vision)];

  return [
    ...SPEAKER_RULES,
    "",
    `${language}로 써라.`,
    "",
    `${request.signals.date}에 네가 본 것:`,
    ...signalLines(request.signals),
    ...visionPart,
    "",
    "이 기록으로 그 하루의 일기를 써라.",
  ].join("\n");
}
