# Research: 두 플랫폼 모두 Pretendard로

사전 조사의 실측·소스 읽기는 설계문서(`docs/superpowers/specs/2026-10-14-pretendard-font-design.md` 「사전 조사」)에 있다. 여기에는 계획을 정하는 결정만 둔다.

## R1. 서체를 넣는 방식 — config plugin (앱에 포함)

- **Decision**: `app.json` plugins에 `expo-font`를 두어 빌드에 서체를 넣는다. android는 `fonts: [{ fontFamily: "Pretendard", fontDefinitions: [{ path, weight }×5] }]`, ios는 `fonts: [path×5]`.
- **Rationale**: 첫 렌더부터 서체가 있다(깜빡임 없음 — spec FR-003). Expo 문서의 권장 방식. 설치본 플러그인(`node_modules/expo-font/plugin/build/withFontsAndroid.js`)을 읽었다 — 안드로이드는 파일을 `res/font/`에 **`copyFile`로 그대로** 복사하고(바이트 불변 — FR-004) `res/font/xml_pretendard.xml`(굵기별 `<font app:fontWeight>`)과 `MainApplication.onCreate`의 `ReactFontManager.getInstance().addCustomFont(this, "Pretendard", R.font.xml_pretendard)`를 만든다. iOS는 `UIAppFonts`에 등록하고 이름은 파일 안의 family(`Pretendard` — 다섯 모두 같음, fc-scan으로 확인)다.
- **Alternatives considered**: 런타임 `Font.loadAsync`/`useFonts` — 스파이크(2026-10-14, iOS 시뮬레이터 dev)에서 등록한 이름·별칭 어느 것도 적용되지 않았다(시스템 서체와 픽셀 동일). 원인은 캐지 않았다. 적용되더라도 적재 전 첫 렌더가 시스템 서체라 깜빡인다.

## R2. 파일과 출처 기록

- **Decision**: v1.3.9 릴리스 `Pretendard-1.3.9.zip`의 `public/static/Pretendard-{Regular,Medium,SemiBold,Bold,ExtraBold}.otf`와 `LICENSE.txt`를 바이트 그대로 `assets/fonts/pretendard/`에 커밋한다. 출처는 `assets/fonts/pretendard/source.json` 하나에 기계가 읽는 모양으로 둔다(data-model 「출처 기록」).
- **Rationale**: 계약 테스트(F4)가 sha256을 계산해 출처 기록과 대조하려면 JSON이 맞다. 빌드 때 내려받지 않으므로 CI(075·076)와 오프라인 빌드가 그대로다.
- **해시(2026-10-14 실측, `shasum -a 256`)**:
  - zip `04be351a74d6bf7d60c480a3087e51d185485d35a52023142af1df19eb8c428a`
  - Regular `3ffbacde6ab8411f1d2db54bb9b1f0b3ee2a738932033722cf0388c06aed1c93`
  - Medium `d39e50e4bb52b4993b6a4eeb821a171254745bd824446af01e1f616b89fface0`
  - SemiBold `c89bc43027dc7cde5726e96223376f8eec09302b2fc1f8147fd5b57cfc376118`
  - Bold `2e91915fab54df71cc9598ebf608b2bdb54c6fe3c066ac61dff0bc44fca71cc7`
  - ExtraBold `c35fe941b7568d52a96010561540e47f9d3948dfde66ba25bc1908233e0a40cd`
  - `LICENSE.txt` `b04538c9abec39a3db75108cf0af0fd9c77032fe8aa2cf38345b4d250e98e38e`(v1.3.9 태그의 저장소 `LICENSE`와는 끝 줄바꿈 하나만 다르다 — 릴리스 파일이 원본이다).
- **Alternatives considered**: 가변 TTF(6.7MB) — iOS는 되지만 안드로이드는 `wght` 축 값이 API 26+에서만 듣는다(minSdk 24). 소유자가 정적을 골랐다. 빌드 때 내려받기 — CI에 외부 의존이 생긴다.

## R3. `expo-font`를 직접 의존성으로 올리는가

- **Decision**: 올리지 않는다. `app.json` plugins의 `"expo-font"`는 설치된 `node_modules/expo-font/app.plugin.js`로 풀린다(`expo`의 의존성, 57.0.1).
- **Rationale**: 버전을 Expo가 정한다 — 직접 올리면 `expo install --check`가 관리해야 할 줄이 하나 는다. 055의 `expo-application`은 코드에서 import해서 올렸다(여기는 import하지 않는다).
- **확인할 것**: `npx expo prebuild --clean`이 플러그인을 찾는다(구현 중). 못 찾으면 `npx expo install expo-font`로 올리고 이 결정을 고친다.

## R4. 서체를 정하는 한 곳과 굵기

- **Decision**: `tokens.ts`에 `FONT = { family: "Pretendard", weights: ["400","500","600","700","800"] }`와 `TEXT_FONT = { fontFamily: FONT.family }`(+ R6 결정)를 둔다. RN `Text`·`TextInput`을 import하는 세 파일이 스타일 배열 맨 앞에 `TEXT_FONT`를 둔다(호출부 `style`이 뒤에서 덮을 수 있는 것은 `fontWeight`·크기 등이고 `fontFamily`는 F1이 다른 곳에 못 쓰게 한다).
- **Rationale**: `tokens.ts`는 `tailwind.config.js`가 `require`하므로 RN import 없이 순수 값만 둔다. 굵기는 화면 값 그대로(FR-006) — 안드로이드는 XML 묶음에서 `fontWeight`로, iOS는 family 안 가까운 굵기로 고른다(`RCTFontUtils.mm`).
- **소스 세기(2026-10-14)**: `fontWeight` 리터럴 `"400"`·`"500"`·`"600"`·`"700"`·`"800"` + RNR 버튼 `font-semibold`(600). TYPE 토큰은 400·600. 그 밖의 굵기 0.
- **Alternatives considered**: NativeWind `fontFamily` 테마로 className에 싣기 — 화면 대부분이 인라인 style을 쓰고 `AppText`가 이미 style로 크기를 넣으므로(032) style 한 곳이 더 확실하다. RN 전역 기본값 덮기(`Text.defaultProps`) — 새 아키텍처에서 지원이 불안정하고 「어디서 정하는가」가 소스에 드러나지 않는다.

## R5. 서체 라이선스 화면

- **Decision**: 설정 「정보」 묶음의 「버전」 다음(「개발자」 앞)에 「서체 라이선스」 행(`settings-font-license`, ›)을 둔다. 누르면 `App.tsx`의 설정 겹 안에 이름 바꾸기와 같은 방식으로 `StackLayer`(`fontLicenseOpen`)가 쌓이고, 그 안에 `SettingsFrame`(뒤로 「설정」) + `FontLicenseScreen`. 전문은 `src/ui/pretendard-license.ts`의 문자열 상수이고 F5가 `assets/fonts/pretendard/LICENSE.txt`와 바이트 대조한다.
- **Rationale**: 055·059의 겹 구조를 그대로 쓴다 — 뒤로 가기는 겹이 받고, 겹이 열린 동안 설정 겹은 `active={false}`로 뒤로 가기를 등록하지 않는다(055 「등록 순서에 기대지 않는다」). 「개발자」 행은 켜졌을 때만 있으므로 그 앞에 두면 서체 라이선스 행의 자리가 개발자 메뉴 켜짐과 무관하다. 전문은 라틴 문자뿐이라 062 B1(카탈로그 밖 한글) 검사에 걸리지 않는다. Metro는 `.txt`를 문자열로 import하지 못한다(변환기를 더하지 않는다).
- **Alternatives considered**: 전문을 카탈로그에 — 언어가 늘면 번역 대상처럼 보이지만 OFL은 원문이어야 한다. 런타임에 `LICENSE.txt`를 자산으로 읽기 — 파일 읽기 통로·실패 갈래가 생긴다. 개발자 화면에 두기 — 사용자가 볼 수 없다.

## R6. 안드로이드 `includeFontPadding`

- **Decision**: 두 벌을 잰다 — (1) `TEXT_FONT`에 `fontFamily`만, (2) `includeFontPadding: false`를 더함. 기준 행 세 곳(쓴 날 홈 큰 날짜 숫자 · 설정 「이름」 행 라벨 · 하단 바 「다시 쓰기」)에서 글자 잉크와 행(바) 테두리 사이 위·아래 여백(dp)을 재어 iOS(pt)와의 차이 절댓값 합이 작은 쪽을 남기고 소유자가 합본을 보고 확정한다(spec FR-010, clarify).
- **Rationale**: 같은 서체로도 안드로이드만 글자 상자에 서체의 위아래 여유가 더해진다(RN 기본 `true`). 둘을 한 번에 바꾸면 어긋남의 원인을 가를 수 없다.
- **재는 법**: 캡처(1080px = 360dp, 1206px = 402pt → 둘 다 3px = 1단위)에서 그 행의 테두리(구분선·바 경계)와 글자 잉크 상자를 픽셀로 찾는다(`captures/tools/`의 스크립트, 제품 밖).

## R7. 고정폭 6곳

- **Decision**: `Platform.select({ ios: "Menlo", default: "monospace" })`를 지우고 공통 스타일(Pretendard)에 맡긴다. 숫자 값 자리에는 `fontVariant: ["tabular-nums"]`(이미 있는 곳은 둔다). `Platform` import가 그 밖에 쓰이지 않으면 지운다.
- **Rationale**: 소유자 결정(서체 하나). Pretendard는 Inter 기반이라 `tnum`(고정폭 숫자)을 가진다 — 화면에서 숫자 폭이 일정한지 구현 뒤 본다.

## R8. 안드로이드 실기기 재설치

- **Decision**: 맥에서 debug APK를 빌드(`cd android && ./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a`)하고, 기기의 `files/` 전체를 `run-as tar`로 맥에 백업 → `adb uninstall` → 새 APK 설치 → 백업 되돌리기 → OS 권한 다시 부여(`pm grant` — 사진·위치·알림; 지우면 권한도 사라진다) → 모델 크기·홈으로 확인. 되돌림을 확인하기 전에는 백업을 지우지 않는다.
- **Rationale**: 기기의 debug APK는 다른 기계(Windows)에서 서명돼 덮어 설치가 거부된다(078). 서체는 네이티브 리소스라 Metro로 올릴 수 없다.
- **Alternatives considered**: 옛 서명 키 찾기 — 그 기계가 없다. 모델 다시 받기(2GB) — 백업이 더 빠르고 일기도 지킨다.

## R9. 깨질 수 있는 기존 계약·흐름

- **Decision**: 구현 전에 서체·고정폭·설정 행을 단언하는 기존 테스트를 찾아 읽는다 — `settings-screen.test.tsx`(행 순서·문구 글자 단위), `developer-screen.test.tsx`, `diagnostics-screen.test.tsx`, `theme-tokens.test.ts`(토큰 모양), `ko-golden.test.ts`(카탈로그 문구 집합), `boundaries.test.ts`, 062 `catalog-types`. 고정폭을 단언하는 테스트가 있으면 그 단언을 이 기능의 결정으로 바꾼다.
- **Rationale**: AGENTS 「설계를 구현에서 뒤집을 때는 그 설계가 기대던 기존 계약 테스트를 먼저 읽는다」(054).
- **찾은 것(2026-10-14 grep)** — 이 기능의 결정과 반대를 잠그는 단언 다섯. 같은 테스트 안에서 결정으로 바꾼다(지우지 않고 뒤집는다):
  - `__tests__/theme-tokens.test.ts:96` — 「tokens에 커스텀 `fontFamily`가 없다」(032 FR-019a) → 「`FONT.family`가 `Pretendard`이고 `TEXT_FONT`가 그것을 쓴다」.
  - `__tests__/ui/developer-screen.test.tsx:131` — 값 글자가 monospace → Pretendard(공통 스타일) + `tabular-nums`.
  - `__tests__/ui/settings-frame.test.tsx:109` — 제목 옆 글자가 monospace → 같은 뒤집기.
  - `__tests__/ui/diagnostics-screen.test.tsx:216` — 진단 값이 monospace → 같은 뒤집기.
  - `__tests__/ui/settings-battery-row.test.tsx:63` — 「SettingsScreen의 `Platform` 사용은 글꼴 선택(Menlo)뿐」 → 고정폭 선택이 사라지므로 「SettingsScreen이 `Platform`을 쓰지 않는다」(Platform.OS를 읽지 않는다는 원래 뜻은 더 강하게 남는다).
