# Data Model: 작명 화면 1a 일치

저장되는 데이터는 바뀌지 않는다. 화면 안의 값만 적는다.

## 작명 화면 문구 (`TEXT`, 고정 상수 — L16)

| 키 | 값 | 비고 |
| --- | --- | --- |
| `kicker` (신규) | `ALPHARIUM` | 대문자 원문(마크업은 CSS uppercase) |
| `face` (신규) | `🤖` | Clarification Q2 |
| `welcomeTitle` | `깨어났어요. 처음 뵙겠습니다.` | 변경 |
| `welcomeBody` | `이제부터 제가 주인님의 하루를 사진과 다닌 자리로 읽고, 일기로 적을게요. 모든 일은 이 휴대폰 안에서만 일어나요.` | 변경 |
| `namePrompt` | `제 이름을 지어주세요.` | 무변경 |
| `nameHint` | `12자까지. 나중에 설정에서 바꿀 수 있어요.` | 변경 — "12"는 `NAME_INPUT_MAX_LENGTH`에서 보간 |
| `submit` | `이 이름으로 할래요` | 무변경, 화살표는 별도(R3) |
| `skip` | `나중에 할래요` | 무변경 |

`checking*`/`failed*`/`retry`/`goHome`/`namePlaceholder`는 무변경.

## 이름 초안 (`draft`, 화면 로컬 state)

- 문자열, 최대 `NAME_INPUT_MAX_LENGTH`(=12, `naming.ts` `NAME_MAX_LENGTH`와 같아야 함).
- 파생값: `canSubmit = draft.trim() !== ""`, 카운터 `draft.length`.
- 파일에 남지 않는다(확정 시 조립부가 검증·저장 — 무변경).
