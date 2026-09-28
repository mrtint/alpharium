# Quickstart: 읽기 스크롤 (052) 검증

## 1. 기기 없는 검증

```bash
npm run test:logic -- reading-scroll
npm run test:ui -- reading-scroll written-day-home diary-home date-jump
npm test
npm run lint
```

통과 기준: 전부 초록. 위반 주입(contracts의 각 항목)으로 테스트가 실제로 잡는지 확인하고 결과를 §5에 적는다.

## 2. 실기기 준비 (dev, `pm clear` 없음 — 모델 보존)

```bash
npx expo run:android            # dev 빌드 설치 (기존 데이터 유지)
EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client
adb reverse tcp:8081 tcp:8081
adb shell dumpsys trust | grep deviceLocked   # deviceLocked=0
```

Metro는 gradle 빌드가 끝난 뒤에 띄운다.

기기에 이미 있는 것:
- 사진 8장인 쓴 날 2026-09-22.
- 화면보다 긴 본문의 쓴 날. 9/22의 캐러셀(210) + 본문이 화면을 넘는지 D1에서 확인한다.

## 3. 눈으로 볼 것 (움직임은 `adb shell screenrecord` + 프레임 추출)

| # | 무엇 | 통과 |
| --- | --- | --- |
| D1 | 9/22를 고르고 지면을 천천히 아래로 | 스트립이 한 번에 위로 접히고(약 240ms), ▾가 나타난다. 큰 날짜·요일·제목의 크기·자리가 그대로다 |
| D2 | 녹화 프레임으로 접힘 한 번을 본다 | 스트립 높이가 한 방향으로만 줄고, 되튐(접혔다 펼쳐짐)이 없다(SC-003). 불투명도가 높이보다 먼저 0이 된다 |
| D3 | 접힌 채 위로 조금 올린다(맨 위 전) | 접힌 채다 |
| D4 | 맨 위까지 올린다 | 펼쳐지고 ▾가 사라진다 |
| D5 | 접힌 채 끝까지 내린다 | 「다시 쓰기」 바가 올라온다. 끝에서 조금 올리면 내려간다 |
| D6 | 끝에서 바가 보이는 채 날짜 줄을 누른다 | 펼쳐지고, 본문 위치와 바가 그대로다. 달력이 안 뜬다(10회 중 0회, SC-004) |
| D7 | 펼친 상태에서 큰 숫자를 누른다 | 「날짜로 이동」 달력이 뜬다(050) |
| D8 | 접힌 채 달력으로 다른 쓴 날로 간다(펼치고 → 누르고 → 날 고름) | 새 날은 펼친 상태로 시작한다 |
| D9 | 짧은 본문의 쓴 날 | 접히지 않고 바가 처음부터 보인다(051) |
| D10 | 안 쓴 날 | 헤더·신호 줄·「일기 쓰기」가 048~051 그대로이고, ▾가 없다 |
| D11 | 접힌 상태에서 스트립 자리(날짜 줄 아래)를 좌우로 끈다 | 주가 넘어가지 않는다 |
| D12 | 캐러셀을 좌우로 넘기며 세로로 조금 흔든다 | 사진만 넘어가고 스트립이 접히지 않는다(051 `failOffsetY`) |
| D13 | 접힌 채 끝에서 「다시 쓰기」 → 덮어쓰기 대화상자 → 취소 | 대화상자가 닫힌 뒤 스트립은 접힌 채, 바는 올라온 채다 |
| D14 | 접힌 상태에서 `MSYS_NO_PATHCONV=1 adb shell uiautomator dump`로 `home-date-row`의 경계를 읽는다 | 높이가 44dp 이상이다(FR-011, 픽셀 ÷ 밀도) |

## 4. Maestro (`maestro test` 직접)

```bash
JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF-8 maestro test .maestro/reading-scroll.yml \
  -e WRITTEN_DAY=2026-09-22
JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF-8 maestro test .maestro/written-day-reading.yml \
  -e WRITTEN_DAY=2026-09-22 -e WRITTEN_DAY_PHOTOS=8
```

## 5. 결과 기록

(구현 뒤 채운다 — 위반 주입 결과, D1~D12 관측, Maestro 결과, 기기에 남긴 상태 변화)
