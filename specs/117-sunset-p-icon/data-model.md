# Data Model: 노을 「P.」 아이콘

앱 데이터·저장소는 바뀌지 않는다. 정본 파일 둘의 모양만 정한다.

## 그림 정본 — `design/icon-art.svg`
- 좌표계 1024×1024, 노을 풍경을 품은 P와 마침표.
- 이름 붙은 요소: `bg`(배경 그라데이션 정의)·`bg-layer`(배경 사각형 그룹)·`art`(그림 그룹)·`p-shape`(P 윤곽 경로)·`dot-shape`(마침표 원 `(508, 875)` r=46).
- 16진수 색은 이 파일에만 있다(계약 C3).

## 배치 값 — `design/icon.json` (version 2)
| 필드 | 뜻 |
|---|---|
| `art.file` | 그림 파일 경로(`design/icon-art.svg`) |
| `art.center` | 그림을 가운데에 놓는 기준점 `{x: 473.1, y: 561.5}` — P를 감싸는 가장 작은 원의 중심 |
| `scale.ios` | 1.0 — iOS·favicon·스토어 아이콘 배율 |
| `scale.androidForeground` | 0.784 — 안드로이드 foreground·monochrome 배율 |
| `scale.featureGraphic` | 0.5 — 기능 그래픽 배율 |
| `safeZone` | 66/108 — 안드로이드 안전 영역 |

모든 배율·중심은 사람이 정한 값이다(런처 확인 뒤 확정). 색·도형은 적지 않는다.

## 생성물
`assets/icon.png`(1024² RGB), `assets/android-icon-foreground.png`(1024² RGBA), `assets/android-icon-background.png`(1024² RGB), `assets/android-icon-monochrome.png`(1024² RGBA), `assets/favicon.png`(48² RGB), `store/ko/store-icon-512.png`(512² RGBA), `store/ko/feature-graphic-1024x500.png`(1024×500 RGB), `design/icon.svg`(iOS 합성 미리보기).
