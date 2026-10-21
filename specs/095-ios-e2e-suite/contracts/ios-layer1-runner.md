# Contract: iOS 층 1 실행기 (`npm run test:layer1:ios`)

069 `layer1-runner.md`(L0~L7, I-1~I-7)를 iOS 시뮬레이터로 옮긴 것이다. 번호가 같은 항목은 같은 뜻이다.

- **L0**: 「층 1은 전용 시뮬레이터에서만 돈다 — 이 시뮬레이터 앱의 일기를 지운다」 안내 한 줄.
- **L1**: `xcrun`·`simctl`이 없거나, 부팅된 iOS 시뮬레이터가 없거나, Maestro가 없으면 **skipped**와 이유(통과 아님). 부팅된 시뮬레이터가 둘 이상이면 **aborted**(임의로 고르지 않는다 — `--device`/환경변수 지정은 없다, 하나만 남긴다).
- **L2**: 앱 데이터에 닿는다(컨테이너 경로를 찾고 `Documents/`가 있다). 못 닿으면 aborted와 이유(앱 미설치 포함).
- **L3**: 모델 세 파일(`ESSENTIAL_ASSET_KEYS`)이 `Documents/models/`에 있다. 없으면 aborted — 모델을 받지 않는다.
- **L4~L6**: 앱을 끄고(`simctl terminate`) 설정 기준값·일기 픽스처·사진 사본을 만든다. `prepareBaseline`을 그대로 쓴다.
- **L7**: 흐름 전부를 `maestro --device <UDID> test` 한 번에 돌린다. 하나라도 실패면 failed와 실패 흐름 이름.
- **I-1**: 이 장치 구현에 앱 삭제·재설치·`erase`·모델 삭제 연산이 없다(`__tests__/e2e/ios-layer1-source-contract.test.ts`가 소스를 읽어 잠근다).
- **S (표본)**: 흐름 앞에 30일 표본을 보장한다(070). 시뮬레이터 보관함이 표본과 어긋나면 지우지 않고 aborted(research R4)한다. 권한은 `simctl privacy grant`.
- **보고**: 끝 줄에 「시뮬레이터 결과 — 실제 iPhone을 말해 주지 않는다」를 덧붙인다.
