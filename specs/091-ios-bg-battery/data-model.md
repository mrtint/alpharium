# Data Model — 091

시도 기록 줄(078·090)에 옵셔널 `wake: "power" | "battery"` — 백그라운드 시작 줄에만, 끝으로 바뀌어도 남는다. 두 값 밖·없음은 필드 없이 읽는다. 화면 꼬리: `launch` 꼬리 뒤에 「· 충전」/「· 배터리」.
네이티브: `UserDefaults` `pocketlog.bgWakeIdentifier`(문자열, 마지막으로 깬 식별자).
