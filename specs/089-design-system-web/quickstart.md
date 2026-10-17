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

(구현 뒤 채운다)
