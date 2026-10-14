# Quickstart: 앱 열기 자동 쓰기의 「한 번」과 넘겨 둔 날 (082) — 확인 절차

계약은 [contracts/auto-write-open.md](./contracts/auto-write-open.md), 상태 표는 [data-model.md](./data-model.md).

## 1. 기기 없는 확인

```bash
npx jest __tests__/app/use-auto-write-handoff.test.tsx __tests__/app/use-auto-write-claim.test.tsx __tests__/ui/auto-write-open-assembly.test.tsx --selectProjects ui
npx jest __tests__/app/app-auto-write-source.test.ts __tests__/app/simulation-wiring.test.ts --selectProjects logic
npx jest __tests__/ui/home-auto-write.test.tsx __tests__/ui/home-join.test.tsx __tests__/ui/home-simulation.test.tsx __tests__/ui/home-wipe.test.tsx --selectProjects ui   # 수정 없이 통과해야 한다
npm test          # 전체 — 가드 표(062 B3·B6, 069 G-1, jest-projects)가 여기서만 걸린다
npm run lint      # eslint + tsc + 헌법 검사 + prettier
```

위반 주입은 계약 문서 끝의 표를 한 줄씩 넣어 보고 되돌린다(되돌린 뒤 원래 문자열을 grep으로 다시 확인).

## 2. 실기기 (dev, SM-S901N) — 기기의 debug APK를 지우지 않는다

**하지 않는 것**: release 빌드, 앱 삭제, `pm clear`, `npm run test:layer1`, 화면을 끄는 실험.

### 준비

```bash
export PATH="$HOME/Library/Android/sdk/platform-tools:/opt/homebrew/bin:$PATH"
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
adb devices                                   # 한 대
adb reverse tcp:8081 tcp:8081
EXPO_PUBLIC_APP_ENV=dev CI=1 npx expo start --dev-client     # 번들에 .env.development.local 모듈이 있는지 curl로 본다
```

1. **백업**: `adb exec-out "run-as com.a810labs.pocketlog tar -cf - files/diary files/preferences files/vision-cache" > app-state.tar` — `tar -tvf`로 내용을 눈으로 확인한다. **D2는 일기를 실제로 지운다.**
2. **어제에 사진을 심는다**: `npm run seed:day -- one-place <어제>`. 심긴 파일이 진짜 사진인지 크기로 본다(1×1 검은 사진이면 쓰기가 실패한다 — AGENTS 078).
3. 시각 조건: 목표 시각 22시(기본)·실제 시각이 22시 전이면 어제가 「차례가 지난 날」이다(창 밖 따라잡기).

조작은 Maestro의 `id:`로 한다(`home-settings`·`auto-diary-toggle`·`settings-target-hour`·`settings-wipe`·`wipe-confirm`·`stop-button`). 판정은 시도 기록(`files/preferences/auto-write-attempts.json`)과 `files/diary/`로 읽는다.

### D1 — 켰다 끄면 쓰지 않는다 (SC-001)

자동 쓰기 꺼짐(`auto-diary.json` 없음 또는 `enabled:false`)·어제 안 쓴 날로 앱을 새로 연다 → `home-settings` → `auto-diary-toggle`(켬, `settings-target-hour`가 보일 때까지) → `auto-diary-toggle`(끔) → 뒤로 가기.

- 기대: 20초 동안 `stop-button`이 보이지 않는다. `files/diary/`에 어제가 없다. 시도 기록은 `disabled` → `write` → `disabled`(판정은 종전대로 돈다).
- 수정 전(2026-10-14): `stop-button`이 떴고 약 50초 뒤 어제가 저장됐다.

### D2 — 켠 채 닫으면 쓴다 (SC-003, 의도)

D1에 이어 `home-settings` → `auto-diary-toggle`(켬) → 뒤로 가기.

- 기대: `stop-button`이 뜨고 어제가 저장된다(약 1분).

### D3 — 지운 직후 쓰지 않는다 (SC-002·SC-004)

D2 뒤(어제가 써 있고 자동 쓰기 켜짐) 앱을 `am force-stop` 뒤 새로 연다(저절로 시작하지 않는다 — 그저께는 재료 없음) → `home-settings` → `settings-wipe` → `wipe-confirm`.

- 기대: `files/diary/`가 비고, 20초 동안 `stop-button`이 보이지 않는다. 홈 버튼으로 내렸다 다시 올려도 시작하지 않는다.
- 이어서 `am force-stop` 뒤 새로 연다 → `stop-button`이 뜨고 어제를 쓴다(새 실행은 종전대로).
- 수정 전(2026-10-14): 지운 직후 `stop-button`이 떴다.

### D4 — 회귀: 앱을 열면 쓰는 중 (057)

D3의 마지막 단계가 이것이다 — 자동 쓰기 켜짐·어제 안 쓴 날로 앱을 새로 열면 홈이 어제의 「쓰는 중」으로 시작해 저장한다.

### 되돌리기

`am force-stop` → `run-as`로 `files/diary/*`·`files/preferences/*`·`files/vision-cache/*`를 지우고 백업 tar를 푼다 → 일기·설정의 md5를 백업과 대조 → `npm run seed:clear`(심은 사진만 있는지 `seed:list`로 먼저 본다) → Metro를 내린다.

## 3. 미확인으로 남기는 것

- iOS 전부(실제 기기 없음), release 빌드, OS가 깨운 백그라운드 잡이 지운 날을 다시 쓰는 것(범위 밖 — spec Assumptions).

## 실측 (2026-10-14)

### 기기 없는 재현 — 고치기 전에 본 실패

- **결함 A**(두 훅을 동작 그대로 옮긴 직후): 훅 단위 HO4 둘·HO5 둘·HO7 하나가 `Expected: "없음" / Received: "2026-09-27"`로, 조립 AS1·AS2·AS11이 `begun 1·generated 1`(기대 0)로 실패했다. AS3(켠 채 닫으면 쓴다)은 통과.
- **결함 B**(`spendAutoWrite`가 없을 때): 훅 단위 CL5 셋, 소스 계약 WP1·WP3, 조립 AS4·AS5·AS6이 실패했다 — 지운 뒤 다시 마운트된 홈이 어제를 다시 써 일기 목록이 비지 않았다(AS8·AS9도 그 전제가 깨져 함께 실패).

### 위반 주입 (주입 → 실패한 테스트; 되돌린 뒤 원래 문자열을 grep으로 확인했다)

| 주입 | 실패한 것 |
| --- | --- |
| HO4 — `write`일 때만 반영 | 훅 HO4 둘, AS11 |
| HO5 — 설정 비교를 뺀다 | 훅 HO5(끈 그 렌더부터), AS2 |
| HO4 + HO5 (옛 동작) | 훅 HO4 둘·HO5 둘, AS1·AS2·AS11 |
| HO6 — `alive` 확인을 뺀다 | 훅 HO6(늦게 끝난 옛 설정의 판정) |
| HO7 — 번호 확인을 뺀다 | 훅 HO7 |
| CL5 — `spendAutoWrite`가 아무것도 안 한다 | 훅 CL5 셋, AS4·AS5·AS6(·AS8·AS9) |
| WP1 — `requestWipe`에서 소모를 뺀다 | 소스 WP1·WP3, `app-wipe-source` AF2 |
| WP1 — 소모를 `setDiaryKey` 뒤로 옮긴다 | 소스 WP1, `app-wipe-source` AF2 |
| CL4 — 흉내 소모 effect를 뺀다 | 훅 CL4, `simulation-wiring` AF3 |

### 전체

`npm test` 291 스위트·5,250 통과(7 skip — 이전부터), `npm run lint` 오류 0(경고 2 — 이전부터 있던 것), 헌법 검사 위반 0. 기존 홈 테스트(`home-auto-write`·`home-join`·`home-simulation`·`home-wipe`·`diary-home-write-request`)는 수정 없이 통과. `git diff main -- src/schedule src/ui/DiaryHomeScreen.tsx package.json src/i18n`은 비어 있다(X1~X3).

### 실기기 (SM-S901N, dev — 기기의 debug APK + 맥의 Metro, 번들에 `spendAutoWrite`·`handed.settings === settings` 확인)

10시 30분경, 목표 시각 22시(기본), 어제(10월 13일)에 사진 4장(`one-place`), 시작 상태는 자동 쓰기 꺼짐·일기 1편(10월 7일).

| | 절차 | 본 것 |
| --- | --- | --- |
| D1 | 앱을 새로 연다 → 설정 → 켬 → 끔 → 뒤로 가기 | 21초 뒤에도 일기는 10월 7일 하나, 모델 적재 줄(`Attached ggml threadpool`) 0. `auto-diary.json` `enabled:false`. 시도 기록 `꺼짐` → `홈에 넘김` → `꺼짐`(판정은 종전대로 돈다). **수정 전: 약 50초 뒤 어제가 저장됐다** |
| D2 | 이어서 설정 → 켬 → 뒤로 가기 | `stop-button`이 뜨고 약 66초 뒤 10월 13일 저장(적재 줄 `n_threads=4` 둘) |
| D3 | `force-stop` 뒤 새로 연다(시작하지 않음 — 판정 `재료 없음`) → 설정 → 「일기 모두 지우기」 → 확인 | 일기 0편. 약 25초 뒤에도 `stop-button` 없음·적재 줄 0. 시도 기록 맨 위는 `홈에 넘김`(넘겼지만 시작하지 않았다). 홈 버튼으로 내렸다 올린 뒤 20초에도 같다. **수정 전: 지운 직후 `stop-button`이 떴다** |
| D4 | `force-stop` 뒤 새로 연다 | 홈이 어제의 「쓰는 중」으로 시작해 약 78초 뒤 10월 13일 저장(057 회귀 없음, SC-004) |

끝난 뒤 백업을 풀어 되돌렸다(일기·`onboarding.json`의 md5가 실험 전과 같다). 심은 사진 4장을 걷었다. 임시 로그는 넣지 않았다.

### 성공 기준 대조

- SC-001 ✓ D1 · SC-002 ✓ D3 · SC-003 ✓ D2·D4 · SC-004 ✓ D4 · SC-005 ✓ 위 「전체」·「위반 주입」.
- **미확인**: iOS 전부(실제 기기 없음), release 빌드, OS가 깨운 백그라운드 잡이 지운 날을 다시 쓰는 것(범위 밖), 「켬 판정이 끝나기 전에 끄기」처럼 사람 손으로 만들기 어려운 타이밍(테스트로만), 지우기가 살아 있는 남의 쓰기를 끊은 뒤의 홈(080의 실기기 확인을 다시 하지 않았다 — 테스트와 소스 계약으로만).
