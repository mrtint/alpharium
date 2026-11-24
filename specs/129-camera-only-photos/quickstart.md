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

(구현 뒤 채운다)
