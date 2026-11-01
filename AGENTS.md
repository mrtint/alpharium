# 헌법을 먼저 읽는다

이 프로젝트가 무엇이고 무엇을 지켜야 하는지는 [.specify/memory/constitution.md](.specify/memory/constitution.md)에 있다. **작업을 시작하기 전에 그것을 읽는다.** 이 문서는 헌법을 요약하지 않으며, 헌법이 담지 않는 실무 사실만 남긴다. 둘이 어긋나면 헌법이 우선한다.

한 줄로 말하면: **주인의 휴대폰이 화자가 되어 하루를 일기로 쓰는 앱**이다. 사람이 쓰는 일기가 아니다. 나머지는 헌법에 있다.

**이 문서에는 지금도 유효한 결론과 아직 남은 위험만 주제별로 둔다.** 기능별 상세 실측 로그와 설계 이력은 `specs/0xx-*/`와 git 히스토리에 있다. **뒤의 기능이 앞의 결정을 뒤집으면 앞의 서술을 주석으로 덧대지 않고 고치거나 지운다.**

## 저장소의 현재 상태

- **패키지·이름**: 포켓로그(Pocketlog), `com.a810labs.pocketlog`(065).
- **온디바이스 일기 생성**: 프롬프트 조립(`src/diary/prompt.ts`, 원본 `my-ollama` `hand-prompt/v5`, `~요`체, 날짜별 첫 문장 틀 11개, 077) → `llama.rn` 추론(`root ::= [^A-Za-z]*`) → 4갈래 판정(`empty`/`echo`/`language`/`unfinished`, `acceptance.ts`) → 2차 호출 제목 질문(`title.ts`) → 저장. 사진이 있는 날은 VLM이 캡션을 읽는다(011·042, 1024px 리사이즈 013, 시간 분포·잡사진 제외 상한 8장 023).
- **캐릭터 페르소나**: 검증 로스터는 `quiet`(`kanana-1.5-2.1b`, 기본 이름 금동이) 하나다(037). 다중 캐릭터 계약은 `__tests__/future-character.ts`의 `FUTURE_CHARACTER`로 잠근다.
- **첫 실행**: 스플래시·로고 → 권한 순차 요청(`photos`·`photo-location`·`location`·`notifications`·`battery-exception`, 021·043) → 필수 모듈(~2GB) 동의(본문에 받을 양 — 못 읽거나 0MB면 양 없이, 095; `CELLULAR`일 때만 모바일 데이터/나중에 받기, 045·074) → 진행 슬라이드(046) → 작명(보드 `1a`, 047) → 정상 동작 확인(liveness) → 자동 첫 일기(040).
- **홈(Modernist)**: 탭 줄 없음(048). **안내·알림은 다섯 갈래뿐이고 갈래마다 자리가 정해져 있다**(108, `design/DESIGN.md` 「안내·알림 방식」) — 스트립 아래에는 아무것도 쌓지 않는다. 일기를 쓰기 전에 막힌 조건(사진 권한 거부·안드로이드 자동 쓰기 켬 + 배터리 제한)은 쓰기 바 위의 **제약 띠**(`src/ui/components/ConstraintBand.tsx` — 한 줄 글자 + 채운 버튼 하나, 닫기 없음, 사진 권한이 먼저, 판정 `src/app/constraint-band.ts`)로, 캐릭터 대체 안내는 토스트로 보인다. 소스 계약 `__tests__/config/notice-rules.test.ts`가 잠근다. **실기기(SM-S901N, 2026-11-01)**: 띠·버튼·토스트 겹침·쓴 날 스크롤·글꼴 2.0배(띠 한 줄, 쓴 날 첫 화면 본문 3줄)를 봤다. 배터리 띠의 「설정 열기」는 삼성 「배터리 사용 관리」 앱 목록을 연다(예외 목록 화면이 아니다 — 기기 쪽 결정). 사진 권한을 바꾸면 OS가 앱을 다시 띄워 같은 프로세스에서 띠가 사라지는 것은 못 본다. **(2026-11-02)** 자동 쓰기를 끈 뒤 띠 사라짐과 토스트 약 3초 뒤 띠 복귀는 확인했고, 작은 화면은 가상 크기(360×640dp)로만 봤다(실제 작은 기기는 미확인, 글꼴 2.0배에서 띠 글이 말줄임표로 잘린다 — `specs/108-notice-unification/quickstart.md`). 주간 스트립·달력(`DateJumpDialog`)으로 모든 지난날과 오늘을 고른다(자정 00:00 경계, 049·050). 안 쓴 날은 사진·장소 재료와 쓰기 전 확인(053), 쓰는 중은 제자리 쓰기·혼잣말·그만두기·실패 토스트(054), 쓴 날은 순환 사진 캐러셀(탭 시 확대 뷰어, 067)과 본문·스크롤 접힘(051·052)을 그린다.
- **살아 있는 쓰기 등록부**: 프로세스 안의 쓰기·지우기는 메모리 등록부 하나(`src/diary/live-write.ts`)가 안다(080 — 잠금 파일·낡음 시간 폐지). 남의 쓰기 도중에 앱을 열면 홈이 「쓰는 중」으로 합류하고, 실패하면 이어서 한 번 새로 쓴다 — 「한 번」을 이미 소모한 오래 사는 iOS 프로세스에서도 홈이 `onJoinedWriteFailed`로 `rearmAutoWrite`를 불러 「한 번」을 한 번 다시 연다(106, 사용자가 그만둔 쓰기는 다시 열지 않는다). `load()`는 도착 순서대로 직렬화돼(106, `llama-port.ts`) 앱 열기·백그라운드·진단 실행이 겹쳐도 모델이 둘 열리지 않는다. **지운 날을 백그라운드가 다시 쓰는 것은 의도된 동작이다**(자동 쓰기를 켠 사용자의 약속은 안 쓴 날을 따라잡는 것 — 082는 지운 직후 눈앞에서 다시 쓰는 것만 막았다, 106이 닫음). 018 미리 준비의 홈 입력(`prepare`·`release`·`captionDay`·`canPrepare`)은 앱이 한 번도 연결하지 않아 걷었다(106) — 엔진의 `prewarm`·`on-device`의 `prepare()`는 그대로 남아 있고 쓰는 곳이 없다.
- **iPhone 이어 하기(092)**: 홈이 시작한 iOS 쓰기(「쓰기」·057 앱 열기·085 알림 누름)는 iOS 26 `BGContinuedProcessingTask`를 신청해(`modules/pocketlog-continued-write/`, `src/app/continued-write.ts`) 앱을 나가도 충전 없이 끝까지 쓰고 완성 알림을 띄운다(iPhone 14, 사진 6장 약 23분). 안드로이드·첫 실행 자동 첫 일기·진단·백그라운드는 신청하지 않는다. 상세는 아래 「iPhone 이어 하기」.
- **빠른 주기(106, 개발 빌드 전용)**: 「하루」를 N분(5~180, 프리셋 10·30·60) 주기로 줄여 자동 쓰기·쓸 차례 알림을 하루에 여러 번 확인하는 도구다. **일기를 지우는 기능이라 판정에 성공한 개발 환경(local·dev)에서만 읽고 쓴다**(`allowsFastCycle(resolution)` — 배포와 환경 판정 실패는 `preferences/dev-fast-cycle.json`이 켜진 채여도 읽지 않는다). 시간 규칙은 `src/schedule/timing.ts`의 `ScheduleTiming` 한 곳이 정한다(`productionTiming`은 106 이전 시 단위 창 논리를 그대로 옮긴 것, `fastCycleTiming`은 자정부터 N분 격자 · 창 ⌊N/2⌋분 · 후보는 오늘 하나 · 알림은 다음 주기 시작 하나 · 지연 상한 min(30, ⌊창 분 / 2⌋) — 값은 **사람이 정한 값이다, 측정이 아니다**). 주기가 바뀌면 판정 직전에 `src/app/fast-cycle-reset.ts`의 `resetFastCycleIfDue`가 오늘 일기와 딸린 기록(완성 알림 확인·건너뜀·따라잡기)을 지우고 앱 열기 「한 번」을 다시 연다 — 판정 자리 둘(백그라운드 `task.ts`, 앱 열기 훅)만 부르고 쓰기가 살아 있으면(등록부 칸) 끊지 않고 다음 판정으로 미룬다. 자동 쓰기가 꺼져 있으면·진단 「지금 실행」(`manual`)에서는 리셋하지 않는다. 켜기는 개발자 메뉴 「빠른 주기」(오늘 일기가 있으면 지운다는 확인을 거친다)이고, 개발자 메뉴를 끄면 함께 꺼진다. **한계**: 안드로이드 잡 간격은 15분 아래로 줄지 않고 OS가 더 미룰 수 있으며(권장 30분 이상, 10분은 앱 열기·강제 잡 `cmd jobscheduler run -f`로), iOS는 OS가 깨우는 때를 앱이 정하지 못한다. 창 밖 따라잡기·사흘 후보는 이 모드로 확인되지 않는다(테스트 날은 오늘 고정). 헌법 검사 `FAST_CYCLE_LEAKS`(FL1~FL3)가 읽는 자리·리셋 호출 자리를 잠근다.
- **자동 쓰기·알림·기록**:
  - 판정은 `src/schedule/auto-write.ts` 하나를 백그라운드(`task.ts`)와 앱 열기(`useAutoWriteHandoff`·`useAutoWriteClaim`, 057·082)가 함께 쓴다. 목표 시각 +3시간 창 안에는 사흘 모두, 창 밖에는 차례가 지난 미작성일(오전 목표는 목표 시각 전까지 어제도 제외)을 따라잡는다(백그라운드 창 밖 따라잡기는 하루 1회 상한, 078).
  - **훑기(105)**: 후보(창 규칙이 만든 목록)는 최근→과거로 `resolveAutoWrite`가 훑어 재료 있는 첫 날을 쓴다 — 가장 최근 날이 재료 없음이어도 더 오래된 재료 있는 날이 따라잡힌다. 재료 없음·미리보기를 못 읽은 날은 기억하지 않고(다음 판정에서 다시 후보), 사진 권한 거부는 전역이라 그 날을 기억하고 멈춘다. 한 곳도 못 읽으면 첫 예외를 던진다(단정하지 않음). 시도 기록의 쓰기로 정해진 줄은 고른 날 `day`를 싣는다(진단에 「· M월 d일」). 백그라운드 창 밖 하루 1회 몫은 파이프라인 직전에만 쓰므로(090) 훑기가 몫을 닳게 하지 않는다.
  - **백그라운드가 쓸 캐릭터(226)**: `schedule/task.ts`는 `selected-character.json`이 없어도 로스터에 캐릭터가 하나뿐이면 그 캐릭터로 쓴다(`selection-store.ts` `characterToWrite`; 둘 이상이면 건너뛴다). 그 파일은 홈이 일기를 저장할 때만 쓰이고 첫 실행의 자동 첫 일기는 쓰지 않아, 새로 설치한 앱의 백그라운드가 `no-character`로 건너뛰었다(릴리스 14, 이틀 반 무기록). **실기기(SM-S901N, 2026-11-01)**: 같은 설치에서 수정 전 강제 잡 `no-character` → 수정 뒤 `ran`(일기 저장, 파일은 계속 없음). 시스템이 스스로 깨운 잡·릴리스 설치본은 못 봤다. **이 경로를 시험할 때의 함정**: ① 앱 열기 자동 쓰기나 홈의 쓰기가 한 번이라도 저장되면 `selected-character.json`이 생겨 기준선이 오염된다(지우고 시험) ② 앱 열기 「한 번」이 먼저 안 쓴 날을 써 버리므로 앱은 열어 잡만 만든 뒤 홈으로 내보내고 대상 일기를 지운 다음 강제 잡을 돌린다 ③ 잡은 앱이 열려 자동 쓰기가 맞춰진 뒤에만 있고 강제 중지는 잡을 지운다(id는 `dumpsys jobscheduler`에서 읽는다 — 이번에는 0이었다가 다시 맞춘 뒤 1) ④ 대상은 후보 창(사흘) 안의 안 쓴 날이어야 한다 — 전부 썼으면 `all-written`이다 ⑤ `sample:fetch`는 `scripts/e2e-sample/photos.json`을 고치니 `git checkout`으로 되돌린다.
  - 목표 시각마다 앞으로 7일치(쓴 날 제외) 「쓸 차례」 예약 알림(`diary-reminder`, DEFAULT)을 걸고(107 — 앱은 OS 알람이 살아 있는지 읽지 못해, **프로세스의 첫 맞추기**는 이미 걸린 것을 믿지 않고 계획 전부를 다시 건다: 안드로이드 강제 중지는 알람만 지우고 expo 저장은 남겨 종전 비교가 「이미 걸림」으로 봤다. 프로세스 메모리 문 `RearmGate`, 읽기 실패·꺼짐·`schedule` 실패는 소비 안 함. **실기기(SM-S901N, 2026-10-29)**: 강제 중지 직후 `dumpsys alarm`의 `diary-reminder` 알람은 0개, 앱을 열면 JS가 뜨기 전(번들 로드 실패 화면에서도) 8초 안에 expo가 저장된 7개를 네이티브로 되살렸다 — 종전 코드(기준선)도 같았다. 그래서 「열면 복구」는 이 기기·이 expo 버전에서 107 없이도 되고, 107은 그 복구가 안 되는 경우의 보강이다(안 되는 경우는 관측 못 함). **강제 중지 뒤 열지 않으면 알람이 없다**(확인). 재부팅·업데이트·iOS는 미확인, 재부팅·업데이트 사이에 지난 시각의 미뤄진 예약은 되살리지 못한다), 누르면 `rearmAutoWrite()`로 앱 열기 자동 쓰기를 다시 연다(085). 백그라운드가 먼저 쓰면 알림을 거두고 완성 알림(`diary-completed`, HIGH)을 띄운다.
  - **배터리 예외 인지(104, 안드로이드)**: `expo-battery`로 예외 상태(`exempt`/`restricted`/`unknown`)를 읽는 곳은 `src/schedule/battery-exception-port.ts` 하나다(`promise-copy.test.ts` FX1이 잠근다). 예외가 **확인된 때만** 쓸 차례 알림을 정각+30분으로 늦춘다(`reminderDelayFor` — 30분은 잡 간격 15분 + 쓰기 한도 10분을 덮는 사람이 정한 값이고 측정이 아니다). 읽지 못했거나 `restricted`·iOS면 정각이다. **예약은 그 날 일기 파일이 생긴 뒤에만 거둔다** — 쓰기 시작·도중에 거두지 않는다(쓰는 중은 프로세스 메모리 상태라, 도중에 죽거나 얼면 일기도 알림도 없는 날이 생긴다). 설정 배터리 행은 이 상태로 꼬리표(「허용됨」/「허용 안 함」)를 달고, 자동 쓰기를 켜 두고 예외가 없으면 홈 쓰기 바 위에 제약 띠를 **항상** 보인다(108 — 닫기 없음, 예외를 주고 앞으로 돌아오면 사라짐; 104의 「저장된 뒤 한 줄·닫으면 7일·`battery-notice-dismissed.json`」은 걷었다). iOS는 변화 없다(OS가 깨우는 시각을 앱이 예측할 수 없어 지연 0 — 사람이 정한 판단, TestFlight 기록에서 재검토). `PowerManager`가 `null`인 기기는 `exempt`로 잘못 읽힌다(소스 읽기, 관측 없음). **실기기(SM-S901N, 2026-10-26)**: 예약이 예외 있음 22:30·없음 22:00으로 앱을 앞으로 돌릴 때 바뀌고, 강제 잡(`cmd jobscheduler run -f`, 화면 켜진 채)으로 돌린 헤드리스 쓰기가 저장되면 완성 알림만 오며 예약은 22:30 그대로다(헤드리스에서 상태를 읽었다는 뜻). 띠 글자는 글꼴 배율 1.2배까지만 커진다(`ConstraintBand`의 `BAND_FONT_CAP` — 값은 104가 옛 안내 줄로 쟀다: 2.0배에서 상한 전 본문 0줄, 상한 뒤 3줄. 띠로 옮긴 뒤의 2.0배는 아직 못 쟀다). 못 본 것: 22:30 실제 발화(예약까지만 확인), 화면을 끈 채 헤드리스, 하룻밤 소크, 작은 화면. **`seed:day`의 템플릿 사진(1×1)은 VLM이 자주 실패한다 — 쓰기까지 보는 수동 확인은 `sample:seed` 표본 사진으로 한다.**
  - 개발자·진단 화면 하단에 「날짜별 백그라운드」(날마다 깨움 횟수·첫~마지막 시각·결과별 횟수·끝나지 않음 — 날짜별 장부 `attempt-ledger/YYYY-MM-DD.json`에 시도 줄을 상한·자동 삭제 없이 모두 남기고 읽을 때 요약한다, 안드로이드 백업 제외, 109. 옛 「최근 20건」은 15분 줄에 하루가 밀려 걷었다. `백그라운드` 줄만 센다 — 깨움 0번은 OS가 깨우지 않은 날이다)와 「최근 실패」(갈래 11개: `module`·`photos`·`empty`·`echo`·`language`·`unfinished`·`timed-out`·`interrupted`·`error`·`save`·`unwritten`, 최근 10건, 060·081)를 남긴다.
  - **배터리 예외 인지(104, 안드로이드)**: `expo-battery`로 예외 상태(`exempt`/`restricted`/`unknown`)를 읽는 곳은 `src/schedule/battery-exception-port.ts` 하나다(`promise-copy.test.ts` FX1이 잠근다). 예외가 **확인된 때만** 쓸 차례 알림을 정각+30분으로 늦춘다(`reminderDelayFor` — 30분은 잡 간격 15분 + 쓰기 한도 10분을 덮는 사람이 정한 값이고 측정이 아니다). 읽지 못했거나 `restricted`·iOS면 정각이다. **예약은 그 날 일기 파일이 생긴 뒤에만 거둔다** — 쓰기 시작·도중에 거두지 않는다(쓰는 중은 프로세스 메모리 상태라, 도중에 죽거나 얼면 일기도 알림도 없는 날이 생긴다). 설정 배터리 행은 이 상태로 꼬리표(「허용됨」/「허용 안 함」)를 달고, 예외가 없는 채 앱 열기 자동 쓰기(057·085 알림 누름)가 **저장된 뒤** 홈에 한 줄 안내를 보인다(닫으면 7일, `preferences/battery-notice-dismissed.json` 시각 하나). iOS는 변화 없다(OS가 깨우는 시각을 앱이 예측할 수 없어 지연 0 — 사람이 정한 판단, TestFlight 기록에서 재검토). `PowerManager`가 `null`인 기기는 `exempt`로 잘못 읽힌다(소스 읽기, 관측 없음). **실기기(SM-S901N, 2026-10-26)**: 예약이 예외 있음 22:30·없음 22:00으로 앱을 앞으로 돌릴 때 바뀌고, 강제 잡(`cmd jobscheduler run -f`, 화면 켜진 채)으로 돌린 헤드리스 쓰기가 저장되면 완성 알림만 오며 예약은 22:30 그대로다(헤드리스에서 상태를 읽었다는 뜻). 안내는 글꼴 배율 1.2배까지만 커져(`NOTICE_FONT_CAP`) 2.0배에서도 본문 첫 줄이 보인다(없을 때 3줄, 상한 전 0줄). 못 본 것: 22:30 실제 발화(예약까지만 확인), 화면을 끈 채 헤드리스, 하룻밤 소크, 작은 화면. **`seed:day`의 템플릿 사진(1×1)은 VLM이 자주 실패한다 — 쓰기까지 보는 수동 확인은 `sample:seed` 표본 사진으로 한다.**
  - 개발자·진단 화면 하단에 「날짜별 백그라운드」(날마다 깨움 횟수·첫~마지막 시각·결과별 횟수·끝나지 않음 — 날짜별 장부 `attempt-ledger/YYYY-MM-DD.json`에 시도 줄을 상한·자동 삭제 없이 모두 남기고 읽을 때 요약한다, 안드로이드 백업 제외, 109. 옛 「최근 20건」은 15분 줄에 하루가 밀려 걷었다. `백그라운드` 줄만 센다 — 깨움 0번은 OS가 깨우지 않은 날이다)와 「최근 실패」(갈래 13개: `module`·`signals`·`vision`·`empty`·`echo`·`language`·`unfinished`·`timed-out`·`interrupted`·`error`·`save`·`unwritten` + 옛 기록을 읽기 위한 `photos`, 최근 10건, 060·081 — 2026-10-30 가름, 옛 `photos`는 신호 수집 실패와 사진 캡션 실패를 뭉쳐 둘을 가를 수 없었다. 새 실패는 `signals`/`vision`으로만 선다. 둘 다 생성 전 단계라 어느 쪽인지는 알아도, 그 안의 까닭(권한·보관함·엔진 시작·전량 캡션 실패)은 기록하지 않는다)를 남긴다.
- **설정·개발자·진단**: 홈 위의 `StackLayer`다(055~060·064). 이름 바꾸기, 자동 쓰기·시각·장소 이름 대화상자, 권한 꼬리표, 이 휴대폰(모듈 용량 1000 기준·일기 모두 지우기), 정보(버전 7번 탭으로 개발자 메뉴 활성화·서체 라이선스·개인정보처리방침·도움말), 개발자 메뉴, 진단 화면(개발 환경 전용).
- **아이콘·스토어 등록 에셋(102)**: 앱 아이콘은 빨강 면 + 기하 「P」이고 정본은 `design/icon.json` 하나다 — `npm run build:icons`(`scripts/design/build-icons.mts`)가 `assets/`의 PNG와 `store/ko/`의 스토어 아이콘·기능 그래픽·`design/icon.svg`를 만들고 `__tests__/design/icons.test.ts`가 정본과 픽셀까지 대조한다(손으로 PNG를 고치지 않는다). 등록 에셋(한국어 한 벌, 출시 국가 한국)은 `store/ko/`(설명문 5개·스크린샷), 앱은 iPhone 전용(`ios.supportsTablet: false`, D5)이다. 기록은 `specs/102-app-icon-store-assets/device-check.md`·`ipad-compat.md`.
- **다국어·디자인·웹**: 화면 한글은 `src/i18n/catalogs/ko/`에만 둔다(062). 서체는 정적 Pretendard v1.3.9 OTF 5종(400~800)이다(083). 디자인 토큰 정본은 `design/tokens.json` 하나이고 앱(`src/ui/theme/tokens.ts`)과 웹(`site/assets/tokens.css`)이 함께 쓴다(089). 개인정보처리방침·지원은 `site/`에서 배포하며 `__tests__/privacy/`가 잠근다(086).
- **검증·배포**: 안드로이드(SM-S901N·SM-G986N)와 iOS 실기기(iPhone 14, iOS 27.0.1, 087)에서 검증 중이다. Play 내부 테스트(076)와 TestFlight(075) 업로드는 GitHub Actions 수동 워크플로로 한다.

## 지금도 유효한 실측 규칙 (헌법 원칙 V — 값을 다시 재지 않도록)

### 안드로이드·iOS·Expo·네이티브

- **아이콘 PNG를 바꾸면 `expo prebuild --clean`을 다시 돌려야 런처에 반영된다**(102 실측 — 안 하면 이전 아이콘이 남는다). 안드로이드 adaptive icon은 108dp 캔버스 중 가운데 72dp만 보여서 foreground 마크 배율이 iOS(2.3)보다 작은 1.6이다(갤럭시 SM-S901N 런처 실측: 2.3은 보이는 영역의 약 83%를 채워 너무 컸다). iOS 배율은 iPhone 런처를 보기 전의 임시값이고 안드로이드 테마 아이콘(monochrome)은 기기에서 보지 않았다(`specs/102-app-icon-store-assets/device-check.md`).
- **★ 안드로이드에서 expo 모듈을 `patch-package`로 고치면 그 모듈을 `package.json` `expo.autolinking.android.buildFromSource`에 넣어야 빌드에 닿는다**(2026-10-29 실측 — 미리 컴파일된 꾸러미(gradle 로그의 📦)로 링크되면 소스 패치가 무시된다). 지금은 `expo-background-task`의 잡 네트워크 제약을 `NOT_REQUIRED`로 바꾼 패치가 이 경우다(`__tests__/config/bg-task-request-patch.test.ts`) — 화면이 꺼진 채 `CONNECTIVITY`에 49분 넘게 막히던 잡이 풀렸다. **이미 걸려 있던 잡은 옛 제약을 들고 있어** 새 APK를 깔아도 한 번 돈 뒤(강제 잡 `cmd jobscheduler run -f` 등) 이어 걸린 잡부터 바뀐다 — `dumpsys jobscheduler`로 확인한다. 릴리스 변형도 소스 빌드되는 것을 로컬 `assembleRelease`의 dex로 확인했다(기기 미확인).
- **Android 걸음 수**: `expo-sensors`의 `getStepCountAsync`는 iOS 전용이라 Android 걸음 수는 `unknown`이 정상이다.
- **`expo-media-library`와 장소 권한**: `ACCESS_MEDIA_LOCATION` 조회 API가 없어 `getLocation()`을 감싸 호출해야 안다. 그래서 **「장소」 권한은 사진 권한에 묶인다.** `Asset.getUri()`는 `file://` 경로를 준다. Android 14+ 부분 허용(`limited`)은 `describePhotoAccessLimit`가 `"partial"`을 준다.
- **`reverseGeocodeAsync` 좌표 외부 전송**(086): 안드로이드는 위치 권한이 없으면 예외를 던지고(`geocoding-port.ts`가 삼킴), **iOS는 위치 권한을 보지 않고 좌표를 보낸다** — 설정 「켬」은 권한과 무관하게 보내고, 기본값 「자동」에서만 위치 권한 거부가 전송을 막는다. 백그라운드는 지오코딩하지 않는다.
- **★ `expo-file-system` `File`에는 비동기 호출(`text()`·`bytes()`·`move()`·`copy()`)을 쓰지 않는다 — `*Sync()`다**(067·073). 비동기 도중 GC가 네이티브 공유 객체를 먼저 놓아 실패한다(`__tests__/diary/expo-file-sync.test.ts`). 사진 읽기에서도 `Asset` 참조를 캡션 루프 동안 유지한다(073).
- **★ RN 전역 `fetch`는 `res.body`가 언제나 `undefined`다**(041). 큰 모델은 `DownloadTask`에 `headers: { Range }`를 줘 `.seg<i>`로 받고 `COPY_CHUNK_BYTES`(1MiB)씩 옮겨 붙인다(`__tests__/models/download-memory.test.ts`).
- **★ `await import("react-native")`는 iOS에서 앱을 죽인다**(066·068). `PushNotificationIOS` getter가 크래시하므로 호출 시점 `require`로만 읽는다(`__tests__/onboarding/no-react-native-dynamic-import.test.ts`).
- **★ iOS Hermes `formatToParts` 버그**(066): `GMT+9`의 「9」를 `minute`으로 돌려줘 datepicker `onChange`가 전날 23:51이 되므로 변환은 `src/app/calendar.ts`의 `dayDateFromPicker()`만 쓴다.
- **★ `devicectl device copy to … --remove-existing-content true`는 대상 디렉터리의 부모를 통째로 비운다**(097 실측 — 사고: `Documents/preferences`를 올리다 기기의 `Documents/`가 비워져 모델 ~2GB가 지워졌다). 쓰지 않는다 — 파일은 하나씩 올리고(없는 부모는 만들어진다), 지우는 것은 앱 안에서 lldb로 한다(`scripts/layer2-ios/app-delete.ts`). `devicectl`에는 파일 삭제 명령이 없고 오류에도 종료 코드 0을 줄 수 있어 `--json-output`의 `outcome`을 본다(`__tests__/e2e/ios-layer2-source-contract.test.ts`가 옵션 문자열을 막는다).
- **iOS 접근성 트리와 e2e**(097): `Pressable`이 자식 글자를 한 요소로 합쳐 날짜 버튼의 큰 숫자·설정/진단 행의 값은 Maestro가 못 읽는다(화면에는 보인다). RN `Modal`의 루트 `testID`(`photo-viewer`·`*-dialog`)도 노출되지 않아 안의 버튼 id로 갈음한다. 시뮬레이터 빌드는 `expo-notifications`가 매 실행 키체인 오류를 내 LogBox 토스트가 하단 쓰기 바를 덮는다(`.maestro/_dismiss-logbox.yml`). 위 값들은 제품의 접근성 라벨을 바꾸는 일(UX-09)이 아니면 사람이 본다.
- **★ 백업은 모델(`models/`)만 뺀다 — 일기·설정·`vision-cache/`는 OS 기본이다**(099, 소유자 결정 D4=A). `vision-cache/`는 일기의 사진 사본이라 제외하면 복원된 일기의 사진이 사라진다. iOS는 로컬 모듈 `modules/pocketlog-backup-exclusion`이 `src/models/expo-port.ts` `openDirectory()`에서(프로세스당 한 번) `models` 디렉터리에 `isExcludedFromBackup`을 건다(경로 불변 — 옮기면 2GB 재다운로드). 안드로이드는 `plugins/with-backup-rules.js`가 `models/` 제외 규칙(`fullBackupContent`·`dataExtractionRules`)을 쓴다 — **`<include>`를 쓰지 않는다**(나머지가 빠진다). **안드로이드 Auto Backup은 앱 데이터가 한도(OS 문서는 앱당 25MB)를 넘으면 패키지 전체를 거부한다 — 로컬 전송에서 `Size quota exceeded`를 실측했다**(규칙 없이 모델 2GB가 있을 때, 규칙 뒤 모델을 뺀 합계 약 33MB일 때). 규칙 뒤 약 13MB는 `Success`였다. 25MB라는 수치와 Google 전송의 실제 동작은 [미확인]이다. 일기 사진 사본(`vision-cache/`, 하루 최대 8장)이 쌓이면 시간이 지나 한도를 넘을 수 있어 일기 백업은 보장하지 않는다 — 앱 안 안내(`lossNotice`)와 방침이 그래서 「사라질 수 있다」고 말한다. 확인은 `adb shell bmgr transport`를 임시로 로컬 전송으로 바꿔 `bmgr backupnow`(구글로 올리지 않는다, 끝나면 되돌린다), iOS는 lldb로 `NSURLIsExcludedFromBackupKey`를 읽는다. 실측표·미확인은 `specs/099-backup-and-loss-notice/quickstart.md`.
- **iOS 컨테이너 UUID 변경**(066): 업데이트·재설치마다 바뀌므로 리사이즈 사진 경로는 `fileStore.load()`가 `rehomeResizedPath()`(`src/diary/photo-path.ts`)로 현재 컨테이너 위치로 옮긴다.

### 화면·레이아웃·서체·동작

- **안전 영역·키보드·worklets**: `react-native-safe-area-context` + 루트 `SafeAreaProvider`를 쓴다. Android 16 edge-to-edge에서는 `KeyboardAvoidingView behavior="padding"` + `keyboardVerticalOffset`(48)이 필요하다(047). `babel.config.js` 마지막에 `react-native-worklets/plugin`이 있어야 reanimated가 돈다(033).
- **움직임·레이아웃**:
  - 크로스페이드 공유값은 겹마다 `key`로 새로 마운트하고 `useSharedValue(from)`으로 시작한다(`FadeLayer`, 049). 끌린 자리는 `useLayoutEffect`에서 되돌린다.
  - 쓴 날 스크롤 접힘(052): 스트립은 절대 배치 불투명 판(`StripOverlay`)으로 두고 지면 맨 위에 같은 높이의 `FoldSpacer`를 둔다(프레임 경계 진동 방지). 1px 미만의 `onContentSizeChange`는 거른다.
  - 가로 캐러셀에는 `.failOffsetY([-10, 10])`과 `onProgressChange` 반올림(`indexAtProgress`)을 쓴다(051). 탭 판정은 이동 거리 10 이내(`isTap`, 067).
  - `StackLayer`가 홈을 덮은 동안 아래 겹은 `BackHandler`를 등록하지 않는다(`covered` / `active={false}`, 055). `flexWrap: "wrap"` + `minHeight` 행에는 `alignContent: "center"`도 준다.
  - 큰 숫자(62·48)는 `useFontScale()`(`src/ui/font-scale.ts`)을 선형으로 곱하고 `allowFontScaling={false}`로 둔다(060). `Dialog.tsx`는 안전 영역 인셋 안에서 스크롤된다(056).
- **강조 색 대비(088·089)**: 빨간(`COLORS.accent`) 면 위 글자는 `accentForeground`(3.76:1)다. **밝은 면(`bg`·`surface`·`WRITTEN_DAY.paper`) 위 작은 강조 글자와 웹 링크·강조에는 `COLORS.danger`(`#ae1800`, 6.41:1)를 쓴다**(`settings-screen.test.tsx` C2, `design/tokens.json` `contrast`).
- **서체(083)**: `src/ui/theme/tokens.ts`의 `FONT`·`TEXT_FONT`에서 정하며, `AppText`·`rnr/text.tsx`·`NameField`와 대화상자 `Title`·`Description` 래퍼가 `TEXT_FONT`를 맨 앞에 둔다(`__tests__/config/font-rules.test.ts`). 고정폭(`monospace`·`Menlo`) 금지, 숫자 정렬은 `fontVariant: ["tabular-nums"]`, `AppText` 기본은 `lineBreakStrategyIOS="hangul-word"`다(066).

- **동작 줄이기(100, 실측)**: OS 「동작 줄이기」·안드로이드 「애니메이션 제거」를 켜고 앱을 다시 열면 reanimated 장면(설정 겹·달력·스트립 튕김, 안드로이드는 실패 토스트도 — iOS 실패 토스트는 못 쟀다)이 즉시 바뀐다. **앱이 켜진 채 OS 값을 바꾸면 reanimated 장면의 닫기 등은 이전 값으로 돌았다**(안드로이드·iOS 시뮬레이터 모두 — 안드로이드 사진 확대 뷰어는 켜진 채로도 따랐다). **iOS의 사진 확대 뷰어(RN `Modal` `fade`)는 재시작 뒤에도 따르지 않는다**(약 465ms 그대로). **내려받기 슬라이드의 `autoplay`는 라이브러리가 OS 값을 보지 않아 켜도 약 4.06초마다 넘어갔다**(안드로이드 실측) — `src/ui/reduce-motion.ts` `useReduceMotion()`이 읽어 켜진 때만 자동 넘김을 멈춘다(손으로 넘기기·순환 그대로, 값을 모르면 돌리지 않는다). 측정 절차·표는 `specs/100-three-measurements/quickstart.md`. 안드로이드는 「애니메이션 제거」 토글이 아니라 배율 세 개를 0.0으로 켠 것이다(이 기기에서 토글로 눌러 확인하지 않았다 — 제품 수정의 효과가 토글에서도 나는지는 미확인) — 가르면 reanimated 장면은 `transition_animation_scale`(앱의 `useReduceMotion()`이 읽는 값도 이것 — 소스 읽기, `AccessibilityInfoModule.kt`), 사진 확대(RN `Modal` 페이드)는 `window_animation_scale`을 따르고 `animator_duration_scale`만으로는 줄지 않는다. iOS 내려받기 슬라이드는 시뮬레이터에 닿지 못해 실측이 아니다.
- **작은 화면의 쓴 날(100, 닫음)**: 083 이후 쓴 날 화면의 크기·여백 값은 바뀌지 않았다. 첫 화면 본문 노출은 글꼴 1.0배에서 SM-S901N 8줄 이상, iPhone SE 3rd gen 시뮬레이터(667pt) 5줄 + 반 줄이라 기준(2줄)을 넘는다 — 캐러셀 높이 210(보드 2c)은 그대로다. ≈2.0배에서는 3줄(083의 SM-S901N·iPhone 18 Pro 캡처)이고 SE는 **0줄**이다(참고 — 가르는 값은 1.0배). 캐러셀을 30dp 줄여도 2.0배에서는 한 줄을 못 번다(줄 높이 약 49.5dp는 로드맵의 계산 — 이번에 다시 재지 않았다, iPhone 2.0배는 `accessibility-large` ≈1.94배). SE급 iPhone이 지원 대상인지(M1)는 미확인이다.

### 추론·프롬프트·VLM·백그라운드

- **`llama.rn` 경계와 해제 순서(079)**: `llama-port.ts`는 `timings`·`tokens_predicted`를 버리고 `{ text, ending }`만 내보낸다(원칙 IV). 호출은 `completion({ messages: [...], jinja: true })`로 하며, `stopCompletion()`은 `interrupted: true`로 resolve된다. **`unload()`는 `inFlight` 생성이 모두 끝난 뒤에야 `release()`를 부른다**(기다리지 않으면 네이티브 5초 타임아웃 뒤 행렬 곱 도중 SIGSEGV가 난다).
- **조립 주체별 스레드·시간 한도**(`src/inference/assembly.ts`, 079): 화면 조립은 기본 스레드·한도 **180초**다. 백그라운드 조립은 안드로이드에서만 **`n_threads: 2`**(작은 코어 3개 경합 해소), 시간 한도는 두 플랫폼 모두 **600초**다(`engine.run()` 구간만 측정).
- **iPhone 이어 하기(092)**: Info.plist에는 와일드카드 `com.a810labs.pocketlog.write.*`만 두고 처리기는 신청마다 UUID 꼬리를 붙인 온전한 식별자로 등록한다(와일드카드 처리기 등록은 막혀 있다 — Apple DTS). strategy는 `.fail`(곧바로 못 돌면 거절 → 종전대로 앞을 벗어나면 끊는다), 만료 처리기는 처리기 맨 앞에서 단다.
  - **★ 시스템은 보고 횟수가 아니라 `completedUnitCount`가 오르는가를 본다.** dasd `ProgressTracker`가 보고 간격을 익힌 뒤 값이 오르지 않는 공백이 그보다 길면(약 35~~39초) 「marking stalled」로 끝낸다. 전체 **1,000,000칸**, 보고마다 **한 칸 이상** 오른다(1000칸에서는 끝 무렵 걸음이 한 칸 아래로 줄어 947에서 36초 머문 뒤 만료됐다). 막대는 실제 일(사진 한 장·조각·프롬프트 토막·토큰)의 박동(`src/inference/heartbeat.ts`)으로만 움직이고 타이머가 없다(원칙 V); 박동 보고는 2초에 한 번까지, 단계 변경은 곧바로. **단계 안 위치는 쌍곡선 `시작 + 몫 × w/(w+k)`다**(103 — `w`는 박동 무게 합: 사진 1·조각 4·토큰 1, `k`는 반몫: 사진 2·글 1000, 사람이 정한 값). 옛 공식(남은 몫의 일정 비율)은 총 토큰 수(수천 개)에 민감해 949k에서 4~~5분 서 있었고 토큰 비율을 1/1600으로 줄여도 그대로였다. 보조 줄은 단계 문구 셋(숫자 없음).
  - **앱 밖에서는 iOS가 CPU를 크게 줄인다**(사진 한 장 앞 4.5초 → 밖 28~58초). `SCREEN_IOS_PACING`(iOS 화면 쓰기 전부): 스레드 2, 쉼 없는 32토큰 조각 생성, 모델 메모리 상주(`use_mmap: false` — 파일 매핑이면 앱 밖 생성이 0.17토큰/초), 프롬프트 토막 미리 읽기(토막마다 앱 상태를 본다 — 앞 240자·밖 24자; 작은 토막만 쓰면 앞에서 2분 50초), 한도 **30분**. 앱에 머문 쓰기는 51초(092 전 98초).
  - **토큰 박동은 데이터 없는 콜백이다** — `llama-port.ts` `completionTicking`이 llama.rn 토큰 콜백을 받아 인자 없이 `tick()`만 부른다. 진행 표시에서 사람이 취소한 것과 시스템이 끝낸 것은 같은 만료 처리기로 와 가를 수 없다 — 둘 다 「도중에 끊김」이고 앱을 다시 열면 057이 그 날을 다시 쓴다. 만료가 왔는데 앱이 앞에 있으면 이어 하기만 잃고 쓰기는 끊지 않는다.
  - **화면 문구(093)**: 설정 「배터리」 행 보조 줄·시각 대화상자 미리보기·쓰는 중 화면 안내 한 줄(`writingLeaveNote`, iOS만)·지원 FAQ의 iPhone 항목이 이 사실을 말한다 — 홈이 시작한 쓰기는 나가도 계속, 저절로 써 두기는 충전 중에만, 그 밖에는 알림 누름. 새 문구는 `settingsPlatform`에 두고 조립부가 `appPlatform`을 넘기며 안드로이드 값은 그대로다(쓰는 중 안내는 안드로이드에 없다 — 앞을 벗어나면 멈추는 사실은 범위 밖).
  - **관찰법**: `devicectl device process launch --console`로 띄우면 Swift `[continued-write]` 줄(submitted·report·close·expired)이 보인다 — `submitted` 뒤 `devicectl … launch com.apple.Preferences`로 앱을 뒤로 보낸다. 일기는 lldb로 지운다(`UIApplicationMain`에 멈춘 채 `NSFileManager removeItemAtPath:` 뒤 `process kill`). dasd 줄은 `sudo log collect --device-udid …`(에이전트 셸은 root가 없어 못 한다 — 사람이 돌린 아카이브는 `/usr/bin/log show`로 읽힌다). 선을 꽂으면 충전이라 배터리 회차는 사람이 앱을 조작한다.
  - **iOS는 UIScene 생명 주기다**(094): `app.json`의 `expo-build-properties` `ios.enableSceneSupport: true`(expo ≥ 57.0.23)가 AppDelegate와 `UIApplicationSceneManifest`를 장면 방식으로 만든다. 이게 빠지면 Xcode 27(iOS 27 SDK) 빌드가 열자마자 죽는다(`__tests__/config/ios-scene-support.test.ts`). SDK 58부터는 템플릿이 기본이라 이 속성을 걷는다. iPhone 14 실기기(Release, expo 57.0.30)에서 앞·뒤 전환, 쓸 차례 알림 누름(웜·콜드 모두 앱이 열리고 앱 열기 쓰기가 시작), 이어 하기(충전 중 약 17분, 충전 없이 약 18분 — 완성 알림)를 확인했다. 알림을 눌러 쓰는 날은 누른 날이 아니라 창 안의 가장 오래된 안 쓴 날이다.
  - **남은 위험**: 모델을 메모리에 읽어 올리는 동안(`initLlama`)은 박동이 없어 앱 밖 적재가 약 36초를 넘으면 생성 전에 만료될 수 있다(실측은 넘지 않았다). 쓰기마다 총 토큰 수가 달라 글 단계 끝 위치가 다르고(실측 66%, 모의 77~89%) 끝나면 `finish`가 가득 채운다. iOS 화면 쓰기는 앞에서도 한도가 30분이다. 충전 없는 회차는 표본 4다(092 1회·094 1회·103 2회 — 103은 새 막대 공식, 로그 없이 약 20분에 저장). **103 3회차에서는 완성 알림이 오지 않았다**(사람이 중간에 화면을 잠그고 시스템의 「백그라운드 작업을 계속할까요」에 「계속」을 눌렀다 — 원인은 미확인, 가설은 그 상호작용이 앱 상태를 「뒤」가 아니게 만들어 `continued-saved.ts`가 알림을 막았다는 것). 화면을 건드리지 않은 4회차는 알림이 왔다. 이어 하기 배너는 iOS가 그리는 시스템 UI라 앱이 글자색을 정하지 못한다 — 밝은 배경 위에서는 흰 글자가 안 보일 수 있다(어두운 배경에서는 보인다). **소유자가 시스템 동작으로 받아들이기로 했다(2026-10-23, 103) — 문구를 줄여도 해결되지 않아 고치지 않는다.** 실측 표는 `specs/092-ios-continued-write/quickstart.md`.
- **VLM 캡션(011·013·066)**: 타일링 청크 수를 줄이려 1024px로 리사이즈한다(013). `expo-image-manipulator`는 `file://`을, `llama.rn`은 순수 경로를 요구한다. **iOS에서는 `initMultimodal`에 `use_gpu: false`를 준다**(`projectorOnGpu: !isIOS()`, 066 — Metal 크래시 및 llama.rn #176 우회).
- **프롬프트와 판정(018·061·063·077)**: `promptPrefix()`는 `buildPrompt()`와 같은 `fixedHead()`에서 나오며 **호칭 줄을 빼면 안 된다**(P11). 문안 정본은 `my-ollama` `results/hand-prompt/v5/user-prompt.md`다(077). 꼬리 첫 문장은 시작 문장 틀을 품되 글자까지 같지 않게 하고, 금지문·「상상」·내부 오류 문자열을 넣지 않는다. `isEcho`는 줄 전체 + 지시 어미로 끝나는 16자 이상의 절(따옴표 안 제외)을 검사한다.
- **제목 구간(100, 실측)**: 본문 판정 뒤 제목을 묻는 두 번째 `completion()`은 SM-S901N dev에서 사진 있는 날 약 4.6초(CPU로 잰 끝 두 회차 4.55·4.67초, 그 밖 두 회차는 저장까지 상한 4.51·4.79초 — 해제·저장 0.3~~0.6초가 들어 있어 실제는 더 짧다), 사진 없는 날 약 3.3~~3.7초(상한 3.10~~4.23초)였다(표본 사진 4·없음 3). 혼잣말 교체 간격(`WRITING.rotateMs` 4초)을 사진 있는 날이 넘어 `ProgressStage`에 **`title`** 과 사람이 쓴 문구 풀 하나(`monologue.title`)를 더했다 — 판정을 통과한 뒤 제목을 묻기 직전에만 신호가 가고(`on-device.ts`), 저장은 단계가 아니다. 신호원: logcat `RNLlama : loadPrompt:580`이 호출 시작이고 끝을 알리는 줄은 없어 `run-as`로 읽은 CPU 틱(추론 스레드 4개가 바쁘던 구간)과 일기 파일 mtime으로 쟀다 — 모델 해제+저장이 끝 뒤 약 0.3~~0.6초다. 제목 길이와 맥락 길이에 따라 달라지고 표본도 적다.
- **백그라운드와 삼성 `freecess` 얼림(024·079·085)**: `defineTask`는 모듈 최상단 동기 `require("expo-task-manager")`로 등록한다(024). 배터리 예외가 없는 삼성 기기는 화면이 꺼진 뒤 1분 만에 프로세스를 얼려(`freezer:/frozen`) 살아 있는 동안 잡과 예약 알람(`RTC_WAKEUP`)이 미뤄진다. 맞추기(`reminders.ts`)는 켜져 있고 안 쓴 사흘 안의 날이면 지난 시각의 예약을 지우지 않는다(085 RC8).

### 테스트 작성의 함정 (jest·RNTL·소스 계약)

- **계약 테스트는 주석을 먼저 걷어내고 소스를 읽는다**(`.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")`).
- **상태·이유 문자열을 공유하는 두 부품은 실제 파이프라인·등록부를 묶은 조립으로 최소 한 번 테스트한다**(080·081·082). 방어 둘이 겹치면 각각을 홀로 빼 본다(082). 스쳐 지나가는 토스트는 렌더 횟수 대역으로 확인한다(080).
- **RNTL 14**: `render`·`fireEvent`·`rerender`를 반드시 `await`한다. 포털 대화상자는 `withPortal()`, fake timers에서는 `await act(async () => ...)`를 쓴다. 팬 제스처(`fireGestureHandler`)는 한 테스트의 한 렌더에서만 쏘며 `AppState.addEventListener` 스파이는 `mockRestore()`하지 않는다.

## 코드를 어디에 두는가

```text
src/
├── config/       환경 판정, 추론 위치 규칙, 하루 경계(00:00)
├── inference/    추론 어댑터(온디바이스/데스크톱), 샘플링, 조립 주체별 스레드·한도(assembly.ts)
├── signals/      하루치 신호. 사진·장소는 실제로 수집한다 (걸음·배터리·연결은 unknown)
├── vision/       사진 내용 캡션(011)과 시간 분포 선별(select.ts, 023). 캐릭터와 무관한 모델 하나
├── diary/        일기 모양, 파이프라인, 저장, 페르소나(014), 제목(061), 살아 있는 쓰기 등록부(live-write.ts, 080)
├── models/       캐릭터→모델 파일 매핑(roster.ts), 구간 내려받기·검증·삭제
├── schedule/     자동 쓰기 판정(auto-write.ts)·시간 규칙(timing.ts, 106)·시도 창·따라잡기 상한(078)·쓸 차례 알림 계획·맞추기(085)
├── onboarding/   권한 요구 목록·판정·플래그 (021)
├── firstrun/     첫 실행 단계 판정 (040·045)
├── app/          화면이 쓰는 순수 상태·조립·훅 (wiring.ts, state.ts, material.ts, write-failures.ts …)
├── diagnostics/  진단 정보 수집과 프롬프트 미리보기(022)
├── i18n/         화면 문구 카탈로그(catalogs/ko/)·기기 언어 감지·해석 (062)
└── ui/           화면 (components/ 공용 부품, rnr/ 대화상자 프리미티브, theme/tokens.ts)

design/           디자인 토큰 정본(tokens.json)과 디자인 시스템 규칙 문서(DESIGN.md, 089)
design/icon.json  아이콘 정본(102) — scripts/design/build-icons.mts가 assets/·store/ko/에 쓴다
store/ko/         스토어 등록 에셋(설명문·스크린샷·기능 그래픽·스토어 아이콘, 102) — 앱 번들에 들어가지 않는다
site/             개인정보처리방침·지원·소개 정적 웹페이지 (GitHub Pages, 086·089)
plugins/          Expo config plugin (android/·ios/는 gitignore된 생성물)
scripts/          헌법 검사, 층 1·층 2 e2e 실행기, 30일 표본(e2e-sample/), 시딩(seed*, ios-seed/), 토큰 생성기
__tests__/        기기 불필요 테스트 (항상 돈다)
.maestro/         실기기·시뮬레이터 e2e 흐름
```

### 지켜야 할 경계

- **`process.env`는 `src/config/environment.ts`에서만 읽는다.** **추론 위치는 `src/inference/select.ts`에서만 고른다.** **`src/config/policy.ts`가 원칙 I의 방어선이다**(dev·prod에서 데스크톱 서버 금지).
- **하루는 기기 로컬 자정(00:00)에 바뀌고 오늘은 언제든 쓸 수 있다**(049). 경계는 `src/config/day-boundary.ts` 하나뿐이며 다른 파일에서 `getHours() ±`로 하루 기준을 옮기지 않는다(`DB11`). 함수는 모두 `now`를 인자로 받는다.
- **모르는 것을 기본값으로 채우지 않는다**(원칙 V). `SignalValue<T>`는 `known`/`none`/`unknown` 셋을 가른다. `src/signals/fake.ts`는 `src/ui/`에서 import하지 않는다.
- **화면에 보이는 한글은 `src/i18n/catalogs/ko/`에만 둔다**(062, 예외는 `scripts/constitution-rules.ts`의 `SCREEN_TEXT_ALLOWLIST`). `text()`는 모듈 최상단 상수에서 평가하지 않는다(`lazyText`·함수 사용). 문구 골든(`__tests__/i18n/ko-golden.test.ts`)은 다시 쓰지 않고 `ADDED_AFTER_GOLDEN`·`CHANGED_AFTER_GOLDEN`에 올린다.
- **프롬프트는 `src/diary/prompt.ts`에만 있다**(원칙 II). **출력 판정의 갈래는 `src/diary/acceptance.ts`의 넷뿐이고 늘리지 않는다**(원칙 I·IV). **실패가 텍스트를 반환하거나 생성 중인 글을 화면에 보여주지 않는다.** 토큰 콜백은 `llama-port.ts`의 `completionTicking` 한 곳에서만 `completion()`에 넘기고 그 자리에서 데이터를 버린다(인자 없는 박동만 나간다, 092).
- **`src/models/roster.ts`가 원칙 III의 최전선이다.** `src/ui/`는 `models/roster`·`ModelAsset`·`ESSENTIAL_ASSET_KEYS`·`diary/prompt`·`signals`에 직접 닿지 못한다. `src/vision/`은 `models/roster.ts`·`inference/sampling.ts`·`diary/store.ts`에 닿지 못한다.
- **`src/diary/live-write.ts`는 시각·타이머·파일·기기를 읽지 않는다**(080).
- **측정·채점 코드를 둘 자리는 없다**(원칙 IV). `scripts/check-constitution.mts`는 아키텍처·설정 경계 위반만 잡는다.

## 환경은 셋이다

| 환경    | 어디서                       | 추론                                                     |
| ------- | ---------------------------- | -------------------------------------------------------- |
| `local` | 개발자 기계 시뮬레이터       | 데스크톱 서버 (기본값), 실기기 연결 시 온디바이스도 가능 |
| `dev`   | 실기기·시뮬레이터, 개발 빌드 | 온디바이스만                                             |
| `prod`  | 실기기, 배포 빌드            | 온디바이스만                                             |

**Expo Go로는 실행할 수 없다**(`llama.rn` 네이티브 모듈). **★ macOS·SDK 57에서는 셸의 `EXPO_PUBLIC_APP_ENV=dev`가 Metro 번들의 `.env.development`(`local`)를 이기지 못한다**(066) — gitignore된 `.env.development.local`에 `EXPO_PUBLIC_APP_ENV=dev`를 두고 번들로 확인한다.

## 도구 사용법 — 실기기 검증과 e2e

1. **안드로이드 연결**: `~/Library/Android/sdk/platform-tools/adb` + `JAVA_HOME=/opt/homebrew/opt/openjdk@17` + `adb reverse tcp:8081 tcp:8081`. 네이티브·서체·플러그인이 안 바뀌었으면 기기의 debug APK를 지우지 않고 Metro 번들만 올린다(`pm clear`·재설치는 모델 ~2GB를 지운다). 플래그만 되돌릴 때는 `run-as com.a810labs.pocketlog`로 `files/preferences/*.json`만 고친다.
2. **매니페스트·네이티브 설정 변경 시**: 반드시 `npx expo prebuild --platform android --clean`을 먼저 돌리고 `adb shell dumpsys package com.a810labs.pocketlog`로 확인한다.
3. **iOS 시뮬레이터·실기기(066·068·087)**: `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`로 `xcodebuild`를 쓰고, `pod install` 시 `~/.netrc`가 644면 `NETRC=<빈 디렉터리>`를 앞에 준다. 시뮬레이터는 Maestro(`maestro --device <UDID> test <flow>`, 콜드 기동은 `MAESTRO_DRIVER_STARTUP_TIMEOUT=180000`, 설정 왕복은 `stopApp: false`)로 조작한다. 실기기 사진 시딩은 `npm run ios:seed`(`scripts/ios-seed/README.md`, 087)를 쓴다.
4. **iOS e2e(097)**: **층 1은 iOS 시뮬레이터**(`npm run test:layer1:ios`, Maestro) — 전용 시뮬레이터 하나(부팅), 모델은 `.maestro/ios/_prepare-simulator.yml`로 앱이 한 번 받는다. 표본 사진 보관함은 낡으면 시뮬레이터 `Media/PhotoData`·`DCIM`만 지워 초기화한다(앱 데이터는 그대로). **층 2는 iPhone 실기기**(`npm run test:layer2:ios`) — Maestro가 iOS 실기기를 구동하지 못해(러너 서명·Xcode 27 배포 목표·iOS 27 미검증, 소유자가 채택하지 않았다) 실행기가 준비하고 안내하면 **사람이 쓰기를 누르고 Enter로 알린다**. 전제·절차는 [docs/e2e/layer2-release-checklist.md](docs/e2e/layer2-release-checklist.md) 「iOS」, 흐름과 한계는 [docs/e2e/feature-flow-map.md](docs/e2e/feature-flow-map.md).
5. **Maestro 규칙과 층 1·층 2 e2e(069·070·073·084)**: 새 흐름은 `scripts/run-device-tests.mjs`의 `FLOWS`(및 `LAYER1_FLOWS`)와 [`docs/e2e/feature-flow-map.md`](docs/e2e/feature-flow-map.md)의 두 표에 함께 등록한다(`__tests__/e2e/flow-map.test.ts`). 전용 기기에서는 모델을 보존하는 `npm run test:layer1`·`npm run test:layer2`를 쓴다.

## release 빌드·서명·Google Play — 요청받았을 때만 탄다

> **⚠️ 기본 작업 흐름이 아니다.** 실기기 검증은 dev(debug) 빌드로만 하며, release 빌드·업로드는 저장소 소유자가 명시적으로 요청했을 때만 탄다.

- **GitHub Actions 수동 워크플로**(076): `.github/workflows/android-release.yml`(`main`). 보호 환경 `android-release`의 secrets 넷(`ANDROID_KEYSTORE_BASE64`·`ANDROID_KEYSTORE_PASSWORD`·`ANDROID_KEY_PASSWORD`·`PLAY_SERVICE_ACCOUNT_JSON`)으로 `bundleRelease`(arm64-v8a) → 서명 지문(`scripts/android-release/upload-key.sha256`) 대조 → `scripts/android-release/play-upload.ts`로 Play 내부 테스트 업로드를 수행한다(`__tests__/ci/android-release-workflow.test.ts`).
- **올리기 전에**: `app.json`의 `android.versionCode`를 Play의 마지막 번호보다 크게 올려 커밋한다 — 번호는 사람이 올리고, 워크플로의 「번호 점검」 단계(`version-check.mts`, 096)가 `npm ci` 앞에서 Play 번들 목록(`edits.bundles.list`, 편집은 열었다가 커밋 없이 버림 — 읽기 전용)을 읽어 같거나 작으면 이미 있는 번호와 올릴 값을 밝히며 실패하고, 못 읽어도(권한·네트워크) 건너뛰지 않고 실패한다. 통과하면 `버전 · versionCode · 커밋 · 스토어 마지막` 한 줄이 실행 요약에 남는다. **Play의 실제 응답과 서비스 계정의 목록 읽기 권한은 첫 실행에서 처음 본다**(테스트는 대역; 403이면 서비스 계정에 앱 정보 보기·릴리스 보기 권한). 실제 모델로 쓰는 경로를 [docs/e2e/layer2-release-checklist.md](docs/e2e/layer2-release-checklist.md)(`npm run test:layer2` + 일기 본문 읽기 + 사람이 보는 항목)로 확인한다. 제외 권한(`blockedPermissions`): `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`·`SYSTEM_ALERT_WINDOW`(065). **릴리스 노트(`release-notes/ko.txt`, 한국어 한 파일)를 이번 버전에 맞게 고쳐 같은 커밋에 넣는다** — Play 「출시 노하우」로 가고(`play-upload.mts --notes`, 500자 한도), 비었거나 넘으면 빌드 전에 설정 점검이 실패한다. 이 파일은 iOS와 같은 글이다.

## iOS 빌드·서명·TestFlight — 요청받았을 때만 탄다

- **수동 서명과 entitlements**(066): 개인 Apple Developer Program(팀 `PGNGG84B39`), 수동 서명(`Apple Distribution` + `Pocketlog App Store` 프로파일, 로컬 `~/.pocketlog-signing/ios/`). entitlements는 `increased-memory-limit` 하나뿐이며 `aps-environment`는 `plugins/with-no-push-entitlement.js`가 걷는다. `NSMotionUsageDescription`은 유지한다(ITMS-90683).
- **GitHub Actions 수동 워크플로**(075): `.github/workflows/ios-release.yml`(`main`). 보호 환경 `ios-release`의 secrets 여섯(`IOS_DIST_P12_BASE64`·`IOS_DIST_P12_PASSWORD`·`IOS_PROFILE_BASE64`·`ASC_API_KEY_P8`·`ASC_KEY_ID`·`ASC_ISSUER_ID`)으로 아카이브·`altool` 업로드를 수행한다(`__tests__/ci/ios-release-workflow.test.ts`).
- **올리기 전에**: `app.json`의 `ios.buildNumber`를 같은 `version`의 스토어 마지막 빌드 번호보다 크게 올려 커밋한다 — 번호는 사람이 올리고, 워크플로의 「번호 점검」 단계(`build-number-check.mts`, 096)가 `npm ci` 앞에서 App Store Connect의 이 앱·이 버전 빌드 목록(`GET /v1/builds`, 읽기 전용)을 읽어 같거나 작으면 버전 이름과 이미 있는 번호·올릴 값을 밝히며 실패하고(그 버전의 빌드가 없으면 통과), 못 읽어도 건너뛰지 않고 실패한다. 통과하면 `버전 · 빌드 · 커밋 · 스토어 마지막` 한 줄이 실행 요약에 남는다. **`builds` 실응답·API 키 역할의 조회 권한도 첫 실행에서 처음 본다.** 안드로이드 쪽 층 2 확인은 [docs/e2e/layer2-release-checklist.md](docs/e2e/layer2-release-checklist.md)를 따르고, 업로드 후 TestFlight 실기기 동작을 확인한다. **릴리스 노트(`release-notes/ko.txt`)도 같이 고친다** — 업로드 뒤 `scripts/ios-release/testflight-notes.mts`가 App Store Connect API로 빌드 처리를 기다렸다가(최대 30분) TestFlight 「테스트할 내용」(`ko`, 4000자 한도)에 쓴다. 이 단계가 실패해도 빌드는 이미 올라가 있다(오류 문장이 그렇게 말한다) — `continue-on-error`로 가리지 않고 실행이 빨갛게 보인다. **Apple의 실제 응답은 첫 릴리스에서 처음 본다**(테스트는 대역).

## 테스트

| 명령                      | 무엇                                                            | 기기                     |
| ------------------------- | --------------------------------------------------------------- | ------------------------ |
| `npm test`                | 기기 불필요 갈래 전부 (`logic` + `ui`)                          | 필요 없음. **항상 돈다** |
| `npm run test:logic`      | 순수 로직만 (`.ts`, `node` 환경) — 개발 중 기본                 | 필요 없음                |
| `npm run test:ui`         | 화면만 (`.tsx`, `jest-expo`)                                    | 필요 없음                |
| `npm run test:layer1`     | 실기기 화면 흐름 e2e (생성 없음, 기준 상태·30일 표본 자동 보장) | 전용 테스트 기기         |
| `npm run test:layer2`     | 실기기 실제 모델 생성 스모크 4종                                | 전용 테스트 기기         |
| `npm run test:layer1:ios` | iOS 시뮬레이터 화면 흐름 e2e (097, 생성 없음)                   | 전용 iOS 시뮬레이터      |
| `npm run test:layer2:ios` | iPhone 실기기 실제 모델 생성 스모크 4종 (097, 사람이 탭)        | 전용 iPhone              |
| `npm run lint`            | eslint + tsc + 헌법 검사 + prettier 포맷 검사                   | 필요 없음                |

- **건너뛴 실기기 테스트는 통과가 아니다**(헌법 원칙 V). 기능이 끝났다고 말하려면 **dev(debug) 빌드**로 실기기에서 최소 1회 확인한다.
- **jest 두 프로젝트 구분**: `.ts`는 `logic`, `.tsx`는 `ui`다(`__tests__/jest-projects.test.ts`). 개별 파일은 `npx jest <경로> --selectProjects logic`으로 부르며, 워커 수는 `npx jest --maxWorkers=2`로 직접 부른다.

## Expo 작업 시

패키지 버전을 추측하지 않는다. **Expo SDK 57**(RN 0.86 + `llama.rn`)을 유지하며, 공식 문서나 context7(`/expo/expo`)로 확인한 뒤 `npx expo install --check`로 검증한다.

## 작업 습관

- 커밋 메시지는 한국어로 쓴다(헌법 「개발 방식」). 계약을 먼저 정하고 테스트를 먼저 쓴다.
- **화면·페이지·문서 같은 디자인 산출물을 만들기 전에 [design/DESIGN.md](design/DESIGN.md)를 먼저 읽는다** — 토큰의 정본은 `design/tokens.json` 하나이고 앱·웹이 그것을 쓴다(089).
- **`main`에서 직접 작업하지 않는다.** 기능마다 브랜치를 파고 PR로 머지한다. **작업을 시작하기 전에 `git branch --show-current`로 지금 브랜치를 눈으로 확인한다**(`.githooks/pre-commit`·`pre-push`).
- **`README.md`에는 금방 낡는 정보를 두지 않는다**(소유자, 2026-10-30) — 버전·수치·기기·검증/출시 상태·실측 조건·스펙 번호·모델 이름·목록의 개수는 적지 않고 정본(`package.json`·이 문서·조건표·로드맵)으로 연결한다.
- **한 축을 깊게 파고들고 싶어지면 그것이 실패 신호다.**
- **위반 주입으로 방어를 검증한다.** 새 규칙을 세울 때마다 실제로 어겨 보고(치환이 적용됐는지 먼저 단언) 테스트나 헌법 검사가 잡는지 확인한 뒤 되돌린다.
- **경계를 옮기거나 유니온을 좁힐 때는 `tsc` 0을 완료 조건으로 삼고, 같은 규칙의 복제가 다른 파일에 있는지 소스를 센다.**
- **보드·스펙을 옮기는 일은 원문 대조를 계약 테스트에 넣는다.**
