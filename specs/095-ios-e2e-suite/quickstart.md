# Quickstart: iOS e2e 세트 (095)

구현이 끝난 뒤 이 기능을 확인하는 절차다. 명령 이름은 계획이며 구현에서 확정한다.

## 전제 (공통)

- Xcode 27.1(`DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`), Maestro 2.11.0, Node 22+.
- 앱은 dev 환경 번들을 쓴다 — 저장소의 gitignore된 `.env.development.local`에 `EXPO_PUBLIC_APP_ENV=dev`가 있고 Metro가 떠 있다(AGENTS).

## A. 층 1 — iOS 시뮬레이터

1. 전용 시뮬레이터 하나만 부팅한다: `xcrun simctl boot <UDID>`. 앱(dev 클라이언트)이 설치돼 있어야 한다.
2. 시뮬레이터 모델 파일: 앱의 첫 실행 내려받기로 한 번 받거나 이미 받은 사본을 복사한다(research R5). 확인: `Documents/models/`에 `a1.bin`·`v1.bin`·`v2.bin`.
3. 실행: `npm run test:layer1:ios`.
4. **기대**: 끝에 `PASSED`, 모든 흐름 PASS. 시뮬레이터가 없거나 모델이 없으면 `SKIPPED`/`ABORTED`와 이유(통과가 아니다).
5. **음성 확인(위반 주입)**: 흐름 하나가 기대하는 화면 요소 id를 일부러 바꿔 실행하면 `FAILED`와 그 흐름 이름이 나온다. 확인 뒤 되돌린다.
6. **일기 안 씀 확인**: 실행 뒤 `Documents/diary/`가 픽스처 사흘뿐이다(SC-003).
7. 소요 시간을 기록한다(SC-006, CI 판단 근거) — 분 단위, 모델 없이 닿는 화면 범위 메모.

## B. 층 2 — iPhone 14

1. iPhone이 맥에 연결돼 잠금이 풀려 있다. **Xcode를 끈다**(087). 개발 서명 빌드가 깔려 있다.
2. 모델이 받아져 있다: 컨테이너 `Documents/models/`의 세 `.bin`이 0바이트가 아니다. (2026-10-22 실측: `v1.bin`이 0KB — 먼저 모델을 받아 둔다.)
3. 사진 읽기·쓰기 권한이 허용돼 있다(`ios:seed` 전제, 087).
4. 실행: `npm run test:layer2:ios`. 흐름마다 안내가 나오면 그대로 하고 **조작을 마치면 터미널에서 Enter를 누른다**(쓰는 중은 파일로 안 보여서 실행기는 이것으로 조작이 끝난 줄 안다):
   - `open-app-writes`: 아무것도 누르지 않는다.
   - `write-and-read`: 앱이 뜨면 어제를 골라 「쓰기」를 누르고 앱을 앞에 둔다.
   - `diagnostics-try-write`: 설정 → 개발자 → 진단 → 「한 번 써 보기」.
   - `first-run-auto-diary`: 작명 화면에서 이름을 입력하고 완료한다.
5. **기대**: 흐름마다 PASS, 끝에 `.cache/layer2-ios/<시각>/`의 일기 파일 경로가 출력된다. 본문을 사람이 읽는다(원칙 II·IV).
6. **음성 확인**: `--operation-timeout 5 --generation-timeout 5`로 Enter를 안 누르면 `failed-operation-timeout`, Enter만 누르고 쓰기를 안 하면 `failed-generation-timeout`이 나온다.

## C. 문서·계약 확인

- `npm test`·`npm run lint` 통과. 대응표 iOS 열 확인.
- 흐름 하나를 등록에서 빼 보면 `__tests__/e2e/flow-map.test.ts`가 실패한다(SC-004).

## D. CI 판단 기록

층 1 소요 시간과 모델 없이 닿는 화면 범위를 로드맵 과제 항목에 한 줄 남기고 CI 도입 여부(권장: 로컬 유지, 모델 2GB와 macOS 러너 시간)를 적는다.
