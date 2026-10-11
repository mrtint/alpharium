---
name: kickoff
description: Use when starting implementation of a roadmap task — e.g. "이 과제 착수하자", "이거 개발 시작하자", or when picking up any item from docs/roadmap/README.md 「진행 예정 과제」 to build it.
---

# Kickoff

<!-- 원본: github.com/mrtint/bluehall .claude/skills/kickoff — 이 저장소에 맞춰 경로·완료 조건을 옮기고, analyze 및 converge를 지적 0건까지 반복하며, 구현 완료 후 독립 코드 리뷰를 거치도록 바꿨다. -->

## Overview

로드맵 과제 하나를 구현 완료까지 끌고 가는 파이프라인. speckit이 "선택"이라 부르는 clarify·analyze·converge와 구현 후 **코드 리뷰**는 **이 프로젝트에서는 필수**다.

**규칙의 문자를 어기는 것이 곧 정신을 어기는 것이다.** 필수 단계를 "같은 효과의 다른 방법"(가정 명시로 clarify 대체, 수동 대조로 analyze/converge 대체, 자체 검토로 코드 리뷰 대체 등)으로 갈음하는 것도 생략이며, 금지다. 스킬을 호출하는 것 자체가 단계다.

## 적용 범위

`docs/roadmap/README.md`의 「진행 예정 과제」만 이 파이프라인을 탄다. 버그픽스·리팩토링·문서·설정 작업은 파이프라인 없이 그냥 작업한다.

## Pipeline (순서 고정 — 생략·대체·순서변경 금지)

1. **과제 선택**: 로드맵에서 대상 과제 확인. 사용자가 지정하지 않았으면 질문한다. 과제에 목적이 적혀 있지 않으면 brainstorming 초입에서 목표부터 확인한다. `git branch --show-current`가 `main`이면 **여기서** 작업 브랜치를 만든다(`main` 직접 커밋 금지 — AGENTS.md).
2. **brainstorming (superpowers:brainstorming)** 호출 → 과제를 구체화한 설계문서를 `docs/superpowers/specs/YYYY-MM-DD-<slug>-design.md`로 저장. 이미 분해 설계 문서가 그 과제를 다루고 있으면 그 문서를 brainstorming의 입력으로 삼는다(brainstorming 자체는 생략하지 않는다).
3. **speckit-specify** — 설계문서를 입력으로 실행. 생성된 스펙 번호를 로드맵의 해당 과제에 기록하고(스펙이 열린 뒤에만 번호를 적는다), 브랜치 이름을 `NNN-<slug>`로 바꾼다(`git branch -m`).
4. **speckit-clarify** — 필수.
5. **speckit-plan** 실행.
6. **설계 구간 (한 흐름으로)**: speckit-tasks → **analyze 루프**:
   1. **speckit-analyze** 호출.
   2. 보고서의 지적이 **0건**이면 루프 종료(예외는 5뿐). 심각도와 무관하다 — LOW 1건도 수정사항이다.
   3. 지적이 1건 이상이면 전부 spec/plan/tasks에 즉시 반영하고(analyze가 remediation 승인을 묻더라도 묻지 않고 반영) **1로 돌아간다.** 반영이 새 지적을 만들 수 있으므로, 반영한 뒤에는 언제나 다시 analyze다.
   4. 사용자 결정 없이는 반영할 수 없는 지적, 또는 지적이 틀렸다고 판단한 지적이 있으면 그 지적만 사용자에게 묻고, 답을 반영한 뒤 1로 돌아간다. 스스로 무시하고 루프를 끝내지 않는다.
   5. 사용자가 "반영하지 않는다"고 정한 지적은 그 결정을 spec이나 plan에 한 줄로 남긴다. 이후 회차에 남은 지적이 **전부 사용자가 이미 반영하지 않기로 정한 것**이면 루프를 끝낸다. 하나라도 새 지적이 있으면 3으로 간다.

   루프가 끝나면 산출물, **analyze 회차별 지적 수**(예: 5 → 2 → 0), 사용자가 반영하지 않기로 정한 지적을 짧게 보고한다.
7. **구현 구간 (한 흐름으로)**: speckit-implement → **converge 루프** → **코드 리뷰**:
   1. **speckit-implement** 실행하여 tasks.md의 초기 태스크들을 구현 및 단위/계약 테스트 작성.
   2. **speckit-converge 루프**:
      1. **speckit-converge** 호출.
      2. 누락된 요구사항이나 미구현 사항이 없어 추가 태스크가 0건(`converged`)이면 루프 종료.
      3. 새 태스크가 `tasks.md`에 추가되면 해당 태스크를 구현하고 테스트를 검증한 뒤 **다시 speckit-converge를 호출한다.**
      4. 사용자의 의도적 결정으로 구현하지 않기로 한 항목은 `tasks.md`에 사유와 함께 기록하고 converge를 마무리한다.
   3. **코드 리뷰 (requesting-code-review 호출)**:
      - converge가 완료되어 스펙/계획과 코드가 완전히 일치한 상태(`converged`)에서만 코드 리뷰를 호출한다(미구현 사항에 대한 불필요한 리뷰 지적으로 토큰/시간 낭비 방지).
      - 리뷰어가 제시한 지적 중 **Critical(Must Fix)** 및 **Important(Should Fix)** 항목은 즉시 수정하고 테스트를 다시 돌린다.
      - 수정 후 전체 테스트 및 린트 통과를 확인하고, 최종 리뷰 결과가 머지 가능(Ready to merge: Yes) 상태임을 확인한다.
   구간 중간에는 사용자 승인을 기다리지 않는다(상호작용 지점은 brainstorming·clarify로 충분). 구현 구간의 종료 보고는 최종 보고로 갈음한다.
8. **완료 처리**: `npm test`·`npm run lint`를 실제로 실행해 통과를 확인하고, dev 빌드로 실기기에서 최소 1회 확인한다(헌법 원칙 V — 건너뛴 실기기 테스트는 통과가 아니다. 결과 안 보고 "완료" 주장 금지). 그 뒤 로드맵의 「진행 예정 과제」에서 해당 과제를 빼고 「완료 이력」 표에 스펙 번호와 한 줄로 옮긴다. 커밋 메시지에 스펙 번호를 남긴다(예: `docs: 로드맵에서 049 완료 과제를 이력으로 옮김`).

## 커밋 시점 (한 커밋 = 한 논리적 변경)

정확히 3회, 각각 실행 전 사용자 확인을 받는다. 커밋 메시지는 한국어:
1. 설계 구간 종료 후 — 스펙 산출물(`specs/NNN-*/`, `docs/superpowers/specs/`)
2. 구현 구간 종료 후 — 구현 코드 (converge 수렴 및 코드 리뷰 반영 완료 후)
3. 완료 처리 — 로드맵 갱신 (구현 커밋과 분리)

## 최종 보고에 반드시 포함

- converge 이후 남은 지적사항(구현 안 한 것) 목록 및 converge 회차별 추가 태스크 수
- 코드 리뷰 결과 요약(지적 사항 및 수정 내용)
- clarify에서 확정된 주요 결정
- 남은 리스크(실기기 미확인 잔여 포함)

## Rationalization table

| 유혹 | 현실 |
|------|------|
| "시간 없으니 핵심 단계만 밟자" | 이 파이프라인 전체가 핵심 단계다. 막연한 시간 압박은 생략 사유가 아니다. 사용자가 특정 단계를 이름 집어 "건너뛰어"라고 명시할 때만 예외. |
| "specify가 요구사항 확인을 내장하니 brainstorming 생략" | specify는 문서 생성이지 발산·수렴 탐색이 아니다. 설계문서 없이 specify에 들어가지 않는다. |
| "가정을 스펙에 적고 컨펌받으면 clarify와 같다" | 대체 절차 금지. speckit-clarify를 호출하는 것이 단계다. |
| "좁은 기능이라 clarify/analyze는 건질 게 없다" | 건질 게 없으면 싸게 끝난다. 건너뛸지 판단하는 비용이 실행 비용보다 크다. |
| "analyze 필수 1회는 이미 채웠다, 반영했으니 끝" | analyze는 횟수가 아니라 지적 0건이 종료 조건이다. 반영했으면 다시 analyze. |
| "LOW/MEDIUM만 남았고 analyze도 proceed해도 된다고 한다" | 그것은 speckit의 기본값이다. 이 파이프라인은 심각도와 무관하게 0건까지 간다. |
| "반영한 부분만 내가 훑어보면 analyze를 또 돌릴 필요 없다" | 대체 절차 금지. 다시 speckit-analyze를 호출하는 것이 단계다. |
| "converge 대신 인수조건 수동 대조" | 대체 절차 금지. speckit-converge 호출. |
| "converge 1회 돌렸으니 추가 태스크 구현 후 바로 끝내자" | 구현 후 다시 converge를 호출해 추가 태스크 0건(`converged`)을 확인해야 루프가 끝난다. |
| "converge 다 안 끝났지만 코드 리뷰 먼저 받자" | converge가 끝나기 전에 리뷰를 받으면 미구현 지적에 토큰과 시간을 낭비한다. 스펙 수렴 완료 후에 코드 리뷰를 진행한다. |
| "코드 리뷰 지적 중 Important는 머지 후 나중에 고치자" | Critical과 Important는 머지 전 수정 필수다. 수정한 뒤 전체 테스트 통과를 확인한다. |
| "자체 검토로 코드 리뷰를 대신하자" | 대체 절차 금지. requesting-code-review를 호출해 독립적 리뷰를 받는 것이 단계다. |

## Red Flags — 이 생각이 들면 멈추고 파이프라인으로 복귀

- "이 단계는 이 과제엔 오버킬이다"
- "같은 효과를 더 빨리 낼 수 있다"
- "speckit 문서에는 선택이라고 되어 있다"
- analyze 보고서에 지적이 남아 있는데 설계 구간 종료 보고를 쓰고 있다
- converge에서 추가 태스크가 나왔는데 재converge 없이 구현 구간을 끝내려 하고 있다
- converge 수렴 전에 코드 리뷰를 호출하거나, 코드 리뷰 없이 2차 커밋을 하려 하고 있다
- 필수 단계를 스킬 호출 없이 수동 절차로 대신하려는 계획을 세우고 있다

