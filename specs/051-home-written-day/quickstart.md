# Quickstart: 쓴 날 읽기 검증

**Feature**: [spec.md](spec.md) · **Contracts**: [contracts/written-day.md](contracts/written-day.md)

## 1. 기기 없는 검증

```bash
npm run test:logic   # PAP·ST·TIME·REACH (순수)
npm run test:ui      # HOME·CAR·BAR·GEN·NR·TXT·DEL
npm test             # 전부
npm run lint         # eslint + tsc + 헌법 검사 + prettier
```

통과 기준: 전부 초록. `tsc`가 `AppScreen`에서 지운 갈래(`detail`·`unreadable`·`written`)를 쓰는 자리를 전부 짚는다 — 그 목록이 곧 고칠 목록이다(037·042 방식).

## 2. 위반 주입 (계약마다 한 번 이상)

contracts의 각 표 「위반 주입」 열을 하나씩 적용 → 해당 테스트가 빨개지는지 확인 → 되돌린다. 최소 목록:

| 주입 | 잡아야 할 계약 |
| --- | --- |
| `paperFor`에서 `loaded.day !== day` 비교 제거 | PAP3, HOME7 |
| `PhotoCarousel`에서 `loop` 제거 | CAR3 |
| 사진 1장에도 `Carousel` | CAR2 |
| 배지를 `index`(0부터)로 | CAR5 |
| `filter` 제거 / `resizeMode="contain"` | CAR6 |
| 작성 시각 조건에서 `isToday` 제거 | BAR4 |
| 1분 인터벌 제거 | BAR5 |
| `writtenAtText`가 반올림 | TIME2 |
| 성공 뒤 결과 화면으로(`written` 되살리기) | ST1, GEN1 |
| 저장 실패를 `failed`로 | ST3, GEN3 |
| 알림 날에 일기가 없어도 `onAcknowledge` | NR2 |
| `onInitialDayApplied` 대신 확인 때만 `pendingRoute` 비움 | NR5 |
| 「← 목록」 문구 되살리기 | GEN5 |
| 화면 소스에 「다시 쓰기」 리터럴 | TXT3 |
| `DateJumpDialog`에 `minDate` | REACH2 |

결과는 이 파일 §5에 적는다.

## 3. 실기기 (dev debug 1회, SM-S901N)

**준비 — `pm clear`를 하지 않는다**(모델 보존):

```bash
git branch --show-current                     # 051-home-written-day
npx expo run:android                          # 빌드·설치 (dev). 끝난 뒤에 Metro
EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client
adb reverse tcp:8081 tcp:8081
adb shell dumpsys trust | grep deviceLocked   # deviceLocked=0
```

사진 있는 지난 날이 필요하면 `npm run seed:day -- many-camera <날짜>`(사흘 안의 날만 — 049 관측). 0장 날은 `npm run seed:day -- empty <날짜>`.
1장 날은 seed 모양에 없으므로 **기기 카메라로 오늘 한 장을 찍고 오늘을 쓴다**. 합성 하루는 「경로가 도는가」만 본다(010·원칙 V).

| # | 본다 | 통과 |
| --- | --- | --- |
| D1 | 쓴 날을 스트립에서 누름 | 화면 전환 없이 헤더에 제목, 지면(연회색 배경)에 캐러셀·본문. 「최근」 목록 없음 |
| D2 | 여러 장 캐러셀 넘김 | 한 장씩, 배지 「2 / n」 갱신, 긴 막대 이동, **마지막 → 첫 장 순환**, 첫 장 → 마지막 순환 |
| D3 | 사진 색·채움 | **흑백**, 높이 210을 잘라 채움(세로 사진은 가운데가 보임) |
| D4 | 캐러셀 위에서 세로로 끌기 | 지면이 세로로 스크롤되고 캐러셀이 가로채지 않는다. 가로 끌기는 캐러셀만 넘긴다(스트립·지면 스크롤과 섞이지 않음) |
| D5 | 사진 1장 날 / 0장 날 | 1장: 사진만, 배지·인디케이터 없음, 넘겨도 그대로. 0장: 캐러셀 없음, 본문이 지면 맨 위부터 |
| D6 | 긴 본문 끝까지 스크롤 | 마지막 문단이 「다시 쓰기」 바에 가리지 않는다 |
| D7 | 오늘 일기 | 「다시 쓰기」 아래 「N분 전에 작성」(또는 「방금 작성」). 1분 이상 기다리면 바뀐다. 지난 날에는 없다 |
| D8 | 「다시 쓰기」 → 대화상자 → 취소 / 다시 쓰기 | 취소: 그대로. 다시 쓰기: 쓰는 중 화면 → 끝나면 **홈의 그 날**에 새 일기(상세 화면·타자기 없음) |
| D9 | 알림(자동 생성) 누름 — 콜드 | 홈이 그 날을 고른 채 열린다. 설정에 갔다 와도 그 날로 되돌아가지 않는다 |
| D10 | 달력으로 몇 달 전 쓴 날로 뜀 | 홈이 그 날의 제목·지면을 보인다(§2 성립 조건) |
| D11 | 설정의 장소명 토글 | 토글·안내 그대로. 쓴 날 지면에 장소 이름 줄이 없다 |

D9는 020의 개발자 탭 「지금 자동 생성 트리거」로 알림을 만든다(자동 생성 설정 켬, 목표 시각 창 안). 창 밖이면 `skipped`이므로
미확인으로 적는다(042 관측 — 판정은 `결과:` 표시와 `files/diary/`를 함께 본다).

## 4. Maestro (실행기 아닌 직접 실행)

```bash
maestro test -e WRITTEN_DAY=<사진 2장 이상인 쓴 날, 이번 주> -e WRITTEN_DAY_PHOTOS=<그 날 캐러셀 장수> \
  .maestro/written-day-reading.yml \
  .maestro/diary-body-screen.yml \
  .maestro/past-day-diary.yml .maestro/photo-selection-over-limit.yml .maestro/today-diary.yml \
  .maestro/diary-user-path.yml .maestro/generate-diary.yml .maestro/writing-flow-simplified.yml \
  .maestro/writing-monologue.yml .maestro/writing-monologue-expansion.yml \
  .maestro/dialog-foundation.yml .maestro/diary-character-select.yml
```

`diary-photo-gallery.yml`은 `written-day-reading.yml`이 대체해 지웠다(FR-036). `WRITTEN_DAY_PHOTOS`는 캐러셀 배지의 전체 수(저장된 사진 수, 최대 8)다. `run-device-tests.mjs`는 `pm clear`를 하므로 쓰지 않는다 —
다만 새 흐름은 그 파일의 `FLOWS`에 등록한다(FR-036). 알려진 실패: `welcome-naming`(035 좌표), `parallel-model-download`·
`download-conflict`(037) — 이번 목록에 넣지 않는다.

## 5. 결과 기록 (2026-09-28)

### 기기 없는 검증
`npm test` 169 스위트 / 3071개(15 skipped) 통과, `npm run lint` 0 error(경고 2건은 051 전부터 있던 것), 헌법 검사 위반 0,
`tsc` 0. `tsc`가 지운 갈래(`detail`·`unreadable`·`written`)를 쓰는 자리로 `DiaryHomeScreen.tsx` 하나만 짚었다.

### 위반 주입 (19건 — 전부 잡힘)
| 주입 | 잡은 것 |
| --- | --- |
| `paperFor`의 `loaded.day` 비교 제거 | PAP3·HOME7 |
| `loop` 제거 / 1장에도 캐러셀 / 배지 0부터 / 흑백 제거 / `contain` | CAR3 / CAR2 / CAR5 / CAR6 / CAR6 |
| 작성 시각의 `isToday` 조건 제거 / 1분 인터벌 제거 | BAR4 / BAR5 |
| `writtenAtText` 반올림 | TIME2 |
| 성공도 결과 화면 / 저장 실패를 `failed`로 | ST2·GEN1 / ST3·GEN3 |
| 일기 없어도 확인 기록 / 적용 때 경로 비우기 제거 | NR2 / NR5 |
| 「← 목록」 되살리기 / 화면에 「다시 쓰기」 리터럴 | GEN5·TXT / TXT3 |
| 달력에 `minDate` | REACH2 |
| 쓴 날에도 신호 줄 / 복귀 시 다시 읽지 않음 | HOME5 / HOME13 |
| `WrittenDayPaper`가 `models/roster`에서 이름을 import (FR-034) | 헌법 검사 `UI_TOUCHES_MODEL` |

주의: `import "../models/roster"`(부수 효과 import, `from` 없음)는 헌법 검사가 잡지 **않는다** — 규칙이 `from … models/roster`만
본다. 051 범위 밖이라 고치지 않았다.

### 실기기 (SM-S901N, dev debug, `pm clear` 없이 — 새 APK 설치 없음, JS만 Metro로)
| # | 결과 |
| --- | --- |
| D1 | ✅ 오늘(9/28) 제목·지면·「다시 쓰기」, 9/21(제목 없음) 「이 날 일기를 썼어요」, 목록 없음 |
| D2 | ✅ 9/22(8장) 배지 「1 / 8」 → 넘기면 「2 / 8」, 거꾸로 넘기면 「1 / 8」 → 「8 / 8」(순환), 인디케이터 긴 막대 이동 |
| D3 | ✅ 흑백, 높이 210 잘라 채움 |
| D4 | ⚠→✅ **처음엔 실패**: 캐러셀 위에서 세로로 끄는 입력(가로 20px 흔들림)을 캐러셀이 잡아 사진이 넘어가고 지면이 스크롤되지 않았다. `failOffsetY([-10, 10])`을 더한 뒤 같은 입력에서 지면이 스크롤되고 사진은 그대로, 가로 넘김은 그대로 됨(research R1 정정) |
| D5 | 0장 ✅(9/21·9/1 — 캐러셀 없음, 본문이 지면 맨 위부터). 1장 ✅(converge T047 — 기기 카메라로 한 장 찍고 오늘을 다시 씀: 사진 하나만, 배지·인디케이터 없음, 가로로 끌어도 그대로 `photo-carousel-single`) |
| D6 | ✅ 긴 본문 끝까지 스크롤, 마지막 문단이 바에 가리지 않음 |
| D7 | ✅ 오늘 「5시간 49분 전에 작성」 → 4분 뒤 「5시간 53분 전에 작성」. 지난 날(9/21·9/22) 없음. 오늘 다시 쓴 9/21에도 없음 |
| D8 | ✅ 9/22 「다시 쓰기」 → 대화상자 → 취소: 그대로. 9/21 다시 쓰기 → 쓰는 중 → **홈의 9/21에 새 본문**(상세·타자기 없음) |
| D9 | ✅(converge T046, 웜) 자동 생성 켬 + 목표 17시 → 개발자 탭 트리거 `결과: ran`(9/27 작성) → 홈 버튼으로 나가 알림을 누르니 **홈이 9/27을 고른 채** 제목 자리·지면이 보였다. `notified.json`의 9/27 `acknowledged: true`. 9/28을 고르고 설정에 갔다 와도 9/27로 되돌아가지 않았다. 콜드 시작은 보지 않았다. 뒤에 자동 생성은 다시 껐다(목표 시각 17시는 남음) |
| D10 | ✅ 달력 → 9/1 → 홈이 9/1 지면(4주 전) |
| D11 | 코드 무변경(설정 화면·토글 그대로), 지면에 장소 이름 줄 없음 ✅ |
| US5 | ✅(converge T048) 9/23 일기 파일을 `run-as`로 `{broken`으로 바꾸고 앱을 앞으로 가져오자(FR-016c 다시 읽기) 상태 줄 「읽을 수 없어요」, 지면 두 줄, 「다시 쓰기」. 파일은 백업으로 되돌렸다 |

### Maestro (`maestro test` 직접)
13흐름 PASS: `written-day-reading`(`-e WRITTEN_DAY=2026-09-22 -e WRITTEN_DAY_PHOTOS=8`)·`diary-body-screen`·`dialog-foundation`·
`today-diary`·`diary-user-path`·`diary-character-select`·`past-day-diary`·`photo-selection-over-limit`(`-e SEED_DAY=2026-09-22`)·
`generate-diary`·`writing-flow-simplified`·`writing-monologue`·`writing-monologue-expansion`. 첫 실행에서 넷이 실패했고 전부 흐름 쪽
결함이었다 — 제목 없는 일기에 `home-day-title`을 단언(→ `home-day-(title|state)`), 쓴 날에 없는 `write-day-label`을 단언
(`today-diary`·`past-day-diary`·`writing-flow-simplified` — 오늘 일기가 있는 기기에서 하단 바에 날짜 조각이 없다).
