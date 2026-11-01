# Contract: 사이트 원문 (`site/`)

규칙 번호는 테스트 이름에 그대로 쓴다. 테스트: `__tests__/privacy/site-pages.test.ts`.

| 규칙 | 내용 | 근거 |
| --- | --- | --- |
| S1 | `site/index.html`·`site/privacy/index.html`·`site/support/index.html`·`site/.nojekyll`이 있다 | FR-001 |
| S2 | 세 HTML은 `<html lang="ko">`, `<meta charset="utf-8">`, `viewport` meta, `<title>`을 갖는다 | FR-001 |
| S3 | 세 HTML에 `<script`·외부 `<link rel="stylesheet"`·`@import`·`http(s)://`로 시작하는 `src=`가 없다(외부 자원 0) | R2 |
| S4 | 방침의 절 열하나가 순서대로 있다 — 각 절은 `<section id="…">`(`summary`·`on-device`·`outbound`·`third-party`·`retention`·`permissions`·`rights`·`safety`·`contact`·`remedy`·`changes`, 108이 `rights`·`safety`·`remedy`를 더했다) | FR-002 |
| S5 | `outbound` 절 안에 `data-outbound` 표식이 붙은 절이 있고, 그 값의 집합 = 외부 전송 목록의 `id` 집합, 각 값은 정확히 한 번 | FR-022a |
| S6 | 사이트의 `{대문자_밑줄}` 꼴은 `{SUPPORT_EMAIL}`·`{OPERATOR}`·`{EFFECTIVE_DATE}` 셋 중 하나뿐이다(모르는 자리표시자 0). 자리표시자가 있어도 테스트는 통과한다 | FR-006 |
| S7 | 방침 `contact` 절에 `{SUPPORT_EMAIL}`(또는 채운 값)과 끝나는 기준(마지막 답장 뒤 30일)·「휴지통까지 비웁니다」가 있고 「지체 없이」가 없다(108) | FR-002a |
| S8 | 방침 `changes` 절에 변경 이력 목록(첫 판 한 줄)과 저장소 기록 링크 `https://github.com/mrtint/alpharium/commits/main/site/privacy/index.html`가 있다 | FR-002 |
| S9 | 지원 페이지에 `PRIVACY_URL`과 같은 링크, 문의 메일 자리, 자주 묻는 것 다섯(`<section data-faq="…">` 다섯)이 있다 | FR-005 |
| S7b | 방침 `retention` 절이 결제가 없어 법령상 따로 보존하는 것이 없다는 것과 보존 요구를 받은 메일의 처리를 말한다(108) | FR-002a |
| S11 | 방침 `third-party` 절: 제공 없음, 법정 요청은 법령 절차의 범위 안에서만, 휴대폰이 직접 요청하는 외부 전송은 제공·위탁이 아님, 문의 메일 보관 위탁(Google LLC, 미국)의 국외 이전 항목(108) | FR-002a |
| S12 | `model-download` 절은 받는 곳(Hugging Face, Inc., 미국)과 받는 정보를 「등」 없이 적는다(108) | FR-002 |
| S13 | `rights`(10일 안 답)·`safety`·`remedy`(구제 기관 넷의 연락처) 절(108) | FR-002 |
| S10 | 방침 `retention` 절은 「포함될 수 있습니다」를 쓰고 「포함됩니다」·「포함되지 않습니다」로 단정하지 않는다. 지원 페이지 `uninstall`도 「포함될 수 있지만」으로 같은 말을 한다(코드 리뷰) | FR-003 |

**원문 검토(사람)**: 방침의 사실 문장마다 HTML 주석 `<!-- 근거: … -->`로 설계문서 §1 항목을 단다(SC-001). 테스트는 주석 존재까지만 본다(각 `data-outbound` 절에 `근거:` 주석이 하나 이상).
