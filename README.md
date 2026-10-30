# 📱 Pocketlog (포켓로그)

**주인의 휴대폰이 화자가 되어 하루를 일기로 쓰는 앱이다.** 사람이 쓰는 일기가 아니다.

휴대폰은 그날 찍힌 사진과 사진에 담긴 장소만으로 주인의 하루를 짐작해 쓴다. 글은 전부
기기 안에서 만들어진다 — 사진도 일기도 기기 밖으로 나가지 않는다. 예외는 하나다: 일기를 쓸 때
다닌 자리의 이름을 참고하려고 좌표를 기기의 지도 서비스에 물어본다(설정 「장소 이름으로 보기」에서 끌 수 있다, 086 —
[개인정보처리방침](https://mrtint.github.io/alpharium/privacy/)).

- 무엇을 지켜야 하는가: [.specify/memory/constitution.md](.specify/memory/constitution.md) (헌법)
- 실무 사실과 실측 규칙: [AGENTS.md](AGENTS.md)
- 디자인 시스템과 토큰 규칙: [design/DESIGN.md](design/DESIGN.md)
- 진행 예정 과제와 완료 이력: [docs/roadmap/README.md](docs/roadmap/README.md), 과제별 상세는 `specs/NNN-*/`
- 자동 쓰기가 언제 되고 안 되는지(실측): [docs/background-write-conditions.md](docs/background-write-conditions.md)

저장소 이름(`alpharium`)만 옛 이름이다. 앱 이름은 Pocketlog, 패키지는 `com.a810labs.pocketlog`다.

## 지금 되는 것

- **온디바이스 일기 생성** — 그날 사진(상한 8장)을 시각 모델이 먼저 읽고, 그 기록으로 `~요`체 일기와 제목을 쓴다. 판정을 통과하지 못한 글은 저장하지 않는다.
- **자동 쓰기(설정에서 켠다, 기본 꺼짐)** — 목표 시각 +3시간 창 안에 OS가 앱을 깨우면 쓰고, 놓친 날은 앱을 열 때 따라잡는다(재료 있는 가장 최근 날부터). 목표 시각에는 「쓸 차례」 알림, 다 쓰면 완성 알림이 온다. **OS가 깨우는 조건은 플랫폼마다 다르다** — iPhone은 충전 중일 때만, 안드로이드는 배터리 사용 제한을 풀면 충전과 무관하게 돈다(실측과 미확인은 [조건표](docs/background-write-conditions.md)).
- **iPhone 이어 하기** — 홈에서 시작한 쓰기는 앱을 나가도 충전 없이 끝까지 쓰고 알린다(iOS 26+ `BGContinuedProcessingTask`, 092).
- **첫 실행 흐름** — 권한 → 모듈 내려받기(약 2GB, 받을 양 안내·모바일 데이터 동의 분기) → 이름 짓기 → 첫 일기.
- **홈** — 주간 스트립·달력으로 날을 고르고, 쓴 날은 그 자리에서 사진 캐러셀(탭 확대)·본문을 읽는다.
- **설정·개발자·진단 화면** — 자동 쓰기·시각·장소 이름, 권한·배터리 상태 꼬리표, 일기 모두 지우기, 개인정보처리방침·서체·오픈소스 라이선스. 개발자 화면에는 「최근 자동 쓰기 시도」와 「최근 실패」 기록이 있다.
- **백업** — 모델(약 2GB)만 OS 백업에서 뺀다. 일기는 OS 기본 백업을 따르지만 보장하지 않는다(안드로이드 한도, 099).

지원 언어는 한국어 하나, 출시 국가는 한국, iOS는 iPhone 전용이다(102). Android(Google Play 내부 테스트)와 iOS(TestFlight) 모두 실기기(SM-S901N·iPhone 14)에서 검증 중이며 정식 출시 전이다. 릴리스 빌드·업로드는 GitHub Actions 수동 워크플로(075·076)로 수행한다.

## 기술 구성

- **Core:** Expo SDK 57, React Native 0.86, React 19, TypeScript 6
- **추론:** `llama.rn` 0.12 (GGUF, 기기 CPU) — 글 모델 Kanana 1.5 2.1B, 시각 모델 LFM2.5-VL
- **네이티브:** 로컬 Expo 모듈 셋(`modules/` — iPhone 이어 하기·iOS 백그라운드 만료 알림·iOS 백업 제외), `patch-package` 패치(`patches/` — `expo-background-task`)
- **UI:** NativeWind, react-native-reanimated, gesture-handler, Pretendard (정적 OTF 5종 번들)
- **Runtime:** Node.js `20.19` 이상
- **CI / 배포:** GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml), `native-build.yml`, `android-release.yml`, `ios-release.yml`, `pages.yml`)

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
실행 시점에 `EXPO_PUBLIC_APP_ENV`로 정해진다(macOS에서는 `.env.development.local`에 `EXPO_PUBLIC_APP_ENV=dev`를 둔다). 연결·빌드에서 자주 걸리는 함정은
[AGENTS.md](AGENTS.md)의 「도구 사용법」에 있다.

## 테스트

| 명령                      | 무엇                                            | 기기                |
| ------------------------- | ----------------------------------------------- | ------------------- |
| `npm test`                | 기기 불필요 테스트 전부                         | 필요 없음           |
| `npm run test:logic`      | 순수 로직만 — 개발 중 기본                      | 필요 없음           |
| `npm run test:ui`         | 화면만                                          | 필요 없음           |
| `npm run test:layer1`     | 실기기 화면 흐름 e2e (기준 상태·30일 표본 보장) | 전용 안드로이드 기기 |
| `npm run test:layer2`     | 실기기 실제 모델 생성 스모크 4종                | 전용 안드로이드 기기 |
| `npm run test:layer1:ios` | iOS 시뮬레이터 화면 흐름 e2e                    | 전용 iOS 시뮬레이터 |
| `npm run test:layer2:ios` | iPhone 실제 모델 생성 스모크 4종 (사람이 탭)    | 전용 iPhone         |
| `npm run lint`            | eslint + tsc + 헌법 검사 + 포맷 검사            | 필요 없음           |

**건너뛴 실기기 테스트는 통과가 아니다.** 기능이 끝났다고 말하려면 최소 한 번은 실기기에서
돌아야 한다(헌법 원칙 V).

## 코드를 어디에 두는가

```text
src/        제품 코드 — 자리별 책임은 AGENTS.md 「코드를 어디에 두는가」
design/     디자인 토큰 정본(tokens.json)·아이콘 정본(icon.json)과 디자인 시스템 규칙(DESIGN.md)
site/       개인정보처리방침·지원·오픈소스 라이선스·소개 정적 웹페이지 (GitHub Pages)
store/ko/   스토어 등록 에셋(설명문·스크린샷·아이콘) — 앱 번들에 들어가지 않는다
modules/    로컬 Expo 네이티브 모듈
plugins/    Expo config plugin (android/·ios/는 생성물이라 커밋하지 않는다)
patches/    patch-package 패치 (npm install 때 적용)
scripts/    헌법 검사, 층 1·층 2 e2e 실행기, 합성 하루·30일 표본 심기, 토큰·아이콘 생성기, 릴리스 점검
release-notes/  Play·TestFlight 릴리스 노트 (한국어 한 파일)
docs/       로드맵, 자동 쓰기 조건표, e2e 대응표·체크리스트, 스토어 데이터 선언 초안
__tests__/  기기 불필요 테스트
.maestro/   실기기·시뮬레이터 e2e 흐름
specs/      기능별 스펙·계약·실측 기록
```

## 작업 방식

- `main`에서 직접 작업하지 않는다 — 기능마다 브랜치를 파고 PR로 머지한다.
- 커밋 메시지는 한국어로 쓴다.
- 계약을 먼저 정하고 테스트를 먼저 쓴다.
- 화면·페이지·문서 등 디자인 산출물을 만들기 전에 [design/DESIGN.md](design/DESIGN.md)를 먼저 읽는다.

## 배포

Android(Google Play)와 iOS(TestFlight) 릴리스 빌드·서명·업로드 절차는 [AGENTS.md](AGENTS.md)에
있다. 기본 작업 흐름이 아니며 저장소 소유자가 요청했을 때만 탄다. 올리기 전에 `app.json`의 빌드 번호를
사람이 올리고 `release-notes/ko.txt`를 고쳐 같은 커밋에 넣는다 — 워크플로가 스토어의 마지막 번호와
견줘 중복이면 빌드 전에 실패한다(096).
