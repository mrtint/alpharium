# Quickstart: 디자인 시스템 기반과 웹 재디자인 — 검증 안내

표시: **[실측]** 직접 본 것 · **[짐작]** 확인 못 한 것. 구현 후 「실측」 절을 채운다.

## 준비

1. 작업 위치: `.claude/worktrees/design-system`(브랜치 `worktree-design-system`). `npm ci`가 필요하면 이 워크트리에서 한다.
2. 서체 가져오기(네트워크 필요, 한 번): `node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/design/import-pretendard-web.mts` → `site/assets/fonts/`·`fonts.css`·`source.json`. 무결성이 다르면 아무것도 쓰지 않고 실패한다.

## 값을 바꾸고 확인하는 법

```
# design/tokens.json 수정 후
node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/design/build-tokens.mts          # 생성
node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/design/build-tokens.mts --check   # 어긋남 검사(종료 코드)
npm run test:logic
```

## 기기 없는 확인

- `npm test` · `npm run lint` 초록.
- 위반 주입(contracts/guards.md 표)을 하나씩: 치환 적용 확인 → 테스트 실패 → 원복.
- 헤드리스 크롬 캡처(`--screenshot=<절대 경로>`로 스크래치패드에 저장): 세 페이지 × (390px, 1280px) × (라이트, 다크). 다크는 `--force-dark-mode` 대신 `prefers-color-scheme` 에뮬레이션이 필요하면 임시 HTML 래퍼를 쓴다 — 방법과 결과를 아래 「실측」에 적는다. 확인할 것: 앱과 같은 색·서체 인상, 제목 계층, 요약 상자, 가로 스크롤 없음(320px 포함), 링크 색.
- 네트워크 확인: 페이지를 로컬 서버로 열고 요청 목록에 제3자 주소가 없다(SC-007).

## 앱 불변 확인 (원칙 V)

- G4 통과(값 불변).
- dev 빌드 한 번: 설정 → 정보, 홈, 작명 화면의 배경·강조 색이 변경 전과 같다(눈으로, 전용 기기 SM-S901N). 이 워크트리에서 네이티브 빌드는 하지 않는다 — 번들만 바뀌므로 기기에 깔린 debug APK에 이 워크트리의 Metro를 올린다(AGENTS 「맥에서 안드로이드 실기기를 보는 법」). 기기·Metro를 쓸 수 없으면 [미확인]으로 기록하고 소유자가 정한다.

## 미확인 후보

- Safari iOS·Chrome Android 실제 렌더링과 글꼴 분할 로딩.
- GitHub Pages 게시 뒤 서체 URL·캐시(머지 뒤 소유자).
- 앱 OTF와 웹 woff2 글리프 동일성(눈 대조).

## 실측

2026-10-18, 맥(macOS), Node 24, 워크트리 `.claude/worktrees/design-system`. **[실측]** 직접 본 것, **[미확인]** 못 본 것.

**기기 없는 검증**
- 코드 리뷰(독립 리뷰어, With fixes → 반영)에서 Important 셋과 Minor 일부를 고쳤다: 대비 검사가 글자색·배경을 각각 허용 목록으로만 보던 것을 규칙 블록 단위 짝 검사로, `.meta` 여백이 `.doc p`에 덮여 죽어 있던 선택자(`.doc .meta`), 임포트 스크립트가 원본 존재를 확인하기 전에 276개를 지우던 순서, 정본 `note`로 잃은 서체 근거 복원, 글자 역할 굵기가 `webWeights` 안인지 검증, HTML 속성 안 hex·엔티티 글자 계산. 새 위반 주입 7건이 모두 실패로 뒤집혔다.
- `npm test` 325개 스위트·6,836개 통과(건너뜀 7), `npm run lint` 오류 0(eslint·`tsc`·헌법 검사 통과·prettier). 전체 첫 실행에서 `bar-lock`이 한 번 실패했는데 부하(Metro·시뮬레이터가 함께 돌던 때) 탓의 타이밍 플레이크였고 단독·재실행에서는 통과했다. `theme-tokens`는 생성 영역 앞에 쓴 머리 주석의 낱말 「COLORS」 때문에 소스 조각 단언이 한 번 어긋났다 — 주석을 고쳐 앱 토큰 테스트는 **수정 없이** 통과한다(SC-005).
- 위반 주입 27건이 모두 실패로 뒤집혔다가 원복됐다(치환 적용을 먼저 단언하는 스크립트): G1 정본 한 값, G2 역할 삭제·`note` 비움·모르는 키, G3 다크 `textMuted`, G4 라이트 `accent` 변경+생성(`COLORS`가 실패), G5 HTML `<style>`·`style=`·외부 스타일시트와 `site.css`의 색 리터럴·`font-family`·px 간격·글자 `accent`·정의 안 된 변수·정의 안 된 클래스, 086 S3 외부·절대 경로 스타일시트, G6 woff2 한 바이트·LICENSE 삭제·굵기 선언 바꿈·`font-display` 변경, G7 선언 두 배(용량 초과), G8 문서의 없는 변수·클래스·경로, G9 안내 줄, G10 링크 삭제.
- 용량(FR-010a) **[실측]**: 방침 51개 조각 587,756바이트, 지원 42개 481,696, 소개 24개 282,604 — 모두 1,000,000 이하(굵기 셋을 모두 쓴다고 본 값). 서체 파일 276개·약 4.0MB가 저장소에 들어간다.

**캡처 (헤드리스 Chrome, 로컬 서버)**: 세 페이지 × 폭 320·390·1280 × 라이트·다크. 파일은 스크래치패드 `shots/`(`privacy-390-light.png`·`privacy-1280-dark.png`·`support-390-light.png`·`index-390-dark.png` 등)이고 저장소에는 두지 않는다. 폭 320에서도 `scrollWidth == clientWidth`(가로 스크롤 없음, SC-003), 라이트·다크가 각각 적용됐고(`matchMedia`), 본문 서체가 Pretendard로 계산된다. 눈으로: 요약 상자(surface 면 + accent 세로 막대)·제목 계층·절 구분선·링크가 의도대로 보였고 다크도 같은 틀이다. 링크 목록(소개)이 `.doc ul`의 들여쓰기에 눌려 밀리던 것을 캡처에서 발견해 선택자를 고쳤다. **소유자의 육안 확정(SC-009)은 이 캡처를 본 뒤에 받는다**(웹 전용 `display`·`reading` 값은 초안).

**앱 색 불변 (원칙 V)**: 안드로이드 기기는 이 맥에 adb가 없어 **[미확인]**. 대신 iOS 시뮬레이터(iPhone 17, 새로 부팅)에 기존 debug 빌드를 설치하고(`xcrun simctl install`) 이 워크트리의 Metro(포트 8082, `RCT_jsLocation`으로 지정 — 다른 세션의 8081 Metro·시뮬레이터는 건드리지 않았다)에서 번들을 받아 띄웠다. 번들에 생성 영역 표식이 들어 있었고(`EXPO_PUBLIC_APP_ENV=dev`), 로고 화면의 주요 색이 `#f3f2f2`(`COLORS.bg`)·`#ec3013`(`COLORS.accent`)로 정확히 같았다(스크린샷 픽셀 집계). 설정·홈 화면까지는 보지 않았다 — 값 불변은 `app-values` 테스트가 잠근다.

**[미확인]**: Safari iOS·Chrome Android 실제 렌더링과 글꼴 분할 로딩, 페이지 요청 목록에서 제3자 0건(SC-007은 소스 검사 G5·G6으로 갈음하고 네트워크 로그는 보지 않았다), GitHub Pages 게시 뒤 서체 URL·캐시(머지 뒤), 앱 OTF와 웹 woff2의 글리프 동일성(눈 대조 안 함 — 같은 v1.3.9의 다른 포장이라는 배포처 설명에 기댄다), 안드로이드 실기기.
