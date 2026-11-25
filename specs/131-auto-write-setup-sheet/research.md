# Research — 131

- **Decision**: 대기를 `OnboardingFlag`의 새 필드로 둔다. **Rationale**: 같은 파일에 `welcomeShown`·`downloadConsented`를 더한 선례(035·045), 옛 파일은 키 없음 → `false` → 기존 사용자 제외가 공짜. **Alternatives**: 새 파일(파일 하나 더), 메모리 판정(앱 종료 시 놓침).
- **Decision**: 대기를 `true`로 쓰는 때는 온보딩이 `completed: false → true`로 바뀌는 저장. **Rationale**: 새 설치만 그 전이를 지난다. **Alternatives**: 권한 단계 시작 때 — 저장이 한 번 더 필요.
- **Decision**: 배터리 단계는 `requirements.ts`에서 지우지 않고 `planOnboardingSteps`에서 거른다. **Rationale**: 설정 화면 권한 꼬리표(`permission-tags.ts`)가 같은 목록을 쓴다. `batteryNoticeShown`은 읽는 곳이 사라지면 필드는 남기고(옛 파일 호환) 판정에서만 뺀다.
- **Decision**: 「켜기」 저장 순서 = 시각이 바뀌었으면 `applyTargetHour` → 토글 켬이면 `applyToggleOn`, 끔이면 저장 안 함(이미 꺼짐). **Rationale**: 설정 화면과 같은 효과 함수 재사용(FR-006).
- **Decision**: 배터리 행 누름은 기존 설정 화면 배터리 행이 쓰는 OS 설정 열기를 그대로 쓰고, `AppState` 앞 복귀 때 상태를 다시 읽는다(104 훅 재사용).
- **Decision**: 띄우는 자리는 `FirstDiaryConfirmDialog` 옆(App.tsx) — 확인창이 떠 있으면 띄우지 않는다(R8).
