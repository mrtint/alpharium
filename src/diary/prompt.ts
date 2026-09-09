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
 *  2. 캐릭터에서 오는 것은 **언어와 이름뿐이다**(FR-014a, 014 FR-015). 성격 지시를
 *     넣지 않는다 — 성격은 모델의 성질이지 우리가 만드는 것이 아니다(원칙 III).
 *     **014가 이름을 더했다** — `persona.ts`의 `tagline`(소개)은 프롬프트에 들어가지
 *     않는다(persona.md 계약 P4), `name`(이름)만 호칭으로 들어간다
 *  3. `known`/`none`/`unknown`이 **서로 다른 말**이 된다(FR-012a·b)
 *  4. 관측의 한계가 함께 간다(FR-012c·d). 004가 값에 붙여 둔 것을 떨어뜨리지 않는다
 *  5. 모델 정보를 담지 않는다(FR-015)
 *  6. **결정적이다**(P6). 시각·난수를 읽지 않는다
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * **평문 문자열 하나로 넘긴다**(research.md §4). `messages` 배열과 채팅 템플릿을 쓰지
 * 않는 이유는 셋이다: 모델마다 템플릿이 달라 최종 문자열이 모델마다 달라지면
 * FR-005·FR-014를 확인할 수 없고, 되뱉기 판정이 「우리가 보낸 문자열」을 알아야 하며,
 * 데스크톱 경로와 맞추기 쉽다.
 */

import { USER_VISIBLE_SIGNAL_AXES, type DaySignals, type SignalValue } from "../signals/types";
import type { PhotoVision } from "../vision/types";
import { displayNameOf } from "./character-name";
import type { Character, CustomNames, DiaryRequest } from "./types";

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
  // ─────────────────────────────────────────────────────────────────────────
  // ★ 014 US3 — 짐작 어미 지시 (research.md R3).
  //
  // 005·007·011의 위반 공통 패턴은 "짐작해도 될 만한 것을 단정형 어미로 썼다"는
  // 것이었다("~것 같다"였다면 위반이 아니었을 문장이 "~했다"로 쓰여 위반이 됐다).
  // 기존 문구는 "무엇을 쓸지"는 말했지만 "어떻게(어떤 어미로) 쓸지"는 말하지 않았다.
  "확실하지 않은 것은 '~인 것 같다', '~였을지도 모른다'처럼 짐작의 말투로 써라. 있었다, 했다처럼 단정하는 말투는 실제로 본 것에만 써라.",
];

/* ────────────────── E2SN — 한국어 캐릭터 새 머리 (036) ────────────────── */

/**
 * E2SN 머리 규칙 (036, 리포트 §5.6 채택안 / 헌법 1.5.0).
 *
 * `SPEAKER_RULES`(8줄)를 대체한다 — **한국어 캐릭터만.** 다른 언어의 캐릭터는 위
 * `SPEAKER_RULES`를 쓴다(036 Clarification Q1=B).
 *
 * **037 — 지금은 로스터가 한국어 하나라 `SPEAKER_RULES`·`TITLE_INSTRUCTION` 경로에
 * 닿는 캐릭터가 없다.** 그래도 지우지 않는다(FR-014): 문장형 신호가 한국어 숫자
 * 낱말이라 다른 언어에 그대로 못 쓰므로, 외국어 캐릭터가 다시 들어오면 그 경로가
 * 필요하다. `usesE2SN()`이 언어로 갈래를 정하므로 캐릭터가 늘면 자동으로 이어진다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **헌법 1.5.0 원칙 II 「화자는 본 것으로 주인의 하루를 짐작한다」를 구현한다.**
 *
 *  - 짐작 MAY: "본 것으로 주인의 하루를 짐작하는 글" 명시 + 짐작의 말투 지시.
 *  - "모른다고 쓴 일기가 지어낸 일기보다 낫다"·「알 수 없는 것」 예시 나열을
 *    **뺐다**(FR-002) — 이 둘이 리포트 §5.4·§5.6에서 끝 문단 면책을 만들었다
 *    (채택 후보 BA 8/16, 같은 프롬프트를 Haiku에 주면 6/6).
 *  - 면책·되뇜 SHOULD NOT: 마지막 줄 "마지막 문장은 그날에 대한 짐작으로 끝내라".
 *  - 사람·관계·단정 MUST NOT: 3번째 줄 "기록에 없는 장소 이름, 사람, 물건,
 *    사건을 끌어와 짐작을 채우지 마라".
 *
 * **판정 갈래를 늘리지 않는다**(헌법 1.5.0 원칙 IV MUST). 면책·되뇜·인물형
 * 지어내기를 재는 코드를 넣지 않는다 — 확인은 my-ollama, 제품은 판정 4갈래만.
 *
 * 문안 출처: my-ollama `concept-prompt-experiment`(`cdabf64`)
 * `src/fixtures/alpharium/concept-candidates.ts` `E2_RULES` (roadmap 18 experiment).
 * ─────────────────────────────────────────────────────────────────────────────
 */
const E2_RULES: readonly string[] = [
  "너는 주머니와 가방 속에서 하루를 보내서, 주인이 어디에 있었는지는 알아도 무엇을 했는지는 보지 못한다. 그래서 너의 일기는 본 것으로 주인의 하루를 짐작하는 글이다.",
  "아래 기록이 단서의 전부다. 단서가 말해 주는 것은 주인이 언제 어디에 있었는가, 얼마나 움직였는가, 그때 무엇이 보였는가뿐이다. 이것으로 주인이 그날 무엇을 했을지 짐작해라.",
  "무엇을 먹었는지, 누구를 만났는지, 어떤 가게나 방에 있었는지는 단서가 말해 주지 않는다. 기록에 없는 장소 이름, 사람, 물건, 사건을 끌어와 짐작을 채우지 마라.",
  "짐작은 '~였을 것 같다', '~였을지도 모른다'처럼 짐작의 말투로 쓴다. 있었다·했다 같은 단정은 기록에 있는 것에만 쓴다.",
  "일기는 기록에 있는 하루 한 편이다. 시각과 숫자를 나열하지 말고 문장으로 이어 써라. 단서가 적은 날은 두세 문장이면 된다. 마지막 문장은 그날에 대한 짐작으로 끝내라.",
];

/**
 * E2SN 제목 지시문 (036, 리포트 §5.1·§7-4).
 *
 * `TITLE_INSTRUCTION`(6문장)을 대체한다 — 한국어 캐릭터만.
 *
 *  - 이름 든 반례('금동이의 오늘 일기'·'루이의 하루')를 "날짜나 이름만 넣은
 *    제목"으로 바꿨다 — 반례의 이름이 베낄 대상이 됐다(리포트 §5.2, Sonnet도
 *    base 제목 4/6 → 이름 뺀 D2 0/6, exaone 94% → 0%).
 *  - 서식 기호 나열('#, *, **, -')을 "서식 기호"로 뭉뚱그렸다 — 기호를 보여
 *    주면 kanana가 `#없음 *없음`, `#생략 #서식기호금지`를 베낀다(§5.2).
 *
 * 문안 출처: `concept-candidates.ts` `E2_TITLE`.
 */
const E2_TITLE = [
  "첫 줄에 제목을, 그다음 줄을 비운 뒤, 그 아래에 본문을 적어라.",
  "제목은 그날의 짐작 하나를 짐작의 말투로 적는다. 날짜나 이름만 넣은 제목은 쓰지 마라.",
  "서식 기호 없이 보통 문장으로만 쓴다.",
  "본문 첫 문장은 주인이 그날 한 일에 대한 짐작으로 시작한다.",
].join(" ");

/**
 * 캐릭터별 톤 줄 (036, 리포트 §3.1, 헌법 1.5.0 원칙 III MAY).
 *
 * **`quiet`(금동이)만 실측 근거가 있다** — "짧게 적는다"를 넣은 B·BA·B2·BA2
 * 72런에서 글자 238~311(base 464), 잘림 0, 톤 이행 83~94%. 씨앗("짧고 정확하다",
 * 006·007 실측)과 **같은 방향**이라, 헌법 1.5.0이 원칙 III에 더한 조항("톤 지시는
 * 씨앗과 같은 방향이어야 하고 근거를 주석에 남긴다 MUST")을 충족한다.
 *
 * **톤 줄이 없는 캐릭터는 빈 문자열을 둔다** — `fixedHead()`가 빈 문자열이면 그 줄을
 * 아예 안 넣는다(조건부 spread). 근거 없는 톤 줄을 지어내지 않기 위한 자리이며,
 * 037로 로스터가 하나가 된 뒤에도 이 구조를 유지한다(FR-014) — 둘째가 들어올 때
 * 근거가 없으면 빈 문자열로 시작한다.
 */
const E_TONE: Readonly<Record<Character, string>> = {
  quiet: "담담하게, 짧게 쓴다.",
};

/**
 * 문장형 신호·감싼 캡션에 붙는 고정 문장 (036).
 *
 * 현행 상수(`DAY_STILL_OPEN`·`TRUNCATED_WARNING`·`PLACES_LIMITATION`·`VISION_PARTIAL`)와
 * **문안이 다르다** — 리포트 §5.6에서 문장형 흐름에 맞춰 검증된 문안이다. 현행
 * 상수는 지우지 않는다(chinese·english가 계속 씀). 문안 출처: `concept-candidates.ts`.
 *
 * 전부 신호 값을 담지 않으므로 되뱉기 판정 대상(`instructionLines()`)에 들어간다.
 */
const S_DAY_OPEN = "오늘은 아직 다 가지 않았다. 이 뒤에 무슨 일이 더 있을지는 모른다.";
const S_TRUNCATED = "이것이 그날 사진의 전부는 아니다. 더 있을 수 있다.";
const S_PLACES = "이 자리들은 사진이 찍힌 지점이지 하루의 궤적은 아니다.";
const S_VISION_PARTIAL = "사진이 더 있었지만 그중 몇 장만 보았다.";

/**
 * 감싼 캡션 묶음 뒤에 붙는 고정 문장 (036, 리포트 §4.1 A-wrap).
 *
 * **캡션 인물 미끄러짐을 잡는 자리.** 머리에 인물 조항을 더하면(A-rule) kanana
 * 화자 ok 17%로 떨어진다("그 사람이 무엇을 했는지 쓰지 마라"를 머리에서 읽은
 * 모델이 본문에서 정확히 그것을 쓴다). 감싸기 + 이 문장만으로 kanana는 잡힌다
 * (A-wrap 화자 ok 83%, 영어 캡션 3/3). 문안 출처: `concept-candidates.ts` `SCENE_LIMIT`.
 */
const SCENE_LIMIT =
  "이 장면들 속 사람이 누구인지, 주인과 어떤 사이인지 나는 모른다. 사진에 찍힌 순간 밖에서 그 사람이 무엇을 했는지도 모른다.";

/**
 * 한국어 숫자 낱말 (036, 리포트 §5.6 손잡이 S).
 *
 * 문장형 신호가 "라벨: 값"("사진: 5장")을 "사진은 다섯 장이 남았다"로 바꾸는 데
 * 쓴다 — kanana가 "라벨: 값" 줄을 되읽어 옮기는 것을 §2.4·§5.6이 확인했다.
 * **문자 그대로** my-ollama `concept-candidates.ts`에서 옮겼다(낱말 하나만 달라도
 * §5.6 실측과 바이트가 어긋난다). 12까지만 낱말이고 나머지는 아라비아 숫자다.
 *
 * `koHour`는 인자만 읽는다 — `buildPrompt()`가 결정적이어야 하기 때문(005 P6).
 */
const KO_NUM = [
  "",
  "한",
  "두",
  "세",
  "네",
  "다섯",
  "여섯",
  "일곱",
  "여덟",
  "아홉",
  "열",
  "열한",
  "열두",
];

function koHour(h: number): string {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const part =
    h < 9 ? "아침" : h < 12 ? "오전" : h < 14 ? "낮" : h < 18 ? "오후" : h < 21 ? "저녁" : "밤";
  return `${part} ${KO_NUM[h12]} 시`;
}

function koCount(n: number, unit: string): string {
  return n <= 12 ? `${KO_NUM[n]} ${unit}` : `${n} ${unit}`;
}

function koMeters(m: number): string {
  if (m >= 1000) {
    const km = Math.round(m / 500) / 2;
    return Number.isInteger(km) ? `${koCount(km, "킬로미터")}` : `${km} 킬로미터`;
  }
  return `${m} 미터`;
}

/**
 * 캐릭터 → 출력 언어 (FR-014a·014b). **캐릭터에서 오는 것은 이것과 이름뿐이다**
 *
 * **로스터가 하나여도 이 표를 지우지 않는다**(037 FR-014). `usesE2SN()`이 이 값을
 * 읽어 프롬프트 갈래를 정하므로, 표가 사라지면 캐릭터가 늘 때 갈래를 새로 만들어야
 * 한다.
 */
const LANGUAGE: Readonly<Record<Character, string>> = {
  quiet: "한국어",
};

/**
 * 이 캐릭터가 E2SN 프롬프트(새 머리 + 문장형 신호 + 감싼 캡션)를 받는가 (036).
 *
 * **코드가 신호 값을 보고 정하는 것이 아니다**(헌법 원칙 V MUST NOT) — `LANGUAGE`는
 * 사람이 못 박은 캐릭터→언어 표다. 한국어 캐릭터가 로스터에 추가되면 자동으로
 * E2SN 경로를 탄다. chinese·english는 현행 머리·라벨형 신호를 유지한다 — 문장형
 * 신호가 한국어 숫자 낱말이라 다른 언어에 그대로 못 쓴다(036 Clarification Q1=B).
 */
function usesE2SN(character: Character): boolean {
  return LANGUAGE[character] === "한국어";
}

/**
 * 제목 지시문 (014 FR-006, 017 FR-010a~010d).
 *
 * **판정 갈래를 늘리지 않는다**(contracts/title.md TL1, 원칙 IV) — `judge()`는
 * 이 지시를 지켰는지 확인하지 않는다. `pipeline.ts`의 `extractTitle()`이 판정
 * 통과 후 사후 분리를 시도할 뿐이며, 형식을 안 지켜도 거부되지 않는다(FR-009).
 *
 * **되뱉기 판정 대상이 된다** — `SPEAKER_RULES`처럼 `instructionLines()`에도
 * 담기므로(research.md R5), 모델이 이 지시문을 그대로 되뱉으면 기존 `isEcho()`가
 * 자동으로 잡는다(별도 배선 불필요).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **017 — 실기기 저장 데이터(2026-08-23)에서 세 가지 문제가 드러나 보강했다**
 * (research.md §8·§9, contracts/title.md TL2·TL4·TL9·TL10·TL11):
 *
 *  1. 제목이 "{캐릭터}의 오늘 일기"류 재조합 문구로 퇴화한다 → **구체적 반례를
 *     든다**(TL2). 완성된 긍정 예시 문장은 넣지 않는다(TL3) — 모델이 그대로
 *     베낄 대상을 만들지 않는다.
 *  2. 마크다운 서식 기호(`###`·`**...**`)가 그대로 노출된다 → **기호를 직접
 *     나열해 금지한다**(TL9, 011·012의 관례상 추상적 "서식 없이"보다 잘 통한다).
 *  3. 본문 첫 줄이 지시문의 "빈 줄"이라는 낱말을 문자 그대로 되뱉거나(짧은
 *     되뱉음이라 `isEcho()`가 못 잡는다) 날짜를 반복하는 부제목성 줄로
 *     시작한다 → **"빈 줄"이라는 낱말 자체를 지시문에서 없애고**(TL10) 개행
 *     구조로만 서식을 전달하며, **본문이 날짜·제목을 반복하지 말라고
 *     명시한다**(TL11).
 *
 * 짐작 어미 규칙(`SPEAKER_RULES` 마지막 항목)이 제목에도 적용됨을 명시해(TL4)
 * "구체적으로 쓰라"는 요구가 단정형 지어내기로 미끄러지지 않게 한다. 캐릭터별로
 * 다른 지시문을 두지 않는다(TL5) — 로스터의 캐릭터가 모두 같은 요구를 받되, 실제
 * 제목의 문체 차이는 각자의 씨앗에서 자연히 나온다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const TITLE_INSTRUCTION = [
  "첫 줄에 제목을, 그다음 줄을 비운 뒤, 그 아래에 본문을 적어라.",
  "제목은 그날 실제로 있었던 구체적인 장면이나 자리를 가리켜야 한다.",
  "'금동이의 오늘 일기', '루이의 하루'처럼 이름과 날짜만 조합한 제목은 쓰지 마라.",
  "확실하지 않은 것을 제목에 쓸 때도 단정하지 말고 짐작의 말투를 써라 — 본문에 적용한 것과 같은 규칙이 제목에도 적용된다.",
  "제목과 본문 어디에도 #, *, **, - 같은 서식 기호를 쓰지 마라. 기호 없이 보통 문장으로 적어라.",
  "본문의 첫 줄은 날짜나 제목을 반복하지 말고, 그날 있었던 일로 바로 시작해라.",
].join(" ");

/**
 * 캐릭터 호칭 지시문 (014 FR-015).
 *
 * **이름만 알린다 — 성격은 지시하지 않는다.** `persona.ts`가 캐릭터 내부 식별자와
 * 사람이 읽는 이름 사이의 유일한 통과 지점이듯, 이 함수가 프롬프트로 넘어가는
 * 그 이름의 유일한 형태다. `personaOf(character).tagline`(소개)은 여기서
 * 절대 읽지 않는다(persona.md 계약 P4) — 소개 문구가 프롬프트에 섞이면 "군더더기
 * 없이 담백하게 적어요" 같은 문구가 성격 지시로 오독될 위험이 있다.
 */
function nameLine(character: Character, customNames: CustomNames): string {
  return `너는 '${displayNameOf(character, customNames)}'이라 불린다.`;
}

/**
 * 날마다 바뀌지 않는 프롬프트의 앞부분 (018, contracts/prompt-prefix.md P9).
 *
 * `buildPrompt()`가 쓰는 것과 **같은 배열**이다 — 복제하면 언젠가 어긋나고,
 * 어긋나면 프리워밍의 KV 캐시가 빗나가 018의 효과가 조용히 사라진다(성능
 * 저하로만 나타나 오류가 없다).
 */
function fixedHead(character: Character, customNames: CustomNames): string[] {
  const language = LANGUAGE[character];
  const name = displayNameOf(character, customNames);

  // 036 — 한국어 캐릭터는 E2SN 머리. chinese·english는 현행(아래).
  if (usesE2SN(character)) {
    return [
      // 호칭 줄은 접두사에 남는다 (035 FR-020, 018 P11) — 빼면 한국어 캐릭터
      // 셋의 접두사가 이름 말고는 같아진다. E2SN 첫 줄은 호칭 + 휴대폰 정체가
      // 한 줄이다(concept-candidates.ts e2HeadLines).
      `너는 '${name}'이라 불린다. 주인의 휴대폰이다. 이 글의 '나'는 휴대폰이지 주인이 아니다.`,
      ...E2_RULES,
      // 톤 줄 — quiet만 값이 있다(§3.1). 빈 문자열이면 원소 자체가 안 들어가
      // `\n\n`(빈 줄)이 생기지 않는다(contracts E8).
      ...(E_TONE[character] ? [E_TONE[character]] : []),
      E2_TITLE,
      "",
      `${language}로 써라.`,
      "",
    ];
  }

  return [
    ...SPEAKER_RULES,
    nameLine(character, customNames),
    TITLE_INSTRUCTION,
    "",
    `${language}로 써라.`,
    "",
  ];
}

/**
 * 미리 프리필할 고정 접두사 (018, contracts/prompt-prefix.md).
 *
 * **`buildPrompt()`의 결과는 언제나 이 문자열로 시작한다**(P8) — 그 성질이
 * 018 기능 전체의 안전장치이며 `prompt.test.ts`가 잠근다.
 */
export function promptPrefix(character: Character, customNames: CustomNames = {}): string {
  return fixedHead(character, customNames).join("\n");
}

/**
 * 아직 끝나지 않은 하루에 붙는 문장 (012 FR-003·004).
 *
 * **사진 축과 무관하게 붙는다** — `signalLines()` 안이 아니라 `buildPrompt()`의
 * 최상단, `SPEAKER_RULES` 다음에 온다(로드맵 결정 (c), spec Clarifications). 사진
 * 권한이 없는 사용자에게도 전달되어야 하므로 신호 목록의 일부가 아니라 하루 자체에
 * 대한 진술로 둔다.
 *
 * **`SPEAKER_RULES`처럼 신호 값을 담지 않는 고정 문구다** — 되뱉기 판정의 비교
 * 대상에 들어간다(`instructionLines()`). `SPEAKER_RULES`가 "기록에 없는 것을
 * 단언하지 마라"를 이미 모든 요청에 무조건 포함하므로(FR-005), 이 문장은 그 위에
 * "하루가 아직 안 끝났다"는 사실 하나만 더할 뿐 새 판정 갈래를 만들지 않는다
 * (research.md §8 "FR-005는 새 판정을 만들지 않는다").
 */
const DAY_STILL_OPEN =
  "오늘은 아직 끝나지 않았다. 이 기록 뒤에 무슨 일이 더 있었는지는 알 수 없다.";

/** 잘린 사진 목록에 붙는 경고 (FR-012c, 004 FR-014d) */
const TRUNCATED_WARNING =
  "위 사진이 그날의 전부가 아니다. 더 있을 수 있으니 사진의 정확한 수를 단언하지 마라.";

/** 사진에서 얻은 자리에 붙는 한계 (FR-012d, 004 FR-013e) */
const PLACES_LIMITATION =
  "이 자리들은 하루의 궤적이 아니라 사진이 찍힌 지점들이다. 사진을 찍지 않은 곳은 여기 없다.";

/**
 * 대표 장소 이름 줄을 만든다 (017 FR-008, contracts/place-name.md L4).
 *
 * **관측 서술이지 단정이 아니다** — 원칙 II의 문체를 그대로 따른다("다녀온
 * 곳은 ○○ 근처였다"). `request.placeName`이 이미 `known`으로 확정된
 * 문자열이므로 여기서는 짐작 어미를 강제하지 않는다 — 좌표를 실제로 물어봐
 * 얻은 이름이라는 점에서 사진 캡션과 같은 자격의 관측이다.
 */
function placeNameLine(placeName: string): string {
  return `다녀온 곳은 ${placeName} 근처였다.`;
}

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
  // 036 — 한국어 캐릭터는 E2SN 머리 + 문장형 고정 줄. chinese·english는 현행(아래).
  if (usesE2SN(request.character)) {
    return [
      ...E2_RULES,
      ...(E_TONE[request.character] ? [E_TONE[request.character]] : []),
      E2_TITLE,
      ...sentenceInstructionLines(request, vision),
      ...(vision !== undefined ? visionLimitLines(vision, request.character) : []),
    ];
  }

  const lines = [
    ...SPEAKER_RULES,
    nameLine(request.character, request.customNames ?? {}),
    TITLE_INSTRUCTION,
  ];

  // 012 — 사진 축과 무관하게, 하루가 아직 끝나지 않았으면 붙는다(FR-004).
  if (request.dayStillOpen) {
    lines.push(DAY_STILL_OPEN);
  }

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
  if (vision !== undefined) lines.push(...visionLimitLines(vision, request.character));

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
function visionLimitLines(vision: PhotoVision, character: Character): string[] {
  const lines: string[] = [];

  // 있는 것 중 일부만 보았다 (SC-007).
  //
  // 036 — 한국어 캐릭터는 `S_VISION_PARTIAL`을 `sentenceSignalLines()`가 캡션 뒤에
  // 붙이므로 여기서 빼야 중복되지 않는다(FR-016). `VISION_UNREAD`·`VISION_NONE_READ`는
  // §5.6 실험에서 문안이 안 바뀌어 한국어도 현행 그대로다.
  if (!usesE2SN(character) && vision.available > vision.considered) lines.push(VISION_PARTIAL);

  if (vision.captions.length === 0) {
    // ★ 사진은 있는데 하나도 못 읽었다 — **「사진이 없었다」가 아니다**(SC-006).
    if (vision.considered > 0) lines.push(VISION_NONE_READ);
  } else if (vision.captions.length < vision.considered) {
    lines.push(VISION_UNREAD);
  }

  return lines;
}

/**
 * 캡션을 "내가 N시에 담은 장면:" 틀로 감싼다 (036, 리포트 §4.1 A-wrap).
 *
 * 캡션 본문은 그대로다(011 — 재서술은 VLM의 일, 캡션 언어는 영어 유지). 묶음 뒤에
 * `SCENE_LIMIT` 고정 문장이 붙어 캡션 인물을 이야기 밖에 둔다. 문안 출처:
 * `concept-candidates.ts` `wrappedCaptionLines()`.
 */
function wrappedCaptionLines(vision: PhotoVision): string[] {
  if (vision.captions.length === 0) return [];
  return [
    ...vision.captions.map((c) => `내가 ${c.takenAt.getHours()}시에 담은 장면: ${c.text}`),
    SCENE_LIMIT,
  ];
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
function visionLines(vision: PhotoVision, character: Character): string[] {
  if (vision.captions.length === 0) return [];

  // 036 — 한국어 캐릭터는 감싼 틀. chinese·english는 현행 목록.
  if (usesE2SN(character)) return wrappedCaptionLines(vision);

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

  // 012 — 관측 통로가 없는 축은 값과 무관하게 프롬프트에 싣지 않는다(FR-006·007·010).
  // 사람이 적은 USER_VISIBLE_SIGNAL_AXES가 유일한 판정처다 — 값(kind)을 보고
  // 코드가 스스로 정하지 않는다(헌법 원칙 V MUST NOT).
  if (USER_VISIBLE_SIGNAL_AXES.steps) {
    lines.push(...describe("걸음 수", signals.steps, (steps) => `${steps}걸음`));
  }

  if (USER_VISIBLE_SIGNAL_AXES.battery) {
    lines.push(
      ...describe(
        "배터리",
        signals.battery,
        (battery) =>
          `${Math.round(battery.startLevel * 100)}%에서 ${Math.round(battery.endLevel * 100)}%로, ` +
          `충전${battery.charged ? "했다" : "하지 않았다"}`,
      ),
    );
  }

  if (USER_VISIBLE_SIGNAL_AXES.connectivity) {
    lines.push(
      ...describe(
        "연결",
        signals.connectivity,
        (net) =>
          `와이파이 ${net.wifiMinutes}분, 셀룰러 ${net.cellularMinutes}분` +
          (net.wentOffline ? ", 아무 데도 닿지 못한 때가 있었다" : ""),
      ),
    );
  }

  return lines;
}

/* ──────────────── 문장형 신호 — 한국어 캐릭터 (036) ──────────────── */

/**
 * 신호를 "라벨: 값"이 아니라 문장으로 옮긴다 (036, 리포트 §5.6 손잡이 S·N).
 *
 * `describe()`가 `사진: 5장 (8시, ...)`을 내던 것을 `사진은 다섯 장이 남았다.
 * 아침 여덟 시, ...에 찍혔다.`로 바꾼다 — kanana가 "라벨: 값" 줄을 되읽어 일기
 * 첫머리에 옮기는 것을 §2.4·§5.6이 확인했다(신호 줄 베낌 10/18). 날짜도 뺀다(N)
 * — 날짜가 문장에 있으면 그 문장이 제목 자리로 간다(D2S 17/18).
 *
 * **`none`/`unknown` 구분은 유지**("없었다" vs "모른다. {reason}.") — 헌법 원칙 V.
 * **걸음·배터리·연결은 안 만든다**(FR-009) — 통로가 없는 축이라
 * `sentenceSignalLines`에 그 갈래가 아예 없다(값을 보고 정하는 것이 아니다).
 *
 * dayStillOpen·잘린 사진 경고·자리 한계·캡션·`S_VISION_PARTIAL`이 전부 이 안에서
 * 처리된다 — `buildPrompt()`의 별도 `dayStillOpenPart`·`placeNamePart`·`visionPart`를
 * 대체한다(data-model.md §3·§5). 문안 출처: `concept-candidates.ts`
 * `sentenceSignalLines()` (roadmap 18 experiment).
 */
function sentenceSignalLines(request: DiaryRequest, vision?: PhotoVision): string[] {
  const { signals } = request;
  const lines: string[] = [];

  if (request.dayStillOpen) lines.push(S_DAY_OPEN);
  lines.push("오늘 내가 본 것은 이렇다.");

  // 사진
  const ph = signals.photos;
  if (ph.kind === "known") {
    if (ph.value.photos.length === 0) {
      lines.push("사진은 없었다.");
    } else {
      const times = ph.value.photos.map((p) => koHour(p.takenAt.getHours())).join(", ");
      lines.push(`사진은 ${koCount(ph.value.photos.length, "장")}이 남았다. ${times}에 찍혔다.`);
      if (!ph.value.complete) lines.push(S_TRUNCATED);
    }
  } else if (ph.kind === "none") {
    lines.push("사진은 없었다.");
  } else {
    lines.push(`사진은 모른다. ${ph.reason}.`);
  }

  // 자리
  const pl = signals.places;
  if (pl.kind === "known") {
    const { visitCount, approximateDistanceMeters } = pl.value.trace;
    lines.push(
      `자리는 ${koCount(visitCount, "곳")}에 남았고, 가장 먼 두 곳은 ${koMeters(approximateDistanceMeters)}쯤 떨어져 있다. ` +
        `사진 ${koCount(pl.value.photosConsidered, "장")} 중 ${koCount(pl.value.photosWithLocation, "장")}에서 얻은 자리다.`,
    );
    lines.push(S_PLACES);
  } else if (pl.kind === "none") {
    lines.push("다닌 자리는 남지 않았다.");
  } else {
    lines.push(`다닌 자리는 모른다. ${pl.reason}.`);
  }

  if (request.placeName !== undefined) {
    lines.push(`다녀온 곳은 ${request.placeName} 근처였다.`);
  }

  if (vision !== undefined && vision.captions.length > 0) {
    lines.push(...wrappedCaptionLines(vision));
  }
  if (vision !== undefined && vision.available > vision.considered) {
    lines.push(S_VISION_PARTIAL);
  }

  return lines;
}

/**
 * 문장형 신호에 딸리는 고정 지시문 줄 (036, 되뱉기 판정 대상).
 *
 * `sentenceSignalLines()`가 낸 것 중 **신호 값을 안 담는 고정 문장만** 골라
 * `instructionLines()`(한국어)에 넘긴다 — `S_DAY_OPEN`·`S_TRUNCATED`·`S_PLACES`·
 * `S_VISION_PARTIAL`·`SCENE_LIMIT`. 문장형 신호 본문("사진은 다섯 장이 남았다")은
 * 넣지 않는다(005 P7, 011 P5 — 재료를 쓴 일기가 echo로 거부되면 안 된다).
 */
function sentenceInstructionLines(request: DiaryRequest, vision?: PhotoVision): string[] {
  const { signals } = request;
  const lines: string[] = [];

  if (request.dayStillOpen) lines.push(S_DAY_OPEN);
  if (
    signals.photos.kind === "known" &&
    signals.photos.value.photos.length > 0 &&
    !signals.photos.value.complete
  ) {
    lines.push(S_TRUNCATED);
  }
  if (signals.places.kind === "known") lines.push(S_PLACES);
  if (vision !== undefined && vision.captions.length > 0) lines.push(SCENE_LIMIT);
  if (vision !== undefined && vision.available > vision.considered) lines.push(S_VISION_PARTIAL);

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
  const head = fixedHead(request.character, request.customNames ?? {});

  // 036 — 한국어 캐릭터는 문장형 신호. 날짜 머리줄·별도 dayStillOpen/placeName/vision
  // 조각이 전부 sentenceSignalLines() 안으로 들어간다(data-model.md §5). `signals.date`
  // 필드 자체는 안 지운다 — 본문에서만 안 쓴다(FR-007).
  if (usesE2SN(request.character)) {
    return [
      // 018 — promptPrefix()와 같은 배열에서 나온다(contracts/prompt-prefix.md P9).
      ...head,
      ...sentenceSignalLines(request, vision),
      "",
      "이 기록으로 그 하루의 일기를 써라.",
    ].join("\n");
  }

  // 011 — 사진을 읽었으면 그 내용과 한계가 신호 뒤에 붙는다.
  //
  // **`vision`이 없으면 005와 바이트 단위로 같은 문자열이 나온다**(P-1, SC-002) —
  // 「보지 않음」인 하루가 이 기능 이전과 똑같이 동작한다는 것의 구현이다.
  const visionPart =
    vision === undefined
      ? []
      : [...visionLines(vision, request.character), ...visionLimitLines(vision, request.character)];

  // 012 — 사진 축과 무관하게, 신호 목록과 독립된 자리에 온다(FR-004).
  const dayStillOpenPart = request.dayStillOpen ? [DAY_STILL_OPEN, ""] : [];

  // 017 — 장소명 설정이 켜져 있고 이름을 얻은 경우에만 붙는다(FR-008,
  // contracts/place-name.md L4). 화면과 같은 지오코딩 호출 결과를 공유한다.
  const placeNamePart = request.placeName !== undefined ? [placeNameLine(request.placeName)] : [];

  return [
    // 018 — promptPrefix()와 같은 배열에서 나온다(contracts/prompt-prefix.md P9).
    ...head,
    ...dayStillOpenPart,
    `${request.signals.date}에 네가 본 것:`,
    ...signalLines(request.signals),
    ...placeNamePart,
    ...visionPart,
    "",
    "이 기록으로 그 하루의 일기를 써라.",
  ].join("\n");
}
