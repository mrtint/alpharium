# Research: 살아 있는 쓰기 등록부와 합류 (080)

설계 문서(`docs/superpowers/specs/2026-10-13-live-write-registry-design.md`)가 정한 것을 구현 수준으로 내리면서 남은 선택을 적는다. 모두 2026-10-13에 소스를 읽어 정했다 — 실측이 아닌 것은 그렇게 적는다.

## R1. 런타임은 한 번에 하나인가 — 소스 읽기

- **Decision**: 「이 런타임이 쥐지 않은 쓰기는 살아 있지 않다」를 전제로 삼는다. 등록부는 모듈 수준 값 하나다.
- **Rationale**:
  - 안드로이드 — `expo-task-manager`의 `TaskService`는 헤드리스 실행에 `HeadlessAppLoader.loadApp()`을 부르고, 구현(`expo-modules-core` `RNHeadlessAppLoader.kt`)은 `(context.applicationContext as ReactApplication).reactHost`를 `start()`한다 — 액티비티가 쓰는 그 호스트다. `invalidateApp()`은 태스크가 끝난 뒤 호스트가 액티비티에 묶이지 않았을 때만(`LifecycleState.BEFORE_CREATE`) 부순다(주석: 「The Activity would take over the ownership」).
  - `expo-background-task`의 `BackgroundTaskScheduler.runTasks()`는 `inForeground`이면 태스크를 돌리지 않는다 — 안드로이드에서 살아 있는 백그라운드 쓰기는 앱이 앞에 오기 **전에** 시작된 것뿐이다.
  - iOS — 백그라운드 실행은 앱 프로세스를 평소대로 띄운다(078: `App.tsx`가 그려진다).
  - 078 실기기(SM-S901N): 앞으로 올린 앱에서 백그라운드 실행이 이어져 끝났고 억제됐던 JS 타이머가 그 순간 발화했다 — 같은 런타임이 아니면 일어나지 않는다.
- **한계**: 직접 잰 값이 아니다. quickstart D1이 안드로이드 한 기기에서 본다(모델 적재 로그가 겹치지 않는가). iOS는 구조에 기댄다(미확인).
- **Alternatives considered**: 파일 + 런타임 표식(판정에 보태는 것이 없다), 나이 + 주기적 갱신(헤드리스·iOS 정지에서 타이머가 멈춘다) — 설계 문서 결정 4.

## R2. 등록부를 어디에 두는가

- **Decision**: `src/diary/live-write.ts`. 파이프라인에는 020의 `acquireLock?`과 같은 방식으로 **주체가 묶인 함수**(`beginWrite?: (day) => WriteHandle | null`)를 주입한다.
- **Rationale**: 등록부가 다루는 것은 「쓰기 하나」이고 파이프라인(`src/diary/pipeline.ts`)이 그것의 수명을 안다. `src/schedule/`에 두면 화면 쓰기까지 「일정」 계층에 기대게 된다(020의 `lock.ts`가 그랬다). `pipeline.ts`가 값을 import하지 않고 타입만 쓰므로 순환이 없다 — 단계 타입(`ProgressStage`·`MonologueBranch`)은 `src/inference/types`에서, 주체 타입은 079 `src/inference/assembly.ts`의 `AssemblyOwner`에서 온다.
- **Alternatives considered**: `PipelineInput`에 주체를 싣는다(020 L5가 이미 기각 — 화면·태스크가 공유하는 데이터다). 등록부를 `wiring.ts` 안에 둔다(테스트가 새 등록부를 만들 자리가 없고 `wiring.ts`가 더 커진다).

## R3. 「사용자가 그만둠」을 어떻게 실어 나르는가

- **Decision**: 실패 결과에 옵셔널 `cancelled?: true`를 붙인다(`PipelineResult`의 실패 두 갈래). 붙이는 자리는 `run()` 한 곳 — `runStages`가 돌아온 뒤 손잡이의 `isCancelled()`를 본다.
- **Rationale**: 끊긴 쓰기는 두 길로 끝난다 — 엔진이 멈춰 `generation` 실패(`interrupted: …`)로 돌아오거나, 생성이 이미 끝나 저장 직전 확인(071)에 걸리거나. 두 길 모두 `run()`을 지나므로 한 곳에서 붙이면 된다. 문구를 비교하지 않고(054·060의 규칙), `PipelineStage`를 늘리지 않는다(071 — 화면의 실패 갈래 표가 stage를 센다).
- **쓰기 실패 기록**: `write-failures.ts`의 `isRecordable()`이 `cancelled`를 거른다 — 태스크·첫 실행 자동 첫 일기·홈이 모두 그 함수를 지나므로 세 곳을 따로 고치지 않는다.
- **홈이 시작한 쓰기의 그만두기는 그대로다**(071의 시도 번호) — 홈은 자기 시도를 스스로 가리므로 등록부의 그만둠을 세우지 않는다. 결과에 `cancelled`가 붙지 않아도 홈이 먼저 거른다.
- **Alternatives considered**: 새 stage `"cancelled"`(실패 갈래 표·007/009/012의 stage 세기 테스트가 모두 움직인다), `done`의 값만으로 전달(태스크는 `pipeline.run()`의 반환값을 본다 — 등록부를 따로 들여다봐야 한다).

## R4. 홈은 언제·어떻게 합류하는가

- **Decision**: 057 자동 시작 effect 옆에 합류 effect를 둔다. 조건은 057과 같은 목록(목록을 읽음·목록 상태·덮이지 않음·대화상자 없음·판정 없음)에 「칸에 쓰기가 있고 홈의 `running`이 거짓」을 더한 것이다. 등록부의 변화는 `onChange` 구독이 화면 상태(번호 하나)를 올려 effect를 다시 돌린다.
- **합류한 상태의 표현**: 화면 상태는 054의 `{ kind: "writing" }` 그대로이고, 합류한 쓰기는 ref 하나(`joined`)가 든다. **`running`을 세우지 않는다** — 그 ref는 「앞을 벗어나면 끊는다」(005)와 지우기 응답(058)이 「홈이 시작한 쓰기」를 가리는 데 쓴다. `AppScreen`을 넓히지 않는다(054 — `toWriting()`의 키가 `kind`뿐임을 007·009·012가 잠근다).
- **혼잣말**: 홈의 `generate()` 안에 있는 「단계 → 줄」 갱신을 함수 하나로 뽑아 두 길이 같이 쓴다. 합류 시점에 `progress()`가 있으면 그 단계로 한 번 부른다.
- **끝 처리**: `done`이 풀리면 목록을 다시 읽어 목록 상태로 돌린다. 실패 뒤의 「이어 쓰기」는 새 코드가 아니다 — 화면이 목록 상태로 돌아오면 057 effect가 다시 판정하고, 조립부가 넘겨 둔 `autoWriteDay`가 아직 안 쓴 날이면 `claimAutoWrite()`를 얻어 쓴다. 그만둔 경우에는 합류 쪽이 먼저 `claimAutoWrite()`를 불러 소모한다.
- **effect 순서**: 같은 렌더에서 057 effect와 합류 effect가 함께 돌 수 있다 — 057 effect와 018 미리 준비 effect 둘은 「남의 쓰기가 칸에 있으면 아무것도 하지 않는다」를 맨 앞에서 본다(H8). 순서에 기대지 않는다(055의 `BackHandler` 교훈).
- **Alternatives considered**: 합류 전용 화면 상태(`AppScreen` 넓히기 — 위 계약 테스트와 부딪힌다), 조립부(`App.tsx`)가 합류를 판정해 prop으로 내림(057의 `autoWriteDay`처럼 — 덮임·대화상자 조건을 홈이 다시 봐야 해서 두 곳에 나뉜다).

## R5. 지우기가 남의 쓰기를 멈추는 자리

- **Decision**: `wipeDiaries()` 안. 칸에 쓰기가 있으면 `cancel()` → `await done` → `beginWipe()`.
- **Rationale**: `requestWipe`(App.tsx)는 먼저 `stopHome()`으로 홈이 시작한 쓰기를 멈춘다(058 — 그대로). 그 뒤 칸에 남은 쓰기는 정의상 남의 것이다. `wipeDiaries`는 통로를 주입받는 조합 함수라 기기 없이 순서를 테스트할 수 있다.
- **합류해 있던 홈**: 지우기가 끊으면 홈의 합류는 `cancelled`로 끝난다(H7). 지운 뒤 `App.tsx`가 홈을 다시 마운트하므로(058 `diaryKey`) 늦게 온 끝은 버려진다(H10).
- **Alternatives considered**: 홈의 지우기 응답(058 effect)이 합류한 쓰기도 끊는다 — 홈이 합류하지 못한 경우(덮여 있었다)를 못 덮는다.

## R6. 완성 알림과 합류

- **Decision**: 바꾸지 않는다. 합류한 쓰기가 백그라운드 것이면 태스크가 종전대로 완성 알림을 보낸다. 홈이 그 일기를 보이면 051의 확인 규칙이 그대로 적용된다.
- **Rationale**: 알림은 「백그라운드가 썼다」는 사실의 표시이고 태스크의 일이다. 주인이 지켜보는 중이었다고 지우면 「합류했는가」를 태스크가 알아야 한다(등록부에 구독자 수 같은 것을 두게 된다).
- **실기기에서 볼 것**: 앱이 앞에 있을 때 그 알림이 어떻게 보이는지(quickstart D1 — 본 대로 적는다).

## R7. 남는 파일과 옛 문서

- **Decision**: 기기의 `locks/diary-generation.lock`을 지우는 코드를 넣지 않는다. 020 `generation-lock.md`와 079 `assembly.md` L절은 머리에 「080으로 대체됨」을 적고 본문은 둔다.
- **Rationale**: 읽는 쪽이 없는 파일은 무해하다(042 `vision-setting.json` 선례). 한 번 지우려고 파일 통로를 남기면 「잠금 파일에 닿는 코드 0」(SC-006)이 깨진다. 층 1 기준 상태 스크립트(`scripts/layer1/`)는 `preferences/`와 `diary/`만 다루고 `locks/`를 모른다(확인함).

## R8. 도구

- 이 맥에는 `pwsh`가 없어 `.specify/scripts/powershell/*.ps1`이 돌지 않는다. 경로는 `.specify/feature.json`에서 읽고 템플릿은 손으로 옮겼다.
- 실기기는 AGENTS 「079」의 맥 절차 — `adb`는 `~/Library/Android/sdk/platform-tools`, 기기의 debug APK를 그대로 두고 `adb reverse tcp:8081 tcp:8081` + 맥의 Metro(`.env.development.local`의 `EXPO_PUBLIC_APP_ENV=dev`). 네이티브 의존성은 바뀌지 않는다.
