# Contract: 설정 배터리 꼬리표

테스트 위치: `__tests__/app/permission-tags.test.ts`, `__tests__/ui/settings-screen.test.tsx`, `__tests__/ui/use-permission-tags.test.tsx`.

- **PT1**: `permissionTagFor("battery", facts)` — `exempt`→`allowed`, `restricted`→`denied`, `unknown`→`unread`.
- **PT2**: `usePermissionTags`는 `battery`를 마운트 때 한 번, `AppState → active`마다 다시 읽는다. 읽기 전·실패는 `unread`(모르는 것을 거부로 채우지 않는다).
- **PT3**: 조립부(`App.tsx` `readPermissions`)는 예외 통로(`expoBatteryExceptionPort()`의 `readStatus()`, 온보딩 묶음의 `battery`는 설정 목록을 여는 데만 쓴다)에서 읽고 실패하면 `unknown`.
- **PT4**: 설정 화면 배터리 행(`settings-perm-battery`)의 trailing은 `PermissionTrailing`이다. 꼬리표 testID는 `settings-tag-battery`. 행의 보조 줄(`batteryHint`)과 누름 동작(앱 정보 화면 열기)은 바뀌지 않는다.
- **PT5**: `allowed`일 때 「허용됨」, `denied`일 때 「허용 안 함」(기존 `permAllowed`·`permDenied`). `unread`이면 꼬리표 없이 화살표만(iOS 포함).
- **PT6**: 설정 목록에서 돌아와 상태가 바뀌면 꼬리표가 바뀐다. 토스트는 없다.
- **PT7**: 기존 세 행(`photos`·`location`·`notifications`)의 판정·표시는 바뀌지 않는다.
