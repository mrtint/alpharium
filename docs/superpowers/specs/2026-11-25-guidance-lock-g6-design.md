# G6 — 안내 규칙 잠금 테스트 설계

입력: [docs/user-guidance-rules.md](../../user-guidance-rules.md) 0-4 G6 행·5장. 소유자 승인 2026-11-25(추천안 그대로).

## 목적

안내 규칙(R3·R6·R7·4-5①·R8·3-3)을 계약 테스트로 잠가, 뒤의 문구·화면 변경이 규칙을 어기면 테스트가 실패하게 한다. 끝나면 규칙 문서에서 G6 행과 끝난 5장 행을 걷는다.

## 범위 — 여섯 규칙

| # | 잠금 | 지금 상태 | 방법 |
| --- | --- | --- | --- |
| K1 | 금지 낱말 「항상·반드시·보장·제때·정각」·「꼭 」 | 방침·FAQ 「보장하지 않습니다」만 걸림 | 사용자 화면 카탈로그(개발 전용 영역 제외)·`site/**/*.html`(주석 제외)·`store/ko/*.txt` 문자열 검사. 허용 목록은 파일+문장 조각 |
| K3 | 플랫폼 짝 | `writingLeaveNoteIos`만 짝 없음 | 카탈로그의 `*Ios` 키마다 `*Android` 짝 또는 지정된 안드로이드 키, 아니면 허용 목록(까닭 필수) |
| K4 | 첫 실행 자동 쓰기 약속에는 「켜 두면/켜면」 | 슬라이드 3·알림 권한 지킴 | `download.slides`(제목+본문 한 단위)·`onboarding.permissions.notifications`·`welcome`에서 약속 낱말(먼저 써·써 드릴·알려)이 나오면 같은 단위에 조건. `welcome.welcomeBody`는 허용 목록 「소유자 문구 결정 대기(4-5①)」 |
| K8 | 토스트가 뜨면 제약 띠는 가려진다(R8) | 동작함 | `DiaryListScreen` 렌더: `constraint`+`toast` → 띠 `hidden` |
| K9 | 쓰는 중 화면에 제약 띠 없음(3-3) | 동작함 | `DiaryListScreen` 쓰는 중 렌더에 `constraint`를 줘도 `constraint-band` 없음 |
| K11 | 쓰는 중 안내가 OS 버전 조건을 본다(R7) | **iOS 16.4~25에도 「앱을 나가도 계속 써요」** | `writingLeaveNote(platform, continuedAvailable: boolean \| undefined)` — `true`일 때만 iOS 문구. 조립부는 `Platform.Version` 주 버전 ≥ 26으로 판정, 못 읽으면 `undefined`(원칙 V — 줄 없음) |

## 결정

| 결정 | 근거 | 뒤집으면 |
| --- | --- | --- |
| K11은 26 미만·모름이면 줄을 숨긴다 | 원칙 V, R7. 시스템 거절(`.fail`)은 여전히 못 가린다 | 동작 변경 없음 — 시그니처만 |
| 작명 화면 문구는 허용 목록(A) | 소유자 선택 2026-11-25 | 문구 수정·골든 갱신 |
| K8·K9는 옛 배터리 안내 대신 제약 띠로 | 108이 대체 | — |
| `previewIos`의 같은 버전 문제는 범위 밖 | K11은 `writingLeaveNote`만 | 남은 위험 |
| K2·K5·K6·K10·K12는 하지 않는다 | D7 대기·걷음 | — |

새 규칙은 위반 주입으로 한 번씩 확인한다.
