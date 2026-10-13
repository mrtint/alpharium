# Quickstart: 쓰기 실패 기록의 갈래 (081) — 확인 절차

계약은 [contracts/write-failure-reasons.md](./contracts/write-failure-reasons.md), 표는 [data-model.md](./data-model.md).

## 1. 기기 없는 확인

```bash
npx jest __tests__/app/write-failures.test.ts __tests__/app/write-failures.pipeline.test.ts --selectProjects logic
npx jest __tests__/ui/failures-group.test.tsx __tests__/ui/developer-screen.test.tsx __tests__/ui/diagnostics-screen.test.tsx --selectProjects ui
npm test          # 전체 — 가드 표(062 B3·B6, 069 G-1, 골든, flow-map)가 여기서만 걸린다
npm run lint      # eslint + tsc + 헌법 검사 + prettier
```

기대: 전부 통과. `tsc` 0 — `Record<WriteFailureReason, string>`이 빠진 갈래를 짚는다.

위반 주입은 계약 문서 끝의 표를 한 줄씩 넣어 보고 되돌린다(되돌린 뒤 원래 문자열을 grep으로 다시 확인).

## 2. 실기기 (dev, SM-S901N) — 기기의 debug APK를 지우지 않는다

**하지 않는 것**: release 빌드, 앱 삭제, `pm clear`, `npm run test:layer1`, 실패를 다시 만들어 보려는 반복 실행.

### 준비

```bash
export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"
adb devices                                  # 한 대
adb reverse tcp:8081 tcp:8081
EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client      # 번들에 .env.development.local 모듈이 있는지 curl로 본다(AGENTS 「도구 사용법」)
```

**백업**(끝나면 되돌린다): `run-as com.a810labs.pocketlog`로 `files/diary/`와 `files/preferences/`를 tar로 묶어 맥의 스크래치 폴더로 가져온다. 화면을 끄는 실험은 하지 않는다(PIN이 필요 없다).

### D1 — 「도중에 끊김」이 남는다 (SC-003)

1. 실패 기록을 본다: `adb exec-out run-as com.a810labs.pocketlog cat files/preferences/write-failures.json`(없을 수 있다).
2. 홈에서 오늘(또는 안 쓴 날) 「쓰기」 → 「쓰는 중」이 되면 홈 버튼으로 앱을 내린다 → 10초쯤 뒤 다시 연다.
3. 기대: 토스트 「일기를 쓰지 못했어요.」(지금 동작 그대로 — **다시 연 뒤 약 20초까지 늦게 온다**, AGENTS 054; 토스트가 뜬 뒤에 기록을 본다). 기록 파일 맨 앞 항목의 `reason`이 `"interrupted"`.
4. 설정 → 개발자 → 맨 아래: 「최근 자동 쓰기 시도」 아래 「최근 실패」의 맨 위 줄이 「도중에 끊김」 + 방금 시각.

사진을 읽는 도중과 본문을 쓰는 도중을 한 번씩 본다(사진 있는 날이면 내리는 시점으로 가른다 — `adb logcat`의 `Attached ggml threadpool` 줄 수로 어느 단계였는지 본다). 둘 다 「도중에 끊김」이어야 한다.

### D2 — 두 화면의 묶음 (SC-002)

1. 개발자 화면: 위 행들(모듈·상태 흉내·진단·다시 받기·온보딩·끄기·시도 묶음)의 순서가 그대로이고 그 아래에 「최근 실패」.
2. 진단 화면: 「최근 실패」가 지금 자리에 있고 개발자 화면과 같은 줄.
3. 글꼴 2.0배(`adb shell settings put system font_scale 2.0` → 끝나면 `1.0`)에서 까닭과 시각이 겹치지 않는다.

### D3 — 옛 기록 (SC-004)

기기에 남아 있던 옛 줄(「일기를 쓰지 못함」 등)이 D1 뒤에도 그대로 있고 새 줄만 앞에 더해졌다. 옛 줄이 없으면 `{"items":[{"reason":"unwritten","at":"…"}]}`를 `adb push` + `run-as cat >`로 넣고 본다(끝나면 백업으로 되돌린다).

### D4 — 실기기 흐름

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@17 maestro test .maestro/settings-developer-sweep.yml
```

기대: 개발자·진단 구간 통과. 마지막 단언(`written-paper`)은 층 1 기준 상태(오늘의 픽스처 일기)가 없으면 실패한다 — 078 때와 같고 회귀가 아니다. 오늘 일기가 있으면 통과한다.

### 되돌리기

백업한 `diary/`·`preferences/`를 되돌리고 글꼴 배율을 1.0으로 둔다. `adb reverse --remove-all`.

## 3. 미확인으로 남기는 것

- 판정 거부 넷·시간 초과·생성 중 오류가 **기기에서** 그 갈래로 남는 것 — 일부러 만들 수단이 없다. 계약 F8(진짜 파이프라인 + 가짜 백엔드)로만 확인한다.
- iOS 전부(실제 iPhone 없음), 배포 빌드의 개발자 화면(release를 만들지 않는다).
- 080에서 본 49초 실패의 까닭 — 이 기능은 그것을 밝히지 않는다.

## 실측

(구현 뒤 여기에 적는다 — 날짜·기기·본 것·못 본 것)
