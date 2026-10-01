# Implementation Plan: 설정 진입과 화면 틀 — 홈 위에 쌓이는 설정

**Branch**: `055-settings-entry-frame` | **Date**: 2026-10-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/055-settings-entry-frame/spec.md`

## Summary

홈 월 라벨 줄 오른쪽의 「일기」 글자를 점 세 개 설정 버튼(`home-settings`)으로 바꾸고, `AppFrame`이 홈(`DiarySection`)을 **늘 마운트한 채**
그 위에 절대 배치한 하위 화면 겹을 `translateX`로 밀어 넣는다(research R1). 겹친 동안 홈은 `covered` prop으로 뒤로 가기를 등록하지
않고·누름을 받지 않고·스크린리더에서 숨는다(R2·R3). 설정 내용은 보드 `6c` 틀(고정 머리·회색 지면·묶음 머리·행)로 새로 그리고, 이름(1a 입력줄을
공유하는 이름 바꾸기 겹)·자동으로 쓰기 토글(+ 당분간 지금의 시각 목록·장소명)·권한 네 행(순수 판정 `permissionTagFor`, 앱 정보 화면으로)·
버전(`expo-application`)을 담는다. 캐릭터 목록·작성자 고르기·설명 카드형 권한 섹션·「온보딩 다시 하기」는 걷는다. 실패 안내의
「설정에서 작성자 준비하기」는 「모듈 다시 받기」(첫 실행 다운로드 화면으로)가 된다(R9).

## Technical Context

**Language/Version**: TypeScript 5 · React 19 · React Native 0.86 · Expo SDK 57

**Primary Dependencies**: react-native-reanimated 4.5.1(겹 움직임), react-native-safe-area-context(인셋), `expo-application` ~57(버전 읽기 —
이미 `expo-notifications`를 통해 설치·자동 링크됨, 직접 의존성으로 올린다, R5). 새 내비게이션 라이브러리 없음.

**Storage**: 없음 — 새 파일을 저장하지 않는다. 이름은 기존 `custom-names`(035), 자동 생성 설정은 기존 `auto-diary.json`(020), 장소명은 기존 파일(029).

**Testing**: jest 두 프로젝트(`.ts` logic / `.tsx` ui, RNTL 14), 소스 계약 테스트, 헌법 검사(`scripts/check-constitution.mts`), Maestro `diary-home-1d.yml`.

**Target Platform**: Android 실기기(SM-S901N, Android 16 edge-to-edge), dev(debug) 빌드.

**Project Type**: mobile-app (단일 Expo 앱)

**Performance Goals**: 겹 움직임이 실기기 녹화에서 끊김 없이 보인다(SC-007). 홈이 뒤에서 리렌더되는 비용은 실기기에서 눈으로 판정(미확인 잔여).

**Constraints**: 새 네이티브 모듈 0(C2·FR-033), `process.env`는 `environment.ts`에서만, 화면은 `models/roster`·`ModelAsset`·`ESSENTIAL_ASSET_KEYS`에 닿지 않는다,
`AppState`를 판정에 쓰지 않는다(다시 읽는 때만 고른다), 문구는 보드 KO 원문(C4).

**Scale/Scope**: 화면 넷(진입점·설정 겹·이름 바꾸기 겹·실패 안내 버튼) + 순수 함수 둘 + `App.tsx` 조립 재배치.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 원칙 | 판정 | 근거 |
| --- | --- | --- |
| I 온디바이스 | 통과 | 생성 경로를 건드리지 않는다. 쓰는 중이 설정 왕복에도 멈추지 않는 것은 같은 파이프라인이 계속 도는 것이다 |
| II 화자 | 해당 없음 | 프롬프트 무변경 |
| III 캐릭터 | 통과 | 설정에서 모델 식별자를 보이지 않는다(FR-032). 이름은 호칭에만 흐른다(035). 캐릭터 목록을 걷어 화면이 로스터에 닿을 자리가 줄어든다 |
| IV 측정 장치 | 통과 | 버전 표시는 빌드 정보 읽기이지 측정이 아니다. 실행 기록을 남기지 않는다(D3) |
| V 관측과 추측 | 통과 | 읽지 못한 권한은 꼬리표를 그리지 않는다(FR-023), 버전 값이 없으면 비운다, 사진 위치 정보는 실제로 읽어 본다(R6). 실기기 dev 1회(quickstart) |
| 개발 방식 | 통과 | 계약(contracts) → 테스트 먼저 → 구현. 브랜치 `055-settings-entry-frame` |

Post-design 재확인: 위와 같다. 위반·예외 없음 — Complexity Tracking 비움.

## Project Structure

### Documentation (this feature)

```text
specs/055-settings-entry-frame/
├── plan.md
├── research.md          # R1~R11
├── data-model.md        # 겹 상태 · PermissionFacts → PermissionTag · VersionText
├── quickstart.md        # 실기기 Q1~Q13
├── contracts/
│   └── settings-stack.md   # E·S·F·C·R·D 계약
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
App.tsx                               # AppFrame: DiarySection 상시 마운트 + StackLayer 겹, onRedownload, 설정 조립(AutoDiarySection → SettingsSection)
src/app/
├── permission-tags.ts                # 새 — permissionTagFor (순수)
├── version.ts                        # 새 — formatVersion (순수)
└── photo-location-probe.ts           # 새 — 최근 사진 1장 getLocation() 감싸기 (기기 통로, R6)
src/ui/
├── DiaryListScreen.tsx               # home-kicker → home-settings 버튼(점 셋), onOpenSettings
├── DiaryHomeScreen.tsx               # covered prop(뒤로 가기 등록 차단·a11y 숨김), onOpenSettings 전달, onGoToSettings → onRedownload
├── StackLayer.tsx                    # 새 — 겹(absolute + translateX 240ms, 마운트 동안 뒤로 가로채기). SubScreenFrame 대체
├── SettingsFrame.tsx                 # 새 — 6c 머리(‹ 뒤로 · 큰 제목 · 2px 선) + 회색 지면 ScrollView
├── SettingsScreen.tsx                # 새 — 묶음·행·토글·꼬리표 (props만, 판정 없음)
├── RenameScreen.tsx                  # 새 — 「‹ 설정」·「이름」·NameField·저장
├── components/NameField.tsx          # 새 — 1a 입력줄 + 카운터 (WelcomeScreen과 공유)
├── WelcomeScreen.tsx                 # NameField 사용 (모양·문구·버튼 규칙 무변경)
├── AutoDiarySettingsScreen.tsx       # 토글·배터리 링크를 걷고 시각 목록만 남김(§3.2 전까지)
├── settings-text.ts                  # 새 — SETTINGS_TEXT (KO 원문)
├── SubScreenFrame.tsx                # 삭제 (StackLayer + SettingsFrame이 대신)
├── PermissionsSection.tsx · AuthorPicker.tsx · CharacterListScreen.tsx   # 설정 조립에서만 뺀다 — 파일·자기 테스트는 남긴다(C7, 050 dropdown-menu 선례; 정리는 개발자 메뉴 조각 몫)
└── theme/tokens.ts                   # SETTINGS 토큰(chevron · tagFill · tagText · 치수)
__tests__/
├── app/permission-tags.test.ts · app/version.test.ts
├── ui/settings-entry.test.tsx        # E1~E6
├── ui/settings-frame.test.tsx        # F1·F2 (SettingsFrame)
├── ui/settings-stack.test.tsx        # S2~S7·S9
├── ui/settings-screen.test.tsx       # F1~F5·C1~C8·문구 원문
├── ui/rename-screen.test.tsx         # R1~R4
├── ui/home-navigation.test.tsx       # 048 소스 계약을 새 구조로(S1·S8·F6·D3)
└── ui/diary-list.test.tsx · diary-home.test.tsx   # home-kicker·onGoToSettings 참조 갱신, D1·D2
.maestro/diary-home-1d.yml            # M1 갱신 + 설정 왕복
```

**Structure Decision**: 판정(권한 꼬리표·버전 문자열)은 `src/app/` 순수 함수, 기기 통로는 조립부(`App.tsx`)에서 만들어 화면에는 값·콜백만 넘긴다(021·048 관례).
겹 부품(`StackLayer`)은 설정·이름 바꾸기·개발자 화면이 같이 쓴다. `AppFrame`은 `route`를 그대로 쓰되 `DiarySection`을 그 삼항에서 꺼낸다.

## 구현 순서의 위험 (tasks가 지킬 것)

1. **겹을 먼저, 내용은 나중** — S1~S7(겹침)이 실기기에서 서야 나머지가 의미가 있다. 홈을 늘 마운트로 바꾸는 순간 기존 `SubScreenFrame` 기반 소스 계약
   (`home-navigation.test.tsx`)이 깨진다 — 같은 태스크에서 고친다.
2. **`covered` 없이 겹만 올리면 조용히 틀린다** — 쓰는 중 설정의 뒤로가 쓰기를 멈춘다(R2). S3 테스트를 겹보다 먼저 쓴다.
3. **`ModelSection`을 걷으면 `AppFrame`의 `acquisition`·`progress`·`rejection`·`ports`가 고아가 된다** — 다른 소비자(진단 등)가 있는지 센 뒤 `App.tsx`에서
   지운다(`tsc`·eslint `no-unused-vars`가 짚는다). `readyCharacters()`는 `DiarySection`이 계속 쓴다. 컴포넌트 파일은 남긴다(위 구조).
4. **`onRedownload`의 ref 되돌리기**(R9) — 빼먹으면 진행 화면이 뜬 채 아무것도 안 받는다.
5. **이전 계약과의 충돌**: 035 W18·W19(설정 이름 편집 — `author-picker.test.tsx`), 021 S2(설정 권한 섹션), 029 FR-014(설정 안내 링크), 048 N2·N3·M6 —
   걷는 대상의 계약 테스트를 새 계약으로 옮기거나 지운다(이유를 테스트 머리 주석에 남긴다).

## Complexity Tracking

없음.
