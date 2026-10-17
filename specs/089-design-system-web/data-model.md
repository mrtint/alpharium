# Data Model: 디자인 시스템 기반과 웹 재디자인

모양은 [contracts/tokens-json.md](./contracts/tokens-json.md), 생성 결과는 [contracts/generated-outputs.md](./contracts/generated-outputs.md)에 있다. 여기서는 개체와 관계, 검증 규칙만 둔다.

## 개체

| 개체 | 설명 | 정체(키) |
| --- | --- | --- |
| 토큰 정본 | `design/tokens.json` 한 파일. 사람이 정한 값 | 파일 |
| 색 역할 | 아홉 개: `bg`·`surface`·`border`·`text`·`textMuted`·`accent`·`accentForeground`·`danger`·`dangerForeground`. 라이트·다크 hex | 역할 이름 |
| 반경 | `card`·`pill`·`control` 숫자 | 이름 |
| 글자 역할 | 앱 공용 여섯(`title`·`sectionTitle`·`body`·`bodyStrong`·`caption`·`button`) + 웹 전용 둘(`display`·`reading`). `size`·`weight`·`lineHeight` | 역할 이름 |
| 서체 | `family`·`weights`(앱 다섯)·`webWeights`(웹 셋)·`fallback`(대체 서체 목록) | 단일 |
| 간격 단계 | 정수 목록(4·8·10·12·16·20·24 — R1) | 값 |
| 대비 쌍 | `{fg, bg, min, mode, note}` 사람이 정한 목록 | (fg, bg, mode) |
| 앱 생성 영역 | `tokens.ts`의 표식 사이 텍스트 | 파일 안 영역 |
| 웹 변수 파일 | `site/assets/tokens.css` | 파일 |
| 웹 서체 목록 | `site/assets/fonts/source.json`: 배포 패키지·무결성·파일별 sha256 | 파일 |
| 규칙 문서 | `design/DESIGN.md` | 파일 |

## 관계

- 색·반경·글자 역할·서체(앱 부분) → **앱 생성 영역**으로 옮겨진다(웹 전용 항목·다크 값 제외).
- 색(라이트·다크)·반경·글자 역할(전부)·서체·간격 → **웹 변수 파일**로 옮겨진다.
- 서체 `webWeights` ⊆ `weights`. `webWeights`마다 `fonts.css`에 `@font-face`가 있고 그 조각 파일이 `site/assets/fonts/`에 있다.
- 대비 쌍의 `fg`·`bg`는 색 역할 이름이다.
- 규칙 문서가 언급하는 이름은 정본의 역할·`site.css`의 클래스·소스의 부품 파일에 실재한다.

## 검증 규칙

| 규칙 | 내용 |
| --- | --- |
| V1 | 색 값은 `#rrggbb` 소문자 hex. 라이트·다크 모두 있다 |
| V2 | 색 역할 키 집합은 정확히 아홉이다(앱 `COLORS` 키와 같다) |
| V3 | 글자 역할 중 `platforms` 없는 것은 정확히 여섯(앱 `TYPE` 키와 같다) |
| V4 | `weight`는 `font.weights`에 있는 값이다 |
| V5 | `space`는 양의 정수의 증가 목록이다 |
| V6 | 대비 쌍은 라이트·다크 각각 계산값이 `min` 이상이다 |
| V7 | `webWeights`는 `weights`의 부분집합이다 |
| V8 | 생성기는 값을 계산·보정하지 않는다 — 출력의 모든 수치·문자열이 정본의 값 그대로다 |

## 상태 전이

없다(정적 파일). 값을 바꾸는 절차: 정본 수정 → `node scripts/design/build-tokens.mts` → 테스트.
