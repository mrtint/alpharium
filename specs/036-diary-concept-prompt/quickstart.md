# Quickstart: E2SN 프롬프트 재구성 검증

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contracts**: [contracts/prompt-e2sn.md](./contracts/prompt-e2sn.md)

구현이 끝났다고 말하려면 아래 넷이 다 통과해야 한다.

---

## 1. 기기 없는 테스트

```bash
cd ~/Workspace/alpharium
npm run test:logic     # prompt.test.ts + prompt-e2sn.test.ts
npm run lint           # eslint + tsc + 헌법 검사 + prettier
```

**통과 기준**:
- `prompt-e2sn.test.ts` (신규) 전부 통과 — E1~E8.
- `prompt.test.ts` 회귀 통과 — P7·P8·P12·P2·제목 되뱉기.
- `tsc` 0 error. 헌법 검사 위반 0. prettier clean.
- `git diff src/diary/acceptance.ts` = 0줄 (E7).

---

## 2. 018 프리필 성질 (P8) — 한국어 3캐릭터

`prompt-e2sn.test.ts` 안에서:

```ts
for (const character of ["quiet", "narrative", "imaginative"] as const) {
  const prefix = promptPrefix(character);
  for (const c of CONCEPT_CASES) {
    const r = buildRequest(c.signals, character, c.vision ? "quick" : "none", c.day, c.now);
    const req = c.placeName ? { ...r.request, placeName: c.placeName } : r.request;
    expect(buildPrompt(req, c.vision).startsWith(prefix)).toBe(true);
  }
}
```

---

## 3. my-ollama 바이트 대조 (SC-001 / SC-001a)

**alpharium 밖 검증.** `npm test`에 안 들어간다.

### 3a. 036 구현 전 baseline (회귀 기준)

```bash
cd ~/Workspace/my-ollama
git checkout concept-prompt-experiment
cd ~/Workspace/alpharium && git stash    # 036 변경 잠깐 치움 (또는 git worktree로 main)
cd ~/Workspace/my-ollama
ALPHARIUM_DIR=~/Workspace/alpharium npx tsx scripts/concept-prompt/gen-baseline.ts
cp results/concept-prompt/prompts/baseline.json results/concept-prompt/prompts/baseline-pre036.json
cd ~/Workspace/alpharium && git stash pop
```

### 3b. 036 구현 후

```bash
cd ~/Workspace/alpharium && git checkout 036-diary-concept-prompt
cd ~/Workspace/my-ollama
ALPHARIUM_DIR=~/Workspace/alpharium npx tsx scripts/concept-prompt/gen-baseline.ts
# → results/concept-prompt/prompts/baseline.json (30행)
```

### 3c. 대조 스크립트

`~/Workspace/my-ollama/scripts/concept-prompt/verify-036.mjs` (신규, my-ollama 쪽):

**대조 방향** (analyze C3·C4): my-ollama `buildCandidate('E2SN', …)`의 `e2HeadLines`는
`E_TONE[character]`를 **모든 캐릭터에 리터럴로 넣는다** — narrative·imaginative
프롬프트에도 "하루의 결을 짚되…"·"추리는 자유롭게…" 톤 줄이 들어 있다. 반면
alpharium `fixedHead()`(036)는 narrative·imaginative에 **톤 줄을 아예 안 낸다**
(조건부 spread `...(E_TONE[c] ? [E_TONE[c]] : [])` — 빈 줄도 없음, R4 옵션 B / §3.1).
따라서 대조는 **my-ollama 쪽 expected에서 톤 줄을 뺀다**:

```js
import { readFileSync } from "node:fs";
import { CONCEPT_CASES } from "../../src/fixtures/alpharium/concept-cases.ts";
import { buildCandidate, E_TONE as MYOLLAMA_E_TONE } from "../../src/fixtures/alpharium/concept-candidates.ts";

const post = JSON.parse(readFileSync("results/concept-prompt/prompts/baseline.json"));
const pre  = JSON.parse(readFileSync("results/concept-prompt/prompts/baseline-pre036.json"));
const rowOf = (j, cid, ch) => j.rows.find(r => r.caseId === cid && r.character === ch);

function firstDiff(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return a.length === b.length ? -1 : n;
}

let fail = 0;
for (const c of CONCEPT_CASES) {
  // 한국어 3캐릭터: my-ollama E2SN 조립과 대조 (pre row를 baseline 입력으로)
  for (const ch of ["quiet", "narrative", "imaginative"]) {
    const got = rowOf(post, c.id, ch).prompt;
    let expected = buildCandidate("E2SN", c, rowOf(pre, c.id, ch)).prompt;
    if (ch !== "quiet") {
      // my-ollama 프롬프트에서 톤 줄 한 줄(앞의 \n 포함) 제거 — alpharium은 안 냄
      expected = expected.replace("\n" + MYOLLAMA_E_TONE[ch], "");
    }
    if (got !== expected) {
      const at = firstDiff(got, expected);
      console.error(`✗ ${c.id}/${ch} 바이트 불일치 @${at}: got …${JSON.stringify(got.slice(at, at+40))} / exp …${JSON.stringify(expected.slice(at, at+40))}`);
      fail++;
    } else console.log(`✓ ${c.id}/${ch}`);
  }
  // 외국어 2캐릭터: 구현 전과 동일 (회귀, SC-001a)
  for (const ch of ["chinese", "english"]) {
    const a = rowOf(post, c.id, ch).prompt;
    const b = rowOf(pre, c.id, ch).prompt;
    if (a !== b) {
      console.error(`✗ ${c.id}/${ch} 회귀 (구현 전과 다름) @${firstDiff(a, b)}`);
      fail++;
    } else console.log(`✓ ${c.id}/${ch} (회귀 없음)`);
  }
}
process.exit(fail ? 1 : 0);
```

**전제**: alpharium `fixedHead()`가 톤 줄을 조건부 spread로 넣어 narrative·
imaginative에서 `\n\n`(빈 줄)이 생기지 않아야 이 `replace`가 정확히 한 줄만
지운다. contracts E8 참조.

```bash
cd ~/Workspace/my-ollama
node scripts/concept-prompt/verify-036.mjs
```

**통과 기준**: 30행 전부 `✓`. quiet × 6은 완전 일치, narrative·imaginative × 6은
톤 줄 제외 일치, chinese·english × 6은 회귀 없음.

**어긋나면**: alpharium `prompt.ts`를 E2SN 조립과 맞춘다. `concept-candidates.ts`를
고치지 않는다(FR-024).

### 3d. 18프롬프트 파일로 보관 (FR-025)

```bash
# baseline.json에서 한국어 3캐릭터 × 6 = 18행을 뽑아
cd ~/Workspace/alpharium
mkdir -p specs/036-diary-concept-prompt/logs
# verify-036.mjs가 통과한 뒤 그 expected 문자열들을 logs/e2sn-prompts.txt로 덤프
```

---

## 4. 실기기 확인 (SC-004 / SC-004a / SC-005)

**SM-S901N / Galaxy S22, dev debug.** (AGENTS.md "도구 사용법" 절 준수 —
`EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client`, 기기 잠금 해제, `adb reverse`.)

### 4a. 금동이 (kanana) — 6편

- 사진 없는 날 3편 (010 seed 또는 실제 조용한 하루):
  - `unfinished`·`echo` 거부가 현행 대비 늘지 않는가 (`adb logcat`).
  - 마지막 문단이 "못 봤다/기록이 없다" 진술로 끝나지 않는가 (SC-004).
  - 날짜·"라벨: 값" 신호 줄이 일기 첫머리에 그대로 옮겨지지 않는가.
  - 짐작 어미 없는 인물형 지어내기 0편 (SC-005). 짐작 어미 붙은 장소 추측은 OK.
- 사진 있는 날 3편 (010 seed, 「빠르게 봄」):
  - 캡션 인물이 등장인물이 되지 않는가 (`SCENE_LIMIT` 효과).
  - `writingMs`가 현행 대비 방향상 줄었는가 (SC-007, 1회 관측).

### 4b. 루이·오드 — 각 1편 (SC-004a, 관측만)

- 설정 탭에서 "일기 작성자"를 루이/오드로 바꾸고 사진 없는 날 생성.
- (a) 저장이 되는가 (`rejected` 여부), (b) E2SN 머리에서 어떤 일기가 나오는가를
  **글로 기록**. 채점하지 않는다(원칙 IV). 이 관측이 로드맵 14번 입력.

### 4c. Maestro 회귀

```bash
cd ~/Workspace/alpharium
node scripts/run-device-tests.mjs   # FLOWS 등록된 것 전부
```

- `generate-diary.yml` — 일기 생성 흐름.
- `diary-user-path.yml` — 목록·상세.
- `prompt-preview.yml` (022) — 진단 미리보기가 새 머리·문장형 신호를 렌더.
  ⚠️ `SIGNAL_PRESETS`가 `buildPrompt()`를 부르므로 미리보기 문자열이 바뀐다 —
  PP1(미리보기 == `buildPrompt()`) 계약 테스트가 자동으로 따라오지만 Maestro
  문안 assert가 있으면 갱신 필요.

**통과 기준**: 회귀 흐름 PASS. 금동이 6편이 SC-004·SC-005 충족. 루이·오드 관측 기록됨.

---

## 완료 체크리스트

- [ ] `npm run test:logic` — `prompt-e2sn.test.ts` + `prompt.test.ts` 회귀 통과
- [ ] `npm run lint` — 0 error, 헌법 위반 0, prettier clean, `acceptance.ts` diff 0
- [ ] `verify-036.mjs` — 30행 전부 `✓` (SC-001, SC-001a)
- [ ] `logs/e2sn-prompts.txt` — 18프롬프트 보관 (FR-025)
- [ ] 실기기 금동이 6편 — SC-004, SC-005
- [ ] 실기기 루이·오드 각 1편 — SC-004a 관측 기록
- [ ] Maestro 회귀 3흐름 PASS
- [ ] `022 prompt-preview` 계약(PP1) 통과 — 미리보기가 새 프롬프트 반영
