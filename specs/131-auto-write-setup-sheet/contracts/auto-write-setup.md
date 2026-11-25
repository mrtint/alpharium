# Contract — 자동 쓰기 설정 창

## shouldShowAutoWriteSetup(input) → boolean (순수, `src/app/auto-write-setup.ts`)

입력: `homeReady`(첫 실행 단계 판정이 `done`이고 홈이 보임), `flagLoaded`, `pending`, `firstDiaryEntered`(이번 실행에서 첫 일기 흐름에 들어갔나), `firstDiaryDone`(`step === "done"`), `writing`, `otherDialogOpen`.
참 ⇔ homeReady ∧ flagLoaded ∧ pending ∧ (¬firstDiaryEntered ∨ firstDiaryDone) ∧ ¬writing ∧ ¬otherDialogOpen.

## confirmAutoWriteSetup(choice, current, deps) (순수 조립)

- `choice = { enabled, targetHour }`.
- targetHour ≠ current.targetHour → `applyTargetHour`.
- enabled → `applyToggleOn`. ¬enabled ∧ current.enabled → `applyToggleOff`.
- 끝나면 대기 false 저장. 저장 실패해도 창은 닫는다(다음 실행에 다시 뜰 수 있음 — 허용).

## AutoWriteSetupDialog props

`visible, platform, enabled, targetHourText, batteryTag?: "allowed"|"denied"|undefined, onToggle, onPickHour, onOpenBattery, onConfirm, onLater`.
문구는 카탈로그 `autoWriteSetup.*`: title · rowAuto · rowHour · rowBattery · conditionIos · conditionAndroid · confirm · later.
