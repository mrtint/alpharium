# Quickstart: 다운로드 진행 화면(캐러셀 + 프로그레스 바) 완성

이 기능이 실제로 동작하는지 검증하는 절차. 구현 코드는 담지 않는다 —
계약은 [contracts/download-progress-carousel.md](./contracts/download-progress-carousel.md),
데이터 모양은 [data-model.md](./data-model.md) 참조.

## 사전 준비

1. 신규 의존성 설치(AGENTS.md 「Expo 작업 시」 절 준수):
   ```
   npx expo install react-native-reanimated-carousel react-native-gesture-handler
   ```
   (`react-native-reanimated`·`react-native-worklets`는 이미 설치돼 있음 —
   research.md R2)
2. 네이티브 링크 반영:
   ```
   npx expo prebuild --platform android --clean
   ```
3. dev 빌드 재설치(AGENTS.md 「테스트 전 앱 초기화 원칙」):
   ```
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   adb shell pm clear com.anonymous.alpharium
   adb shell am start -n com.anonymous.alpharium/.MainActivity
   ```

## 기기 없는 검증

```
npm run test:logic   # progressSegments() 등 순수 함수 (D1~D3)
npm run test:ui      # DownloadProgressScreen 렌더 계약 (D4~D8)
npm run lint         # eslint + tsc + 헌법 검사 + prettier
```

기대 결과: 전부 통과. 특히 `tsc`가 `onRetry` prop 제거로 인한 기존
호출부(`App.tsx`) 타입 불일치를 잡아내는지 확인한다(007·014 관례 — 타입
축소는 `tsc`가 변경 지점을 짚어준다).

## 실기기 검증 (dev debug, 필수 — AGENTS.md 원칙 V)

새 네이티브 링크 모듈(`react-native-gesture-handler`) 도입이므로 실기기
검증을 건너뛸 수 없다.

1. `EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client`로 Metro 기동,
   `adb reverse tcp:8081 tcp:8081`.
2. 기존 온보딩 상태를 지우고 다운로드 동의 화면까지 도달(온보딩 권한 단계를
   통과하거나 이미 부여된 기기 사용).
3. **캐러셀(US1)**: 동의 확인 직후 진행 화면 진입.
   - 아무 조작 없이 4초 이상 대기 → 카드가 자동으로 다음 카드로 바뀌는지.
   - 카드 영역을 좌우로 스와이프 → 즉시 카드가 바뀌는지.
   - 같은 방향으로 4회 이상 연속 스와이프 → 4번째에서 1번째로 순환하는지
     (막히지 않는지).
4. **프로그레스 바(US2)**: 다운로드가 진행되는 동안 관찰.
   - 시간이 지날수록 진행 칸이 채워지는 방향으로만 변하는지(줄어들지
     않는지).
   - 카드를 스와이프해도 진행 칸 상태가 흔들리지 않는지.
   - 채워지고 있는 칸에 움직임(애니메이션)이 보이는지.
5. **완료(US3)**: 다운로드가 끝났을 때.
   - 카드 대신 완료 안내("준비됐어요")와 버튼이 뜨는지.
   - 버튼을 누르기 전까지 화면이 자동으로 안 넘어가는지.
   - 버튼을 누르면 다음(작명) 화면으로 넘어가는지.
6. **실패·자동 재시도(US4)**: 다운로드 도중 비행기 모드 등으로 네트워크를
   끊는다.
   - 화면 레이아웃(캐러셀·진행 바 위치)이 그대로 유지되는지, 진행 바
     하단 문구만 "받다가 멈췄어요" 계열로 바뀌는지.
   - 오류 메시지 원문이나 실패 원인이 화면에 보이지 않는지(원칙 III).
   - 네트워크를 복구한 뒤 사용자 조작 없이 다운로드가 재개돼 결국 완료
     화면(5번)에 도달하는지.

## 회귀 확인

- 기존 온보딩·첫 실행 Maestro 흐름(`unified-permission-onboarding.yml` 등)이
  이 변경으로 깨지지 않는지 `npm run test:device`로 확인.
- `App.tsx`에 추가한 `GestureHandlerRootView`가 다른 화면(홈, 설정,
  일기 상세)의 기존 터치 조작(033의 눌림 피드백 등)에 영향을 주지 않는지
  육안 확인.
