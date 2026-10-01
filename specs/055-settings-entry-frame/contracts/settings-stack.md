# Contract: 홈 위에 쌓이는 설정 (055)

계약 ID는 테스트 이름에 그대로 쓴다. 「jest」는 배선만, 「기기」는 실기기 눈·녹화로 본다(C9).

## 진입점 (보드 `6a`)

| ID | 계약 | 검증 |
| --- | --- | --- |
| E1 | 월 라벨 줄 오른쪽에 `testID="home-settings"` 버튼이 있고 「일기」 글자(`home-kicker`)는 없다 | jest |
| E2 | `home-settings`는 안 쓴 날·쓴 날·쓴 날 접힘·쓰는 중 네 상태에 모두 있다 | jest |
| E3 | 스크린리더 라벨 「설정」, 역할 `button` | jest |
| E4 | 점 셋은 5×5, 간격 4, 색 `COLORS.text`. 누름 영역 44×44, 오른쪽 위 모서리 쪽(보드 `margin -14 -12 -14 0`) | jest(스타일 값) + 기기 |
| E5 | 누르면 `onOpenSettings`가 한 번 불린다 | jest |
| E6 | 쓰기 시작 전 실패 안내 화면에는 `home-settings`가 없다(홈 헤더가 없다) | jest |

## 겹침 (D4)

| ID | 계약 | 검증 |
| --- | --- | --- |
| S1 | `AppFrame`은 `DiarySection`을 `route` 삼항으로 바꿔 끼우지 않는다 — `route`와 무관하게 늘 그린다 | 소스 |
| S2 | 설정 겹이 열린 동안·닫히는 동안 `DiaryHomeScreen`에 `covered={true}`가 간다 | jest(겹 부품) + 소스 |
| S3 | `covered`이면 `DiaryHomeScreen`은 `hardwareBackPress`를 등록하지 않는다(쓰는 중·실패 화면 모두). `covered`가 풀리면 다시 등록한다 | jest |
| S4 | `covered`이면 홈 래퍼가 `importantForAccessibility="no-hide-descendants"`·`accessibilityElementsHidden`·`pointerEvents="none"` | jest |
| S5 | 쓰는 중에 `covered`가 참→거짓으로 바뀌어도 `pipeline.run`이 다시 불리지 않고 `stop`이 불리지 않는다 | jest |
| S6 | 하위 화면 겹은 마운트돼 있고 `active`(위에 다른 겹이 없음)일 때만 `hardwareBackPress`를 가로채 닫기를 부른다(048 N3 유지). 이름 바꾸기 겹이 열리면 설정 겹은 등록하지 않는다 | jest |
| S7 | 겹은 열 때 `translateX`를 화면 폭에서 0으로, 닫을 때 0에서 화면 폭으로 옮기고(240ms), 닫힘 뒤에 언마운트한다 | jest(배선·타이머) + 기기(녹화) |
| S8 | 알림 응답이 오면 `route`가 `"home"`이 된다(020 — 기존 N4 유지) | 소스 |
| S9 | 쓰는 중에 바꾼 이름은 진행 중인 run의 `authorName`을 바꾸지 않는다 | jest |

## 설정 틀 (보드 `6c` ①)

| ID | 계약 | 검증 |
| --- | --- | --- |
| F1 | 머리: 「‹ 일기」(`testID="back-to-home"`, 최소 높이 44, ‹ 22, 글자 15/700) + 「설정」(44/800, 줄높이 0.9×44, 자간 -0.04×44) + 아래 2px `COLORS.text` 선. 머리는 스크롤 밖 | jest |
| F2 | 지면: `WRITTEN_DAY.paper` 배경 `ScrollView`, 여백 위 14·좌우 20·아래 40 | jest |
| F3 | 묶음 머리: 11/600, 자간 1.1, 대문자, `COLORS.accent`, 위 14(첫 묶음 0)·아래 6 | jest |
| F4 | 행: 최소 높이 44(보조 줄 56), 아래 1px `COLORS.border`, 간격 12, 라벨 15/600 `text`, 값 15 `textMuted` tabular, › 18 `SETTINGS.chevron`, 보조 줄 12 줄높이 1.35×12 `textMuted` | jest |
| F5 | 묶음 순서: 캐릭터 → 일기 → 권한 · 휴대폰 설정으로 이동 → 정보 | jest |
| F6 | 설정에 `CharacterListScreen`·`AuthorPicker`·`PermissionsSection`·「온보딩 다시 하기」가 없다 | 소스 |
| F7 | 설정 화면 파일은 `models/roster`·`ModelAsset`·`ESSENTIAL_ASSET_KEYS`를 import하지 않는다 | 헌법 검사(기존 `UI_TOUCHES_*`) |

## 설정 내용

| ID | 계약 | 검증 |
| --- | --- | --- |
| C1 | 이름 행: 라벨 「이름」, 값 = 넘겨받은 지금 이름, › . 누르면 `onOpenRename` | jest |
| C2 | 자동으로 쓰기 토글: `accessibilityRole="switch"`, `accessibilityState.checked`. 44×26·안쪽 3, 켜짐 = accent 면 + 오른쪽 20×20 `bg` 손잡이, 꺼짐 = `SETTINGS.tagFill` 면 + 왼쪽 손잡이. 누르면 `onToggleAutoWrite(!enabled)` | jest |
| C3 | 토글 아래에 지금의 시각 선택(`AutoDiarySettingsScreen`의 시 목록)과 장소명(`GeocodingSettingToggle`)이 그대로 있다. 시각 화면의 배터리 링크는 없다 | jest + 소스 |
| C4 | 권한 네 행: 사진·위치·알림은 `permissionTagFor` 결과로 꼬리표(`allowed`/`partial`/`denied`), `unread`면 꼬리표 없음. 배터리는 꼬리표 없이 보조 줄 + › | jest |
| C5 | 꼬리표 모양: allowed = `tagFill` 면 + `tagText` 글자, 여백 3·8 / denied = 1px `accent` 테두리 + `danger` 글자, 여백 2·7 / partial = 1px `border` 테두리 + `textMuted` 글자, 여백 2·7. 13/600 | jest |
| C6 | 네 행 모두 누르면 `onOpenAppSettings`가 불린다 | jest |
| C7 | 설정 겹이 마운트될 때와 `AppState → active`일 때 권한을 다시 읽는다 | jest |
| C8 | 버전 행: 라벨 「버전」, 값 = `formatVersion(...)`, 누름 없음 | jest |
| C9 | `permissionTagFor`·`formatVersion` 표(data-model) 전 갈래 | jest(logic) |

## 이름 바꾸기 (Clarification Q3)

| ID | 계약 | 검증 |
| --- | --- | --- |
| R1 | 이름 바꾸기 겹: 머리 「‹ 설정」 + 제목 「이름」, 입력은 1a와 같은 `NameField`(지금 이름으로 채움, `maxLength` 12, 카운터) | jest |
| R2 | 잘라낸 입력이 빈 이름이면 「저장」 버튼이 `disabled`(흐림 + `accessibilityState.disabled`)이고 눌러도 `onSave`가 불리지 않는다 | jest |
| R3 | 「저장」 → `onSave(draft)` 한 번 → 겹이 닫힌다. 뒤로 → `onSave` 없이 닫힌다 | jest |
| R4 | 첫 실행 1a(`welcome-name-submit`)는 여전히 `disabled`를 넘기지 않는다(047 Q1) | jest(기존 유지) |

## 모듈 다시 받기 (Clarification Q2)

| ID | 계약 | 검증 |
| --- | --- | --- |
| D1 | 실패 안내 화면의 버튼 문구는 「모듈 다시 받기」이고 「설정에서 작성자 준비하기」는 없다 | jest |
| D2 | 누르면 `onRedownload()`를 부르고, `true`면 쓰기 전 홈으로 돌아간다 | jest |
| D3 | 조립부의 `onRedownload`는 다운로드 시작 ref와 완료 확인을 되돌린 뒤 필수 에셋을 다시 읽는다 | 소스 |
| D4 | `DiaryHomeScreen`에 `onGoToSettings` prop이 없다 | 소스(tsc) |
