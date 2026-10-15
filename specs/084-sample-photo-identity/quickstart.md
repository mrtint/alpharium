# Quickstart: 084 검증

## 1. 기기 없는 테스트

```bash
npx jest __tests__/e2e-sample --selectProjects logic
npm test && npm run lint
```

## 2. 목록 이전과 내려받기 (맥 — 외부 서비스 호출, 소유자 승인 2026-10-15)

```bash
export NODE_EXTRA_CA_CERTS=/Users/mrtint/system-cas.pem   # TLS 가로채는 네트워크
npm run sample:fetch -- --record-hashes   # 원본 sha1 210개 채우기 + 15장 eqiad 변형 받아들이기 (약 8분)
npm run sample:fetch                      # 다시: 네트워크 0, 「캐시 210」
git diff --stat scripts/e2e-sample/photos.json
```

기대: 첫 실행에서 「새 썸네일 변형을 받아들였다」가 15줄(어긋났던 15장), 종료 코드 0. 둘째 실행은 원본 조회 없이 끝난다.

## 3. 층 1 전체 (맥 + SM-S901N dev)

```bash
ADB=~/Library/Android/sdk/platform-tools/adb
# 백업
$ADB exec-out run-as com.a810labs.pocketlog tar cf - files/diary files/preferences files/vision-cache > <scratchpad>/device-backup.tar
# Metro(dev) + adb reverse
$ADB reverse tcp:8081 tcp:8081
npm run test:layer1
# 복원
$ADB shell run-as com.a810labs.pocketlog rm -rf files/diary files/preferences files/vision-cache
cat <scratchpad>/device-backup.tar | $ADB shell run-as com.a810labs.pocketlog tar xf -
```

기대: 표본 보장이 다시 심고(지문이 바뀌었으므로) `sample-days`를 포함한 층 1 흐름이 모두 통과한다.

## 실측 (2026-10-15, 맥 + SM-S901N dev — Metro는 이 브랜치, 기기의 debug APK 그대로)

- **기기 없는 테스트**: `__tests__/e2e-sample` 142개 통과(새 `commons.test.ts` 9 · `sample-fetch-entry.test.ts` 5, `fetch.test.ts` 31). 위반 주입 다섯이 실패로 뒤집혔다 —
  원본 sha1 비교 제거(3개 실패), 썸네일 모양 판정 제거(3개), 확인 일자 판정 제거(1개), 진입점의 쓰기를 `recordHashes ||` 조건으로(2개), 쓰기를 조건 밖으로(1개). 매번 치환을 확인하고 되돌렸다.
  `npm test` 296 스위트·6434 통과(7 건너뜀), `npm run lint` 0 오류(경고 2는 이 기능과 무관한 기존 파일).
- **`npm run sample:fetch -- --record-hashes`**(약 8분 — 원본 조회 210 + 썸네일 198, 캐시 12): 종료 코드 0. 「새 썸네일 변형을 받아들였다」가 정확히 어긋났던 15장(indoor-13·18·26·28,
  street-06·12·29, people-12·14·18·19·26, night-01·08·22)에 나왔다. `photos.json`: `originalSha1` 210개 채움, 15장만 해시 둘 — 첫째가 목록 작성 때 값(codfw), 둘째가 brainstorming에서 eqiad
  엣지로 받은 값과 같고, 원본 sha1은 brainstorming의 Commons 이력 값과 같았다. 다른 필드·순서는 그대로. 확인 일자 뒤에 다시 올라온 원본은 없었다.
- **다시 `npm run sample:fetch`**: 「새로 받음 0, 캐시 210」, `photos.json` 무변경(SC-001).
- **`npm run test:layer1`**(14분 20초): 표본 보장이 지문이 바뀌어 다시 심었다(129장, 5초, 기준일 2026-10-15). 흐름 **12/12 통과**(13분 53초) — `restart-persistence` 2m10s ·
  `single-photo-swipe` · `settings-developer-sweep` 2m56s · `dialog-foundation` · `diary-home-1d` · `week-strip-swipe` · `diary-body-screen` · `skeleton` · `prompt-preview` · `today-diary` ·
  `state-simulation` · **`sample-days` 2m51s**(SC-002).
- **백업·복원**: 시작 전 `files/diary`(1편)·`files/preferences`(2개)·`files/vision-cache`(빈 폴더)를 `run-as tar`로 받았다. 끝나고 `force-stop` → 세 폴더 지움 → 되돌림 → 세 파일 md5가
  백업과 같고, 앱을 다시 열어 홈이 뜨는 것을 봤다. 기기의 `PocketlogSeed/s30-*` 표본 사진 129장은 층 1의 산출물로 남겨 두었다(070과 같다 — 다음 층 1은 건너뛴다).
- **미확인**: 다른 기계(codfw 계열 — 목록 작성 때의 Windows)에서 이 목록으로 원본 조회 없이 받아지는지(첫째 해시가 그 값이므로 그럴 것으로 본다 — 짐작), 셋째 썸네일 변형이
  실제로 생겼을 때의 받아들임(가짜 네트워크 테스트로만).
