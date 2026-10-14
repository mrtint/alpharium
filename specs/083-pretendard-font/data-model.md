# Data Model: 두 플랫폼 모두 Pretendard로

앱 데이터(일기·설정 파일)는 바뀌지 않는다. 이 기능의 「데이터」는 저장소에 들어가는 서체 파일 묶음과 그 출처 기록, 그리고 소스의 토큰 값이다.

## 1. 서체 파일 묶음 — `assets/fonts/pretendard/`

| 파일 | 굵기 | 출처(zip 안 경로) |
| --- | --- | --- |
| `Pretendard-Regular.otf` | 400 | `public/static/Pretendard-Regular.otf` |
| `Pretendard-Medium.otf` | 500 | `public/static/Pretendard-Medium.otf` |
| `Pretendard-SemiBold.otf` | 600 | `public/static/Pretendard-SemiBold.otf` |
| `Pretendard-Bold.otf` | 700 | `public/static/Pretendard-Bold.otf` |
| `Pretendard-ExtraBold.otf` | 800 | `public/static/Pretendard-ExtraBold.otf` |
| `LICENSE.txt` | — | `LICENSE.txt` |

규칙: 바이트 그대로(해시가 출처 기록과 같다 — F4). 이름을 바꾸지 않는다.

## 2. 출처 기록 — `assets/fonts/pretendard/source.json`

```json
{
  "name": "Pretendard",
  "version": "1.3.9",
  "release": "https://github.com/orioncactus/pretendard/releases/tag/v1.3.9",
  "archive": {
    "url": "https://github.com/orioncactus/pretendard/releases/download/v1.3.9/Pretendard-1.3.9.zip",
    "sha256": "04be351a74d6bf7d60c480a3087e51d185485d35a52023142af1df19eb8c428a"
  },
  "license": { "name": "SIL Open Font License 1.1", "file": "LICENSE.txt", "archivePath": "LICENSE.txt", "sha256": "b04538c9abec39a3db75108cf0af0fd9c77032fe8aa2cf38345b4d250e98e38e" },
  "fonts": [
    { "file": "Pretendard-Regular.otf", "weight": 400, "archivePath": "public/static/Pretendard-Regular.otf", "sha256": "3ffbacde…" }
  ]
}
```

- `fonts`는 굵기 다섯 모두(research R2의 해시).
- `version`·`license.name`은 라이선스 화면이 읽지 않는다 — 화면은 `FONT.family`와 카탈로그·전문 상수를 쓴다. 이 파일은 저장소 기록이고 계약 테스트만 읽는다.

## 3. 빌드 설정 — `app.json` plugins

```json
["expo-font", {
  "android": { "fonts": [{ "fontFamily": "Pretendard", "fontDefinitions": [
    { "path": "./assets/fonts/pretendard/Pretendard-Regular.otf", "weight": 400 }
  ] }] },
  "ios": { "fonts": ["./assets/fonts/pretendard/Pretendard-Regular.otf"] }
}]
```

- android `fontFamily`는 `FONT.family`와 같다(F4). `fontDefinitions`의 굵기 집합 = `FONT.weights` = `source.json`의 굵기 집합.
- ios `fonts`의 파일 집합 = android `fontDefinitions`의 파일 집합 = `source.json`의 `fonts[].file`.
- 플러그인 위치: 기존 plugins 배열 안. `with-no-push-entitlement`은 맨 마지막을 지킨다(066).

## 4. 토큰 — `src/ui/theme/tokens.ts`

| 이름 | 값 | 쓰는 곳 |
| --- | --- | --- |
| `FONT.family` | `"Pretendard"` | `TEXT_FONT`, F4 대조, 라이선스 화면의 서체 이름 |
| `FONT.weights` | `["400","500","600","700","800"]` | F3·F4 대조 |
| `TEXT_FONT` | `{ fontFamily: FONT.family }` (+ R6 결과로 `includeFontPadding: false`일 수 있음) | `AppText`·`rnr/text.tsx`·`NameField` |

## 5. 화면 문구 — 카탈로그 영역 `fontLicense`(새)

| 키 | 값 | 자리 |
| --- | --- | --- |
| `row` | 서체 라이선스 | 설정 「정보」 행 |
| `title` | 서체 라이선스 | 겹 화면 제목 |
| `intro` | 이 앱의 글자는 Pretendard 서체로 그려요. 아래는 그 서체를 쓰도록 허락하는 라이선스 전문이에요. | 화면 첫 문단 |

- 뒤로 버튼 글자는 기존 `SETTINGS_TEXT.backToSettings`(「설정」)를 쓴다.
- 라틴 문자열 「Pretendard」·「SIL Open Font License 1.1」은 카탈로그 밖(`FONT.family`·전문 모듈)이다 — 062 B1은 한글만 본다.
- 새 한국어 문구는 062 골든의 `ADDED_AFTER_GOLDEN`에 올린다.

## 6. 라이선스 전문 — `src/ui/pretendard-license.ts`

- `PRETENDARD_LICENSE_NAME = "SIL Open Font License 1.1"`, `PRETENDARD_LICENSE_TEXT` = `LICENSE.txt` 전체(끝 줄바꿈 포함 바이트 동일 — F5).
- 템플릿 리터럴 안에 `` ` ``·`${`가 없어야 한다(전문에 없다 — 구현 때 확인).
