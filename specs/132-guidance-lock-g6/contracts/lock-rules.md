# Contract: 안내 잠금 규칙 (G6)

| id | 대상 | 실패 조건 | 허용 목록 |
| --- | --- | --- | --- |
| GL1 (K1) | 사용자 화면 카탈로그(R2 제외)·`site/**/*.html`(주석 제외)·`store/ko/*.txt` | 「항상」·「반드시」·「보장」·「제때」·「정각」·낱말 「꼭」 | `site/privacy`·`site/support`의 「보장하지 않습니다」 |
| GL2 (K3) | 카탈로그의 `*Ios` 키 | 짝 표에도 허용 목록에도 없음, 또는 짝 표의 안드로이드 키가 실제로 없음 | `writingLeaveNoteIos` — 안드로이드는 앞을 벗어나면 멈추는데 문구를 아직 정하지 않았다(R6) |
| GL3 (K4) | `download.slides[i]`(제목+본문), `onboarding.permissions.notifications`(설명+거부), `welcome.*` | 「먼저 써」·「써 드릴」·「알려」가 있고 「켜 두면」·「켜면」이 없음 | `welcome.welcomeBody` — 소유자 문구 결정 대기(4-5①) |
| LN1 (K11) | `writingLeaveNote(platform, continuedAvailable)` | iOS·`true`가 아닌데 문구 반환 / iOS·`true`인데 없음 | — |
| LN2 (K11) | `continuedAvailableFor(platform, version)` | iOS 주 버전 ≥26 → `true`, <26 → `false`, 못 읽음 → `undefined`, 안드로이드 → `false` | — |
| LN3 (K11) | 소스 | `writingLeaveNote`가 인자 하나로 호출됨(App.tsx) | — |
| HB1 (K8) | `DiaryListScreen` constraint+toast | 띠가 가려지지 않음 | — |
| HB2 (K9) | `DiaryListScreen` writing+constraint | `constraint-band`가 있음 | — |
