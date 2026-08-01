# 진행 상황

**마지막 갱신**: 2026-08-01

## 지금까지 한 것

| 문서 | 상태 | 내용 |
| --- | --- | --- |
| [.specify/memory/constitution.md](../.specify/memory/constitution.md) | v1.3.0 확정 | 원칙 0 「휴대폰 퍼소나」 포함 |
| [001-persona-diary-contracts/spec.md](001-persona-diary-contracts/spec.md) | 작성 완료, 명확화 완료 | 네 축 사이의 경계면 계약. FR 55개, SC 13개 |
| [001-.../checklists/requirements.md](001-persona-diary-contracts/checklists/requirements.md) | 25/25 통과 | 품질 검사 |
| [ROADMAP.md](ROADMAP.md) | 작성 완료 | 축별 스펙의 순서·범위·완료 조건 |
| [002-persona-identity/spec.md](002-persona-identity/spec.md) | 작성 완료 | 퍼소나 이름·성격의 부여 규칙. FR 33개, SC 12개 |
| [002-.../checklists/requirements.md](002-persona-identity/checklists/requirements.md) | 전 항목 통과 | 품질 검사 + ROADMAP 002 완료 조건 대조 |

**002에서 정한 것**: 이름은 앱 내장 후보 목록에서 무작위, 성격은 내장 카탈로그(식별자·표시명·서술)에서 무작위 — 설치마다 갈린다. 부여는 최초 실행 시 사용자 입력 없이 한 번. 이름은 1~20자 범위에서 자유롭게 변경 가능하고, 성격은 앱 갱신으로도 바뀌지 않는다.

## 다음에 할 것

**`/speckit-specify`로 003 수집·정제 스펙을 작성한다.**

[ROADMAP.md](ROADMAP.md)의 「003 — 수집·정제 스펙」 절에 답해야 할 질문 일곱 개와 완료 조건이 적혀 있다. 네 축 중 **가장 크고 가장 파기 쉬운** 축이므로 완료 조건을 특히 엄격하게 본다.

**004(추론)는 003이 끝난 뒤에만** 착수한다 — 002는 이미 끝났으므로 남은 전제는 003뿐이다.

## 다음 세션 시작 시 읽을 것

순서대로:

1. `.specify/memory/constitution.md` — 특히 원칙 0
2. `specs/ROADMAP.md` — 어디까지 왔고 다음이 무엇인지
3. `specs/001-persona-diary-contracts/spec.md` — 경계면 계약 (후속 스펙이 위반하면 안 되는 것)

003을 쓸 때 `002-persona-identity/spec.md`는 읽지 않아도 된다 — 두 축은 서로 독립이다. **004를 쓸 때는 002와 003을 모두 읽는다.**

**읽지 않아도 되는 것**: `src/`와 `App.tsx`의 기존 코드. 이것은 "온디바이스로 일기 생성이 가능한가"만 확인한 실험체이며 설계 근거가 아니다. 스펙은 이 코드에 맞추지 않는다.

## 이 프로젝트에서 반복된 실패

코딩 에이전트가 네 축(퍼소나·수집/정제·추론·저장) 중 하나를 붙잡고 지나치게 파고들어 매번 어긋났다. 원인은 스펙을 하나만 써서가 아니라 **경계면을 정하기 전에 내부를 팠기 때문**이다.

001이 경계면을 못 박았고, ROADMAP이 각 축의 「답하지 않는 것」과 「파기 시작했다는 신호」를 정해 두었다. **한 축을 깊게 파고 싶어지면 그것이 실패 신호다.**

## 아직 안 한 것

- `README.md`·`AGENTS.md`가 여전히 "따뜻한 1인칭 한국어 일기"로 서술되어 사람 일기로 읽힌다. 퍼소나 컨셉에 맞게 정정 필요. 스펙 작업과 독립이라 언제든 가능하다.
- 실험 코드 삭제 여부 미정 — 구현 단계에서 정리한다.
