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
| 자동 테스트 재확인 | 통과 — 맥북에서 `npm test` 344 스위트·7171 통과(7 건너뜀), `npm run lint` 0, `npx tsc --noEmit` 0 (2026-10-22, main 위 PR 브랜치) |
| 안드로이드 SM-S901N (dev, Wi-Fi) | 통과 — 모델을 치우고 첫 실행 플래그를 되돌려 열면 「받을 것이 있어요」 본문에 「약 2.0GB」, 버튼 [받을게요] 하나. 누르면 진행 슬라이드(「받는 중이에요」)로 넘어가고 구간 파일이 쌓임 |
| iPhone 14 (Release+dev 번들, Wi-Fi) | 통과 — 앱 삭제·재설치 후 본문 「약 2.0GB」, 버튼 하나. [받을게요] 탭(사람) → 진행 슬라이드 |
| 받는 도중 앱을 죽이고 다시 열기 | 통과 — 안드로이드 약 1.6GB, iPhone 약 1.5GB로 줄어듦(동의 플래그만 되돌려 다시 띄움) |
| 못 본 것 | 모바일 데이터(`cellular`) 동의 화면·연결/양 읽기 실패 때의 양 없는 문장은 실기기에서 보지 않음(자동 테스트 DS4~DS6·DS12만). 첫 실행 전체(권한 단계 포함)는 안드로이드는 플래그 복원으로, iPhone은 재설치 + 사람의 권한 허용으로 갔다 |
