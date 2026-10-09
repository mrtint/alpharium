# Superpowers Skills Internalization (내재화)

이 프로젝트에는 [obra/superpowers](https://github.com/obra/superpowers)의 최신 버전 코어 스킬셋이 프로젝트 로컬(`file://.claude/skills/`)로 내재화되어 있습니다.

## 메타데이터

- **버전**: `v6.4.2`
- **업스트림 커밋**: `8ca22dba9a94f28898bbce59f2537ff4d87c747d` (2026-09-25)
- **업스트림 저장소**: https://github.com/obra/superpowers
- **내재화 일시**: 2026-10-09

## 내재화된 스킬 목록 (15개)

| 스킬 디렉토리 | 설명 | 주요 역할 |
|---|---|---|
| `brainstorming` | 아이디어 구체화 및 설계 문서화 | 기능 착수 전 요구사항 발굴, 설계안 확정 후 `docs/superpowers/specs/`에 문서 작성 |
| `writing-plans` | 구현 계획 수립 | 명세서를 바탕으로 TDD/작업 단위 계획 수립 (`docs/superpowers/plans/`) |
| `executing-plans` | 계획 순차 실행 | 작성된 계획서를 바탕으로 태스크 순차 실행 |
| `subagent-driven-development` | 서브에이전트 주도 개발 | 구현자-리뷰어 서브에이전트 루프로 태스크 완수 |
| `test-driven-development` | 테스트 주도 개발 (TDD) | 실패하는 테스트 선행 작성, 최소 구현, 리팩터링 사이클 준수 |
| `systematic-debugging` | 체계적 원인 분석 디버깅 | 근본 원인 추적, 오염원 격리, 다층 방어 기법 적용 |
| `verification-before-completion` | 완료 선언 전 검증 | "완료" 보고 전 실제 테스트 및 명령 실행 결과 증거 확인 |
| `using-superpowers` | 스킬 사용 프레임워크 규칙 | 세션 시작 시 부트스트랩, 상황별 적합 스킬 필수 호출 강제 |
| `requesting-code-review` | 코드 리뷰 요청 | 태스크 또는 브랜치 변경사항에 대한 코드 리뷰 요청 패키지 작성 |
| `receiving-code-review` | 코드 리뷰 수신 및 반영 | 리뷰어의 피드백을 엄밀히 검토하고 조치 |
| `finishing-a-development-branch` | 개발 브랜치 완료 | 작업 마무리 후 머지/정리 절차 수행 |
| `using-git-worktrees` | Git 워크트리 격리 작업 | 메인 작업트리 보존 및 독립된 worktree 생성 |
| `dispatching-parallel-agents` | 병렬 에이전트 디스패치 | 독립적인 서브태스크들의 동시 실행 및 취합 |
| `writing-skills` | 스킬 작성 및 평가 | 새로운 스킬 개발 및 동작 평가 |
| `diagnosing-superpowers` | 스킬 진단 도구 | 세션 로그 분석 및 스킬 실행 진단 |

## 부트스트랩 및 훅 연동

- **SessionStart Hook**: `.claude/hooks/session-start`
  - 세션 시작(startup/clear/compact) 시 `using-superpowers` 스킬을 자동으로 세션 컨텍스트에 주입합니다.
  - `.claude/settings.json`의 `hooks.SessionStart`를 통해 플랫폼에 맞게 구동됩니다.
