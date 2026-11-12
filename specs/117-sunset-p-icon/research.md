# Research: 노을 「P.」 아이콘 정본 전환

## R1 — 래스터라이저
- **Decision**: `@resvg/resvg-js@2.6.2`(devDependency, 정확한 버전).
- **Rationale**: 저장소에 SVG 렌더러가 없다. 임시 디렉터리에서 설치해 후보 `ios.svg`를 두 번 렌더해 보니 1024×1024에서 바이트가 같았고(결정적) `<use href>`가 칠해졌다(P 윤곽·마침표를 따로 쓰는 monochrome에 필요). Node 24·macOS arm64에서 설치·동작을 확인했다(Linux·Windows는 못 봤다 — 플랫폼별 바이너리를 optionalDependencies로 받는다).
- **Alternatives**: 자체 래스터라이저(그라데이션·곡선·clipPath·불투명도·stroke를 다시 짜는 큰 코드, 후보 시안과 어긋날 위험), Chromium 렌더(환경마다 픽셀이 달라 정확 일치 대조가 흔들린다), `sharp`(libvips 용량·SVG 지원이 librsvg 의존).

## R2 — 그림 파일의 구조
- **Decision**: `design/icon-art.svg` 한 파일에 `<defs>`(그라데이션 4·`p-shape`·`dot-shape`·`clipPath`), 배경 `<g id="bg-layer">`, 그림 `<g id="art">`가 있다. 생성기는 이 셋을 이름으로 꺼내 출력별 SVG를 조립한다. 없는 id면 아무것도 쓰지 않고 실패한다.
- **Rationale**: 후보 원본은 이미 그라데이션·경로가 한 파일이고, monochrome은 P 윤곽·마침표를 따로 써야 한다. 문자열 추출은 우리 파일 한 개에 대한 것이라 XML 파서를 들이지 않는다.
- **Alternatives**: 출력마다 SVG 파일 여러 개(정본 분산, 102가 막으려던 것), XML 파서 의존성 추가(과함).
- **확인할 것**: `clipPath` 안에서 `<use href="#p-shape"/>`가 resvg에서 되는지 — 안 되면 clipPath에 경로를 직접 두고 `p-shape`는 별도 id의 같은 `d`를 둔다(구현 중 렌더로 확인, 같은 `d`가 둘이면 테스트가 일치를 본다).

## R3 — 합성과 알파
- **Decision**: 불투명 출력(iOS·favicon·background·기능 그래픽)은 `#bg` 배경 사각형이 캔버스를 덮으므로 resvg 결과의 알파가 모두 255여야 한다 — 생성기가 이를 검사해 다르면 실패한다. 투명 출력(foreground·monochrome·스토어 512 RGBA)은 알파를 그대로 쓴다. 스토어 512는 102처럼 RGBA 파일이다(Play 형식), 배경이 덮이므로 알파는 255다.
- **Rationale**: iOS 아이콘은 알파 채널이 없어야 한다(I4).

## R4 — 안전 영역 검사
- **Decision**: foreground·monochrome의 불투명 픽셀이 (a) 가운데 66/108 정사각형 안(102 I5)이고 (b) 가운데에서 반지름 `1024 × 66/108 / 2 = 312.9` 원 안에 든다. (b)가 실제 마스크(원)에 맞다.
- **Rationale**: 후보 README의 0.784 근거(감싸는 원 반지름 305.1, 여유 8px)를 테스트가 지키게 한다. 값 312.9는 안전 영역 66/108에서 계산한 것이고 측정이 아니다.

## R5 — monochrome 윤곽
- **Decision**: `p-shape`와 `dot-shape`를 검정 단색으로 칠한 것, 배율은 foreground와 같은 0.784.
- **Rationale**: 테마 아이콘은 알파만 쓴다. 풍경 안의 산·해는 한 색에서 구분이 안 되고 마침표가 「P.」다.
- **못 본 것**: 갤럭시 테마 아이콘 모드에서 실제 모양(런처 확인 때 본다).

## R6 — `app.json` adaptive `backgroundColor`
- **Decision**: 그림 `#bg`의 첫 정지점 `#fffdf8`로 바꾼다. 테스트는 SVG의 첫 정지점에서 읽어 대조한다.
- **Rationale**: 102는 background PNG가 단색 accent라 같은 값을 썼다. 이제 background는 그라데이션이라 첫 색을 폴백으로 둔다(OS가 이미지 대신 쓸 때의 색).

## R7 — 기능 그래픽 배율
- **Decision**: 0.5(P 높이 약 356/500).
- **Rationale**: 102의 비율(300/500)보다 크다. 사람이 정한 임시값이고 렌더를 보고 소유자가 본다.

## R8 — 후보 폴더
- **Decision**: 정본 승격 후 `design/icon-candidates/`를 지운다.
- **Rationale**: 같은 그림이 둘이면 정본이 갈라진다. 원본·미리보기는 git 기록에 남는다.

## R9 — 작은 크기
- **Decision**: 단순화 판을 두지 않는다. favicon 48·스토어·29~60px 렌더를 quickstart에서 보고 읽힘을 기록한다.
- **Rationale**: 설계 결정 표.
