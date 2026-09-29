# Quickstart: 제자리 쓰기 검증

계약은 [contracts/writing-in-place.md](contracts/writing-in-place.md)(W1~W16)·[contracts/failure-toast.md](contracts/failure-toast.md)(T1~T14). 구현 세부는 `tasks.md`.

## §1 기기 없는 검증 (배선) — 항상 돈다

```
npm run test:logic      # failure-toast 판정 · state 전이 · 소스 계약 (약 7초)
npm run test:ui         # writing-in-place · failure-toast 부품 · diary-home 수리
npm test && npm run lint
```

- 잠그는 것: W1~W16, T1~T14, KO 원문 글자 단위(W2·T4), `unsaved` 부재, `ActivityIndicator`·`TypewriterText` import 부재, 갈래 표 나열, 「다시 써 볼 수 있어요」가 `retry`에만.
- **jest는 움직임을 못 잡는다**(reanimated 목은 값을 계산하지 않고, RNGH 핸들러 태그는 앞 테스트의 것이 불린다 — 033·049). 그래서 아래 §2가 따로 있다. **초록불이 「움직인다」를 뜻하지 않는다.**
- **RNTL 14**: `render`·`fireEvent`·`rerender` 모두 `await`. 가짜 시계와 `waitFor`를 섞을 땐 `advanceTimersByTimeAsync`.

## §2 실기기 검증 (dev 빌드 1회, `pm clear` 없음)

기기: SM-S901N, `EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client --clear`(이전 Metro가 남아 있으면 종료), `adb reverse tcp:8081 tcp:8081`. 모델·일기 보존을 위해 `pm clear`를 쓰지 않는다.
**움직임은 스크린샷이 아니라 `adb shell screenrecord` + 프레임 추출로 본다**(049 — ffmpeg가 없으면 `pip install --target <임시> imageio-ffmpeg`). Windows에서 `adb pull`은 `MSYS_NO_PATHCONV=1`.

| # | 무엇을 본다 | 기대 |
| --- | --- | --- |
| D1 | 안 쓴 날에서 「일기 쓰기」 | 화면 전환 없이 헤더 「쓰는 중」(빨강), 스트립 흐림, 혼잣말 영역, 검정 「그만두기」 바(보드 `2b`와 나란히 대조 — 여백·글자 크기·위치) |
| D2 | 쓰는 중 스트립 탭·좌우 스와이프·큰 숫자·요일 탭 | 아무 반응 없음(고른 날 불변, 달력 안 열림) |
| D3 | 혼잣말이 바뀌는 동안 녹화 | 몇 초마다 페이드 교체(글자가 하나씩 나오지 않음), 깜빡임·이중 표시 없음, 단계가 바뀌면 문안이 바뀜, 진행률·시간 없음 |
| D4 | 「그만두기」(안 쓴 날) | 바로 안 쓴 날로. 일기 파일 생기지 않음, 토스트 없음 |
| D5 | 다시 쓰기 → 확인 → 「그만두기」 | 기존 일기 그대로, 스트립 펼침, 「다시 쓰기」 바는 지면 끝에 닿을 때까지 내려가 있음 |
| D6 | 안드로이드 뒤로 가기(쓰는 중) | 「그만두기」와 같음 |
| D7 | 실패 유도 후 토스트 | 하단 바 위 12에서 올라옴 → 3초 뒤 사라짐. 문구 한 줄, 이유·코드 없음 |
| D8 | 토스트를 아래로 쓸어 닫기·약하게 쓸어 되돌아옴 | 문턱대로 닫힘/제자리, 손맛 확인(저장소 소유자) |
| D9 | 토스트가 떠 있는 동안 하단 바 누르기 | 바가 눌림(다시 쓰기 시작 → 토스트 즉시 사라짐) |
| D10 | 글꼴 1.3배 · 2.0배 | 혼잣말·안내 줄·토스트가 잘리지 않고 줄바꿈 |
| D11 | 성공 | 연출 없이 쓴 날 화면(제목이 헤더에), 스트립 잠금 풀림 |

**실패 유도 방법(기기)**: (a) 생성 도중 앱을 홈으로 보냈다 돌아오기(`interrupted` → `retry`), (b) `run-as`로 모델 파일을 임시 이름 변경해 `model-not-ready`(`prepare-character` 토스트) 후 복구 — 이때 `resolve()`가 먼저
`no-ready-character`로 막으면 그것은 쓰기 시작 전 갈래다(FR-024). 저장 실패·`plain`은 기기에서 유도하기 어려우면 계약 테스트로 갈음하고 **미확인으로 기록**한다(원칙 V — 못 한 것을 한 것으로 쓰지 않는다).

## §3 위반 주입 (각각 테스트가 잡는지 실제로 어긴다)

| # | 주입 | 잡아야 하는 것 |
| --- | --- | --- |
| V1 | 토스트 문구에 `reason`을 이어 붙임 | T6 |
| V2 | `prepare-character` 문구에 「다시 써 볼 수 있어요」 | T5 |
| V3 | 스트립의 `pointerEvents="none"` 제거 | W4 |
| V4 | `writing`에서 `onPressDate`를 그대로 통과 | W5 |
| V5 | 그만두기 뒤 토스트를 띄움 | T13·W16 |
| V6 | `toWriting()`이 `entry`를 들게 함 | W1 |
| V7 | `unsaved` 갈래를 되살림 | W15 소스 검사 |
| V8 | 혼잣말 페이드를 `useEffect`로 시작값 되돌리기 | W10 소스 검사 |
| V9 | 토스트 바닥을 고정 76으로 | T8 |
| V10 | 토스트 래퍼 `pointerEvents` 제거 | T11 |

**주입이 적용됐는지를 먼저 단언한다**(053 교훈 — 치환이 실패했는데 초록불이 나오는 경우). Python으로 파일을 쓸 때는 `newline=""`(CRLF 함정, 050).

## §4 Maestro (`maestro test`로 직접 — `.maestro/*.yml`)

새 흐름 `in-place-writing.yml`을 `scripts/run-device-tests.mjs`의 `FLOWS`에 등록한다(등록 안 하면 초록불인데 안 돈다).
영향받는 일곱 흐름은 같은 스펙에서 고친다 — 이 표대로 수리한 뒤 각각 PASS를 본다.

| 흐름 | 지금 기대는 | 고칠 것 |
| --- | --- | --- |
| `diary-user-path` | `notVisible: "쓰고 있다"`(끝) | 쓰는 중 표식을 「쓰는 중」·`stop-button`으로, 끝은 `stop-button` 사라짐 |
| `generate-diary` | 「쓰고 있다」·독백 문구 | 위와 같음. 독백은 페이드라 타자기 대기 제거 |
| `past-day-diary` | `visible: "그만두기"` → `tapOn "그만두기"` → 목록 | 그만둔 뒤 **홈의 그 날**(스트립 유지)로 돌아옴을 확인 |
| `photo-selection-over-limit` | `notVisible: "그만두기"`로 끝을 기다림 | `stop-button` 사라짐으로(같은 방식, id로) |
| `writing-flow-simplified` | 「쓰고 있다」 노출/사라짐 | `stop-button`·「쓰는 중」 |
| `writing-monologue` | 「그만두기」로 진입 판정, 타자기 주석 | 타자기 주석 제거, 진입은 `stop-button`, 그만둔 뒤 독백이 사라짐 |
| `writing-monologue-expansion` | 같음 | 같음 |

- 새 흐름 `in-place-writing.yml`: (1) 쓰기 → 스트립 탭이 무반응(고른 날 그대로) → `stop-button`으로 그만둠 → 쓰기 전 상태 확인. 토스트는 Maestro로 유도하기 어려우니 그 부분은 §2 D7로 본다.
- **Maestro 함정**: 쓰기 버튼은 글자가 아니라 `id: "write-button"`(051), 쓰는 중 진입 판정은 「그만두기」 글자가 아니라 `id: "stop-button"`. 흐름 파일의 `env:` 값이 `-e`를 덮는다(049) — 기본값은 `${X || "…"}`로 준다.
- 실행: `maestro test .maestro/in-place-writing.yml`(직접). 끊은 Maestro 뒤에 곧바로 다시 돌리면 `DeviceServerDiedException` — 한 번 더.

## 완료 조건 (헌법 원칙 V)

`npm test`·`npm run lint` 통과 + §3 위반 주입 전부 잡힘 + §2 D1~D11 중 관측한 것과 **못 한 것을 구분해 기록** + §4 Maestro 여덟 흐름 PASS. 미확인은 「미확인 잔여」에 적고 통과로 세지 않는다.
