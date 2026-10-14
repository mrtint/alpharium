# Research: 앱 열기 자동 쓰기의 「한 번」과 넘겨 둔 날 (082)

R1·R2는 실기기에서 본 것이고(2026-10-14, SM-S901N dev, `main` 17ebdc5), 나머지는 이 저장소의 소스를 읽은 것이다.

## R1 — 결함 A는 「비우는 길이 없다」에서 난다 (재현함)

- **본 것**: 자동 쓰기 꺼짐 → 설정에서 켬 → 끔 → 뒤로 가기. 홈이 어제의 「쓰는 중」이 됐고 약 50초 뒤 저장됐다. 그때 `auto-diary.json`은 `{"enabled":false,"targetHour":22}`, 시도 기록은 `꺼짐` → `홈에 넘김` → `꺼짐`.
- **읽은 것**: `App.tsx` `DiarySection`의 판정 effect가 `decision.kind === "write"`일 때만 `setAutoWriteDay(decision.day)`를 부른다. 그 밖의 판정은 값을 건드리지 않는다. 홈의 057 effect는 `autoWriteDay`가 있고 `covered`가 풀리면 시작한다.
- **Decision**: 넘겨 둔 날을 「판정의 결과 + 그 판정을 낳은 설정」의 짝으로 들고, 지금 설정과 같을 때만 홈에 준다(R3).

## R2 — 결함 B는 다시 마운트된 판정 + 남은 「한 번」에서 난다 (재현함)

- **본 것**: 어제가 써진 상태로 앱을 새로 열고 자동 쓰기를 켬(판정 `재료 없음` — 그저께) → 「일기 모두 지우기」 확인. 0편이 된 직후 홈이 어제의 「쓰는 중」. 시도 기록 맨 위 `홈에 넘김`.
- **읽은 것**: `requestWipe`가 `busy`가 아니면 `setDiaryKey`로 `DiarySection`을 다시 마운트한다. 새 판정은 방금 지운 어제를 「안 쓴 날」로 본다. `autoWriteClaimed`는 `AppFrame`의 ref라 다시 마운트에 남고, 그 실행에서 홈이 시작한 적이 없으면 거짓이다.
- **Decision**: `requestWipe`가 `setDiaryKey` 앞에서 「한 번」을 소모한다(소유자 결정).
- **Alternatives considered**: 넘겨 둔 날을 지우기 때 비운다 — 다시 마운트된 판정이 곧바로 다시 세우므로 막지 못한다. 지운 시점을 저장해 그 이전의 날을 자동으로 쓰지 않는다 — 판정 입력과 새 기록 파일이 필요하고 소유자가 고르지 않았다.

## R3 — 설정이 바뀐 순간과 새 판정 사이의 틈은 렌더에서 막는다

- **읽은 것**: `resolveAutoWrite`는 꺼진 설정이어도 `await deps.listDiaryDays()`를 먼저 지난다 — 「꺼짐」 판정도 비동기다. 설정 겹이 닫히는 동안(240ms) 홈은 `covered`지만 파일 읽기가 그 안에 끝난다는 보장이 없다. effect 본문에서 `setState`로 비우는 것은 `react-hooks/set-state-in-effect`에 걸린다.
- **Decision**: state는 `{ day, settings }`이고, 돌려주는 값은 `handed.settings === 지금 설정`일 때만 `handed.day`다. 설정 객체가 바뀐 그 렌더부터 새 판정이 반영될 때까지 `null`이다 — 타이밍에 기대지 않는다.
- **근거**: effect의 의존성이 이미 설정 객체의 참조다(`autoDiarySettings`). 「참조가 바뀌면 판정을 다시 한다」와 「참조가 다르면 옛 결과를 안 쓴다」가 같은 기준을 쓴다.
- **확인할 것(구현 때)**: `settingsValues.autoDiary`가 자동 쓰기와 무관한 변경(장소 이름 등)에서 새 객체가 되는가. 되더라도 틀리지 않다(판정이 다시 돌고 그 사이만 `null`) — 다만 그 경우 홈이 덮여 있지 않으면 한 박자 늦게 시작할 뿐이다.

## R4 — 겹친 판정은 늦게 시작한 것만 반영한다

- **읽은 것**: 한 effect 안에서 `check()`는 마운트 때와 `AppState → active`마다 돈다. 둘이 겹치면 먼저 시작한 것이 늦게 끝나 최근 결과를 덮을 수 있다(지금은 「쓴다」만 반영해 드러나지 않았다 — 비우기 시작하면 「쓴다」를 옛 「쓰지 않는다」가 덮을 수 있다).
- **Decision**: effect 인스턴스마다 번호를 올리고, 자기 번호가 최신일 때만 넘겨 둔 날에 반영한다. **시도 기록은 순서와 무관하게 남긴다**(078 — 판정에 들어갔다는 사실). 사진 권한 건너뜀 알림(`onSkipped`)은 지금처럼 effect가 살아 있을 때만.

## R5 — 「한 번」을 소모하는 자리와, 080이 기대는 것

- **읽은 것**(`App.tsx`·`DiaryHomeScreen.tsx`): 소모하는 자리는 (1) 홈이 실제로 시작할 때의 `claimAutoWrite()`, (2) 064 흉내가 켜졌을 때의 effect, (3) 080 합류가 끊겼을 때 `claimRef.current?.()`. 읽기만 하는 자리는 040 `autoGenerateTried`.
- **080 「실패 뒤 이어 쓰기」**는 넘겨 둔 날이 남아 있고 「한 번」이 남아 있어야 돈다. 쓰는 중인 날은 일기 목록에 없으므로 전경 복귀 판정도 같은 날을 준다 — R1의 비움이 이것을 깨지 않는다. 지우기가 소모한 실행에서는 이어 쓰지 않는다(spec Edge Cases — 받아들였다).
- **Decision**: `spendAutoWrite()`를 더한다 — 묻지 않고 소모만 한다(`claimAutoWrite()`를 불러 버리는 것과 달리 「흉내 기록을 읽기 전」에도 소모한다. 지우기는 사용자의 명시적 행동이라 읽기를 기다릴 이유가 없다).

## R6 — 두 규칙을 훅으로 뗀다 (소유자 승인)

- **읽은 것**: `App.tsx`는 테스트에서 렌더되지 않는다. 057·064의 방어는 소스 정규식이다(`app-auto-write-source.test.ts` OP1, `simulation-wiring.test.ts` AF3·AF4). `src/app/use-consent-gate.ts`(074)가 「조립부의 상태를 `src/app/` 훅으로 떼고 `.tsx` 테스트로 돌린다」의 선례다. `src/app/` → `src/schedule/` import는 이미 있다(`wipe-diaries.ts`·`auto-write-attempts.ts`).
- **Decision**: `src/app/use-auto-write-handoff.ts`와 `src/app/use-auto-write-claim.ts`. 훅 단위 테스트와, 두 훅 + 진짜 `resolveAutoWrite` + 진짜 홈 + 진짜 파이프라인·등록부를 묶은 조립 테스트를 쓴다.
- **옮길 때의 규칙**: 057·064 소스 계약은 읽는 파일만 바꾸고 단언을 줄이지 않는다. `resolveAutoWrite(`를 부르는 곳이 `src/`와 `App.tsx`를 통틀어 화면 경로에서 한 곳(훅)뿐임을 계속 센다.
- **남는 한계**: `requestWipe`의 순서(소모 → 다시 마운트)와 「`DiarySection`이 훅의 결과를 홈에 넘긴다」는 여전히 `App.tsx` 소스 계약으로만 잠긴다. 조립 테스트의 하니스는 그 두 줄을 흉내 낸다.

## R7 — 테스트 수단

- 훅 테스트는 RNTL 14 `renderHook`(Promise — `await`)과 `rerender`로 설정 참조를 바꾼다(`use-consent-gate.test.tsx`와 같다). `AppState` 재판정은 `jest.spyOn(AppState, "addEventListener")`로 받은 콜백을 직접 부른다(복원하지 않는다 — AGENTS).
- 「쓰기가 시작되지 않았다」는 가짜 백엔드의 `generate` 호출 횟수와 등록부의 칸으로 단언한다(spec FR-014). 판정이 끝났음은 시도 기록 대역의 호출로 기다린다 — 시간을 기다리지 않는다.
- 조립 테스트의 「지금」은 주입한다(`now` — 목표 22시·실제 오전이면 어제가 창 밖 따라잡기 대상이다, 재현 조건과 같다).
