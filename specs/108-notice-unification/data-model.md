# Data Model: 제약 띠

저장하는 데이터가 없다. 메모리 상태와 판정 입출력뿐이다.

- **ConstraintKind**: `"photos" | "battery"` — 띠 없음은 `null`.
- **판정 입력**: `{ photoDenied: boolean | undefined, platform: AppPlatform, autoWriteEnabled: boolean | undefined, battery: BatteryExceptionStatus }`. `undefined`·`unknown`은 「모름」이며 해당 띠를 만들지 않는다.
- **판정 출력**: `photoDenied === true` → `"photos"`; 아니면 `platform === "android" && autoWriteEnabled === true && battery === "restricted"` → `"battery"`; 그 밖 `null`.
- **띠 내용(화면 입력)**: `{ text: string; action: string; onAction: () => void }` — 문구는 카탈로그 `home.constraintBand[kind]`.
- **훅 상태**: 마지막으로 읽은 `BatteryExceptionStatus`(메모리). 앞 복귀 때 갱신. 파일 없음.
