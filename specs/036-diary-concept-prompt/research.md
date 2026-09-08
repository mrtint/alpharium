# Phase 0 Research: 일기 자동 생성 프롬프트 재구성 (E2SN)

**Date**: 2026-09-08 | **Plan**: [plan.md](./plan.md)

리포트(`docs/superpowers/specs/2026-09-07-diary-concept-prompt-experiment-report.md`)와
my-ollama `concept-prompt-experiment` 브랜치(`cdabf64`)를 읽어 확인한 것.

---

## R1. `ConceptCase.signals` ↔ alpharium `DaySignals`

**결정**: 매핑 코드가 필요 없다. 같은 모양이다.

**근거**: `my-ollama/src/fixtures/alpharium/concept-cases.ts`가 alpharium의 `DaySignals`·
`PhotoObservation`·`PhotoPlaces`·`PhotoVision` 타입을 그대로 복제해 뒀다(파일 주석:
"alpharium `DaySignals`·`PhotoVision`과 같은 모양의 **데이터**만 둔다"). 그리고
`gen-baseline.ts`가 조립을 my-ollama 쪽에서 하지 않고 **alpharium의 실제
`buildRequest(c.signals, character, c.vision ? 'quick' : 'none', c.day, c.now)`**를
import해 부른다. 따라서 036이 `prompt.ts`를 고치면 `gen-baseline.ts`는 그 새 코드로
프롬프트를 뽑는다.

한 가지 미세 차이: my-ollama `PhotoPlaces`에 `representativeCoordinate`가 없다
(alpharium엔 옵셔널로 있음). 프롬프트는 좌표를 안 읽으므로(장소명은 `request.placeName`
문자열로 옴) 무관하다.

**대안**: alpharium에 매핑 어댑터를 두는 것 — 불필요. 타입이 이미 같고 `gen-baseline`이
실코드를 부른다.

---

## R2. `koHour` · `koCount` · `koMeters` 헬퍼

**결정**: `concept-candidates.ts`에서 alpharium `src/diary/prompt.ts`로 **이름 있는
함수로 복사**한다(인라인 아님). 출처 주석을 단다.

**원본** (my-ollama `concept-candidates.ts` L403~415):

```ts
const KO_NUM = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열', '열한', '열두'];
function koHour(h: number): string {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const part = h < 9 ? '아침' : h < 12 ? '오전' : h < 14 ? '낮' : h < 18 ? '오후' : h < 21 ? '저녁' : '밤';
  return `${part} ${KO_NUM[h12]} 시`;
}
function koCount(n: number, unit: string): string {
  return n <= 12 ? `${KO_NUM[n]} ${unit}` : `${n} ${unit}`;
}
function koMeters(m: number): string {
  if (m >= 1000) { const km = Math.round(m / 500) / 2; return Number.isInteger(km) ? `${koCount(km, '킬로미터')}` : `${km} 킬로미터`; }
  return `${m} 미터`;
}
```

**근거**: `sentenceSignalLines()`가 이 셋을 여러 번 부른다(시각 목록·개수·거리).
인라인하면 `prompt.ts`가 읽기 어려워지고, 이 파일의 관례(고정 지시문·헬퍼를 이름
있는 상수/함수로)에 어긋난다. 바이트 일치를 지키려면 **문자 그대로** 복사한다 —
`KO_NUM` 배열의 낱말 하나만 달라도 SC-001이 깨진다.

**대안**: 한국어 숫자 라이브러리 — 과하다. 12까지만 낱말이고 나머지는 아라비아
숫자라 이 12칸 배열이 정확히 실험이 검증한 것이다.

---

## R3. 언어 분기를 어디에 두는가

**결정**: `LANGUAGE[character] === "한국어"` 하나로 판정. 네 함수가 각자 분기한다:

| 함수 | 한국어 캐릭터 (quiet·narrative·imaginative) | 외국어 (chinese·english) |
|---|---|---|
| `fixedHead()` | 호칭 줄 + `E2_RULES` + (quiet면 톤 줄) + `E2_TITLE` | 현행 `SPEAKER_RULES` + `nameLine` + `TITLE_INSTRUCTION` |
| `signalLines()` (신호 본문) | `sentenceSignalLines()` (문장형) | 현행 `describe()` (라벨형) |
| `visionLines()` (캡션) | "내가 {N}시에 담은 장면:" + `SCENE_LIMIT` | 현행 "사진에 담긴 것:" 목록 |
| `instructionLines()` | 새 머리 + `SCENE_LIMIT` + `S_*` 고정 줄 | 현행 머리 + 현행 한계 줄 |

**근거**:
- `LANGUAGE`는 이미 `prompt.ts`에 있는 **사람이 못 박은 캐릭터→언어 표**
  (`quiet/narrative/imaginative: "한국어"`, `chinese: "중국어"`, `english: "영어"`).
  코드가 값을 보고 정하는 것이 아니므로 원칙 V MUST NOT에 안 걸린다.
- 로스터가 바뀌어(예: 새 한국어 캐릭터 추가) 자동으로 따라온다 — `character ===
  "quiet" || …` 열거보다 안전하다.
- Clarification Q1(=B): 세 한국어 캐릭터 모두 E2SN. 문장형 신호가 한국어 숫자
  낱말이라 셋 다 유효.

**대안**:
- `character`로 직접 분기 — 로스터 변경에 취약. 기각.
- 별도 `USES_E2SN_HEAD` 상수 신설 — `LANGUAGE`가 이미 그 정보를 담으므로 중복. 기각.
- 다섯 캐릭터 전부 E2SN 머리 + 외국어는 라벨형 신호(Q1 옵션 C) — 사용자가 B를
  골랐다. 기각.

---

## R4. `E_TONE` 이관

**결정**: 다섯 캐릭터 전부 옮기되(`E_TONE: Record<Character, string>`), 실제로 붙는
것은 `quiet`뿐. `narrative`·`imaginative`는 빈 문자열이라 `fixedHead()`가 빈 줄을 안
넣는다. `chinese`·`english`는 현행 머리라 `E_TONE`을 안 읽는다.

**원본** (my-ollama `concept-candidates.ts` L332~338):

```ts
export const E_TONE: Record<ConceptCharacter, string> = {
  quiet: '담담하게, 짧게 쓴다.',
  narrative: '하루의 결을 짚되, 열 문장 안에 끝낸다.',
  imaginative: '추리는 자유롭게 하되, 반드시 짐작의 말투로 쓴다.',
  chinese: '적게 쓰되 여운을 남긴다.',
  english: '차분히 쓴다.',
};
```

**근거**: 리포트 §3.1이 루이(narrative)·오드(imaginative) 톤 줄 초안을 **"채택 안 함"**
으로 결론냈다 — 루이 초안은 잘림 4~8/18(씨앗 "가장 길게 쓴다" 증폭 = 헌법 원칙 III
위반), 오드 초안은 이행 22~33%. 그래서 두 캐릭터엔 톤 줄을 안 넣는다. `E_TONE`의
`narrative`·`imaginative` 값은 my-ollama 실험용이었고 alpharium엔 빈 문자열로 둔다.

**주의**: `buildCandidate('E2SN', …)`의 `e2HeadLines(character)`는 `E_TONE[character]`를
**그대로 넣는다**(빈 문자열 아님). 그래서 my-ollama의 narrative·imaginative E2SN
프롬프트에는 그 톤 줄이 들어 있다. **바이트 대조(SC-001)를 위해**, alpharium은
`narrative`·`imaginative`에도 `E_TONE`의 그 값을 넣어야 `buildCandidate` 출력과 같다
— **다시 검토가 필요한 지점**:
- 옵션 A: alpharium도 `E_TONE` 다섯 값을 그대로 넣는다 → SC-001 18프롬프트 전부
  일치. 단 §3.1 "채택 안 함"과 어긋남.
- 옵션 B: alpharium은 `quiet`만 톤 줄, `narrative`·`imaginative`는 안 붙임 →
  `buildCandidate`와 narrative·imaginative에서 **바이트가 다르다**. SC-001을
  "quiet × 6 = 6프롬프트만 엄격 대조, narrative·imaginative는 '톤 줄 한 줄 제외
  나머지 동일'"로 완화.

→ **Phase 1 contracts에서 이것을 E8로 명시하고, 옵션 B를 택한다** — 헌법 원칙 III·
§3.1이 실측 근거이고, 바이트 대조는 "조립대로 옮겼는가"의 수단이지 목적이 아니다.
`gen-baseline` 대조 스크립트가 narrative·imaginative에서 톤 줄 한 줄만 다른 것을
허용하도록 짠다. quiet × 6은 완전 일치.

---

## R5. `gen-baseline.ts` 검증 절차

**결정**: 아래 순서. quickstart.md에 스크립트를 인라인한다.

1. 036 구현 **전** (현재 `main` 상태): my-ollama에서
   `ALPHARIUM_DIR=~/Workspace/alpharium npx tsx scripts/concept-prompt/gen-baseline.ts`
   → `results/concept-prompt/prompts/baseline-pre036.json` (직접 이름 지정). 30행.
   chinese·english × 6 = 12행을 보관 — 회귀 기준.
2. 036 구현 **후** (`036-diary-concept-prompt` 브랜치): 같은 명령 →
   `baseline.json`. 30행.
3. 대조:
   - **quiet × 6**: `baseline.json`의 `quiet/*` 프롬프트 === `buildCandidate('E2SN',
     case, row).prompt` (바이트 완전 일치). SC-001의 핵심.
   - **narrative·imaginative × 6 각**: `buildCandidate('E2SN', …).prompt`에서 톤 줄
     (`E_TONE[character]`) 한 줄을 제거한 것 === `baseline.json` 프롬프트. (R4 옵션 B)
   - **chinese·english × 6 각**: `baseline.json` === `baseline-pre036.json` (바이트
     완전 일치, 회귀 없음). SC-001a.
4. 대조 스크립트는 my-ollama `scripts/concept-prompt/`에 새 파일로 두거나
   quickstart.md의 인라인 tsx로. **alpharium 코드가 아니다.**

**근거**: `gen-baseline.ts`는 이미 "박제 사본을 쓰지 않는다 — `ALPHARIUM_DIR`의
`prompt.ts`를 그대로 import"라고 설계됐다(파일 주석, 핸드오프 §4.2). 036이 그
`prompt.ts`를 고치면 자동으로 반영된다. `buildCandidate`는 baseline row(prefix·
prompt·instructionLines)를 입력으로 받아 E2SN을 조립하므로, "alpharium이 뽑은 것"과
"my-ollama가 조립한 것"을 나란히 비교할 수 있다.

---

## R6. `DAY_STILL_OPEN` → `S_DAY_OPEN` 문안 변경

**결정**: 한국어 캐릭터는 `S_DAY_OPEN`("오늘은 아직 다 가지 않았다. 이 뒤에 무슨 일이
더 있을지는 모른다."), 외국어는 현행 `DAY_STILL_OPEN`("오늘은 아직 끝나지 않았다. 이
기록 뒤에 무슨 일이 더 있었는지는 알 수 없다.") 유지.

**근거**: `sentenceSignalLines()`가 `S_DAY_OPEN`을 쓴다(my-ollama L444). 012가
`DAY_STILL_OPEN` 되뇜으로 `echo` 거부되는 것을 실기기에서 관측했는데(신호 빈약한
날), 새 문안도 `instructionLines()`에 실려 같은 판정 대상이 된다. `prompt.test.ts`의
P2("DAY_STILL_OPEN이 instructionLines의 되뱉기 비교 대상에 포함된다")를 한국어
캐릭터는 `S_DAY_OPEN`으로 검사하도록 갱신한다.

**주의**: `day-open` 케이스(케이스 4)가 이 경로를 탄다 — `signals: EMPTY, day: DATE,
now: 15:00`. E2SN 프롬프트에서 `S_DAY_OPEN`이 `sentenceSignalLines()` 맨 앞에 온다.

---

## R7. `S_*` / `SCENE_LIMIT` 고정 문안

**결정**: 아래를 alpharium `prompt.ts`에 상수로 추가(한국어 캐릭터용). 문자 그대로
복사.

| 상수 | 문안 | 현행 대응 |
|---|---|---|
| `S_DAY_OPEN` | 오늘은 아직 다 가지 않았다. 이 뒤에 무슨 일이 더 있을지는 모른다. | `DAY_STILL_OPEN` |
| `S_TRUNCATED` | 이것이 그날 사진의 전부는 아니다. 더 있을 수 있다. | `TRUNCATED_WARNING` |
| `S_PLACES` | 이 자리들은 사진이 찍힌 지점이지 하루의 궤적은 아니다. | `PLACES_LIMITATION` |
| `S_VISION_PARTIAL` | 사진이 더 있었지만 그중 몇 장만 보았다. | `VISION_PARTIAL` |
| `SCENE_LIMIT` | 이 장면들 속 사람이 누구인지, 주인과 어떤 사이인지 나는 모른다. 사진에 찍힌 순간 밖에서 그 사람이 무엇을 했는지도 모른다. | (신규 — A-wrap) |

**근거**: 현행 상수와 문안이 미묘하게 다르다(예: `TRUNCATED_WARNING`은 "사진의 정확한
수를 단언하지 마라"까지 있음). E2SN은 §5.6에서 검증된 문안이므로 그대로 써야 SC-001이
성립한다. 현행 상수는 외국어 캐릭터가 계속 쓰므로 지우지 않는다.

---

## R8. `E2_RULES` · `E2_TITLE` 전문

**원본** (my-ollama `concept-candidates.ts` L368~389, 문자 그대로):

```ts
export const E2_RULES: readonly string[] = [
  '너는 주머니와 가방 속에서 하루를 보내서, 주인이 어디에 있었는지는 알아도 무엇을 했는지는 보지 못한다. 그래서 너의 일기는 본 것으로 주인의 하루를 짐작하는 글이다.',
  '아래 기록이 단서의 전부다. 단서가 말해 주는 것은 주인이 언제 어디에 있었는가, 얼마나 움직였는가, 그때 무엇이 보였는가뿐이다. 이것으로 주인이 그날 무엇을 했을지 짐작해라.',
  '무엇을 먹었는지, 누구를 만났는지, 어떤 가게나 방에 있었는지는 단서가 말해 주지 않는다. 기록에 없는 장소 이름, 사람, 물건, 사건을 끌어와 짐작을 채우지 마라.',
  "짐작은 '~였을 것 같다', '~였을지도 모른다'처럼 짐작의 말투로 쓴다. 있었다·했다 같은 단정은 기록에 있는 것에만 쓴다.",
  '일기는 기록에 있는 하루 한 편이다. 시각과 숫자를 나열하지 말고 문장으로 이어 써라. 단서가 적은 날은 두세 문장이면 된다. 마지막 문장은 그날에 대한 짐작으로 끝내라.',
];

export const E2_TITLE = [
  '첫 줄에 제목을, 그다음 줄을 비운 뒤, 그 아래에 본문을 적어라.',
  '제목은 그날의 짐작 하나를 짐작의 말투로 적는다. 날짜나 이름만 넣은 제목은 쓰지 마라.',
  '서식 기호 없이 보통 문장으로만 쓴다.',
  '본문 첫 문장은 주인이 그날 한 일에 대한 짐작으로 시작한다.',
].join(' ');
```

**머리 첫 줄** (호칭 포함, `e2HeadLines`):
`너는 '{이름}'이라 불린다. 주인의 휴대폰이다. 이 글의 '나'는 휴대폰이지 주인이 아니다.`

→ alpharium `nameLine()`은 현재 `너는 '{이름}'이라 불린다.`만 반환한다. E2SN 머리는
그 뒤에 "주인의 휴대폰이다. 이 글의 '나'는 휴대폰이지 주인이 아니다."가 **붙어 있는
한 줄**이다. `fixedHead()`(한국어)가 이 결합된 첫 줄을 만든다 — `displayNameOf()`로
이름을 넣되 호칭이 이 줄 안에 있어 접두사에 남는다(FR-005, 018 P11).

---

## 미해결로 남기는 것 (Phase 1 contracts / tasks에서)

- **R4 옵션 B의 대조 스크립트 형태** — narrative·imaginative에서 톤 줄 한 줄 제외
  비교. quickstart.md에 구체화.
- **`instructionLines()`의 외국어 분기** — chinese·english가 현행 그대로여야 하므로
  `instructionLines()`도 언어로 갈라야 한다. 현재 이 함수는 캐릭터 무관하게 같은
  줄을 낸다. Phase 1 E5·E6에서 계약으로.
- **`sentenceInstructionLines()` 이관** — `concept-candidates.ts`에 있는 이 함수가
  한국어 캐릭터의 `instructionLines()` 대응이다. 옮긴다.
