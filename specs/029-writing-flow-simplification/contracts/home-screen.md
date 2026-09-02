# Contract: 홈 화면 단순화 (DiaryHomeScreen / DiaryListScreen)

관련 요구사항: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-014.

---

## H1 — 홈에 남는 것 (FR-001)

`DiaryListScreen`이 렌더하는 것은 **정확히**:
- 일기 목록 (기존)
- "일기 쓰기" 버튼 (기존)
- 날짜 셀렉트 박스 — 최근 3일, 기본값 당일 (009 `write.selectable` 재사용)
- 012 정오 게이트 안내 (오늘을 아직 못 쓸 때, `todayNotYetWritable`)
- 021 거부 권한 안내 (`deniedNotices`) — 유지

**렌더되지 않는 것** (계약 테스트가 `queryByTestId`로 부재 확인):
- `CharacterPicker` / 캐릭터 선택 UI
- `VisionPicker` / 사진 설정 UI
- `GeocodingSettingToggle` / 장소명 토글
- 위 위젯에 딸린 안내 문구 ("상상을 섞어 씁니다" 등은 설정 탭으로)

## H2 — 제거되는 props (FR-006)

`DiaryHomeScreen` / `DiaryListScreen`에서 제거:
`characters`, `onSelectCharacter`, `vision`, `onSelectVision`,
`onToggleGeocoding`, `geocodingEnabled`.

유지: `now`, `initialDay`, `onAcknowledge`, `deniedNotices`, `store`, `pipeline`,
`stop`, `prepare`, `release`, `captionDay`, 날짜 셀렉트 상태(`chosenDay`/
`setChosenDay`), `write`(WritePrompt).

**추가**: `onGoToSettings?: () => void` — FR-014의 "설정 탭 안내"용 (기존
`onGoToCharacters`를 대체).

## H3 — "일기 쓰기" 1탭 (FR-004)

`write()` 핸들러:
1. 상위(`DiarySection`)가 계산한 `ResolveOutcome`을 받는다 (자동 판정은 배선
   계층 — FR-007).
2. `outcome.kind === "no-ready-character"` → `toFailed("일기 작성자를 준비해야
   한다")` + `onGoToSettings` 경로 노출 (FR-014). **온보딩 재노출 아님.**
3. `outcome.kind === "resolved"`:
   - `writePromptFor(items, now(), chosenDay)` → `WritePrompt` (009, 재판정).
   - `startWriting(prompt)`:
     - `confirm-overwrite` → 확인 화면 (012 그대로).
     - 아니면 `generate(prompt.day, outcome.params)` — 곧바로 (FR-004).
4. `outcome.params.movedFrom`이 있으면 화면에 "○○로 썼다"류 안내 (FR-014,
   007 `movedFrom` 표시 재사용).

## H4 — 생성 호출 (FR-013 — prompt.ts 불변)

`generate(day, params: ResolvedParams)`:
- `pipeline.run({ day, now, character: params.character, vision: params.vision,
  ...(seen ? { seen } : {}) }, onProgress)` — 기존 `pipeline.run` 계약 그대로.
- `params.geocodingEnabled`는 `createAppPipeline`이 `createPipeline({ geocodingEnabled })`
  에 넘기는 값 — 배선에서 자동 판정 결과로 설정 (wiring 계약 참조).
- **성공 후**: `saveSelection(selectionPort, params.character)` — "마지막에 쓴
  캐릭터" 기록 (FR-008a). 실패 시 파일 안 건드림(원칙 I) — 저장은 성공 경로에서만.

## H5 — 정오 게이트 (FR-005)

`isDayWritable(dayOf(now()), now())` 재사용 (012, 새 판정 안 만듦).
`todayNotYetWritable` prop으로 `DiaryListScreen`에 전달, 안내 문구 유지.

## H6 — 날짜 셀렉트 (FR-002·003)

- `selectableDays(now)` → 최근 3일. 기본값 = 당일(정오 이후) 또는 마지막으로
  닫힌 하루.
- **파일 저장 안 함** (FR-003, 009 FR-010) — `chosenDay`는 `useState`, 매 렌더
  `writePromptFor`가 범위 재판정. 범위 밖으로 밀린 선택은 조용히 기본값.

## H7 — 소스 불변식 (계약 테스트)

- `DiaryHomeScreen.tsx` / `DiaryListScreen.tsx`에 `from "../ui/CharacterPicker"` /
  `VisionPicker` / `GeocodingSettingToggle` import 없음 (홈에서 제거).
- `from "../diary/prompt"` import 없음 (022 `UI_TOUCHES_PROMPT` — 유지).
- `from "../models/` import 없음 (007 `UI_TOUCHES_MODEL` — 유지).

## 화면 테스트 (`__tests__/ui/diary-home-screen.test.tsx` 갱신)

| # | 상황 | 기대 |
|---|---|---|
| HT1 | 홈 렌더 | 캐릭터/사진/장소명 위젯 `queryByTestId` 전부 null |
| HT2 | 날짜 셀렉트 오늘 + "일기 쓰기" (일기 없음) | 확인 없이 `generate` 호출, params.character = 자동 판정값 |
| HT3 | 고른 날 일기 있음 + "일기 쓰기" | `confirm-overwrite` 화면 (012) |
| HT4 | 자동 판정 no-ready-character | `failed` 화면 + "설정" 경로, 온보딩 안 뜸 |
| HT5 | movedFrom 있는 resolved | "○○로 썼다" 안내 보임 |
| HT6 | 정오 이전 | 정오 게이트 안내 보임, 셀렉트에 오늘 여전히 있음 |
