# 139 iPad 창 모드 — 원인 확인과 시험 (시뮬레이터)

**실기기 점검이 아니다.** iPad Pro 11-inch (M5) 시뮬레이터, iOS 27.0, 창 모드(시뮬레이터 설정은 바꾸지 않았다).
앱은 2026-11-28 점검이 설치해 둔 `origin/main`(`0ab23fb`) 시뮬레이터 Release 빌드를 그대로 썼다. 값은 lldb로 읽었고,
방법 시험은 실행할 때 lldb로 장면 대리자(`EXExpoAppSceneDelegate`)에 메서드를 넣은 것이다(이 문서는 구현 전의 기록이다 — 고친 것과 그 뒤 확인은 [quickstart.md](quickstart.md)).

## 원인 (확인)

창은 417×1210pt, 화면은 834×1210pt다. 순서는 위·왼쪽·아래·오른쪽.

| 물은 값 | 결과 |
| --- | --- |
| `safeAreaInsets` (앱이 지금 쓰는 값) | 32 · 0 · 20 · 0 |
| 모서리 적응 안전 영역(가로축) | 32 · 66 · 20 · 9.5 |
| 모서리 적응 안전 영역(세로축) | 75 · 0 · 20 · 0 |

기본 안전 영역은 창 조절 점 자리를 싣지 않는다. iOS 26의 `UIViewLayoutRegion` 모서리 적응 영역을 따로 물어야 실린다.

## 시험 1 — 창 조절 점 「최소」 모양

`preferredWindowingControlStyleForScene:`이 `.minimalStyle`을 돌려주면 점이 상태 표시줄 줄(위 32pt 안)로 올라간다.
이때 모서리 적응(세로축) 위 값은 32로 기본과 같다. 홈에서 겹침이 없었고, 설정을 열어 전에 창 메뉴가 펼쳐지던
좌표(251, 63)를 눌러 홈으로 돌아왔다. 작명·확대 화면은 이 시험에서 보지 않았다.

## 시험 2 — 가로 회전

- 지금 앱: 시스템은 가로, 앱은 `interfaceOrientation = 1`(세로)에 창 834×417 — 옆으로 누워 눌린 배치가 된다.
- `supportedInterfaceOrientationsForWindowScene:`(iOS 27)이 네 방향(30)을 돌려주면 가로에서도 바로 선 417×834 창이 되고
  (`interfaceOrientation = 3`, 안전 영역 32·0·20·0), 실행 중 세로로 되돌려도 따라왔다.
- `userInterfaceIdiom`은 iPad에서도 0(phone)이다. 기기 구분은 `UIDevice.model`(`iPad`)로 된다.

## 못 본 것

(이 시점 기준) 「전체 화면 앱」 멀티태스킹 설정, 다른 iPad 크기, iPhone에 메서드를 넣었을 때, Xcode 26 이하 SDK 빌드, 실기기 전부.
상태 표시줄의 앱 이름(「포켓로그」)이 보일 때 최소 모양의 점과 겹친 캡처가 한 번 있었다(시스템이 그리는 영역, 지속 여부 미확인).
