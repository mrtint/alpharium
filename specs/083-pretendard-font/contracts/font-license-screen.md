# Contract: 서체 라이선스 행과 화면 (L1~L6)

테스트: `__tests__/ui/font-license.test.tsx`(jest `ui`, RNTL 14 — `render`·`fireEvent`는 `await`). 조립 배선(L5)은 `App.tsx`가 테스트에서 렌더되지 않으므로 소스 계약으로 잠근다(055·059 선례).

## L1. 설정 「정보」 묶음에 행이 있다 (FR-011)

- `SettingsScreen`의 「정보」 묶음(`settings-group-about`) 안에 `settings-font-license` 행이 있고 라벨은 카탈로그 `fontLicense.row`(「서체 라이선스」), 꼬리는 ›.
- 순서: 「버전」 → 「서체 라이선스」 → (켜져 있으면) 「개발자」.
- 개발자 메뉴가 꺼져 있어도 행이 있다(개발·배포 무관 — `SettingsScreen`은 환경을 모른다).

## L2. 행을 누르면 여는 콜백이 불린다 (FR-012)

- `onOpenFontLicense`를 받고 행을 누르면 한 번 불린다. 콜백을 넘기지 않으면 행은 누를 수 없다(058 「누를 수 없는 행은 `onPress`도 넘기지 않는다」).

## L3. 화면이 서체 이름·라이선스 이름·전문을 그린다 (FR-013)

- `FontLicenseScreen`이 `fontLicense.intro`, `FONT.family`(「Pretendard」), `PRETENDARD_LICENSE_NAME`, `PRETENDARD_LICENSE_TEXT` 전문을 그린다. 전문은 한 `Text`의 자식으로 통째로(줄을 나누거나 자르지 않는다 — `getByText`가 전문 전체와 맞는다).
- 화면 루트 `testID="font-license-screen"`, 전문 `testID="font-license-text"`.

## L4. 지면 안 작은 스크롤 상자가 없다 (FR-015)

- `FontLicenseScreen`은 `ScrollView`·`FlatList`를 직접 두지 않는다 — 스크롤은 `SettingsFrame`의 것 하나(소스 계약). 전문에 `numberOfLines`가 없다.

## L5. 겹 배선 (FR-012, 055 S6)

`App.tsx` 소스 계약:

- 설정 겹 안에 `open={fontLicenseOpen}`인 `StackLayer`가 있고 그 안에 `SettingsFrame` + `FontLicenseScreen`.
- 설정 겹의 `active`는 서체 라이선스 겹이 열린 동안 거짓이다(`!fontLicenseOpen`이 `active` 식에 있다).
- `goHome`·알림 라우팅이 이름 바꾸기와 함께 서체 라이선스 겹도 닫는다(`setFontLicenseOpen(false)`).
- 뒤로 버튼은 `SETTINGS_TEXT.backToSettings`, `backTestID="back-from-font-license"`.

## L6. 문구는 카탈로그에서 온다 (FR-014)

- 카탈로그 `ko.fontLicense`가 있고 `row`·`title`·`intro` 셋. `src/ui/FontLicenseScreen.tsx`·`src/ui/pretendard-license.ts`에 한글이 없다(062 B1 — 헌법 검사가 이미 잡는다; 이 테스트는 키가 있는지만 본다).
- 새 문구는 `ko-golden.test.ts`의 `ADDED_AFTER_GOLDEN`에 있다.
