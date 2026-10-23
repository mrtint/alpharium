# Data Model: 앱 아이콘과 스토어 등록 에셋

앱 런타임 데이터는 없다. 파일 형식과 불변식만 적는다.

## IconSource (`design/icon.json`)

| 필드 | 뜻 | 규칙 |
| --- | --- | --- |
| `colors.background` | 면 색의 토큰 이름 | `design/tokens.json`의 `accent`를 가리킨다. 16진수를 직접 적지 않는다 |
| `colors.mark` | 마크 색의 토큰 이름 | `accentForeground` |
| `mark.box` | 마크를 그리는 460 좌표계의 크기와 중심 | 시안과 같다 |
| `mark.shapes` | 사각형·반원 목록(채움/구멍) | 좌표는 정수 |
| `scale.ios` | iOS 글리프 배율 | 2.3(임시 — iPhone 확인 뒤 확정) |
| `scale.androidForeground` | 안드로이드 foreground·monochrome 배율 | 1.6 |
| `scale.featureGraphic` | 기능 그래픽 배율 | 마크 높이가 캔버스 높이(500)의 60%가 되도록 3.0 근처에서 정한다(T015에서 확정, 원본 460 좌표 글리프 높이 250 기준) |
| `safeZone` | 안전 영역 비율 | 66/108 |

## IconOutputs (생성물)

| 파일 | 크기 | 규칙 |
| --- | --- | --- |
| `assets/icon.png` | 1024² | 알파 없음, 전면 빨강 |
| `assets/android-icon-foreground.png` | 1024² | 투명, 불투명 픽셀 bbox가 안전 영역 안 |
| `assets/android-icon-background.png` | 1024² | 단색 accent |
| `assets/android-icon-monochrome.png` | 1024² | 투명 바탕 검정 마크 |
| `assets/favicon.png` | 48² | 전면 빨강 + 마크 |
| `store/ko/store-icon-512.png` | 512² | iOS 아이콘과 같은 그림, 알파 없음 |
| `store/ko/feature-graphic-1024x500.png` | 1024×500 | 마크 하나, 글자 없음 |
| `design/icon.svg` | — | 미리보기(생성물) |

## Listing (`store/ko/*.txt`)

| 파일 | 한도(글자) | 쓰는 곳 |
| --- | --- | --- |
| `title.txt` | 30 | 두 스토어 이름 |
| `subtitle.txt` | 30 | App Store 부제 |
| `short.txt` | 80 | Play 짧은 설명 |
| `full.txt` | 4000 | 두 스토어 긴 설명 |
| `keywords.txt` | 100 | App Store 키워드(쉼표 구분) |

한 줄 파일은 끝 개행을 글자 수에서 뺀다. 모델 식별자 금지어 목록은 `__tests__/store/listing.test.ts` 안 상수다.

## Screenshots

- `store/ko/screenshots/ios-6.5/NN-<장면>.png` — 1284×2778, 5장(홈·쓰는 중·쓴 날·달력·설정 「이 휴대폰」)
- `store/ko/screenshots/play-phone/NN-<장면>.png` — 갤럭시 실기기 캡처 원본 크기, 4장 이상
- 촬영 전 확인 기록(`device-check.md`): 사진 목록, 장소 이름, 소유자 확인 일시.
