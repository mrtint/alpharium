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

## 5. 결과 기록

(구현 뒤 채운다 — 위반 주입 결과, 실기기 D1~D11 관측, Maestro 결과, 미확인 잔여.)
