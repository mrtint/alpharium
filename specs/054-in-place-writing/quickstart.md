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

## §6 실기기 결과 (2026-09-29, SM-S901N, dev, `pm clear` 없음)

| # | 결과 | 관측 |
| --- | --- | --- |
| D1 | ✅ | 안 쓴 날에서 「일기 쓰기」 → 053 확인 → 화면 전환 없이 헤더 「쓰는 중」(빨강)·스트립 35%·머리말·혼잣말·「금동이가 쓰고 있어요. 진행률은 세지 않아요.」·검정 「그만두기」 바. 보드 `2b`와 배치가 맞다 |
| D2 | ✅ | 스트립 칸(27)·헤더 큰 숫자를 눌러도 고른 날(29)이 그대로이고 달력이 열리지 않았다 |
| D3 | ✅ | 단계가 바뀔 때 줄이 바뀌고(「하루가 어땠는지 가늠해보는 중…」→「생각을 문장으로 옮기는 중…」) 진행률·시간이 없다. **녹화 프레임(30fps)에서 줄이 바뀌는 구간의 이전 줄·새 줄이 겹쳐 보이는 것을 확인**했다(약 200ms, 이전 줄 옅어짐·새 줄 짙어짐). 손맛은 사용자 육안 |
| D4 | ✅ | 안 쓴 날에서 「그만두기」 → 바로 안 쓴 날(쓸 재료 두 칸·빨강 「일기 쓰기」 바)로, 토스트 없음, 그 날 파일이 생기지 않았다(convergence T035) |
| D5 | ✅ | 다시 쓰기 → 확인 → 그만두기 → 기존 일기가 그대로(같은 본문·「방금/1분 전에 작성」 그대로), 스트립 펼침, 「다시 쓰기」 바는 지면 끝에 닿아 있음 |
| D6 | ✅ | 쓰는 중(검정 바) 안드로이드 뒤로 가기 → 쓰기 전 상태(빨강 「일기 쓰기」 바)로, 앱이 닫히지 않고 파일이 생기지 않았다(T035) |
| D7 | ✅ | 중단(앱을 홈으로 보냈다 복귀) 뒤 「일기를 쓰지 못했어요. 다시 써 볼 수 있어요.」 토스트가 하단 바 위 12dp(36px)에 뜨고 약 2.5초 뒤 사라졌다. 글은 화면 어디에도 없다. **중단 실패는 돌아온 뒤 약 20초 지나서야 올라왔다**(생성이 이어지다 끝난다) — 054 결함이 아니다 |
| D8 | ✅ 일부 | 아래로 쓸어 내리면 0.5초 안에 사라졌다. **약하게 쓸었을 때 제자리로 돌아오는지·손맛은 미확인** |
| D9 | ✅ | 토스트가 떠 있는 동안 「일기 쓰기」 바를 눌렀더니 053 확인 대화상자가 정상으로 열렸다(바가 눌린다). 토스트는 안 쓴 날에서도 바 위 12dp에 있었고 3초 수명으로 저절로 사라진다(T036). 확인 대화상자가 열려 있는 동안은 토스트가 그대로 남는다 — 쓰기 **시작**(확인 뒤)에서 지워지며 이는 FR-018과 같다 |
| D10 | ✅ 일부 | 글꼴 2.0배에서 쓰는 중 화면(혼잣말·안내 줄 두 줄 줄바꿈)이 잘리지 않았다. 토스트의 2.0배는 미확인 |
| D11 | ✅ | 성공하면 연출 없이 쓴 날 화면(「지어낸 하루」 표식·본문), 스트립 잠금이 풀렸다 |

- **미확인 잔여**: 저장 실패·`plain`·`prepare-*` 토스트(기기에서 유도하지 못했다 — 계약 테스트 T1~T6·W15로 갈음), 약한 쓸기의 되돌아옴·손맛, 글꼴 2.0배의 토스트.
- Maestro: `in-place-writing`·`generate-diary`·`past-day-diary`·`photo-selection-over-limit`(제목 유무 단정을 고친 뒤)·`writing-flow-simplified`·`writing-monologue`·
  `writing-monologue-expansion` PASS. `diary-user-path`는 쓰기 구간 통과 후 051이 없앤 `home-menu-button`에서 실패(알려진 stale, FLOWS 밖).
- 검증 중 만든 2026-09-29 일기 파일은 지웠다. 글꼴 배율은 1.0으로 되돌렸다.
