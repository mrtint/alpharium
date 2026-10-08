# 📱 Pocketlog (포켓로그)

**주인의 휴대폰이 화자가 되어 하루를 일기로 쓰는 앱이다.** 사람이 쓰는 일기가 아니다.

휴대폰은 그날 찍힌 사진과 사진에 담긴 장소만으로 주인의 하루를 짐작해 쓴다. 글은 전부
기기 안에서 만들어진다 — 사진도 일기도 기기 밖으로 나가지 않는다.

- 무엇을 지켜야 하는가: [.specify/memory/constitution.md](.specify/memory/constitution.md) (헌법)
- 실무 사실과 실측 규칙: [AGENTS.md](AGENTS.md)
- 완료된 과제 이력: [docs/roadmap/README.md](docs/roadmap/README.md), 과제별 상세는 `specs/NNN-*/`

저장소 이름(`alpharium`)만 옛 이름이다. 앱 이름은 Pocketlog, 패키지는 `com.a810labs.pocketlog`다.

## 지금 되는 것

- **온디바이스 일기 생성** — 그날 사진을 시각 모델이 먼저 읽고, 그 기록으로 일기를 쓴다.
- **백그라운드 자동 쓰기와 완성 알림** — 매일 정한 시각 무렵, 또는 앱을 열 때.
- **첫 실행 흐름** — 권한 → 모듈 내려받기(약 2GB) → 이름 짓기 → 첫 일기.
- **홈** — 주간 스트립·달력으로 날을 고르고, 쓴 날은 그 자리에서 읽는다.
- **설정·개발자·진단 화면.**

지원 언어는 한국어 하나다. 플랫폼은 Android가 검증된 대상이고(Google Play 내부 테스트
준비 중), iOS는 아직 실기기에서 확인하지 않았다.

## 기술 구성

- **Core:** Expo SDK 57, React Native 0.86, React 19, TypeScript 6
- **추론:** `llama.rn` (GGUF, 기기 CPU)
- **UI:** NativeWind, react-native-reanimated, gesture-handler
- **Runtime:** Node.js `20.19` 이상
- **CI:** GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml))

**Expo Go로는 실행할 수 없다** — `llama.rn`이 네이티브 모듈이라 development build가 필요하다.

## 시작하기

```bash
npm install
git config core.hooksPath .githooks   # main 직접 커밋·push를 막는 훅 (clone 뒤 한 번)
```

Android 실기기에서 개발 빌드로 돌린다:

```bash
npx expo prebuild --platform android --clean
npx expo run:android
adb reverse tcp:8081 tcp:8081
EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client
```

환경은 `local`(시뮬레이터, 데스크톱 추론 서버)·`dev`(실기기 개발 빌드)·`prod`(배포 빌드) 셋이며
실행 시점에 `EXPO_PUBLIC_APP_ENV`로 정해진다. 연결·빌드에서 자주 걸리는 함정은
[AGENTS.md](AGENTS.md)의 「도구 사용법」에 있다.

## 테스트

| 명령 | 무엇 | 기기 |
| --- | --- | --- |
| `npm test` | 기기 불필요 테스트 전부 | 필요 없음 |
| `npm run test:logic` | 순수 로직만 — 개발 중 기본 | 필요 없음 |
| `npm run test:ui` | 화면만 | 필요 없음 |
| `npm run test:device` | 실기기 테스트 (Maestro) | 있으면 돌고 없으면 건너뛴다 |
| `npm run lint` | eslint + tsc + 헌법 검사 + 포맷 검사 | 필요 없음 |

**건너뛴 실기기 테스트는 통과가 아니다.** 기능이 끝났다고 말하려면 최소 한 번은 실기기에서
돌아야 한다(헌법 원칙 V).

## 코드를 어디에 두는가

```
src/        제품 코드 — 자리별 책임은 AGENTS.md 「코드를 어디에 두는가」
plugins/    Expo config plugin (android/·ios/는 생성물이라 커밋하지 않는다)
scripts/    헌법 검사, 실기기 테스트 실행기, 합성 하루 심기
__tests__/  기기 불필요 테스트
.maestro/   실기기 테스트
specs/      기능별 스펙·계약·실측 기록
```

## 작업 방식

- `main`에서 직접 작업하지 않는다 — 기능마다 브랜치를 파고 PR로 머지한다.
- 커밋 메시지는 한국어로 쓴다.
- 계약을 먼저 정하고 테스트를 먼저 쓴다.

## 배포

release 빌드·서명·Google Play 절차는 [AGENTS.md](AGENTS.md)의 「release 빌드·서명·Google Play」에
있다. 기본 작업 흐름이 아니며 저장소 소유자가 요청했을 때만 탄다.
