# Quickstart: G6 검증

1. `npx jest __tests__/config/guidance-lock.test.ts __tests__/app/leave-note.test.ts --selectProjects logic`
2. `npx jest __tests__/ui/guidance-lock-home.test.tsx --selectProjects ui`
3. 위반 주입(각 규칙 한 번, 치환 적용을 먼저 단언): 카탈로그에 「항상」 / 새 `fooIos` 키 / 슬라이드 본문에서 「켜 두면」 제거 / `writingLeaveNote`가 iOS면 늘 반환 / 띠 `hidden` 조건 제거 / 쓰는 중 분기에 `{bandNode}` 추가 → 해당 테스트 실패 확인 후 되돌림.
4. `npm test`·`npm run lint`
5. 실기기(iPhone 14, iOS 27, dev 빌드): 홈에서 「일기 쓰기」 → 쓰는 중 화면에 「앱을 나가도 계속 써요.」가 보인다. 안드로이드(SM-S901N): 쓰는 중 안내 줄 없음(변화 없음).

## 기록

### 위반 주입 (2026-11-25, 치환 적용을 먼저 단언)

| 주입 | 잡은 테스트 | 결과 |
| --- | --- | --- |
| `home.autoWriteSetup.conditionIos`에 「항상」 | GL1 | 1 failed / 55 |
| `settingsPlatform`에 새 키 `fooIos` | GL2 | 1 failed / 56 |
| 슬라이드 3 본문에서 「자동으로 쓰기를 켜 두면」 제거 | GL3 | 1 failed / 55 |
| `writingLeaveNote`가 iOS면 늘 반환 | LN1 | 1 failed / 10 |
| 띠 `hidden`에서 토스트 조건 제거 | HB1 | 1 failed / 3 |
| 쓰는 중 분기에 `{bandNode}` 추가 | HB2 | 1 failed / 3 |

모두 되돌렸다.

### 실기기 (2026-11-26)

- **iPhone 14(iOS 27)**: 이 브랜치의 개발 서명 Release 빌드(JS 내장)를 설치. 홈 「일기 쓰기」 → 쓰는 중 화면에 「앱을 나가도 계속 써요.」가 보였다(소유자 확인).
- **SM-S901N(안드로이드)**: Metro에 이 브랜치 번들을 올리고 재료 없는 오늘에서 「일기 쓰기」 → 확인 → 쓰는 중 화면. 안내 줄 없음·제약 띠 없음(변화 없음, 화면 캡처로 확인). 쓰기는 「그만두기」로 멈췄다.
- **못 본 것**: iOS 26 미만 기기(줄이 숨는 경우)는 없어 단위 테스트(LN1·LN2)로만 확인. 제약 띠가 선 상태의 쓰는 중 화면(K9)은 기기에서 만들지 않았다 — 렌더 테스트로만.
