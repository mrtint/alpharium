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
