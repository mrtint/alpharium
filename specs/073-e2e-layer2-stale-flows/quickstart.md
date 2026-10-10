# Quickstart: 073 검증

전제: 전용 테스트 기기(SM-G986N, dev 빌드, 모델·권한·배터리 예외 있음), Metro가 dev 환경(`CI=1`)으로 떠 있고 `adb reverse tcp:8081 tcp:8081`, 기기 잠금 해제.

## 기기 없는 검증
- `npm run test:logic` — layer2-runner·source-contract·flow-map 통과
- `npm run lint`

## A. 낡은 흐름
1. `contracts/stale-flows.md` 절차로 셋을 판정, 고치거나 지운다.
2. 고친 흐름을 `npm run test:layer1 -- .maestro/<흐름>.yml`로 돌려 통과를 본다. **`node scripts/run-device-tests.mjs`(인자를 줘도)는 쓰지 않는다** — `pm clear`가 모델을 지운다.
3. 위반 주입: 고친 흐름의 단언 하나를 틀리게 → 실패(치환 적용 확인 먼저).

## B. 층 2
1. `npm run test:layer2` — 흐름 넷 통과, 끝에 흐름별 표와 `.cache/layer2/<시각>/` 일기 경로가 출력된다.
2. 출력된 일기를 열어 본문을 읽는다(사람).
3. 위반 주입: `layer2-write-and-read.yml`의 `stop-button` 소멸 대기 id를 틀리게 → 그 흐름 실패(나머지 3개는 돈다).
4. 위반 주입: `LAYER2_FLOWS`에서 한 흐름을 빼기 → `flow-map`/계약 테스트 실패.
5. 모델 없는 상태(= `files/models` 이름을 잠시 바꿈 — 끝나면 되돌린다)에서 → aborted.

## 문서
- `docs/e2e/layer2-release-checklist.md`를 따라 한 번 해 본다. AGENTS.md 링크 확인.

## 실측 (2026-10-10, SM-G986N, Android 13, dev, Metro CI=1)

**낡은 흐름 셋 (A)** — 층 1 기준 상태에서 원인을 가렸다. 셋 다 **문구·문안 변경**이었고 앱 결함은 없었다.
- `skeleton`: 060이 진단을 일곱 묶음으로 바꿔 「모듈 상태」·「loaded」·「on-device」·「ok — 저장·조회…」가 사라졌다. 「기기 · CPU」와 저장 점검(행을 눌러야 「N편 · 정상」이 펼쳐진다)으로 고쳤다. 옛 「loaded」(추론 모듈 적재)는 어디에도 안 보인다 — 실제 적재는 층 2가 본다.
- `prompt-preview`: 문안이 바뀐 것(061·063). 글자 단언을 걷고 구조(프리셋 둘 `diagnostics-preset-empty`·`-photos`, 눌러 바뀜, `diagnostics-prompt-size`·`-text`, 「조립 시점 근사치, 실측 토큰 아님」)만 본다. 본문 상자는 아래로 더 스크롤해야 보인다.
- `today-diary`: 홈의 「일기」 kicker가 055에서 사라진 것. 첫 단언만 `day-strip` 대기로 바꿨고 나머지(신호 축·모델 이름 노출 없음, 덮어쓰기 확인 열고 취소)는 그대로 통과했다.
- 셋 다 층 1(`LAYER1_FLOWS`·`NEEDS_LAYER1_BASELINE`)로 올렸다. 위반 주입(단언 하나를 틀리게) → 셋 모두 실패 확인.
- **일반 실행(`node scripts/run-device-tests.mjs`)은 이 전용 기기에서 돌리지 않았다** — 인자를 줘도 먼저 `pm clear`를 해 모델 2GB가 지워진다. 일반 실행에서 이 셋이 실패하지 않는다는 확인은 `NEEDS_LAYER1_BASELINE`로 일반 실행에서 제외된 것 + 층 1 개별 통과로 갈음했다.

**층 2 (B)** — `npm run test:layer2`: 흐름 넷 통과(쓰기 1m54s·앱 열기 1m58s·진단 1m08s·첫 실행 54s, 전체 약 10분). 처음 한 번은 셋 통과·첫 실행 실패였다:
- 첫 실행 흐름이 `stop-button` 대기에서 3분 뒤 실패했다. 실패 스크린샷은 이미 「2분 전에 작성」인 쓴 날 홈이었다 — **040 자동 첫 일기는 홈의 제자리 쓰기(`stop-button`)가 아니라 파이프라인 직접 호출**이라 쓰는 중 표식이 서지 않는다. `home-settings` → `written-paper` 대기로 고쳤다(계약 `layer2-flows.md`·AGENTS 073).
- 위반 주입(`written-and-read`의 완료 표식을 틀리게) → 실패. 모델 파일(`v2.bin`) 이름을 바꾸고 실행 → `ABORTED`, 흐름 0개 실행, 원복 확인(`ls files/models`).
- **본문 읽기(사람, 채점 아님)**: 어제(사진 5~6장) 두 편은 사진 내용(식탁·파스타·노트·책)을 반영했다. 「주인이 … 있었을지도 모르겠다」·「~ 같다」로 짐작의 말투를 썼다(원칙 II 범위). 사진 없는 오늘 두 편은 「나는 오늘 아무것도 보지 못했다」 계열로 거의 같았다 — 입력이 같으면 출력이 닮는다(AGENTS). 제목은 네 편 모두 붙었다.
- 층 1 전체(`npm run test:layer1`)는 `prepareBaseline` 추출 뒤에도 12개 흐름이 13분 26초에 통과(기존 9 + 낡은 흐름 셋).

- 위반 주입(FR-022-2): 실제 `run-device-tests.mjs`의 `FLOWS`에서 `layer2-write-and-read` 한 줄을 지우면 `flow-map.test.ts`의 M-1~M-10이 실패하고 원복하면 e2e 220개가 통과한다. `layer2-with-sample`은 표본 보장 중단 분기를 끄면 실패한다.

## 미확인 잔여
- iOS 시뮬레이터(맥 필요)·CI 편입 판단·release 빌드·다른 기기. 층 2는 안드로이드 dev만 봤다.
- Maestro는 이 Windows 기계에 없어 GitHub 릴리스(2.11.0)를 `~/.maestro-install/maestro/bin`에 풀어 썼다(PATH는 세션에만).
- 앱을 열면 쓰는 중(057) 흐름은 「지금 시 = 목표 시각」으로 시도 창 안에서만 확인했다. 목표 시각 근방이 아닐 때 `not-near-target`로 건너뛰는 갈래는 기기 없는 판정 테스트가 본다.
