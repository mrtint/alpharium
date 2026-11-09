# Quickstart: 첫 일기 분기 확인

## 기기 없이

`npm test`, `npm run lint`.

## iOS 시뮬레이터 (2GB를 받지 않고 되풀이)

1. 워크트리에서 `npm ci` → `npx expo prebuild --platform ios --clean` → `NETRC=<빈 경로>`로 `pod install` → `xcodebuild`로 Release 시뮬레이터 빌드(Metro 불필요).
2. 설치 뒤 `simctl get_app_container … data`의 `Documents/models/`에 `a1.bin`·`v1.bin`·`v2.bin`을 넣고(지문 대조) `state.json` 없이 첫 실행을 탄다. **main 기반 빌드는 이 파일을 다시 받거나 사진 모델에서 준비되지 못할 수 있다**(파일 검증은 110 코드에만 있다). 막히면 `_prepare-simulator.yml`처럼 한 번 정상으로 받는다.
3. 되풀이: 앱을 끄고 `Documents/preferences/onboarding.json`의 `welcomeShown`·`completed`를 `false`로 고치고 `character-names.json`·오늘 일기를 지운다. **「온보딩부터 다시」는 이 흐름에 닿지 않는다**(작명·확인을 다시 타지 않는다).
4. Maestro(`clearState` 없이)로 본다:
   - 오늘 사진 없음 → 확인창 없이 안 쓴 날.
   - `simctl addmedia`로 오늘 사진 → 확인창, 「나중에」 → 안 쓴 날, 일기 없음.
   - 「써 보기」 → 쓰는 중 화면·그만두기. 끝까지 쓰기는 시뮬레이터에서 못 볼 수 있다.

시뮬레이터에서 정상 동작 확인이 실패하면 분기에 닿지 못한다. 그때는 못 봤다고 적는다.

### 시뮬레이터 결과 (2026-11-04, iPhone 18 Pro 시뮬레이터 iOS 27.0, Release 빌드, Maestro)

모델은 받지 않았다 — 앞서 앱이 받은 다른 시뮬레이터의 `models/`를 `state.json`째 복사했다(이 main 기반 빌드는 받아 둔 파일을 `state.json` 없이 믿지 않을 수 있어 처음부터 이 길을 썼다. `state.json` 없는 경로는 보지 않았다).

| 경로                      | 결과                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 재료 없음(오늘 사진 없음) | 정상 동작 확인 통과 → 확인창 없이 안 쓴 날 홈(사진 0장·장소 0곳), 일기 파일 없음                                               |
| 재료 있음 → 확인창        | 정상 동작 확인 통과 → 홈 위에 확인창, 초안 문구 그대로                                                                         |
| 나중에                    | 창이 닫히고 안 쓴 날 홈, 일기 파일 없음                                                                                        |
| 써 보기 → 끝까지          | 쓰는 중(「앱을 나가도 계속 써요」 표시) → 약 1분 뒤 쓴 날 지면, 오늘 일기 파일 생성(사진 1장). 시뮬레이터라 기기 시간과 다르다 |
| 써 보기 → 그만두기        | 안 쓴 날 홈, 토스트 없음, 일기 파일 없음                                                                                       |

**못 본 것**: 실패 되돌림(첫 실패·두 번째 실패 — jest 조립 시험으로만 봤다), 정상 동작 확인 실패 화면에서의 건너뛰기, 안드로이드 전부, 앱을 나가는 경로, 이어 하기, 안드로이드 층 2 새 흐름 두 개(한 번도 돌리지 않았다).

**함께 본 것(이 과제 밖)**: iOS 확인창 본문이 단어 중간에서 줄바꿈된다(「걸 / 릴」). 공용 `Dialog.tsx`의 설명이 `AppText`를 거치지 않아 `hangul-word`가 안 걸린다 — 모든 확인창이 같다(소스 읽기).

## 실기기 (2026-11-09, 개발 빌드 — SM-S901N은 Metro 번들, iPhone 14는 Release 개발 서명)

- [x] 재료 있음: 확인창 → 써 보기 → 쓰는 중 → 쓴 날 — SM-S901N 층 2 `layer2-first-run-first-diary` 통과, iPhone 14 층 2 `first-run-first-diary` 통과(사람이 작명·「써 보기」를 눌렀다, 권한은 이미 허용된 기기라 권한 창은 뜨지 않았다. 쓰는 중에 이어 하기 배너가 섰다, 사진 8장으로 저장).
- [x] 재료 없음: 확인창 없이 안 쓴 날 — SM-S901N 층 2 `layer2-first-run-no-material` 통과.
- [x] 실패 되돌림 — SM-S901N, 확인창이 선 뒤 `v1.bin`을 옮기고 「써 보기」: 첫 실패(`vision`) → 확인창 재등장 → 다시 「써 보기」 → 두 번째 실패(`vision`) → 「일기를 쓰지 못했어요.」 토스트 + 안 쓴 날, 일기 파일 없음. 실패 기록 두 줄(13초 간격).
- [x] 그만두기 — SM-S901N: 토스트 없이 안 쓴 날, 일기 파일 없음, 확인창 다시 안 섬.
- [~] 쓰는 중 앱 나가기 — SM-S901N: 홈 키 뒤 다시 열면 안 쓴 날, 실패 기록 `interrupted` 한 줄, 일기 파일 없음. 끊김 토스트 자체는 화면 캡처 시점이 맞지 않아 못 봤다. iOS 이어 하기는 위 iPhone 회차에서 배너만 봤다(앱을 나가지 않았다).
- [ ] 쓰는 중 설정을 연 채 실패 — 못 봤다(소스·시험으로만).
- [ ] 재료를 읽는 중 앱을 나갔다 오기 — 못 봤다.
- [ ] iOS: 앱이 뒤에 있을 때 쓰기 실패 → 되돌림 — 못 봤다.
- [x] 층 2: `npm run test:layer2` 다섯 흐름 통과(SM-S901N), `npm run test:layer2:ios first-run-first-diary` 통과(iPhone 14).

함께 고친 것(이 확인 중에 드러남):

- 첫 층 2 실행에서 흐름 둘(`layer2-write-and-read`·`layer2-diagnostics-try-write`)이 실패했다. 106 이후 `timing.ts ↔ reminder-plan.ts` 순환 import 경고를 개발 클라이언트가 하단 토스트로 띄워 쓰기 바·설정 행을 덮었다. 상수를 `src/schedule/reminder-delay.ts`로 옮겨 끊고, `__tests__/config/no-require-cycle.test.ts`가 `src`의 값 import 순환을 막는다.
- `layer2-first-run-no-material`은 예전 `seed:day`가 남긴 오늘 날짜 사진(`Pictures/PocketlogSeed/` 바로 아래) 때문에 실패했다 — 기기에서 지웠다(전용 기기 전제).
- iOS 층 2 실행기는 선을 뺀 iPhone(`tunnelState: unavailable`)도 세어 「iPhone이 하나일 때만」에 막혔다 — 닿지 않는 기기는 세지 않는다(`scripts/layer2-ios/device.ts`).

실패 주입: 쓰기 실패를 자연스럽게 내기 어려우면 사진 모델 파일(`v1.bin`)을 잠시 옮겨 `vision`/`module` 실패를 낸다. 정상 동작 확인은 사진 모듈을 보지 않으므로 지나간다(규칙 0-2). 앱을 앞에 둔 채 옮긴다 — 앱이 앞으로 돌아오면 필수 모듈을 다시 읽어 받기 화면으로 간다(`AppState` 재판정, 소스 읽기).
