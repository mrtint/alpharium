# Quickstart: 129 검증

## 자동

```bash
npx jest __tests__/signals __tests__/vision __tests__/config --selectProjects logic
npm test
npm run lint
```

## 실기기

### 안드로이드 (SM-S901N, 설치된 debug APK + Metro)

1. 오늘 날짜로 카메라 사진(`DCIM/Camera`), 스크린샷(`DCIM/Screenshots`), 다운로드(`Download/`), 퀵셰어(`Download/Quick Share/`)를 `adb push` + 미디어 스캔으로 준비한다(시딩 템플릿 EXIF 회전값 1).
2. 홈 오늘 재료의 「사진 N장」이 카메라 사진 수와 같은지 본다.
3. 쓰기 → 일기 묘사·캐러셀에 스크린샷·다운로드 사진이 없는지 본다.
4. `seed:day`(개발 환경)로 심은 `PocketlogSeed` 사진이 재료로 들어가는지 본다.

### iPhone 14 (개발 서명 Release)

1. 카메라 사진 + 스크린샷이 있는 날을 사람이 홈에서 연다 → 장수가 카메라 사진 수인지.
2. 쓰기 → 스크린샷이 일기에 없는지.
3. 한계: 사파리·메신저에서 저장한 사진은 남는다(research R2).

## 기록

### SM-S901N (dev 빌드 + Metro 번들, 2026-11-24)

2026-11-14에 사진 11장을 두었다(EXIF 촬영 시각을 그날로 쓰고 미디어 스캔).

| 경로 | 장 | 재료 |
|---|---|---|
| `Pictures/PocketlogSeed/Camera/` (시딩, 이미 있던 것) | 4 | 들어감 (dev) |
| `DCIM/Camera/t129_cam_*.jpg` (좌표 있음) | 3 | 들어감 |
| `DCIM/Screenshots/Screenshot_20261114_120000.jpg` | 1 | 빠짐 |
| `Download/t129_dl_receipt.jpg` (영수증) | 1 | 빠짐 |
| `Download/t129_dl_landscape.jpg` (보통 실내 사진, 좌표 있음) | 1 | 빠짐 |
| `Download/Quick Share/t129_qs_photo.jpg` | 1 | 빠짐 |

- 홈 재료 지면: 「사진 7장 · 장소 3곳」.
- 「일기 쓰기」로 저장한 일기: `signalsUsed.photos` 7장, 캐러셀 사진 7장. id는 `content://media/external/images/media/<n>` 꼴이다(레거시 id 변환이 기기에서 맞았다). 캡션 21초, 본문은 실내·거리 묘사로 영수증·스크린샷 내용이 없다. `places` 3곳에 좌표(`latE5`·`lonE5`)가 저장됐다.
- 못 본 것: 「스크린샷뿐인 날」(단위·조립 테스트만), 층 1 e2e 전체 실행, 배포 빌드에서 시딩 사진 빠짐(헌법 검사·테스트만), 경로가 비어 있는 사진의 실제 발생.

### iPhone 14

### iPhone 14 (개발 서명 Release, 2026-11-24)

- 오늘(11-24)에 `ios:seed`로 사진 3장을 더 넣고, 사람이 같은 날 스크린샷을 여러 장 찍었다. 그날에는 앞서 심어 둔 사진도 있었다.
- 「일기 쓰기」로 저장한 일기의 `signalsUsed.photos`는 13장이고 모두 `IMG_*`·카메라 비율이다. 스크린샷(1170×2532)은 한 장도 없다. 사람은 재료 지면에서 「3장」을 봤다고 했다 — 일기에 실린 13장과 맞지 않는다. 화면을 다시 읽지 않아 어느 쪽이 맞는지는 모른다.
- id는 `ph://<localIdentifier>` 꼴이다(레거시 id 변환이 맞았다). 캡션 17초, 캐러셀 5장, `places` 11곳에 좌표가 저장됐다.
- 못 본 것: 사파리·메신저에서 저장한 사진(설계상 가르지 못한다).
