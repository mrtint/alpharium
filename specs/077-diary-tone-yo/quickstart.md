# Quickstart: 077 검증

## 1. 기기 없는 테스트

```bash
npm run test:logic          # 프롬프트·추론 포트 계약
npm test && npm run lint    # 커밋 전
```

통과 기준: [contracts/prompt.md](contracts/prompt.md) TN1~TN6, [contracts/grammar.md](contracts/grammar.md) GR1~GR5를 잠근 테스트가 초록, `tsc` 0, 헌법 검사 통과.

위반 주입(각각 실패해야 한다): 틀 한 글자 변경 / 문법 인자 제거(run 또는 ask 한쪽) / 사진 `unknown` 문장을 `${ph.reason}`으로 되돌림 / `instructionLines()`에서 본 장면 꼬리 제거. 치환이 실제로 적용됐는지 먼저 확인한다.

## 2. 바이트 대조 (my-ollama, 지시서 §8)

1. my-ollama `e192c9b`를 스크래치에 받는다. `scripts/kanana2-compare/gen-prompts.ts`의 동적 import를 `pathToFileURL`로 고친 사본을 쓴다(AGENTS 061).
2. `TZ=Asia/Seoul ALPHARIUM_DIR=<이 저장소> ALPHARIUM_COMMIT=<sha> npx -y tsx <사본>/gen-prompts.ts`.
3. 10케이스의 `prompt`·`followUp`을 v5 `prompts.json`과 견준다 — 본 장면 있는 날 꼬리의 `'…'` 안은 자리표로 바꿔 비교. `instructionLines`는 집합으로 비교(research R6·R7).
4. 결과(같음/다름과 차이)를 이 파일 끝 「실측」에 적는다. my-ollama의 추적 파일을 덮어썼으면 되돌린다.

## 3. 실기기 (dev, SM-G986N 등)

준비: Metro dev(`EXPO_PUBLIC_APP_ENV=dev`), `adb reverse tcp:8081 tcp:8081`, 모델 있음. `pm clear` 하지 않는다.

| # | 무엇 | 통과 |
| --- | --- | --- |
| D1 | 영어 캡션이 나오는 사진이 있는 날 2편 이상 쓰기 | 본문·제목에 A–Z/a–z 0자, 정상 저장(문법이 jinja 경로에서 듣는다) |
| D2 | 서로 다른 날 열 편쯤 쓰고 읽기(010 `seed:day`·070 표본 날 사용 가능) | 첫 문장이 날마다 다른 틀, `~요`가 끝까지, 평어 섞인 글 0편 |
| D3 | 같은 날 다시 쓰기 | 같은 틀로 시작 |
| D4 | 사진 권한 끈 날 1편(또는 상태 흉내 없이 실제 권한) | 저장됨, 「모른다」 쪽 글 |
| D5 | **헤드리스 자동 쓰기 1회**(홈 버튼 + 화면 끄기, 목표 시각 맞춤) — `adb logcat`으로 시작·저장 시각 | 생성 시간 한도 안에 저장. 넘으면 소유자 보고, 미완료 |

D2·D5의 판단은 사람이 읽어서 한다(원칙 IV — 채점 코드를 만들지 않는다). 일기 파일은 `run-as … cat files/diary/<날짜>.json`.

## 실측

### 기기 없는 테스트 (2026-10-12)

- `npm test` 4,898 통과·7 건너뜀, `npm run lint` 오류 0(헌법 검사 위반 0, prettier 통과).
- 위반 주입 넷 모두 실패로 뒤집힘(되돌린 뒤 초록): 틀 한 글자(`!` 추가) → 1 실패 / `complete()`의 `grammar` 제거 → 3 실패 / 사진 `unknown`을 `${ph.reason}`으로 → 4 실패 / `instructionLines()`의 본 장면 꼬리 제거 → 4 실패.

### 바이트 대조 (2026-10-12)

my-ollama `e192c9b`를 스크래치에 받아 `gen-prompts.ts`의 동적 import 둘을 `pathToFileURL`로 고친 사본으로 이 작업본(커밋 전)에서 10케이스를 뽑았다(`TZ=Asia/Seoul`, 출력은 스크래치 — my-ollama 추적 파일은 건드리지 않음).
본 장면 있는 날 꼬리의 `'…'` 안을 자리표로 바꾸고 `instructionLines`는 집합으로 비교했다.

| 케이스 | prompt | followUp | instructionLines | 틀(이 저장소 / v5) |
| --- | --- | --- | --- | --- |
| rich | 같음 | 같음 | 같음 | 6번 / 8번 |
| multi | 같음 | 같음 | 같음 | 9번 / 6번 |
| none·h-trunc·h-dayopen·h-denied | 같음 | 같음 | 같음 | — |
| one | 같음 | 같음 | 같음 | 1번 / 9번 |
| h-caption-en·h-hike·h-office | 같음 | 같음 | 같음 | 9번 / 10·2·5번 (같은 날짜라 같은 틀) |

틀은 케이스 날짜로 정해져 v5가 케이스에 맡긴 틀과 다르다(설계대로). 틀 목록 자체는 픽스처 대조 테스트가 잠근다.

### 실기기

(진행 중 — 아래 D1~D5)
