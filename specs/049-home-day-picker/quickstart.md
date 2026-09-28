# Quickstart: 049 날 고르기 — 검증 절차

계약은 [contracts/day-picking.md](contracts/day-picking.md), 모양은 [data-model.md](data-model.md)를 본다.
**jest는 배선만, 움직임은 실기기에서 눈으로**(C9). 실기기는 **dev(debug) 1회**(C2), release 없음.

## 1. 기기 없는 검증

```bash
npm run test:logic      # DB·WP·SW 계약, select.ts 시간 칸(DB12), 백그라운드 사흘 보존(DB6·DB7)
npm run test:ui         # H·S·HS·AF 계약, fireGestureHandler 스와이프(S4)
npm test && npm run lint
```

### 위반 주입(각각 넣고 잡히는지 본 뒤 되돌린다)

| # | 주입 | 잡아야 할 것 |
| --- | --- | --- |
| V1 | `selectableDays`의 오늘 포함 조건을 `isDayWritable(today, now)`로 되돌리기 | DB6(정오 전에 오늘이 들어옴) |
| V2 | `vision/select.ts`에 `getHours() - 4` 되살리기 | DB11·DB12 |
| V3 | `writePromptFor`의 기본값을 `selectableDays(now)[0]`로 | WP1 |
| V4 | `swipeWeek`에서 clamp 제거 | SW4·S1 |
| V5 | `DiaryHomeScreen`에서 `canPrepare` 검사 제거 | HS3 |
| V6 | 헤더 숫자에 `Pressable` 두르기 | H7 |
| V7 | `AppFrame` 고른 날 초기값을 `null`로 | AF1·HS2 |
| V8 | `DayPicker`에서 `new Date()` 호출 | S5 |

## 2. 실기기 준비 (AGENTS.md 「도구 사용법」)

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell pm clear com.anonymous.alpharium      # ⚠️ 모델이 지워진다 — 모델이 필요한 D5·D8·D9 전에는 재배치
adb reverse tcp:8081 tcp:8081
EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client
npm run seed:day -- many-camera <4주 전 날짜>    # D6·D9용 사흘 밖의 사진 있는 날
```

## 3. 실기기 확인 항목

| # | 무엇 | 어떻게 | 통과 |
| --- | --- | --- | --- |
| D1 | 새로 열면 오늘 | 앱 종료 후 다시 열기(정오 전에 할 것) | 큰 숫자 = 오늘, 스트립은 오늘이 든 일~토, 오늘 칸 반전 + 밑줄 |
| D2 | 헤더 | 날 바꿔 보기, 8/31 같은 월 경계 주 | 월 라벨이 고른 날의 달, 「토요일」 형식, 날짜 표시(월 라벨·숫자·요일)에 「오늘」 없음 |
| D3 | 크로스페이드 | 칸 여러 번 누르기 | 숫자·요일이 짧게 겹쳐 바뀜(깜빡임·높이 튐 없음) |
| D4 | 스와이프 | 오른쪽으로 넘기기 ×4, 왼쪽으로 되돌아오기 | 주가 통째로 바뀜, 요일 유지, 세로 스크롤과 안 겹침, 탭은 여전히 탭 |
| D5 | 튕김 | 오늘이 든 주에서 왼쪽으로 넘기기 | 살짝 끌리다 제자리, 주·선택 불변 |
| D6 | clamp | 지난 주 토요일 선택 후(오늘이 토 이전일 때) 왼쪽으로 넘기기 | 오늘이 선택됨 |
| D7 | 미래 칸 | 흐린 칸 누르기 | 반응 없음 |
| D8 | 정오 전 오늘 쓰기 | 오전에 오늘 일기 쓰기 | 쓰기 버튼이 있고, 일기가 오늘 날짜로 저장됨(상세·목록), 상태 줄이 제목으로 바뀜 |
| D9 | ★ 사흘 밖 사진 있는 날(R5) | 4주 전 심은 날로 스와이프 → 쓰기 | `adb logcat`에 `has_media=1`, 크래시 없음, 일기 저장. 그 날을 고른 뒤 쓰기 전에 캐릭터 모델 적재 로그가 없다 |
| D10 | Maestro | `node scripts/run-device-tests.mjs .maestro/week-strip-swipe.yml .maestro/today-diary.yml .maestro/past-day-diary.yml .maestro/diary-home-1d.yml .maestro/photo-selection-over-limit.yml .maestro/writing-flow-simplified.yml` | 전부 PASS |

**자정 전환(FR-019)은 그 시각에 기기 앞에 있을 때만 실기기로 본다** — 없으면 HS2(가짜 시계)로 갈음하고 스펙의
「미확인 잔여」에 적는다(048 D7과 같은 처리).

## 4. 결과 기록

관측값을 AGENTS.md 「049」 절에 옮긴다(04:00 → 자정, 정오 제한 폐지 두 규칙의 문구 교체 포함).

## 5. 위반 주입 결과 (2026-09-27, 기기 없는 테스트)

| # | 주입 | 결과 |
| --- | --- | --- |
| V1 | `selectableDays` 오늘 포함을 `isDayWritable(today, now)`로 | DB6·DB7·R4 3건 FAIL — 잡힘 |
| V2 | `vision/select.ts`에 `getHours() - 4` | DB11 2건 + D1·D5·DB12·R3 등 FAIL — 잡힘 |
| V3 | `writePromptFor` 기본값을 `selectableDays(now)[0]` | state.test 6건 FAIL — 잡힘 |
| V4 | `swipeWeek` clamp 제거 | SW4·S1 등 3건 FAIL — 잡힘 |
| V5 | `canPrepare` 검사 무력화 | HS3 FAIL — 잡힘 |
| V6 | 헤더 날짜 묶음을 `Pressable`로 감싸기 | H7 FAIL — 잡힘(헤더 본문까지 검사하도록 H7을 넓힌 뒤) |
| V7 | `AppFrame` 고른 날 초기값 `null` | N5(AF1) FAIL — 잡힘 |
| V8 | `DayPicker`에서 `new Date()` | S5 FAIL — 잡힘 |

## 6. 실기기 결과 (2026-09-28 07:45~08:13, SM-S901N, dev debug)

**`pm clear`는 하지 않았다** — 모델(약 2GB)이 지워지면 D8·D9를 볼 수 없다. 이미 설치된 dev APK(네이티브 변경 없음) +
Metro dev로 새 JS를 띄웠고, Maestro도 실행기(`run-device-tests.mjs`는 `pm clear`를 먼저 한다)를 거치지 않고
`maestro test`로 직접 돌렸다. **오전 7시대라 D8(정오 전 오늘 쓰기)을 실제로 봤다.**

| # | 결과 |
| --- | --- |
| D1 | 통과 — 07:45 새로 열자 28 월요일, 27~10/3 주, 28 반전 + 밑줄, 29~3 흐림, 상태 줄 「오늘 일기를 쓸 수 있어요」 |
| D2 | 통과 — 8/30~9/5 주에서 8/30을 고르면 「2026년 8월」, 9/1을 고르면 「2026년 9월」. 헤더에 「오늘」 없음 |
| D3 | **결함 발견·수정** — 사용자가 「넘기는 중에 숫자가 빠르게 여러 번 바뀐다」고 봤다(아래 3). 고친 뒤 캡처에서 이전 날과 새 날이 겹친 프레임만 잡히고 새 날이 먼저 보이는 프레임은 없다. 부드러움의 최종 판정은 사람의 눈 |
| D4 | 통과 — 오른쪽 넘김 28 월 → 21 월 → 14 월(요일 유지), 왼쪽으로 되돌아옴 |
| D5 | 통과 — 오늘이 든 주에서 400px 끌면 스트립이 약 90px(≈0.25) 따라오고, 놓으면 제자리. 주·선택 불변 |
| D6 | 통과 — 9/26 토를 고른 뒤 왼쪽으로 넘기자 28 월(오늘)이 골라짐 |
| D7 | 통과 — 흐린 30을 눌러도 28 그대로 |
| D8 | 통과 — 07:53에 오늘(28)을 써서 `2026-09-28.json` 저장, 상태 줄이 「이 날 일기를 썼어요」(제목 없는 일기) |
| D9 | 통과 — 사흘 밖 9/14(사진 3장)로 넘겨 쓰기 → `has_media=1` 3회, 크래시 없음, `2026-09-14.json` 저장. 그 날을 고른 동안 캡션·모델 적재 로그 없음, PSS 686→712MB(모델 적재 없음) |
| D10 | 통과 — 6흐름. `photo-selection-over-limit`은 042 이후 깨져 있던 것 셋을 고친 뒤 통과(아래) |

**실기기에서 고친 것**

1. **오늘이 든 주에서만 스트립이 약 6px 높았다** — 밑줄을 오늘 칸에만 그려서, 주를 넘길 때마다 아래 신호 줄·목록이
   위아래로 튀었다. 밑줄 자리를 모든 칸에 두고(투명) S7이 잠근다.
2. **`photo-selection-over-limit.yml`이 042 이후 깨져 있었다** — (a) 없어진 설정 `vision-quick`·`vision-auto`를
   누름, (b) 흐름의 `env: SEED_DAY: "2026-09-01"`이 `-e SEED_DAY=`를 **덮어써** 사진 없는 9/1을 씀(Maestro 문서:
   기본값은 `${X || "…"}`), (c) 「쓰고 있다」를 기다려 **생성이 끝나기 전에 PASS**(015 이후 쓰는 화면 문구가 다르다).
   셋 다 고쳤고, 고친 뒤 9/22(many-camera 12장)에서 `has_media=1` 8회 → 저장 후 흐름이 끝났다.
3. **★ 헤더 크로스페이드가 새 날 → 이전 날 → 새 날로 깜빡였다**(사용자 관측). 한 공유값의 시작 투명도를 `useEffect`에서
   0으로 되돌렸는데, effect는 **첫 프레임이 그려진 뒤에** 돈다 — 그 한 프레임에 새 날이 온전히 보였다가 이전 날로 돌아간 뒤
   다시 새 날로 바뀌었다. jest는 목이 값을 즉시 대입해 구조적으로 못 잡는다. 겹마다 `key`로 새로 마운트하고 시작 투명도를
   `useSharedValue(from)`으로 준다(`FadeLayer`). H9가 소스로 잠그고, 옛 방식을 되살리면 잡힌다(위반 주입 확인).
4. **★ 스트립도 넘길 때 숫자가 여러 번 바뀌어 보였다**(사용자 재관측 → 화면 녹화 프레임으로 원인 확인). 두 가지였다:
   (a) 넘길 때도 스프링으로 되돌려 새 주가 좌우로 **출렁였고**, (b) 손을 뗀 순간 0으로 되돌리니 새 주가 그려질 때까지
   (dev에서 약 0.2초, 14프레임) **끌던 주가 가운데로 돌아와 멈춰** 끌던 주 → 같은 주 → 새 주로 보였다. 이제 넘기면 끌린
   자리를 **새 주가 그려지는 커밋에서**(`useLayoutEffect`) 0으로 두고, 튕김은 출렁임 없는 180ms 타이밍이다. 고친 뒤 녹화에서
   보이는 상태는 「끌리는 이전 주」와 「제자리의 새 주」 둘뿐이다. S8이 잠근다. `week-strip-swipe`·`past-day-diary` 재통과.
5. **한 자리 날과 두 자리 날 사이에서 요일이 옆으로 밀렸다**(사용자 요청, 예: 9/6 ↔ 8/30). 큰 숫자 칸이 언제나 두 자리
   폭을 잡는다 — 보이지 않는 「00」(접근성에서 숨김)이 폭을 정하고 실제 숫자는 왼쪽에 겹친다. 8/31과 9/5에서 요일 위치가
   같은 것을 확인했다. H10이 잠근다.

**관측(고치지 않음)**

- **사진 없는 날은 기기에서 미리 준비(018)가 한 번도 돌지 않는다** — `DiaryHomeScreen`의 1단계 효과가
  `captionDay`가 있으면(기기는 언제나 있다) 바로 돌아가고, 2단계는 사진 있는 날만 본다. 029(`cd0e1a0`)부터 그랬다.
  049 범위 밖이라 두었다(C7).
- **`seed:day`는 여전히 사흘 안의 날에만 심는다**(`scripts/seed/plan.ts`가 `selectableDays`를 본다, 010 FR-005b).
  화면은 이제 모든 지난 날을 고를 수 있으므로 어긋난다 — 이번엔 이미 심어 둔 9/14·9/22를 썼다.
- **정오 전 오늘 일기가 저녁까지 지어냈다**(D8, 신호 0) — 「슈퍼에서 빵과 우유」·「저녁에는 집에 돌아와」. 프롬프트의
  「오늘은 아직 끝나지 않았다」(012)가 있는데도 그렇다. 원칙 II 위반의 알려진 계열이며, 정오 제한이 사라져 **신호가 거의
  없는 오전에 쓰는 일**이 새로 생긴 만큼 더 자주 보일 수 있다.
