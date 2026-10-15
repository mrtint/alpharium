# Contract: 게시 워크플로 (`.github/workflows/pages.yml`)

테스트: `__tests__/ci/pages-workflow.test.ts`. 075·076의 워크플로 계약 테스트와 같은 방식 — 파일 텍스트를 읽고 주석을 먼저 걷는다.

| 규칙 | 내용 | 근거 |
| --- | --- | --- |
| P1 | `on:`에는 `push`와 `workflow_dispatch` 둘뿐이다(`pull_request`·`schedule`·`workflow_run` 없음) | FR-007 |
| P2 | `push`는 `branches: [main]`과 `paths: ['site/**']`를 갖는다 | FR-007 |
| P3 | 최상위 `permissions`는 정확히 `contents: read`·`pages: write`·`id-token: write` | FR-008 |
| P4 | `secrets.`가 없다 | FR-008 |
| P5 | `uses:`는 `actions/checkout@v5`·`actions/configure-pages@v6`·`actions/upload-pages-artifact@v5`·`actions/deploy-pages@v5`뿐이다 | FR-010 |
| P6 | 자리표시자 검사 단계가 있고, `upload-pages-artifact`보다 앞이며, 세 자리표시자 이름을 모두 담는다 | FR-009 |
| P7 | 업로드 경로는 `site`다(저장소 전체를 올리지 않는다) | R1 |
| P8 | `concurrency` 그룹이 있다(겹친 게시가 서로를 덮지 않게) | R1 |

**자리표시자 검사 단계의 동작**: `site/` 아래에서 `{SUPPORT_EMAIL}`·`{OPERATOR}`·`{EFFECTIVE_DATE}`를 찾아 파일·줄을 출력하고, 하나라도 있으면 실패한다.

**테스트가 못 잡는 것**: 저장소 설정의 Pages 소스(「GitHub Actions」)·`github-pages` 환경의 보호 규칙 — 소유자가 설정 화면에서 본다(quickstart §4).

## 위반 주입

| 주입 | 깨지는 규칙 |
| --- | --- |
| `on:`에 `pull_request:` 추가 | P1 |
| `paths` 삭제 | P2 |
| `permissions`에 `contents: write` | P3 |
| 자리표시자 검사 단계 삭제 / 업로드 뒤로 이동 | P6 |
| `path: .` | P7 |
