# 계약: 층 2 실행기 (`scripts/layer2/runner.ts`)

069 `layer1-runner.md`(L0~L7, I-1~I-7)를 따르고 아래만 다르다. 기기는 `Layer2Device`로 주입된다.

- **L2-0**: 시작할 때 「전용 테스트 기기에서만 돈다 — 이 기기의 일기를 지운다」를 출력한다(FR-007). 확인 질문 없음.
- **L2-1**: adb 없음/기기 0대/Maestro 없음 → `skipped`. 기기 2대 이상 → `aborted`(표본 규칙, 070).
- **L2-2**: 표본 보장(070 `SampleStep`)이 먼저. 실패하면 `aborted`.
- **L2-3**: 프로브(`run-as`)·모델 존재 점검 실패 → `aborted`. 모델은 읽기만(I-1).
- **L2-4 (흐름마다 반복)**: 앱 종료 → 기준 상태(`prepareBaseline`, 층 1과 같은 `BASELINE`) → 흐름의 `preferenceOverrides`·`deleteFiles` 적용 → 일기 픽스처에서 `absentDays` 제거한 것 심기 → `maestro test <흐름 1개> -e …` 실행 → 흐름의 `writtenDay` 일기 가져오기.
- **L2-5**: 한 흐름이 실패해도 다음 흐름으로 간다. 끝에 흐름별 상태를 표로 출력한다.
- **L2-6**: **보고서에 실패한 흐름 이름이 없는데 종료 코드가 0이 아니면**(= `DeviceServerDiedException` 등 Maestro 기기 서버가 죽은 실패) 같은 흐름을 기준 상태부터 한 번만 다시 돌린다(AGENTS 「Maestro」). 보고서에 실패 이름이 있으면 진짜 실패라 다시 돌리지 않는다.
- **L2-7**: 마지막 흐름 뒤 기준 상태를 한 번 더 만든다(FR-016) — 설정을 바꾼 채 끝나지 않게.
- **L2-8**: 가져오기 실패는 경고만 출력하고 판정에 영향이 없다(출력일 뿐이다). 일기를 채점·비교하지 않는다(IV).
- **금지(소스 계약)**: `pm clear`·`install`·`uninstall`, `judge`·`score`·`similar` 등 채점 어휘, 일기 `text` 필드를 읽는 코드.

## 테스트 (T-)
- T-1 기기·Maestro 없음 → skipped. T-2 모델 없음 → aborted, 흐름 0개 실행. T-3 흐름 4개가 각각 기준 상태 재생성을 거친다(호출 순서 기록). T-4 흐름 하나 실패해도 나머지 실행, 전체 failed. T-5 서버 죽음 한 번 재시도. T-6 가져오기 실패해도 passed 유지. T-7 마지막에 기준 상태 복원.
