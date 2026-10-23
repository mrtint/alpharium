# 포켓로그 디자인 시스템 — 규칙 문서

화면·페이지·문서 등 **디자인 산출물을 만들기 전에 이 문서를 먼저 읽는다.** 앱(React Native)과 웹(`site/`)이 같은 토큰을 쓰고, 값의 정본은 `design/tokens.json` 하나다.
이 문서는 정본의 사본이 아니다 — 값은 정본·`site/assets/tokens.css`·`src/ui/theme/tokens.ts`에서 읽고, 여기서는 **뜻과 쓰는 법**만 적는다. 문서가 적은 이름이 실재하는지는 `__tests__/design/design-doc.test.ts`가 본다.

## 토큰과 역할 이름

값은 **사람이 정한 상수**다(헌법 원칙 V). 코드가 색을 계산하거나 파생하지 않는다 — `design/tokens.json`을 고치고 생성기가 옮긴다.

| 역할 | 뜻 | 쓰는 곳 |
| --- | --- | --- |
| `bg` | 화면 배경(오프화이트, 다크는 오프블랙) | 페이지·화면 바탕 |
| `surface` | 카드·행·요약 상자 면(옅은 회색) | 면으로 구분하는 덩어리 |
| `border` | 구분선·경계(장식 hairline) | 절 구분, 목록 구분선 |
| `text` | 본문 글자 | 본문 |
| `textMuted` | 보조·캡션 글자 | 보조 줄, 시행일 |
| `accent` | 단일 레드 — **면·표식**(버튼 면, 요약 상자의 세로 막대) | 글자에는 쓰지 않는다(아래 「색 사용 규칙」) |
| `accentForeground` | accent 면 위 글자(오프화이트) | accent 버튼 라벨 |
| `danger` | 진한 레드 — 삭제·되돌릴 수 없는 동작, 웹의 링크·강조 글자 | 링크, 위험 버튼 |
| `dangerForeground` | danger 면 위 글자 | danger 버튼 라벨 |

- 앱에서는 `COLORS.bg`처럼 `src/ui/theme/tokens.ts`에서 읽는다. 앱은 라이트만 쓴다(031).
- 웹에서는 `--color-bg`처럼 `site/assets/tokens.css`의 변수로 읽는다. 라이트가 기본이고 다크는 `prefers-color-scheme: dark`에서 같은 이름의 변수 값이 바뀐다. 변수 이름은 `--color-*`·`--radius-*`·`--font-sans`·`--text-*`·`--space-*` 다섯 꼴뿐이다.
- 반경은 `RADIUS.card`·`RADIUS.pill`(둘 다 0, 직선)과 `RADIUS.control`(버튼만 6)이다.
- 컴포넌트 전용 값(눌림, 쓰는 중, 토스트, 대화상자, 달력, 설정 행)은 정본이 아니라 `src/ui/theme/tokens.ts`의 생성 영역 밖에 있다.

## 타입 스케일

| 역할 | 크기/행간/굵기 | 쓰는 곳 |
| --- | --- | --- |
| `display` | 32/40/700 | 웹 전용 — 페이지 큰 제목(h1) |
| `title` | 20/28/600 | 화면 제목, 웹 절 제목(h2) |
| `sectionTitle` | 16/22/600 | 섹션 헤더, 웹 소절 제목(h3) |
| `reading` | 17/30/400 | 웹 전용 — 긴 글 본문 |
| `body` · `bodyStrong` | 15/22/400 · 600 | 앱 본문·행 라벨 |
| `caption` | 13/19/400 | 보조 설명(`textMuted`와 짝) |
| `button` | 15/20/600 | 버튼 라벨 |

앱은 `TYPE.title`처럼, 웹은 `--text-title-size`·`--text-title-weight`·`--text-title-line` 세 변수로 쓴다. 웹 전용 `display`·`reading` 값은 초안이며 캡처를 보고 소유자가 확정한다(089).

## 서체

- 서체는 **Pretendard 하나**다. 이름·굵기는 정본의 `font` 항목 한 곳에서 정한다. 앱은 굵기 다섯(400~800)을 `assets/fonts/pretendard/`의 OTF로 싣고(083), 웹은 그중 400·600·700만 `site/assets/fonts/`에서 **자체 호스팅**한다.
- 웹 서체 파일은 배포처(npm `pretendard@1.3.9`의 분할 배포본)의 것을 **바이트 그대로** 둔다 — 수정·서브셋 변환 금지(OFL, 수정판은 예약 서체명을 못 쓴다). 가져오는 길은 `scripts/design/import-pretendard-web.mts` 하나이고 무결성(sha512)이 다르면 아무것도 쓰지 않는다. 라이선스 전문은 `site/assets/fonts/LICENSE.txt`.
- **CDN으로 글꼴·스타일을 불러오지 않는다** — 방문자의 IP가 제3자로 가서 방침의 「휴대폰 밖으로 나가는 것」 서술과 모순된다. 페이지당 첫 로딩 글꼴 합계는 1,000,000바이트 이하여야 하고 테스트(`__tests__/design/fonts-budget.test.ts`)가 잠근다.
- 글꼴이 늦게 와도 글이 보이도록 `font-display: swap`과 대체 서체 목록(`--font-sans`)을 쓴다. 대체 목록은 일반 계열 `sans-serif`로 끝난다.
- 앱에서 RN 글자 부품을 직접 쓰는 자리는 세 곳뿐이고 `TEXT_FONT`를 앞에 둔다(083). 새 화면은 `src/ui/components/Text.tsx`의 `AppText`를 쓴다.

## 색 사용 규칙

- **accent는 면과 표식에만 쓴다.** 라이트 배경 위 글자로는 3.76:1이라 본문 기준 4.5:1에 못 미친다. 앱은 accent 면 위 오프화이트 글자(3.76:1, 큰 글자·UI 기준)만 소유자 결정(043)으로 허용한다.
- **글자 강조·링크는 `danger`다**(라이트 6.41:1, 다크 7.91:1). 웹의 링크는 `danger` 색에 밑줄이다.
- 글자/배경 조합은 정본의 대비 쌍 표(`contrast`)에 있는 것만 쓴다: `text`·`textMuted`·`danger` 글자는 `bg`·`surface` 위에서 4.5:1 이상, `dangerForeground`는 `danger` 위, `accentForeground`는 `accent` 위(라이트는 3:1). 새 조합이 필요하면 쌍을 정본에 먼저 적는다.
- `border`는 장식 구분선이라 대비 쌍 밖이다. 구분선에 정보를 싣지 않는다.
- 다크 값은 웹 전용이다. 앱에 다크 팔레트나 색 스킴 분기를 넣지 않는다(031, 기존 테스트가 막는다).

## 간격

간격 단계는 **앱 소스가 실제로 반복해 쓰는 값**(padding·margin·gap 정수 리터럴 중 9회 이상)에서 정했다: 4·8·10·12·16·20·24. 웹 변수는 `--space-4`·`--space-8`·`--space-10`·`--space-12`·`--space-16`·`--space-20`·`--space-24`다.

- 웹 `site/assets/site.css`의 여백·간격은 이 변수나 그 정수배·합(`calc(var(--space-24) * 2)`), `0`, `auto`만 쓴다. px 리터럴을 쓰지 않는다.
- 앱 코드는 이번 변경에서 이 단계로 바뀌지 않았다 — 기존 화면의 값은 그대로이고, 이탈 정리는 후속 과제다.

## 공용 부품

앱(`src/ui/components/`):

| 부품 | 쓰는 곳 |
| --- | --- |
| `src/ui/components/Button.tsx` | 버튼 — `primary`·`secondary`·`danger` 세 갈래, 눌림 반응 포함 |
| `src/ui/components/Card.tsx` | 면(`surface`) 위의 덩어리, `Section` |
| `src/ui/components/SectionHeader.tsx` | 섹션 머리 |
| `src/ui/components/Text.tsx` | 글자 — `AppText` 한 곳에서 서체·타입 스케일을 입는다 |
| `src/ui/components/Dialog.tsx` | 대화상자 — `ConfirmDialog`·`DismissibleDialog` |
| `src/ui/components/NameField.tsx` | 이름 입력줄 |
| `src/ui/components/Toggle.tsx` | 토글 |

웹(`site/assets/site.css`)의 공용 클래스는 여섯이다:

| 클래스 | 역할 |
| --- | --- |
| `.page` | 본문 컨테이너 — 읽기 폭(최대 42rem), 좌우 `--space-16` |
| `.doc` | 긴 글 타이포 — h1 `display`, h2 `title`, h3 `sectionTitle`, 본문 `reading` |
| `.meta` | 보조 줄(`textMuted`, `caption`) |
| `.summary` | 한 줄 요약 상자 — `surface` 면 + `accent` 세로 막대 |
| `.section` | 절 구분 — 위 구분선 + 간격 |
| `.links` | 링크 목록 — 한 줄에 하나, 구분선으로 나눔 |

새 요소를 더하지 않고 기존 요소에 `class`만 붙인다. 정의되지 않은 클래스를 쓰면 테스트(`__tests__/design/site-hardcode.test.ts`)가 실패한다.

## 화면 유형별 패턴

- **긴 글 문서 페이지(웹)**: `<main class="page doc">` 안에 h1(`display`) → `.meta` → 요약은 `<section class="summary">` → 나머지 절은 `<section class="section">`(h2 `title`, 안쪽 소절 h3). 링크는 `danger` 색 밑줄, 목록은 점 목록. 방침·지원·소개가 같은 틀이다(`site/privacy/index.html` 참고).
- **설정 행(앱)**: 행 높이·여백·꼬리표는 `src/ui/SettingsScreen.tsx`와 `SETTINGS`(`src/ui/theme/tokens.ts`)가 정본이다. 라벨은 `body`, 값·꼬리표는 `caption`+`textMuted`, 누를 수 있는 행은 `›`로 알린다. 새 행도 같은 묶음 구조를 따른다.
- **대화상자(앱)**: `src/ui/components/Dialog.tsx`의 `ConfirmDialog`·`DismissibleDialog`를 쓴다. 되돌릴 수 없는 동작의 버튼만 `danger`, 나머지는 accent다. 면은 직선, 버튼만 `RADIUS.control`.

## 아이콘

앱 아이콘은 **빨강 면(`accent`) 위 기하 「P」 마크(`accentForeground`) 하나**다(102). 모양과 플랫폼별 배율의 정본은 `design/icon.json`이고 PNG·스토어 에셋·SVG 미리보기는 `scripts/design/build-icons.mts`가 거기서 만든다(`npm run build:icons`, 끝에 `--check`를 주면 쓰지 않고 어긋남만 본다). **생성된 PNG를 손으로 고치지 않는다** — `__tests__/design/icons.test.ts`가 정본과 픽셀까지 대조한다. 색은 토큰 이름으로만 가리키며 16진수를 적지 않는다.

- iOS 아이콘은 알파 채널이 없다(PNG 색 유형 RGB). 안드로이드는 108dp 캔버스 중 가운데 72dp만 보이므로 foreground·monochrome 마크는 iOS보다 작게(배율 1.6) 잡는다 — 갤럭시 런처 실측(foreground만 봤다, monochrome 테마 아이콘과 iOS 런처는 못 봤다).
- 아이콘 PNG를 바꾸면 안드로이드·iOS `expo prebuild --clean`을 다시 돌려야 런처에 반영된다.

## 하지 않는 것

- 색 16진수·서체 이름·반경 숫자를 화면·페이지에 직접 쓰지 않는다(웹은 `<style>`·`style=`·`site.css` 안 리터럴을 테스트가 막고, 앱 서체는 083의 규칙 테스트가 막는다).
- 웹에서 `accent`를 글자·링크 색으로 쓰지 않는다.
- 앱에 다크 팔레트·색 스킴 분기를 넣지 않는다.
- 서체 파일을 변환·서브셋하지 않고, CDN·외부 주소 자원(글꼴·스타일·스크립트)을 쓰지 않는다.
- 컴포넌트 전용 값(눌림·쓰는 중·토스트 등)을 정본에 옮기지 않는다 — 앱 밖에서 쓰게 될 때 따로 정한다.
- 보드에 없는 장식(그림자·그라데이션·둥근 모서리)을 더하지 않는다. 디자인 리뷰 보드 원본은 저장소 밖에 있다.
- 값이 어긋난 곳을 손으로 고쳐 맞추지 않는다 — 정본을 고치고 생성기를 돌린다.

## 새 값을 더하는 절차

1. `design/tokens.json`에 값을 적는다(색은 라이트·다크 둘, `note`는 왜 이 값인지, 글자 조합이 새로 생기면 `contrast`에 쌍을 먼저 적는다).
2. 생성한다 — `src/ui/theme/tokens.ts`의 생성 영역과 `site/assets/tokens.css`가 다시 써진다. 끝에 `--check`를 주면 쓰지 않고 어긋남만 본다(종료 코드).

   ```
   node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/design/build-tokens.mts
   ```
3. `npm test`·`npm run lint`. 정본↔생성물 동기(`tokens-sync`), 앱 값 불변(`app-values`), 대비(`contrast`)가 지켜 준다.
4. 앱 값을 의도적으로 바꾸는 경우에만 `__tests__/design/fixtures/app-tokens-before.json`을 새 값으로 고치고, 이유를 스펙에 남긴다.

이 시스템이 아직 다루지 않는 것: 앱 화면이 토큰·공용 부품을 벗어난 곳의 점검과 정리(후속 과제), 소개 페이지의 랜딩화(후속 과제).
