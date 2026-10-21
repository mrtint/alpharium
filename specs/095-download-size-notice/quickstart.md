# Quickstart: 095 확인 절차

## 자동

```bash
npx jest __tests__/ui/download-consent-dialog.test.tsx __tests__/app/use-consent-gate.test.tsx __tests__/ui/download-consent-gate.test.tsx __tests__/ui/cellular-consent-dialog.test.tsx --selectProjects ui
npx jest __tests__/i18n/ko-golden.test.ts --selectProjects logic
npm test
npm run lint
```

기대: 전부 통과. 계약 ID는 [contracts/consent-size.md](contracts/consent-size.md).

## 실기기 (dev 빌드, 소유자)

모델을 지워야 첫 실행 동의가 뜬다 — **모델 ~2GB를 다시 받는다**. 전용 테스트 기기에서 한다.

1. 안드로이드: `adb shell pm clear com.a810labs.pocketlog`(또는 개발자 메뉴 「온보딩부터 다시」 + 모듈 삭제) 뒤 Wi-Fi로 앱을 연다. iOS: 앱 삭제 후 재설치.
2. 권한 단계를 지난 뒤 「받을 것이 있어요」 안내 본문에 **「약 2.0GB」**(남은 양)가 보이는지 본다. 버튼은 [받을게요] 하나.
3. [받을게요] → 진행 슬라이드로 넘어가는지 본다(동작 불변).
4. (선택) 받는 도중 앱을 죽이고 다시 열면 남은 양(더 작은 값)이 보인다.

## 결과 기록

| 항목 | 결과 |
| --- | --- |
| 자동 테스트 | 통과 — `npm test` 344 스위트·7170 통과(7 건너뜀은 기존), `npm run lint` 오류 0(경고 2는 기존 파일), 헌법 검사 0, 위반 주입 6/6 잡힘 (2026-10-21, 클라우드 컨테이너) |
| 실기기 Wi-Fi 표준 동의 | 미확인 — 이 작업 세션은 기기가 없는 클라우드 컨테이너 |
