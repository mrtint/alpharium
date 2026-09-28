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
