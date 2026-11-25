# Quickstart: G6 검증

1. `npx jest __tests__/config/guidance-lock.test.ts __tests__/app/leave-note.test.ts --selectProjects logic`
2. `npx jest __tests__/ui/guidance-lock-home.test.tsx --selectProjects ui`
3. 위반 주입(각 규칙 한 번, 치환 적용을 먼저 단언): 카탈로그에 「항상」 / 새 `fooIos` 키 / 슬라이드 본문에서 「켜 두면」 제거 / `writingLeaveNote`가 iOS면 늘 반환 / 띠 `hidden` 조건 제거 / 쓰는 중 분기에 `{bandNode}` 추가 → 해당 테스트 실패 확인 후 되돌림.
4. `npm test`·`npm run lint`
5. 실기기(iPhone 14, iOS 27, dev 빌드): 홈에서 「일기 쓰기」 → 쓰는 중 화면에 「앱을 나가도 계속 써요.」가 보인다. 안드로이드(SM-S901N): 쓰는 중 안내 줄 없음(변화 없음).

## 기록

(구현 후 채움)
