# Quickstart: 대화상자 기반 (050) — 검증 안내

계약은 [contracts/dialogs.md](contracts/dialogs.md), 모양은 [data-model.md](data-model.md)에 있다. 여기는 **돌려서 확인하는 순서**만 적는다.

## 1. 기기 없는 검증

```bash
npm run test:logic   # calendar.ts·state.ts(cellFor·startWriting)·home-text·tokens
npm run test:ui      # Dialog·OverwriteConfirmDialog·DateJumpDialog·DownloadConsentDialog·HomeMenu·DiaryHome 배선
npm test && npm run lint   # 커밋 전 — eslint·tsc·헌법 검사·prettier
```

- 새 의존성 설치는 `npx expo install`로 한다(버전 해석은 Expo API). RNR·datepicker는 Expo가 관리하지 않는 패키지라 `--check`가 검사하지
  않는다 — 설치 뒤 `package.json` 판을 research R1 표와 대조한다.
- 위반 주입은 계약 표의 「위반 주입」 열을 하나씩 넣어 **빨간불이 되는 것을 본 뒤** 되돌린다.

## 2. 실기기 준비 (dev, 모델 보존)

**`pm clear`를 하지 않는다** — 모델(~2GB)과 일기를 보존한다. 새 네이티브 모듈이 없으므로(research R1) 기존 dev 빌드 APK를 그대로 쓰고
JS만 Metro로 받는다. 네이티브가 바뀌지 않았으니 재빌드는 필요 없다(재빌드가 필요해지면 그 사실이 R1을 뒤집는 것이므로 멈추고 기록한다).

```bash
adb reverse tcp:8081 tcp:8081
EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client --clear
adb shell dumpsys trust | grep deviceLocked   # deviceLocked=0
adb shell am start -n com.anonymous.alpharium/.MainActivity
```

필요한 기기 상태: 일기가 있는 **오늘**, 일기가 있는 **지난 날**, 몇 달 전 날(일기 없어도 됨). 없으면 앱에서 오늘을 한 번 써서 만든다.

## 3. 실기기에서 눈으로 볼 것

| # | 동작 | 기대 |
| --- | --- | --- |
| D1 | 일기가 있는 지난 날 → 「일기 쓰기」 | 홈이 50% 덮개 뒤에 보이고 대화상자(직선 면, 2px 테두리, 그림자). 제목·설명·「다시 쓰기」(빨강, 검정 글자, 위)·「취소」(테두리, 아래). 오늘 안내 줄 없음 |
| D2 | D1에서 덮개 누름 | 안 닫힌다 |
| D3 | D1에서 뒤로 가기 | 닫히고 홈, 고른 날 그대로. 앱이 닫히지 않는다 |
| D4 | D1에서 「취소」 | D3과 같다 |
| D5 | 일기가 있는 오늘 → 「일기 쓰기」 | 설명 아래 「지금까지의 하루로 써요.」 |
| D6 | D5에서 「다시 쓰기」 → 끝까지 | 쓰는 중 화면 → 완성 시에만 새 일기로 바뀜. (한 번은 「그만두기」로 끊어 기존 일기가 남는지 본다) |
| D7 | 헤더 큰 숫자 누름 | 「날짜로 이동」 달력, 이번 달, 일요일 시작, 오늘 밑줄, 선택 빨강, 점, 미래 흐림, › 흐림 |
| D8 | ‹ 여러 번 → 몇 달 전 날 누름 | 즉시 닫히고 스트립이 그 주, 그 날 선택, 헤더가 그 날(크로스페이드) |
| D9 | 월 표시 → 월 목록 / 연 표시 → 연 목록 | 미래 달·해 흐림. 고르면 그 달 날짜 보기 |
| D10 | 달력을 열고 달을 넘긴 뒤 취소·덮개·뒤로 가기 각각 | 아무것도 안 바뀜. 다시 열면 선택한 날의 달 |
| D11 | 미래 칸 누름 | 반응 없음 |
| D12 | ⋯ 메뉴 | 하단 바 윗선을 덮지 않고 뜸, 바깥 누름·뒤로 가기로 닫힘, 설정·개발자 이동 |
| D13 | 다운로드 동의 | 새 설치에서만 뜨므로 **이 세션에서는 계약 테스트(MIG1)로 갈음**한다 — 모델을 지워야 재현되기 때문(모델 보존 우선). 미확인 잔여에 적는다 |

움직임(덮개·면 페이드)은 스크린샷으로 못 잡는다. 이상하면 `adb shell screenrecord` + 프레임 추출로 본다(049 교훈).

## 4. Maestro

`maestro test`로 필요한 흐름만 직접 돌린다(`run-device-tests.mjs`는 `pm clear`를 먼저 하므로 이 세션에서는 쓰지 않는다 — 모델 보존).
다만 새 흐름은 `run-device-tests.mjs`의 `FLOWS`에 등록한다(FR-027).

- 고친 흐름: `diary-user-path`, `generate-diary`, `photo-selection-over-limit`, `writing-flow-simplified`, `today-diary`(「덮어쓸지 확인」·「확인」 → `overwrite-dialog`·「다시 쓰기」)
- 메뉴를 지나는 흐름(`home-menu-*`): `skeleton`, `prompt-preview`, `scheduled-diary-notification`, `diary-home-1d` 등 — testID가 그대로라 고칠 것이
  없어야 한다. 돌려서 확인한다.
- 새 흐름: `dialog-foundation.yml` — 덮어쓰기 대화상자(취소·뒤로 가기·다시 쓰기) + 달력(열기·‹·과거 날 고르기·스트립 반영·취소).
- 동의 흐름(`download-consent-flow`·`unified-permission-onboarding`·`welcome-naming`)은 `clearState`가 들어 있어 모델을 지운다 — 이 세션에서
  돌리지 않고 미확인 잔여에 적는다.

## 5. 위반 주입 결과 (T037, 2026-09-28)

`inject.py`(세션 scratchpad)로 변경을 하나씩 넣고 관련 테스트를 돌린 뒤 되돌렸다. **13건 전부 잡혔다.**

| 계약 | 주입 | 결과 |
| --- | --- | --- |
| DLG1 | 확인 대화상자 덮개에 닫기 `onPress` | 잡힘 |
| DLG2 | `onOpenChange(false)`가 `onCancel`을 부르지 않음 | 잡힘 |
| DLG7 | `Dialog.tsx`에 `#ffffff` | 잡힘 |
| OW6 | 오늘 조건 제거(언제나 안내) | 잡힘 |
| OW9 | `OverwriteConfirmScreen.tsx` 되살림 | 잡힘 |
| CAL3 | ›의 `isLatestMonth` 무시 | 잡힘 |
| CAL4 | `disabledDates`·`maxDate` 둘 다 제거 | 잡힘 |
| CAL5 | 달력이 `dayOf(now)`를 직접 부름 | 잡힘 |
| CAL6 | 스트립이 `cellFor`를 우회해 `isToday`를 바꿈 | 잡힘 |
| MIG3 | `HomeMenu`에 `Modal` import | 잡힘 |
| DEP1 | 복사본에 `react-native-screens` import | 잡힘 |
| DEP2 | 화면 파일이 RNR `Text` import | 잡힘 |
| DEP4 | RNR 별칭에 새 hex | 잡힘 |

- **CAL4는 방어가 둘이다** — `disabledDates`(우리 판정)와 `maxDate`(오늘) 중 하나만 빼면 다른 하나가 막아 테스트가
  초록이다. 둘 다 빼야 빨간불이 된다(의도한 이중 방어).
- 주입하지 않은 것: DLG3(프리미티브 핸들러가 `false`를 돌려주게 하려면 `node_modules`를 고쳐야 한다), CAL9·MIG1(보이는
  달·닫힘 상태를 부모로 올리는 변경은 구조 변경이라 한 줄 주입이 안 된다 — 테스트가 동작으로 잠근다).

## 6. 실기기 결과 (T039, 2026-09-28 11:13~11:15, SM-S901N, dev debug, `pm clear` 없음)

기존 dev APK 그대로(새 네이티브 모듈 없음 — 재빌드 안 함), Metro를 `EXPO_PUBLIC_APP_ENV=dev --clear`로 다시 띄웠다.

| # | 결과 | 관측 |
| --- | --- | --- |
| D1 | 통과 | 지난 날(9/23) → 홈이 덮개 뒤에 흐리게 보이고 직선 면·2px 테두리, 제목·설명·「다시 쓰기」(빨강 바탕·검정 글자, 위)·「취소」(테두리, 아래). 오늘 안내 줄 없음 |
| D2 | 통과 | 덮개(화면 위쪽) 누름 → 그대로 |
| D3 | 통과 | 뒤로 가기 → 대화상자만 닫히고 홈·고른 날 그대로, 앱 전경 유지(`topResumedActivity` = MainActivity) |
| D4 | 통과 | 「취소」 → 홈 그대로 |
| D5 | 통과 | 오늘(9/28, 일기 있음) → 설명 아래 「지금까지의 하루로 써요.」 |
| D6 | 부분 | 「다시 쓰기」 → 지금의 쓰는 중 화면(048 모양 그대로 — Q1) → 뒤로 가기(그만두기) → 홈, `files/diary/2026-09-23.json` 수정 시각이 9/24 그대로(기존 일기 불변). **완주 뒤 교체는 T040의 `generate-diary` 흐름으로 본다** |
| D7 | 통과 | 헤더 숫자 → 「날짜로 이동」, 9월, 일요일 시작, 오늘(28) 빨강 바탕+밑줄, 일기 있는 날 점(1·14·21·22·23), 29·30 흐림, › 흐림 |
| D8 | 통과 | ‹ 두 번 → 7월 → 15 → 즉시 닫힘, 헤더 「2026년 7월 / 15 수요일」, 스트립 7/12~7/18, 15 선택. 하루 밀림 없음(시간대 변환 문제 없음) |
| D9 | 통과 | 월 표시 → 1~12월, 10·11·12월 흐림 / 연 표시 → 2015~2026년, 2020년 → 「7월 2020년」 날짜 보기 |
| D10 | 통과 | 덮개 누름·뒤로 가기·「취소」 각각 → 아무것도 안 바뀜. 다시 열면 선택한 날의 달(7월, 15 선택) |
| D11 | 통과 | 9/29 누름 → 반응 없음 |
| D12 | 통과 | ⋯ → 목록이 하단 바 윗선 위에 떨어져 뜸(048 수정 유지), 뒤로 가기로 닫힘, 「설정」 → 설정 화면 |
| D13 | 미확인 | 다운로드 동의는 모델을 지워야 다시 뜬다 — 계약 테스트 MIG1로 갈음 |

**관측(결함 아님, 기록)**: 달력 면은 화면 세로 가운데에 놓여, 월·연 목록으로 바꾸면 면 높이가 줄어 위치가 옮겨진다.
날짜 격자는 datepicker가 6주 높이를 늘 잡아 달이 5주일 때 아래가 비어 보인다.

## 7. Maestro 결과 (T040, 2026-09-28, SM-S901N, dev, `pm clear` 없음, `maestro test` 한 번에 11흐름)

**11/11 PASS (10분 23초)** — `dialog-foundation`·`diary-user-path`·`today-diary`·`past-day-diary`·`skeleton`·
`prompt-preview`·`scheduled-diary-notification`·`diary-home-1d`·`generate-diary`·`writing-flow-simplified`·
`photo-selection-over-limit`. `generate-diary`·`writing-flow-simplified`·`photo-selection-over-limit`는 대화상자
「다시 쓰기」 → 실제 생성 완주까지 지나므로 D6의 완주 갈래(다 쓰면 새 글로 바뀜)를 덮는다. 동의 흐름은 돌리지
않았다(FR-031, 모델 삭제 필요).
