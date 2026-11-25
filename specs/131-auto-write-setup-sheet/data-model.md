# Data Model — 131

## OnboardingFlag (기존, `preferences/onboarding.json`)

| 필드 | 형 | 새/기존 | 규칙 |
| --- | --- | --- | --- |
| autoWriteSetupPending | boolean | 새 | 키 없음 → false. `completed`가 false→true로 저장될 때 true. 창의 「켜기」/「나중에」에서 false. 다시 true가 되지 않는다 |
| batteryNoticeShown | boolean | 기존 | 온보딩 판정에서 더 읽지 않는다(필드 유지) |

상태 전이: (없음/false) —첫 완료→ true —켜기·나중에→ false.
