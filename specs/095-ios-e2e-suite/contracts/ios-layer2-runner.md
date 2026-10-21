# Contract: iOS 층 2 실행기 (`npm run test:layer2:ios`)

073 `layer2-runner.md`(L2-0~L2-8)의 iOS 실기기 판이다. Maestro를 쓰지 않는다.

- **L2-0**: 「층 2는 전용 iPhone에서만 돈다 — 이 기기의 일기를 지우고 실제 모델로 쓴다. 사진 보관함에 합성 사진이 남는다」 안내.
- **L2-1**: `devicectl`이 없거나 연결된 iPhone이 없으면 skipped. 둘 이상이면 aborted. 개발 서명 빌드가 아니면(컨테이너에 닿지 못하면) aborted.
- **L2-2**: 모델 세 파일이 있고 0바이트가 아니다(실측: 내려받기 중에 0KB 파일이 보였다). 아니면 aborted — 모델을 받지 않는다.
- **L2-3**: 흐름마다 순서를 고정한다 — (1) `prepareBaseline`으로 기준 상태(자동 쓰기 꺼짐)를 만든다(앱은 `process launch --terminate-existing`로 끄고, 파일 삭제는 디렉터리 단위 교체로 한다 — data-model 「IosDeviceTarget」), (2) 사진이 필요한 흐름은 `ios:seed`를 부른다 — Xcode가 켜져 있으면 먼저 알려 중단한다(087). 시딩이 앱을 새로 띄우므로(087) 이 시점의 설정은 자동 쓰기 꺼짐이어야 한다, (3) 시딩 뒤 앱을 끈다, (4) 흐름별 덮어쓰기(자동 쓰기 켜짐 등)를 적용한다. **시딩은 같은 날 한 번만**: `.cache/layer2-ios/seeded.json`에 심은 날짜를 적어 같은 날 재실행에서는 건너뛴다(보관함에서 지우는 통로가 없어 중복이 쌓인다, 087). 사진은 어제 5장(위치 포함, 층 1 표본 카탈로그 `.cache/e2e-sample/`의 카메라 사진)이다.
- **L2-4**: 앱을 띄운다(`devicectl device process launch`).
- **L2-5**: `humanSteps`가 있으면 번호 매긴 안내문을 출력하고 사람이 조작을 마친 뒤 Enter를 누를 때까지 `operationTimeoutMs`(5분) 기다린다. Enter가 없으면 `failed-operation-timeout`이다. 표준 입력이 터미널이 아니면 aborted. 없으면 「사람 조작 없음 — 앱이 알아서 쓴다」.
- **L2-6**: Enter 뒤(자동 흐름은 앱 실행 뒤) 5초마다 `Documents/diary/<날짜>.json`을 본다. `generationTimeoutMs`(10분) 안에 파일이 안 생기면 `failed-generation-timeout`(쓰기가 끝나지 않았다). 쓰는 중은 파일로 안 보이므로 중간 상태는 단언하지 않는다(research R7).
- **L2-7**: 파일이 생기면 정상 형식(JSON, 본문 비어 있지 않음, 날짜가 맞음 — 점수화 없음)을 확인하고 `write-failures.json`에 새 항목이 없는지 본다. 있으면 failed와 그 이유 갈래.
- **L2-8**: 일기 파일을 `.cache/layer2-ios/<시각>/`로 가져온다 — 출력일 뿐이고 판정을 바꾸지 않는다. 끝에 기준 상태로 되돌린다.
- **I-1**: 장치 구현에 앱 삭제·재설치·모델 삭제 연산이 없다(소스 계약 테스트).
