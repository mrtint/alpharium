@AGENTS.md

## Claude Skills (Superpowers 내재화)

이 프로젝트에는 최신 Superpowers(v6.4.2) 스킬셋이 `.claude/skills/`에 내재화되어 있습니다.
- 기능 탐색·설계 착수 시: `brainstorming` (`superpowers:brainstorming`) 호출 → `docs/superpowers/specs/YYYY-MM-DD-<slug>-design.md` 작성
- 구현 계획 수립 시: `writing-plans` 호출 → `docs/superpowers/plans/` 작성
- 버그 분석 및 디버깅 시: `systematic-debugging` 필수 준수
- 코드 구현 시: `test-driven-development` (TDD) 필수 준수
- 태스크 실행 시: `subagent-driven-development` 또는 `executing-plans`
- 작업 완료 선언 전: `verification-before-completion` 필수 검증
- 코드 리뷰 시: `requesting-code-review` / `receiving-code-review`
- 브랜치 마무리: `finishing-a-development-branch`
- 스킬 사용 전반 규칙: `using-superpowers`
