# Contract: 설정 「정보」의 방침·문의 행

테스트: `__tests__/ui/settings-policy-rows.test.tsx`(화면), `__tests__/app/browser-port.test.ts`(통로), `__tests__/config/ios-permissions.test.ts`(문구).

## 화면 (R)

| 규칙 | 내용 | 근거 |
| --- | --- | --- |
| R1 | 「정보」 묶음의 행 순서: `settings-version` → `settings-privacy` → `settings-support` → `settings-font-license` → (켜져 있으면) `settings-developer` | FR-012 |
| R2 | 두 행의 라벨은 「개인정보처리방침」·「도움말·문의」이고 끝에 ›(`Chevron`)가 있다 | FR-012 |
| R3 | 「개인정보처리방침」을 누르면 `onOpenPrivacy`, 「도움말·문의」는 `onOpenSupport`가 한 번 불린다 | FR-013 |
| R4 | `privacyFailedText`/`supportFailedText`를 주면 그 행 아래 danger 보조 줄로 보이고, 주지 않으면 보조 줄이 없다 | FR-014 |
| R5 | `SettingsScreen.tsx`는 `policy-links`를 import하지 않고 `http`를 담지 않는다(화면은 URL을 모른다) | FR-013 |
| R6 | 배터리·권한·이 휴대폰 묶음의 기존 테스트가 그대로 통과한다 | FR-017 |

## 조립 (A) — `App.tsx` 소스 계약

| 규칙 | 내용 | 근거 |
| --- | --- | --- |
| A1 | 설정 조립부가 `openInBrowser(PRIVACY_URL)`·`openInBrowser(SUPPORT_URL)`를 넘기고, 결과가 `false`면 그 행의 실패 줄을 세우고 `true`면 비운다 | FR-013·014 |
| A2 | 실패 줄 문구는 `linkOpenFailed(url)`(카탈로그)로 만든다 | FR-016 |

## 통로 (B) — `src/app/browser-port.ts`

| 규칙 | 내용 | 근거 |
| --- | --- | --- |
| B1 | `openURL`이 resolve하면 `true`, reject하면 `false`(던지지 않는다) | FR-014 |
| B2 | `react-native`를 동적 `import`로 읽지 않는다(호출 시점 `require`) — `no-react-native-dynamic-import.test.ts`는 이미 `src` 전체의 동적 import를 막는다. 거기에 「`browser-port.ts`는 `openInBrowser` 안에서 `require`한다」 사례 하나를 더한다 | FR-015 |
| B3 | `canOpenURL`을 부르지 않는다 | R5 |

## 문구 (T)

| 규칙 | 내용 | 근거 |
| --- | --- | --- |
| T1 | 카탈로그 `settings.privacyPolicy` = 「개인정보처리방침」, `settings.support` = 「도움말·문의」, `settings.linkOpenFailed(url)` = 「브라우저를 열지 못했어요 · {url}」 | FR-016 |
| T2 | 새 고정 문구가 `ADDED_AFTER_GOLDEN`에 있고 골든 G1·G2가 통과한다 | FR-016 |
| T3 | `app.json` iOS 위치 문구 = FR-018 문장 그대로, 사진 문구는 지금 그대로 | FR-018 |
