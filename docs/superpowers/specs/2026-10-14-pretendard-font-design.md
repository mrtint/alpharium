# 두 플랫폼 모두 Pretendard로 — 설계

- 날짜: 2026-10-14
- 로드맵: 「두 플랫폼 모두 Pretendard로 — 안드로이드·iOS의 화면이 다르게 보인다」
- 상태: 소유자 승인(brainstorming)

## 목표

안드로이드와 iOS가 같은 서체(Pretendard)로 같은 모양으로 그려진다. 지금은 서체를 정하지 않아(032 FR-019a — 시스템 기본) 안드로이드는 기기 서체, iOS는 iOS 시스템 서체로 그려진다.

**완료 조건**: 두 플랫폼(안드로이드 dev 실기기·iOS 시뮬레이터)에서 Pretendard로 그려지는 것을 눈과 글자 폭 측정으로 확인하고, 소유자가 나란히 본 화면이 같다고 본다. 「서체는 한 곳에서만 정한다」·「OFL 고지가 앱에 있다」·「배포처 파일 그대로」를 소스·파일 계약 테스트로 잠근다. 층 1이 통과한다.

## 사전 조사 (2026-10-14, 실측과 소스 읽기)

### 고치기 전 캡처

- 같은 상태: 층 1 기준 설정(`scripts/layer1/baseline.ts`) + 픽스처 일기 사흘(`scripts/layer1/fixtures.ts`, 10-12~10-14). 표본 사진(070)은 심지 않았다 — 안 쓴 날(10-11)은 두 플랫폼 모두 사진 0장.
- 기기: 안드로이드 SM-S901N(dev, 1080px = 360dp), iOS iPhone 17 시뮬레이터(iOS 26.5, 1206px = 402pt). 화면 7개 — 쓴 날 홈·달력 대화상자·안 쓴 날 홈·설정 위·설정 아래·개발자·이름 바꾸기(TextInput).
- 원본·나란히 놓은 합본은 스펙 디렉터리의 `captures/before/`로 옮긴다. 두 기기의 원래 데이터는 백업에서 되돌렸다.
- 육안 차이는 숫자·라틴 글자(큰 날짜 「14」, 「2.0GB」)의 모양·자폭이 가장 크다. 한글은 비슷하다.
- 캡처 절차(같은 상태를 두 플랫폼에 깔기·Maestro로 찍기)는 고친 뒤에 그대로 다시 쓴다 — iOS는 XCUITest가 홈 헤더 안의 `testID`를 못 찾아 좌표·글자로 짚었다(068과 같은 한계).

### 서체를 거치는 자리 (소스 세기)

- RN `Text`·`TextInput`을 직접 import하는 파일은 셋뿐이다: `src/ui/components/Text.tsx`(`AppText`, 31개 파일·125곳이 쓴다), `src/ui/rnr/text.tsx`(대화상자), `src/ui/components/NameField.tsx`(TextInput). 달력의 날짜·요일 칸도 `components={{ Day, Weekday }}`로 `AppText`를 그린다.
- **쓰는 굵기는 다섯이다**: `"400"`·`"500"`(1곳)·`"600"`(22)·`"700"`(21)·`"800"`(6) + RNR 버튼의 `font-semibold`. 로드맵의 「400·600」은 틀렸다.
- 고정폭 `Platform.select({ ios: "Menlo", default: "monospace" })`: 4개 파일 6곳(개발자·진단 값, 설정 틀의 제목 옆 글자, DEV 꼬리표).

### 배포처

- 최신 릴리스 v1.3.9(2023-11-05). `Pretendard-1.3.9.zip` sha256 `04be351a74d6bf7d60c480a3087e51d185485d35a52023142af1df19eb8c428a`.
- 정적 OTF(`public/static/`) 한 굵기 약 1.57MB, 한글 11,172자. 다섯 굵기 합 약 7.9MB. 가변 TTF 6.7MB.
- 앱에 쓸 수 있는 한글 서브셋판은 없다(「Std」는 라틴용, 다이나믹 서브셋은 웹용).
- 파일의 family 이름은 다섯 모두 `Pretendard`(typographic family). PostScript 이름 `Pretendard-Regular` 등.
- **v1.3.9의 `LICENSE`(릴리스 `LICENSE.txt`와 같다)는 저작권 줄이 하나다**(Kil Hyung-jin, Reserved Font Name Pretendard). 로드맵이 적은 넷(Adobe·Inter·M+)은 그 뒤 `main`의 `LICENSE`다. 우리가 넣는 파일과 짝인 v1.3.9 것을 쓴다.

### expo-font (SDK 57, 설치본 57.0.1 — `expo`가 이미 의존)

- 공식 권장은 config plugin으로 앱에 넣는 방식이다. 안드로이드는 `fontFamily` + `fontDefinitions`(굵기·스타일)로 `res/font` XML 서체 묶음이 되고, iOS는 `UIAppFonts`에 등록되며 이름은 파일 안의 family다.
- RN(Fabric) iOS는 `fontNamesForFamilyName:`의 글꼴 중 가장 가까운 굵기를 고른다(`RCTFontUtils.mm`).

### iOS 가변 서체 스파이크 (버린 코드, 저장소 변경 없음)

- config plugin으로 가변 TTF와 정적 OTF 5개를 함께 넣은 시뮬레이터 빌드에서 `fontFamily: "Pretendard Variable"`과 `"Pretendard"`를 `fontWeight` 400~800으로 그렸다.
- 가변·정적의 같은 굵기 글자 폭: 693/693, 696/696, 703/702, 704/704, 713/713px(400 픽셀 차 7개). 시스템 서체는 695·699·706 — Pretendard가 실제로 쓰였다.
- **런타임 `Font.loadAsync`는 이 dev 빌드에서 아무것도 적용되지 않았다**(별칭 이름·없는 이름까지 전부 시스템 서체와 픽셀 동일). 원인은 캐지 않았다 — 쓰지 않는다.
- 안드로이드는 재지 않았다.

## 결정 (소유자, 2026-10-14)

| 항목 | 결정 | 이유 |
| --- | --- | --- |
| 파일 | **정적 OTF 다섯**(Regular·Medium·SemiBold·Bold·ExtraBold) | 가변은 안드로이드에서 `wght` 축 값이 API 26+에서만 듣는다(minSdk 24). 차이 1.2MB |
| 넣는 방식 | expo-font config plugin(빌드에 포함) | 첫 렌더부터 서체가 있다(깜빡임 없음). 런타임 적재는 스파이크에서 적용 안 됨 |
| 고정폭 6곳 | **Pretendard + `tabular-nums`로 바꾼다** | 서체가 앱 전체에서 하나. 보드 `6e`·`6h`·`6i`의 「고정폭」은 따르지 않는다 |
| OFL 고지 자리 | 설정 「정보」 → **「서체 라이선스」** 행 → 겹 화면 | 사용자가 볼 수 있는 자리. 이름이 담는 범위가 지금 있는 것과 같다(원칙 V) |
| 안드로이드 `includeFontPadding` | **두 단계로 재고 iOS에 더 가까운 쪽** | 서체만 바꾼 캡처 → 끈 캡처를 비교. 원인을 가를 수 있다 |

## 설계

### 1. 서체 파일과 출처

- `assets/fonts/pretendard/`: OTF 다섯 + 릴리스 `LICENSE.txt` + 출처 기록(릴리스 버전·URL·zip sha256·파일별 sha256·zip 안 경로). git에 커밋한다(약 7.9MB) — 빌드 때 내려받지 않으므로 CI(075·076)는 바뀌지 않는다.
- 파일은 바이트 그대로다(OFL — 서브셋·변환은 수정이고 예약 서체명을 못 쓴다).

### 2. 빌드

- `app.json` plugins에 `expo-font`:
  - android: `fontFamily: "Pretendard"`, `fontDefinitions` 400·500·600·700·800 → 각 파일.
  - ios: 파일 다섯.
- 네이티브 설정이 바뀌므로 `npx expo prebuild --clean`. 생성된 `res/font/`·`Info.plist`의 `UIAppFonts`로 확인한다(빌드 성공이 설정이 맞다는 뜻이 아니다).
- **안드로이드 실기기 재설치**: 기기의 debug APK는 다른 기계에서 서명돼 덮어 설치가 안 된다. `files/` 전체(모델 ~2GB 포함)를 `run-as tar`로 맥에 백업 → 지우기 → 맥에서 빌드한 debug APK 설치 → 되돌리기. 되돌린 뒤 모델 파일 크기·홈 표시로 확인한다.
- iOS 시뮬레이터는 같은 맥에서 빌드하므로 덮어 설치로 데이터가 남는다(스파이크에서 확인 — 컨테이너 UUID는 바뀐다, 066 `rehomeResizedPath`).

### 3. 서체를 정하는 곳은 한 곳

- `src/ui/theme/tokens.ts`에 서체 이름과 공통 글자 스타일(`fontFamily`, 안드로이드 여백 결정이 나면 그 값)을 둔다. 032 FR-019a(「시스템 기본」)를 뒤집는다는 사실을 거기 주석으로 남긴다. `tailwind.config.js`는 크기·굵기만 옮기므로 바꾸지 않는다.
- 공통 스타일을 쓰는 곳은 RN 글자 부품을 직접 쓰는 세 자리(`AppText`·`rnr/text.tsx`·`NameField`)뿐이다. 화면은 이 부품들을 거친다.
- 고정폭 6곳: `fontFamily`·`Platform.select`를 지우고(공통 스타일이 덮는다) 숫자 값에는 `fontVariant: ["tabular-nums"]`.
- 굵기는 지금 쓰는 다섯 그대로 — 화면의 굵기 값을 바꾸지 않는다.

### 4. 서체 라이선스 화면

- 설정 「정보」의 「버전」 아래에 「서체 라이선스」 행. 누르면 설정 위에 한 겹(055 `StackLayer`, 이름 바꾸기와 같은 방식). 개발·배포 환경 모두.
- 화면: 설정 틀(`SettingsFrame`) + 서체 이름 「Pretendard」, 「SIL Open Font License 1.1」, `LICENSE.txt` 전문(영어 원문 그대로 — 저작권 줄 포함).
- 한국어 문구(행·제목·안내)는 카탈로그(062 — 새 영역). 전문은 화면 문구가 아니라 바꿀 수 없는 문서이므로 카탈로그 밖의 모듈 하나에 두고, 테스트가 `LICENSE.txt`와 바이트 대조한다. 전문은 라틴 문자뿐이라 062 B1(카탈로그 밖 한글)에 걸리지 않는다.
- 긴 본문은 지면 안 작은 스크롤 상자를 두지 않는다(060 — 안드로이드 중첩 스크롤). 겹의 스크롤 하나에 다 펼친다.

### 5. 계약 테스트 (소스·파일을 읽는다)

1. `fontFamily`는 `tokens.ts`에만 나온다(주석 제거 후).
2. RN `Text`·`TextInput`을 import하는 파일은 세 자리뿐이고, 셋 모두 공통 글자 스타일을 쓴다.
3. 소스의 `fontWeight` 값(리터럴·`font-*` 클래스)은 서체 설정의 굵기 다섯에 모두 들어 있다 — 설정에 없는 굵기를 쓰면 실패한다.
4. 서체 설정(`app.json`)이 가리키는 파일 다섯이 있고, sha256이 출처 기록과 같다. 출처 기록의 버전과 `LICENSE.txt`가 짝이다.
5. 설정 조립에 「서체 라이선스」 행이 있고, 라이선스 화면이 그리는 전문이 `LICENSE.txt`와 같다.

각 계약은 위반 주입으로 실패를 확인한다(치환이 실제로 적용됐는지 먼저 단언).

### 6. 확인 (원칙 V)

- 고치기 전과 같은 상태·같은 7화면 + 라이선스 화면 + 글꼴 2.0배를 두 플랫폼에서 다시 찍어 `captures/after/`에 나란히 둔다. 안드로이드 여백은 「서체만」과 「여백 끔」 두 벌.
- **서체가 바뀌었는지는 글자 폭으로 잰다** — 스파이크처럼 같은 문자열의 잉크 폭이 시스템 서체와 다르고 두 플랫폼이 같은 비율인지(dp/pt 환산).
- 로고 화면에서 깜빡임 없음(첫 렌더부터 Pretendard).
- 안드로이드 굵기 다섯이 각각 다른 굵기로 나오는지(XML 서체 묶음 + `fontWeight` — 이 기기에서 처음 재는 경로).
- 앱 용량 증가(debug APK 전후, 가능하면 AAB 전후).
- 층 1 전체(`npm run test:layer1`). 행 높이가 바뀌어 `scrollUntilVisible`·좌표가 깨지는 흐름은 고친다.
- 흔들릴 수 있는 자리를 눈으로 본다: 052 접힘 문턱, 055 `alignContent` 행, 056 대화상자 행간, 055 큰 제목 윗부분(iOS), 060 큰 숫자, 064 개발자 화면.
- 소유자가 나란히 본 결과로 완료를 판정한다.

## 범위 밖

- 다른 라이브러리(RN·Expo 등)의 오픈소스 고지 — 이 과제는 서체 고지만 둔다.
- iOS 실기기·release 빌드 확인(AGENTS 「테스트」 — dev로만, 잔여로 기록).
- 가변 서체, 런타임 `loadAsync`가 안 된 원인.
- 사용자가 기기에서 고른 서체 설정은 더 이상 따르지 않는다(받아들인 대가, 로드맵).

## 위험

- 행 높이·줄 바꿈이 모두 다시 흔들린다(위 6의 목록). Maestro 흐름이 행 높이에 기대는 자리가 깨질 수 있다.
- 안드로이드 재설치에서 백업·복원이 실패하면 기기의 모델 2GB와 일기가 사라진다 — 복원 확인 전에 백업을 지우지 않는다.
- 고지를 빠뜨리면 OFL 조건 위반 — 계약 테스트 5가 막는다.
- 안드로이드 XML 서체 묶음에서 `fontWeight`가 기대대로 고르는지는 재 보지 않았다(구현 중 첫 확인).
