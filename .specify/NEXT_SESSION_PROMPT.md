# 다음 세션 시작 프롬프트

아래를 그대로 새 세션에 붙여넣으세요.

---

020 스펙(시간대 지정 자동 일기 작성과 완성 알림)을 이어서 진행해줘.

**먼저 할 것**: `020-scheduled-diary-notification` 브랜치로 체크아웃하고
(`git checkout 020-scheduled-diary-notification`), `.specify/feature.json`이
`specs/020-scheduled-diary-notification`을 가리키도록 바로잡아줘 — main
브랜치에는 아직 020이 반영되지 않아서 그 파일이 `019`로 남아 있을 수
있어. spec.md는 이미 이 브랜치에 커밋돼 있으니 잃어버린 건 없어, 다음
speckit 명령이 올바른 디렉터리를 보게만 하면 돼.

**그다음 진행 순서**: `/speckit-clarify` → `/speckit-plan` →
`/speckit-tasks` → (필요하면 `/speckit-analyze`) → `/speckit-implement`
순서로 계속 진행해줘. 각 단계 결과는 한글로 보고해줘.

**배경(이전 세션에서 이미 정한 것 — 다시 묻지 말고 그대로 전제할 것)**:

- 이 기능은 019(백그라운드 자동 일기 생성 기술 검증) 스파이크의 실측
  결론 위에 짓는 첫 실제 배포 기능이다. 019는 스파이크였고 이번(020)은
  스파이크가 아니라 실제 기능이다.
- 019 결론: 화면 꺼짐·잠금 상태에서 WorkManager(`expo-background-task`)
  기반 백그라운드 생성은 실제로 완주한다. 다만 정확한 시각을 보장하지
  않는다 — 배터리 최적화 기본값에서는 15분 등록도 하루 1~2회로
  억제됐고(최대 19시간 33분 지연 실측), 배터리 최적화 예외를 주면
  10~32분 간격으로 좁혀진다(`specs/019-background-diary-feasibility/
  findings.md` 참고).
- alarm 계열(정확 시각 예약 API)은 019에서 의도적으로 배제했고, 020도
  이 결정을 유지한다 — "대략적인 시각 선택"이라는 요청 자체가 이미
  근사치를 전제하기 때문이다(spec.md Assumptions에 명시됨).
- 020 spec.md는 이미 작성 완료됐고 체크리스트 전 항목 통과, 명확화
  질문([NEEDS CLARIFICATION]) 없이 끝났다 — User Story 1(시각 선택,
  P1) · User Story 2(완료 알림, P1) · User Story 3(화면 수동 생성과의
  경합 방지, P2), FR-001~012, SC-001~006.
- SC-003(배터리 예외 적용 시 1시간 이내 실행 비율)은 계획 단계에서
  019의 실측 데이터(표본 2회, 10~32분)를 근거로 구체적 수치를 다듬을
  필요가 있다고 체크리스트 Notes에 남겨뒀다 — `/speckit-clarify`에서
  다룰 후보.

**참고 파일**: `specs/020-scheduled-diary-notification/spec.md`,
`specs/020-scheduled-diary-notification/checklists/requirements.md`,
`specs/019-background-diary-feasibility/findings.md`,
`specs/019-background-diary-feasibility/research.md`(§7~9, minimumInterval과
공식 문서 근거).
