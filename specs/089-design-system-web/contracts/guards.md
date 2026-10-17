# Contract: 방어 테스트 (`__tests__/design/` + 기존 한 곳)

소스를 읽는 테스트는 주석을 먼저 걷는다(AGENTS 「테스트 작성의 함정」). 위반 주입은 치환이 실제로 적용됐는지 먼저 단언한 뒤 한다.

| ID | 파일 | 잠그는 것 | 스펙 | 위반 주입 |
| --- | --- | --- | --- | --- |
| G1 | `tokens-sync.test.ts` | `await buildOutputs(정본)`이 `tokens.ts` 생성 영역·`tokens.css`와 바이트 같다. 표식 두 줄이 정확히 한 번씩 있다. `--font-sans`가 `sans-serif`로 끝난다 | FR-002·SC-004 | 정본의 색 한 값만 바꾸고 생성하지 않기 |
| G2 | `tokens-schema.test.ts` | tokens-json C1~C9와 data-model V1~V8 | FR-001·001a | 색 역할 하나 삭제 / `note` 비우기 / 모르는 키 |
| G3 | `contrast.test.ts` | `contrast` 쌍이 라이트·다크 각각 `min` 이상. 쌍이 정본 색 키를 가리킨다. 본문 글자 역할 쌍(`text`·`textMuted`·`danger` × `bg`·`surface`)이 표에 빠지지 않았다 | FR-006·SC-002 | 다크 `textMuted`를 어둡게 |
| G4 | `app-values.test.ts` | 현재 `COLORS`·`RADIUS`·`TYPE`·`FONT`가 변경 전 스냅샷(`fixtures/app-tokens-before.json`, **이 기능의 첫 커밋 전에** 현재 `tokens.ts`에서 뽑아 둔다)과 깊이 같다. 기존 `theme-tokens.test.ts`·`font-rules.test.ts`는 수정 없이 통과 | FR-003·SC-005 | 라이트 `accent`를 한 글자 바꾸고 생성 |
| G5 | `site-hardcode.test.ts` | 사이트 L1·S1·S2 (HTML 세 개와 `site.css`). `site.css`의 `color`/`background` 값은 허용 목록(글자: text·textMuted·danger·dangerForeground·accentForeground, 배경: bg·surface·accent·danger)만 — 조합이 정본 대비 표에 있음은 G3. `tokens.css`·`fonts.css`는 대상 밖이지만 `fonts.css`는 `@font-face`만 있다 | FR-008·SC-001 | 위 위반 주입 전부 |
| G6 | `fonts-files.test.ts` | woff2 276개의 sha256이 `source.json`과 같다 / `LICENSE.txt`가 앱 것과 바이트 같다 / `fonts.css`의 모든 `url()` 파일이 있다 / 모든 `@font-face`에 `font-display: swap` / 선언 굵기 == `webWeights` ⊆ `FONT.weights` / 외부 주소 없음 | FR-009·010 | 파일 한 바이트 바꾸기 / LICENSE 삭제 / 굵기 선언 하나 추가 |
| G7 | `fonts-budget.test.ts` | 세 페이지 각각: 글자 집합 × `unicode-range` → 필요한 조각 크기 합 × 선언 굵기 ≤ 1,000,000 | FR-010a·SC-006a | 상한을 일시적으로 낮춰 실패 확인(주입), 굵기 하나 더 선언 |
| G8 | `design-doc.test.ts` | `DESIGN.md`의 백틱 이름(`--color-*`·역할·클래스·부품 파일 경로)이 실재한다 / 규칙 문서 필수 절이 있다 | FR-013·SC-008 | 문서에 없는 토큰 이름 한 줄 |
| G9 | `design-doc.test.ts` | `AGENTS.md`·`CLAUDE.md`가 `design/DESIGN.md`를 가리키고 그 파일이 있다 | FR-014 | 안내 줄 삭제 |
| G10 | `site-links.test.ts` | 세 페이지의 `<link>` 셋이 순서대로 있고 경로가 실제 파일을 가리킨다 | FR-008 | 링크 하나 삭제 |

기존 테스트 한 곳: `__tests__/privacy/site-pages.test.ts` S3 — `rel="stylesheet"` 전면 금지를 「상대 경로가 아닌 것 금지」로 좁힌다(FR-012). 위반 주입: 외부 주소 stylesheet 링크가 여전히 실패.

## 통과 기준

`npm test`(logic·ui 전부) 초록, `npm run lint` 초록, 위 위반 주입 전부 실패로 뒤집혔다가 원복됐다.
