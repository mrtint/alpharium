# 계약: 스토어 등록 에셋 (`store/ko/`)

- **S1**: 모든 에셋은 한국어 한 벌이다. 출시 국가는 한국이다.
- **S2**: `title.txt` ≤ 30자, `subtitle.txt` ≤ 30자, `short.txt` ≤ 80자, `full.txt` ≤ 4000자, `keywords.txt` ≤ 100자(끝 개행 제외, 글자는 유니코드 코드 포인트 수).
- **S3**: 설명문 어디에도 모델 식별자(`kanana`·`lfm`·`llama`·`gguf`·「파라미터」·양자화 표기·`1.5`/`2.1b` 꼴 숫자 등 테스트 상수 목록)가 없다. 스크린샷 파일명·기능 그래픽에도 쓰지 않는다.
- **S4**: `screenshots/ios-6.5/`는 1284×2778 PNG 5장(App Store 「Face ID 큰 화면」 규격), `screenshots/play-phone/`는 4장 이상(Play 최소 2장·최대 8장)이며 각 변이 320~3840px이고 긴 변이 짧은 변의 2배 이하다. 치수는 PNG 헤더로 검증한다.
- **S5**: `feature-graphic-1024x500.png` 1024×500(24비트 PNG, 알파 없음), `store-icon-512.png` 512×512(Play 형식: 32비트 PNG, 알파 포함 — RGBA로 쓴다).
- **S4c**: Play 스크린샷은 긴 변이 짧은 변의 2배 이하여야 한다. 갤럭시 1080×2340(2.17배)은 `prepare-screenshot.mts --crop-height 2160`으로 위 2160줄만 남긴다.
- **S4b**: 스크린샷·기능 그래픽은 알파 채널이 없다(PNG 색 유형 RGB). App Store는 알파·투명을 허용하지 않고 Play는 24비트 PNG를 받는다. 기기 캡처는 `scripts/store/prepare-screenshot.mts`로 알파를 걷고(투명한 픽셀이 있으면 실패), iPhone 캡처는 `--size 1284x2778`로 늘린다.
- **S6**: 스크린샷은 합성·모의 이미지가 아니라 실기기 촬영이다. 촬영 일시·기기(iPhone 14 / SM-S901N)·앱 빌드·사진 목록·보이는 장소 이름·소유자 확인을 `device-check.md`에 적는다(촬영 **전** 확인).
- **S7**: 설명문의 서술은 방침·지원 페이지와 어긋나지 않는다(소유자 검수, 대조한 항목을 `device-check.md`에 적는다).
- **S8**: 위반 주입 — 31자 제목, 설명문에 「kanana」 삽입, 스크린샷 치수 변경 — 이 각각 테스트를 실패시킨다.
- **S9**: 규격 값은 제출 시점 콘솔 도움말과 대조한 날짜와 결과를 `device-check.md`에 적는다. 이 값들은 이번 계획에서는 짐작이다(research R5).
