# Contract: 훑기 (SW)

- **SW1**: 후보 = `decideSchedule`의 `days`. 순서는 최근→과거.
- **SW2**: 후보 순서대로 `previewDay` → 사진 권한 거부면 `saveSkippedDay(그 날)` 후 `skip no-photo-access(그 날)`로 끝.
- **SW3**: `decideAutoWrite`가 `write`면 그 날로 끝. `skip no-material`이면 다음 후보.
- **SW4**: `previewDay` 예외는 그 후보를 건너뛴다(재료 있음 단정 금지). 읽힌 후보가 0이고 예외가 있으면 첫 예외를 던진다.
- **SW5**: 끝까지 못 쓰면 `skip{day: 첫 후보, because: "no-material"}`.
- **SW6**: 후보가 하나면 종전과 같은 결과(예외 포함).
- **SW7**: 재료 없음·모름을 어디에도 저장하지 않는다.
- **AT1**: 시도 줄 `day`는 선택 필드, 옛 줄은 날 없이 읽힌다. 결과 갈래 수 불변.
- **AT2**: 쓰기로 정해진 시도(`decision.kind==="write"`)의 끝 줄만 `day`를 갖는다. 합치기는 날까지 같을 때만.
