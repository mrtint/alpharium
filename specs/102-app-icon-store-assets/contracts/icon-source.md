# 계약: 아이콘 정본과 생성물

- **I1**: `design/icon.json`이 아이콘 모양·배율의 유일한 정본이다. 색은 토큰 이름으로만 가리키며 16진수를 적지 않는다.
- **I2**: `node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/design/build-icons.mts`가 생성물을 쓰고 `--check`는 쓰지 않고 어긋남만 본다(종료 코드).
- **I3**: 생성물은 정본에서 메모리로 다시 만든 바이트와 같아야 한다(손으로 고친 PNG는 테스트 실패).
- **I4**: `assets/icon.png` 1024², 알파 채널 없음. 모든 픽셀이 불투명이다.
- **I5**: `assets/android-icon-foreground.png`의 불투명 픽셀 bbox는 캔버스 중앙 66/108 안에 든다. `-background.png`는 단색 accent이며 `app.json`의 adaptive `backgroundColor`도 accent 값이다.
- **I6**: `app.json`이 가리키는 `icon`·adaptive 세 경로·`web.favicon`이 모두 실재한다.
- **I7**: `app.json`의 `ios.supportsTablet`은 `false`다.
- **I8**: 위반 주입 — PNG 한 바이트 수정, iOS 아이콘에 알파 추가, foreground를 키워 안전 영역 밖으로, `supportsTablet`을 true로 — 가 각각 테스트를 실패시킨다.
- **I9**: 이 과제는 `src/`·`modules/`·`site/` 파일을 바꾸지 않는다(`git diff --stat`로 확인).
