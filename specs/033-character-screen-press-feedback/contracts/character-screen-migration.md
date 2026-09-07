# Contract: 캐릭터 화면 이관 불변식 (CS)

**Feature**: 033-character-screen-press-feedback

032 `contracts/screen-migration.md`의 **공통 원칙을 그대로 상속한다**(research R5) —
문안·`testID` 문자 그대로 유지, "className + 토큰 style 병행" 패턴, 원시 hex 0,
`checkSourceFile` 위반 0, 기존 `.tsx` 테스트 초록, Maestro 1회. 아래는 그 위에
`CharacterListScreen` 고유로 더하는 불변식이다. 032가 SM1~SM5를 적은 자리에
이 화면이 왔다면 SM6이 됐을 것이다.

**1차 계약**: `__tests__/ui/character-list.test.tsx`가 **한 줄도 수정되지 않은 채**
전부 통과한다. 이것이 "표현만 바뀌었다"의 가장 강한 증거다.

---

## CS1 — 사용자가 읽는 문장이 문자 그대로 같다

이관 전후로 다음 문자열이 **바이트 단위로 동일**해야 한다:

- 화면 제목: `캐릭터`
- 상태: `쓸 수 있음` / `받아야 함` / `받다 멈춤 — 이어받을 수 있음` / `받다 멈춤` /
  `다시 받아야 함`
- 동작: `준비하기` / `지우기` / `이어받기` / `다시 받기` / `멈추기` / `닫기`
- 진행: `받는 중…` / `받는 중… {N}%`
- 사진 모델 줄: `사진을 보는 데 필요한 것`
- 거부 안내: `{X}을(를) 받는 중이라 지금은 받을 수 없다. {X}을(를) 멈추면 받을 수 있다.`

**검사**: 계약 테스트가 `CharacterListScreen.tsx` 소스를 `readFileSync`로 읽어
위 리터럴의 존재를 확인한다(007 이후 이 저장소의 관례 — jest는 타입을 지우고,
렌더 테스트는 조건 분기를 다 못 밟는다).

## CS2 — 순수 함수 넷의 로직이 불변이다

`statusText()`·`actionLabel()`·`progressText()`·`formatBytes()`의 분기와 반환값이
바뀌지 않는다. 이관이 이 함수들을 삭제하거나 컴포넌트 안으로 인라인하지 않는다.

## CS3 — props 타입이 불변이다

`CharacterListProps`의 필드·옵셔널 여부·시그니처가 그대로다. `App.tsx`의 호출부가
한 줄도 안 바뀐다. **`tsc`가 이것을 보증한다.**

## CS4 — `testID` 7종이 그대로이고, 버튼이 자기 이름을 갖는다

`character-row-<character>` · `action-<character>` · `pause-<character>` ·
`action-vision` · `vision-row` · `download-notice` · `dismiss-notice`

**★ 동작 버튼의 `testID`는 반드시 버튼 자신에 있다** — 행에 주고 말면 안 된다.
008이 2026-08-21에 실측한 것: Maestro는 좌표상 행 안에 있는 버튼을 **접근성
트리에서는 형제로 평탄화**해 보므로 `childOf`로 좁힐 수 없다. `ListRow`로 이관할
때 행의 `testID`는 `ListRow`에, 버튼의 `testID`는 `right` 노드 안의 `Button`에
각각 준다.

## CS5 — 동작 계약이 불변이다

- 다섯 캐릭터 자리가 **처음부터 전부** 보인다(003 FR-005a) — 아무것도 준비되지
  않은 첫 화면에서도.
- `view.active`에 있는 줄만 `멈추기`를 갖는다. 그 외는 상태별 동작 버튼(008 FR-011,
  026 다중 다운로드).
- 거부 안내는 **한 번에 하나**(`view.notice`가 배열이 아님, 008 FR-006). 화면에
  지우는 코드를 두지 않는다.
- 거부는 그 줄의 **상태 표시를 바꾸지 않는다**(008 FR-007).
- 사진 모델 줄은 캐릭터 다섯 **아래에 별도로** 온다(011 FR-025) — 같은 목록에
  섞지 않는다. `visionReadiness`가 `undefined`면 줄 자체가 없다.
- `bytes > 0`일 때만 저장 공간이 보인다.

## CS6 — 원칙 III: 모델에 닿는 경로가 없다

- `CharacterListScreen.tsx`가 `models/roster`·`models/assets`·`models/expo-port`·
  `models/storage`를 import하지 않는다. `ModelAsset`·`assetFor`·`allAssets`
  식별자가 소스에 없다.
- **`checkSourceFile`의 `UI_TOUCHES_MODEL`·`UI_TOUCHES_ASSET`가 자동 검사**하므로,
  이관이 실수로 import를 들여오면 `npm run lint`가 잡는다.
- 이관은 `models/types`(`ModelReadiness`·`DownloadView`·`StorageUsage`)만 계속
  쓴다 — 이것은 상태 타입이지 자산이 아니며 이관 전에도 그랬다.

## CS7 — 원칙 III: 이름·소개를 짓지 않는다

표시 이름과 소개는 `personaOf(character)`의 `name`·`tagline`에서만 온다. 화면이
문자열을 직접 짓거나 조건으로 고르지 않는다.

## CS8 — 원칙 III: 크기·규모가 안 드러나고, 추천이 없다

- 상태 문장에 모델 크기·파라미터 수·양자화·파일 개수가 없다. `받아야 함`이지
  `3.2GB를 받아야 함`이 아니다.
- 사진 모델 줄이 **파일이 둘이라는 것을 드러내지 않는다**(011 FR-026) —
  `formatBytes`가 합산값 하나를 준다.
- 어느 캐릭터도 추천·강조·선점되지 않는다. 다섯 행이 **같은 시각적 자격**을
  갖는다 — 이관이 특정 행에만 다른 배경·테두리·순서 강조를 주지 않는다.

## CS9 — 원시 색값이 0개다

`CharacterListScreen.tsx` 소스에 `#rrggbb` 리터럴이 없다. `COLORS.*` 참조는
위반이 아니다(032 SC-001과 같은 정의).

---

## Maestro

**대상 흐름 셋** — 전부 **갱신 없이** 통과해야 한다(spec SC-004):

| 흐름 | 이 화면에서 조회하는 것 |
|---|---|
| `download-conflict.yml` | `pause-english`, `download-notice` |
| `parallel-model-download.yml` | `pause-english`, `pause-chinese`, `download-notice` |
| `photo-vision.yml` | `vision-row`, `action-vision` |

**⚠️ `diary-character-select.yml`은 이 화면과 무관하다**(research R7) — 029가
캐릭터 *선택*을 설정 탭 `AuthorPicker`로 옮겼고 그 흐름은 `author-picker`·
`author-option-<i>`만 본다. 로드맵 21번과 spec 초안이 이 흐름을 지목했으나
실측으로 정정했다.

## CS10 — 행 높이가 자동화의 스크롤 도달을 깨뜨리지 않는다

이 화면은 `App.tsx`의 `ModelSection` 안, **설정 탭의 `VisionPicker`·
`GeocodingSettingToggle` 아래**에 있다(029 SS4). 세 흐름이 전부
`scrollUntilVisible`로 찾아 들어간다.

**`ListRow`의 기본 `paddingVertical`은 14이고 현행 행은 12다.** 다섯 행 + 사진
모델 행이 각 2px씩 커지면 누적 12px이 밀리고, 025가 실측한
"`scrollUntilVisible`이 컨테이너 상단에서 멈춘다" 성질과 겹치면 그 아래 버튼이
화면 밖에 남을 수 있다 — **문안·`testID`가 전부 불변인데도 깨지는 경로**다.

**대응**: 화면이 `ListRow`에 `style`을 넘겨 세로 여백을 현행에 맞춘다
(`ListRow`가 이미 `style` prop을 받는다). `ListRow`의 기본값은 **바꾸지 않는다** —
공용 컴포넌트를 이 화면 하나 때문에 고치지 않는다.

깨지면 032 공통 원칙대로 **흐름이 아니라 구현을 고친다.** 그래도 안 되면 흐름의
스크롤 타겟만 조정하되, SC-004("무갱신 통과")가 깨진 것이므로 **명시적으로
보고**한다.

새 흐름은 만들지 않는다(spec FR-021) — 문안·`testID`가 불변이므로 검증할 새
표면이 없다.
