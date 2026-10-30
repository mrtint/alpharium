# 📱 Pocketlog (포켓로그)

**주인의 휴대폰이 화자가 되어 하루를 일기로 쓰는 앱이다.** 사람이 쓰는 일기가 아니다.

휴대폰은 그날 찍힌 사진과 사진에 담긴 장소로 주인의 하루를 짐작해 쓴다. 글은 전부 기기 안의
모델이 만든다. 무엇이 기기 밖으로 나가는지는 [개인정보처리방침](https://mrtint.github.io/alpharium/privacy/)이
정본이다.

> 이 문서에는 오래 유지되는 것만 둔다 — 버전·수치·기기·검증 상태·실측 조건·과제 번호처럼 금방 낡는
> 정보는 적지 않고, 그것을 담는 문서로 연결한다.

| 알고 싶은 것                         | 문서                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| 무엇을 지켜야 하는가 (헌법)          | [.specify/memory/constitution.md](.specify/memory/constitution.md)                   |
| 지금 상태·실측 규칙·도구 사용법      | [AGENTS.md](AGENTS.md)                                                               |
| 자동 쓰기가 언제 되고 안 되는가      | [docs/background-write-conditions.md](docs/background-write-conditions.md)           |
| 진행 예정 과제와 완료 이력           | [docs/roadmap/README.md](docs/roadmap/README.md) — 과제별 상세는 `specs/NNN-*/`      |
| 디자인 시스템과 토큰                 | [design/DESIGN.md](design/DESIGN.md)                                                 |
| 의존성·버전·실행 환경                | [package.json](package.json), [app.json](app.json)                                   |

저장소 이름(`alpharium`)만 옛 이름이다. 앱 이름은 Pocketlog, 패키지는 `com.a810labs.pocketlog`다.

## 무엇을 하는 앱인가

- **온디바이스 일기 생성** — 사진을 시각 모델이 먼저 읽고, 그 기록으로 글 모델이 일기와 제목을 쓴다. 판정을 통과하지 못한 글은 저장하지 않는다.
- **자동 쓰기** — 설정에서 켜면 목표 시각 무렵 OS가 앱을 깨울 때 쓰고, 놓친 날은 앱을 열 때 따라잡는다. 쓸 차례·완성 알림이 따른다. OS가 언제 깨우는지는 플랫폼과 기기 상태에 달려 있다 — 조건표를 본다.
- **첫 실행** — 권한 요청 → 모델 내려받기 동의 → 이름 짓기 → 첫 일기.
- **홈** — 날을 골라 안 쓴 날은 쓰고, 쓴 날은 그 자리에서 사진과 본문을 읽는다.
- **설정·개발자·진단 화면.**

## 시작하기

**Expo Go로는 실행할 수 없다** — 추론 라이브러리(`llama.rn`)가 네이티브 모듈이라 development build가 필요하다.

```bash
npm install
```

```bash
git config core.hooksPath .githooks   # main 직접 커밋·push를 막는 훅 (clone 뒤 한 번)
```

Android 실기기 개발 빌드:

```bash
npx expo prebuild --platform android --clean
```

```bash
npx expo run:android
```

환경은 `local`·`dev`·`prod` 셋이고 `EXPO_PUBLIC_APP_ENV`로 정해진다. 기기 연결·iOS 빌드·환경 설정의
함정은 [AGENTS.md](AGENTS.md)의 「환경은 셋이다」·「도구 사용법」에 있다.

## 테스트

```bash
npm test        # 기기 불필요 테스트 전부
```

```bash
npm run lint    # eslint + tsc + 헌법 검사 + 포맷 검사
```

실기기·시뮬레이터 e2e 명령은 [AGENTS.md](AGENTS.md)의 「테스트」에 있다. **건너뛴 실기기 테스트는
통과가 아니다** — 기능이 끝났다고 말하려면 실기기에서 한 번은 돌아야 한다(헌법 원칙 V).

## 코드를 어디에 두는가

```text
src/        제품 코드 — 자리별 책임은 AGENTS.md 「코드를 어디에 두는가」
__tests__/  기기 불필요 테스트
.maestro/   실기기·시뮬레이터 e2e 흐름
specs/      기능별 스펙·계약·실측 기록
docs/       로드맵, 자동 쓰기 조건표, e2e 문서 등
design/     디자인 정본(토큰·아이콘)과 디자인 시스템 규칙
site/       개인정보처리방침·지원 등 정적 웹페이지 (GitHub Pages)
store/      스토어 등록 에셋 — 앱 번들에 들어가지 않는다
modules/    로컬 Expo 네이티브 모듈
plugins/    Expo config plugin (android/·ios/는 생성물이라 커밋하지 않는다)
patches/    patch-package 패치 (npm install 때 적용)
scripts/    헌법 검사, e2e 실행기, 표본 심기, 생성기, 릴리스 점검
```

## 작업 방식

- `main`에서 직접 작업하지 않는다 — 기능마다 브랜치를 파고 PR로 머지한다.
- 커밋 메시지는 한국어로 쓴다.
- 계약을 먼저 정하고 테스트를 먼저 쓴다.
- 화면·페이지·문서 등 디자인 산출물을 만들기 전에 [design/DESIGN.md](design/DESIGN.md)를 먼저 읽는다.

## 배포

Android(Google Play)와 iOS(TestFlight) 릴리스는 GitHub Actions 수동 워크플로로 한다. 절차와 올리기 전
할 일은 [AGENTS.md](AGENTS.md)에 있다. 기본 작업 흐름이 아니며 저장소 소유자가 요청했을 때만 탄다.
