# 계약: 아이콘 정본과 생성물 (117 — 102를 대체)

- **C1**: `design/icon-art.svg`가 아이콘 그림·색의 유일한 정본이고 `design/icon.json`(v2)이 배치 값의 유일한 정본이다. `icon.json`에는 16진수 색이 없다.
- **C2**: `node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/design/build-icons.mts`가 생성물을 쓰고 `--check`는 쓰지 않고 어긋남만 본다(종료 코드).
- **C3**: 16진수 색(`#rrggbb`)은 `design/icon-art.svg`에만 있다. 생성기 소스·`icon.json`에 새로 생기면 테스트가 실패한다(주석 제거 뒤 소스 읽기).
- **C4**: 마침표는 `(508, 875)`(A안)이고 `p-shape`·`dot-shape`·`art` id가 있다. 없는 그림 파일·id를 가리키면 아무것도 쓰지 않고 실패한다.
- **C5**: 생성물은 정본에서 메모리로 다시 만든 픽셀과 같아야 한다(채널당 `PIXEL_TOLERANCE`=2 이내 — 래스터라이저의 플랫폼 차이를 위한 사람이 정한 값이고, 손으로 고친 PNG는 실패). 같은 정본으로 두 번 만든 결과가 같다(결정적).
- **C6**: `assets/icon.png` 1024², 알파 채널 없음(PNG 색 유형 RGB), 모든 픽셀 불투명.
- **C7**: foreground·monochrome의 불투명 픽셀은 가운데 66/108 정사각형과 그 안의 원(반지름 `1024×66/108/2`) 안에 든다. monochrome에는 P 윤곽과 마침표가 모두 있다(마침표 자리에 불투명 픽셀).
- **C8**: 크기·색 유형 — 스토어 512² RGBA, favicon 48², 기능 그래픽 1024×500 RGB.
- **C9**: `app.json`이 가리키는 `icon`·adaptive 세 경로·`web.favicon`이 실재하고 생성 목록에 있다. adaptive `backgroundColor`는 그림 `#bg` 첫 정지점 색이다. `ios.supportsTablet`은 `false`.
- **C10**: 위반 주입 — PNG 한 픽셀 변조, iOS 알파 낮춤, foreground 배율을 1.5로, 그림 밖 16진수, 없는 id — 이 각각 테스트를 실패시킨다.
- **C11**: 이 과제는 `src/`·`modules/`·`site/` 파일을 바꾸지 않는다(`git diff --stat`).
