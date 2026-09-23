# Quickstart: 작명 화면 1a 검증

## 기기 없는 확인

```bash
npm run test:ui -- welcome-screen
npm run lint
npm test
```

## 실기기 확인 (dev debug, SM-S901N)

사전 조건: AGENTS.md 「도구 사용법」 네 가지(Metro dev, 잠금 해제, `adb reverse tcp:8081 tcp:8081`).
필수 자산이 이미 받아진 기기면 앱을 재시작하고 다운로드 완료 화면에서 [시작할게요]를 누르면
작명 화면이 뜬다(`downloadProceedConfirmed`는 세션 로컬). 새 네이티브 모듈이 없으므로 APK
재빌드 없이 Metro 리로드로 충분하다.

1. 스크린샷을 `1a`와 나란히 놓고 spec 배경 표 9항목을 대조한다(SC-001).
2. 빈 입력에서 확정 버튼이 진한 빨강이고 눌러도 화면이 그대로인지 본다(FR-012).
3. "금동"을 입력 → 카운터 `2/12`. 12자 입력 후 한 자 더 → `12/12`에서 멈춤(SC-003).
4. 키보드가 열린 채 스크롤해 두 버튼에 닿는지 본다(SC-005).
5. [이 이름으로 할래요 →] → liveness → 일기 탭으로 이어지는지 본다(SC-004).
6. Maestro: `maestro test .maestro/welcome-naming.yml` (`run-device-tests.mjs` 경유 권장).
