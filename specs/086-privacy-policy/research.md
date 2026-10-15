# Research: 개인정보처리방침·지원 페이지와 데이터 선언

사실 확인(M7·스토어 요건)은 설계문서 `docs/superpowers/specs/2026-10-15-privacy-policy-design.md` §1에 있다. 여기는 구현 방법의 결정만 둔다.

## R1. 게시 통로 — 공식 Pages 배포 워크플로

- **Decision**: `site/`를 `actions/upload-pages-artifact` → `actions/deploy-pages`로 올린다. 저장소 설정의 Pages 소스는 「GitHub Actions」(소유자가 켠다).
- **Rationale**: 브랜치 배포는 저장소 루트나 `/docs`만 받는다 — `/docs`는 내부 문서(로드맵·e2e·설계)까지 사이트로 서빙된다. 워크플로 배포는 올릴 폴더를 고르고, 업로드 전에 자리표시자 검사를 끼울 자리가 있다.
- **Versions** (2026-10-15 `gh api …/releases/latest`): `actions/configure-pages@v6`(v6.0.0, 2026-03-25), `actions/upload-pages-artifact@v5`(v5.0.0, 2026-04-10), `actions/deploy-pages@v5`(v5.0.1, 2026-09-01). checkout은 저장소의 다른 워크플로와 같은 `actions/checkout@v5`. 모두 2주 넘게 지난 판이다. 저장소 관례대로 주 버전 태그로 고정한다(SHA 고정은 다른 워크플로도 쓰지 않는다).
- **Alternatives**: `/docs` 브랜치 배포(내부 문서 노출·검사 자리 없음), `gh-pages` 브랜치(원문이 `main`과 갈라짐), 새 저장소(동기화를 사람이 지킴) — 브레인스토밍에서 기각.

## R2. 사이트 형식 — 손으로 쓴 정적 HTML

- **Decision**: `site/index.html`·`site/privacy/index.html`·`site/support/index.html`, 각 파일 안 `<style>` 하나, `site/.nojekyll`. 외부 스크립트·글꼴·분석 없음.
- **Rationale**: 페이지 셋에 빌드 도구는 과하다. 외부 자원을 부르지 않아야 「방침 페이지가 방문자를 추적하지 않는다」를 따로 설명할 필요가 없다. 마크다운 렌더링(Jekyll)은 버전·테마가 바뀌면 화면이 바뀐다.
- **Alternatives**: Jekyll 마크다운(기각 — 위), Astro 등 정적 생성기(새 의존성).

## R3. 외부 전송 표식 — `data-outbound` 속성

- **Decision**: 방침의 「휴대폰 밖으로 나가는 것」 절의 항목마다 `<section data-outbound="<식별자>">`를 붙인다. 테스트는 HTML을 정규식으로 읽어 식별자 집합을 만든다(HTML 파서 의존성 없음).
- **Rationale**: 문장은 자유롭게 고칠 수 있고, 항목의 존재만 목록과 대조된다(Clarification 3).
- **Alternatives**: 낱말 포함 검사(문장을 고치면 깨지고, 빠진 항목을 못 가린다), 방침을 표에서 생성(원문을 사람이 직접 읽고 고치기 어렵다).

## R4. 외부 전송 목록·허용 목록의 자리 — `__tests__/privacy/outbound.ts`

- **Decision**: 외부 전송 목록(식별자·이유·근거)과 앱 소스의 외부 주소 허용 목록(호스트·이유)을 테스트 쪽 표 하나에 둔다.
- **Rationale**: 이 표는 제품이 읽지 않는 검증 자료다(069 `scripts/layer1/baseline.ts`·`__tests__/future-character.ts`와 같은 성격). `src/`에 두면 이유 문장의 한글이 062 화면 문구 검사(`checkI18nFile`)에 걸리고, 제품 번들에 실린다.
- **Alternatives**: `src/app/policy-links.ts`에 함께 둠(위 이유로 기각), `site/` 안 JSON(공개 사이트로 함께 올라간다 — 해롭지 않지만 사이트의 일이 아니다).

## R5. 브라우저 여는 통로 — `src/app/browser-port.ts`

- **Decision**: `openInBrowser(url): Promise<boolean>` — 호출 시점 `require("react-native")`의 `Linking.openURL`을 부르고, 거부되면 `false`. `canOpenURL`은 부르지 않는다.
- **Rationale**: 066 — `await import("react-native")`는 iOS에서 앱을 죽였다(`os-settings-port.ts`·`battery-exception-port.ts`와 같은 꼴, `__tests__/onboarding/no-react-native-dynamic-import.test.ts`가 그 꼴을 막는다). `canOpenURL`은 안드로이드 11+에서 `<queries>` 선언이 없으면 거짓을 줄 수 있다 — 매니페스트를 건드리지 않으려 `openURL`의 거부만 본다. RN 안드로이드는 처리할 액티비티가 없으면 `openURL`을 거부한다([문서] React Native Linking).
- **Alternatives**: `expo-web-browser`(앱 안 브라우저 — 새 네이티브 의존성, 매니페스트·Pod 변경).

## R6. 실패 줄의 수명 — 설정 겹의 지역 상태

- **Decision**: 실패한 행(`"privacy" | "support" | null`)은 `App.tsx`의 설정 조립부(`SettingsSection`)가 지역 state로 든다. 성공하면 비우고, 설정 겹이 닫히면 언마운트로 사라진다(055 — 설정 겹은 닫히면 언마운트).
- **Rationale**: FR-014 「다시 눌러 성공하거나 설정을 다시 열면 지운다」를 저장 없이 만족한다.

## R7. 문구 — 카탈로그 새 영역 `policyLinks`

- **Decision**: `catalogs/ko/policy-links.ts`의 새 영역 `policyLinks`(`privacy`·`support`·`openFailed(url)`)에 두고 `src/ui/settings-text.ts`의 `POLICY_LINKS_TEXT`로 읽는다. 062 골든 `ADDED_AFTER_GOLDEN`에 고정 문구를 올린다.
- **Rationale**: 처음에는 `settings` 영역에 더하려 했으나 구현에서 062 골든 G2가 `SETTINGS_TEXT`를 `JSON.stringify`로 키 짝까지 잠그는 것을 확인했다(AGENTS 062 「카탈로그 영역은 옛 상수와 같은 키만 갖는다」). 083 `fontLicense`와 같은 방식으로 새 영역을 둔다.

## R8. iOS 위치 문구

- **Decision**: `app.json` `expo-location.locationWhenInUsePermission`을 「사진에 담긴 장소를 사람이 읽을 수 있는 이름으로 바꾸는 데 위치를 씁니다. 이때 사진의 좌표를 Apple 지도 서비스에 보냅니다.」로 바꾸고 `__tests__/config/ios-permissions.test.ts`에 문구 단언을 더한다.
- **Rationale**: [문서] CLGeocoder "network-based service". iOS 전용 문구라 Apple로 단정할 수 있다.
- **Note**: `app.json`은 072의 네이티브 입력이라 PR에서 CI 네이티브 빌드가 돈다(필수 체크 아님). iOS 반영은 다음 빌드부터.
