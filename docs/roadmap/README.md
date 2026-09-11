# 개선 예정 과제

알파리움 프로젝트의 향후 개발 아이디어를 기록하고구상하기 위한 개선 예정 과제 로드맵입니다.

> [!NOTE]
> **우선순위 가이드라인**: 이 로드맵의 과제들은 고정된 우선순위가 없습니다. 시급도는 사용자가 전적으로 판단하며 필요한 과제를 선택하여 순차적으로 개발합니다.

## 개선 예정 과제 목록

- [ ] **다국어화 (i18n)**
- [x] **사진 선별 전략 고도화** (023 — 잡사진 필터링 + 시간 분포 선별)
- [x] **백그라운드 안정성 및 예외 대응** (024 — 실측·보강 완료, narrative 관련 부채는 14번으로 분리)
- [ ] **단독 구동용 Release 빌드 배포**
- [x] **앱 요구 권한 실측 및 통합 신청 절차 구현** (021)
- [x] **개발자 탭 내 프롬프트 및 토큰 모니터링** (022 — 프롬프트 원본 노출만 구현)
- [ ] **사용성 분석을 위한 Google Analytics 연동**
- [x] **사진 분석 수량 상한 측정 및 확장** (023 — 5 → 8장, 시간 제약)
- [x] **일기 본문 사진 슬라이드 및 갤러리 뷰 개선** (025 — 가로 슬라이더 + 풀스크린 갤러리, 코어 RN만)
- [x] **LLM 모델 다운로드 속도 개선** (026 — 여러 캐릭터 동시 + 한 파일 세그먼트 병렬 + 폴백 + 세그먼트 이어받기)
- [x] **NativeWind 및 React Native Reusables 기반 미니멀 UI 시스템 도입** (032 — 디자인 토큰·재사용 컴포넌트 7종·핵심 화면 5개 이관, 라이트 고정 유지. reanimated는 NativeWind의 peer dep으로 들어왔으나 아직 실제로 쓰이진 않음. SM-S928N 육안·release 재확인·`CharacterListScreen` 이관[T063]은 21번으로 이월)
- [ ] **배포용 앱 패키징 및 기본 설정 구성**
- [ ] **앱 출시를 위한 외부 행정 및 마켓 설정** (참고용)
- [ ] **자동 생성용 서술형·외국어 모델 재검토** (024 후속 — EXAONE mojibake·헤드리스 미완주 + 028: qwen3·gemma3도 자동 저장 불가)
- [x] **024 잔여 실측 마무리** (027 — 삼성 One UI 배터리 화면 라우팅 + release APK 헤드리스 1회 확인 완료. 배터리 예외/무예외 소크 SC-001·SC-002는 14번 세션으로 이월)
- [x] **일기 쓰기 흐름 단순화 + 최초 실행 필수 에셋 다운로드** (029 — 홈 위젯 4개 제거·1탭, 자동 판정, 온보딩 필수 에셋 단계, 헌법 v1.3.0. 11번 UI 선행)
- [x] **샤오바이·모카 일기 생성 실패 조사** (028 — 조사 완료: 둘 다 **모델 부적합**으로 확정. qwen3=추론 `<think>` 블록이 `n_predict:512` 소진해 본문 미도달, gemma3=지시 이행 불안정. mojibake·판정 오탐·프롬프트 문제 아님. 코드 0줄 → **14번으로 병합**)
- [~] **입력 프롬프트 텍스트 최적화** (`prompt.ts` — 14번[자동 생성용 모델 재검토]과 합류. **알파리움에서는 컨셉만 정립**하고 실제 프롬프트·페르소나 후보 실험은 `my-ollama`에서 API로 진행 — 온디바이스는 후보 하나 도는 데 최대 240초라 반복이 안 됨. 2026-09-03 핸드오프 문서 작성·push 완료: `033-diary-concept-prompt-handoff` 브랜치 `docs/superpowers/specs/2026-09-03-diary-concept-prompt-experiment-handoff-design.md` — 컨셉 고정 뼈대[화자=표면 제3자·실체 휴대폰, 아는 범위=권한만큼, 사진 속 인물 정체 불명, 독백], 페르소나가 톤·태도를 프롬프트에서 지시하도록 원칙 III 완화[헌법 개정 선행], 로스터 5개 전부 재평가 대상, 현재 지시문 8+6+5줄의 스펙별 출처·근거, 불변 제약 6가지, 프롬프트 후보 3개 스케치. **`my-ollama`의 실험 리포트(§8 계약)가 오면 그걸 근거로 별도 speckit 스펙에서 `prompt.ts`·`persona.ts`·헌법을 고친다** — 아직 미완료.)
- [ ] **모델 준비 완료 연출 + 캐릭터 작명** (16번 후속 — 헌법 페르소나 조항 개정 동반)
- [x] **One UI 8.5+ 다크 모드 dimmed + 온보딩 photo-location 무반응** (031 — 다크 모드: `AppTheme` 부모 `DayNight` → `Light` 교체 + `expo-system-ui`, photo-location: 판정 불가능한 단계라 온보딩에서 제거. 실기기 검증 완료: S928N One UI 8.5 6화면 다크 모드·권한 4행·Maestro / S901N One UI 8.0 S22 회귀·신호 수집 회귀. release 재확인만 dev-only 정책상 보류[PR #56])
- [x] **032 후속 — 미이관 화면 마무리 + 새 인터랙션/애니메이션** (033 — `CharacterListScreen`·`DayPicker` 토큰·`ListRow` 이관, 눌림 피드백 `scale 0.97`. 실기기 debug 검증 완료 2026-09-07. release 눌림 반응·SM-S928N 육안은 별도 잔여)
- [x] **엔드유저 화면 전체를 NativeWind/토큰으로 이관** (034 — `AuthorPicker`·`BuildErrorScreen`·`OverwriteConfirmScreen`·`PermissionsSection` 4개 이관, `App.tsx` 설정 탭 여백 1곳. `Card`·`SectionHeader` 첫 실사용. 실기기 debug 검증·PR #51 머지 완료. `AutoDiaryTriggerButton`·`PermissionPanel`은 개발자 탭 전용이라 범위 밖)
- [ ] **완성된 일기 첫 표시를 타자기 연출로** (생성 직후 `written` 화면에서 제목+본문이 글자 단위로 흐른다. 화면 탭 시 즉시 전체. 이미 저장·판정 통과한 본문이므로 "생성 중인 글 미노출"[005 FR-028b]과 무관 — 다만 실시간 생성처럼 보이면 안 됨. 아래 23번 상세)
- [ ] **초기 권한 획득 UI/UX 개선 + 작명·에셋 다운로드·첫 일기 병렬화** (「시작하기 전에」를 전체화면 로고 + 목적 설명 위 자동 권한 팝업 흐름으로. **권한 획득 이후 곧바로 19번(모델 준비 연출·작명)으로 이어져** — 백그라운드에서 LLM·VLM 모델을 받는 동안 포어그라운드에서 캐릭터 작명을 하고, 작명이 끝나면 다운로드 완료까지 대기했다가 **첫 일기를 자동 작성**한다. 021·029·031·035 후속. 원칙 I의 「건너뛰기」·OS의 제스처 없는 연속 팝업 허용 여부·배터리 예외 인텐트·029 에셋 단계(건너뛰기 불가)와 035 환영/작명·liveness 게이트의 재배치가 설계 긴장. 11·22번 이후. 아래 24번 상세)

---

## 과제별 상세 및 아이디어

### 1. 다국어화 (i18n)

- **아이디어**: `expo-localization` + `i18n-js`를 연동하여 화면 UI 언어만 기기 로케일을 따르도록 하고, 캐릭터 출력 언어(일기 본문)는 캐릭터 고유 언어로 고정합니다. LLM 시스템 지시문(프롬프트)은 번역하지 않고 격리하여 되뱉기 판정 깨짐을 방지합니다.

### 2. 사진 선별 전략 고도화 — ✅ 023에서 구현 (8번과 함께)

- **아이디어**: 의미 없는 사진(검은 화면, 무지 벽지 등)이나 캡처 사진을 필터링하여 VLM 캡션 시간 낭비를 최소화합니다. 복잡한 이미지 채점이나 품질 분석 대신, 폴더 경로 검사 및 간단한 메타데이터(크기, EXIF) 등 단순 상수를 기준으로 분류하는 방안을 구상합니다.
- **구현 결과 (023, 2026-08-29)**: 세 갈래(잡사진 필터링·시간 분포 선별·상한 확장)를 한 스펙으로 묶었다. `src/vision/select.ts`의 순수 함수가 (1) 파일 경로 상위 폴더 이름(`NON_CAMERA_FOLDERS` — 사람이 못 박은 상수)으로 스크린샷·다운로드·메신저 저장 사진을 걸러내고(전부 걸러지면 원본 유지), (2) 남은 것을 찍힌 **시각** 분포로 배분한다 — 하루를 6개 4시간 칸(`BUCKET_COUNT`, 사람이 정한 값)으로 나눠 칸마다 최소 1장 + 남은 예산을 사진 수에 비례한 최대 잔여법. 011의 "몇 번째 사진" 인덱스 균등이 한 시간대에 몰린 하루에서 "아침 카페만 본 채 하루를 쓰던" 문제를 고쳤다. 이미지 채점은 없다(원칙 IV — `checkVisionFile`이 픽셀 접근 헬퍼를 차단). 폴더 이름 해석은 상한에 닿은 하루에서만 asset별 `getUri()`를 부른다(`getUri()`는 `file://` 경로 반환 — T035 실측). 실기기 검증: `mixed-clutter`(Camera 6 + Screenshots 3 + Download 1) → 캡션 6장 전부 Camera. 상세: `specs/023-photo-selection-algorithm/`.
- **실기기 재검증 (025 세션, 2026-08-31)**: `many-camera`(12장)로 「빠르게 봄」 `quiet` 생성 시 캡션이 **정확히 8장**(`VISION_PHOTO_LIMIT`)만 돌고 위치 표시가 `1 / 8`로 뜨는 것을 슬라이더에서 눈으로 확인했다. 목록 카드는 "사진 12장"(수집 전체), 상세 슬라이더/갤러리는 8장(캡션분) — 의도대로.

### 3. 백그라운드 안정성 및 예외 대응 — ✅ 024에서 구현

- **아이디어**: Android Doze 모드 등으로 인한 실행 지연을 정밀 실측하고, 기기 재부팅 시 작업 예약 복구 로직을 보완합니다. 백그라운드 생성 중 갑자기 권한이 취소되었을 때 조용히 실패하지 않고 `unknown` 데이터로 감싸 일기를 정직하게 채우는 예외 대응을 마련합니다.
- **구현 결과 (024, 2026-08-30)**: 019·020·021·023이 미확인으로 남긴 백그라운드 자동 생성 안정성 부채를 검증·보강했다. 새 사용자 기능·저장 계층·네이티브 모듈을 만들지 않고 020의 `src/schedule/` 경계와 004의 `src/signals/collect.ts` 경계를 재사용·검증했다. 핵심 성과 셋: **(1) 020 CRITICAL 버그 수정** — `TaskManager.defineTask()`가 `App.tsx`의 `useEffect`에 있어 헤드리스 배경 실행에서 태스크가 등록되지 않았다(`No task registered for key expo-task-manager`). 모듈 최상단 부수 효과로 되돌리되 동기 `require()`를 try/catch로 감싸 프로덕션 RN에서는 등록, Jest `logic`에서는 생략. 재부팅 복구도 이 수정으로 함께 성립한다(`expo-task-manager` 자체 `BOOT_COMPLETED` 리시버). **(2) `STALE_LOCK_MS` 5분 → 6분** — `narrative` 사진 있는 날 완주 벽시계 ≈170초 실측 근거(`ceil(170×2/60)×60`). **(3) 권한 회수 방어 명시** — `collect.ts`가 실행 중 회수 타이밍에서도 `photos.kind === "unknown"`(`none` 아님)을 반환함을 계약 테스트(SR1~SR6)로 잠갔고 코드는 무변경. 미확인 잔여(narrative 헤드리스 완주 불가·EXAONE mojibake·배터리 예외 소크)는 14·15번으로 분리. 상세: `specs/024-background-stability-exceptions/`.

### 4. 단독 구동용 Release 빌드 배포

- **아이디어**: 설치 후 `Unable to load script`와 Metro 번들러 연결 요구가 발생하는 것은 개발 빌드(Development Build)가 설치되었기 때문입니다. 개발 PC 연결 없이 완전한 독립 사용이 가능하도록 자바스크립트 번들을 APK 내부에 포함하는 Release 빌드 패키징/배포 절차를 수립합니다.

### 5. 앱 요구 권한 실측 및 통합 신청 절차 구현 — ✅ 021에서 구현

- **아이디어**: 사진이나 위치 정보에만 국한하지 않고, 알림(`expo-notifications`)이나 기기 백그라운드 위치 권한 등 앱 구동에 실제 필수적인 모든 권한들을 구현 시점에 실측하여 면밀히 식별합니다. 식별된 모든 필수 권한을 앱 최초 진입부에서 통합적으로 요청하고 획득할 수 있는 시작 시나리오 흐름을 구성합니다.
- **구현 결과 (021, 2026-08-29)**: `src/onboarding/` 경계를 새로 세워 순수 판정(`requirements`·`decision`·`flag`)과 기기 통로(`*-port`)를 나눴다. 필수 권한은 사람이 못 박은 상수 `PERMISSION_REQUIREMENTS`(사진·사진 위치·위치·알림·배터리 예외 5갈래, 고정 순서) — 코드가 항목을 판정하지 않는다(원칙 V). 앱 최초 진입부에 통합 온보딩을 두고 각 단계는 건너뛸 수 있으며(원칙 I), `onboarding.json`의 `completed` 플래그로 진입 게이트를 판정한다. 020이 흩뿌린 배터리 예외 안내 주체를 온보딩·설정 "권한" 섹션으로 일원화하고 `AutoDiarySettings.batteryExceptionPrompted`를 흡수·제거했다. 새 네이티브 모듈 0개. 실기기 검증 완료(SM-S901N, Android 16). 상세: `specs/021-unified-permission-onboarding/`.

### 6. 개발자 탭 내 프롬프트 및 토큰 모니터링 — ✅ 022에서 구현 (프롬프트 원본만)

- **아이디어**: 입력 토큰 양을 최적화하기 위해, 헌법 IV 원칙(성능 지표의 일반 화면 노출 금지)을 침해하지 않는 범위 내인 '개발자 진단 화면(DiagnosticsScreen)'에 모델별로 전송되는 실제 프롬프트 원본 텍스트 및 llama.rn의 인풋/아웃풋 토큰 지표(`tokens_evaluated`, `tokens_predicted`)를 노출하는 디버깅 도구를 구축합니다.
- **구현 결과 (022, 2026-08-29)**: **토큰 지표는 범위에서 제외했다** — 이 항목이 AI로 옮겨지며 왜곡됐고, 원래 의도는 입력 프롬프트 원본 노출이었다(사용자 확인). 진단 계층이 사람이 못 박은 대표 신호 프리셋("신호 없음"·"사진 있음")으로 `buildPrompt()`(실제 생성 경로가 부르는 바로 그 함수)를 불러 캐릭터별 프롬프트 원본과 문자 수 근사값을 `DiagnosticReport.promptPreviews`에 실어 개발자 탭에만 보인다. `llama-port.ts`의 원칙 IV 경계(`timings`·`tokens_*` 폐기)는 그대로다. `src/ui/`가 `diary/prompt`를 직접 import하지 못하도록 헌법 검사(`checkSourceFile`)에 규칙을 추가했다. 상세: `specs/022-prompt-token-diagnostics/`.

### 7. 사용성 분석을 위한 Google Analytics 연동

- **아이디어**: 사용자가 앱을 사용하며 겪는 불편한 지점이나 사용 패턴을 파악하기 위해 `@react-native-firebase/analytics`를 연동합니다. 단, 사용자의 일기나 구체적 프라이버시가 유출되지 않도록 화면 뷰나 특정 기능의 이벤트 클릭 빈도 수준의 비식별 지표 수집으로 한정하여 설계합니다.

### 8. 사진 분석 수량 상한 측정 및 확장 — ✅ 023에서 구현 (2번과 함께)

- **아이디어**: 리사이즈 성능(1.3초)을 지렛대 삼아 30초 이내에 캡션할 수 있는 사진 수량 상한(현재 5장)을 점진적으로 확장(10장~15장)합니다. 단, LLM 컨텍스트 한계(n_ctx)와 LLM 추론 시간 병목을 정밀 실측하여 최적의 상한값을 도출합니다. (선행: `사진 선별 전략 고도화`)
- **구현 결과 (023, 2026-08-29)**: `VISION_PHOTO_LIMIT`을 **5 → 8**로 올렸다. 실기기(SM-S901N, `quiet`, `many-camera` 12장)에서 상한 5·8 두 번 생성해 두 물리 한계를 실측: **시간** — 캡션 8장 46초 + 생성 92초 = 총 ~~138초 / 생성 시간 한도 180초(`runWithTimeout()`), 여유 42초. **컨텍스트** — 캡션 5장 캐릭터 프롬프트 852토큰 / 캐릭터 `n_ctx` 2048, `n_predict` 512 → 상한 1536, 8장 ≈ 1030토큰(67%). **걸린 제약은 시간**이고 10장 초과 시 한도에 근접한다. **`narrative`(exaone 콜드 최대 242초)는 미확인이라 8에서 멈췄다** — 더 올리려면 narrative 완주를 먼저 재고 `src/vision/select.ts` 주석을 갱신한다. `distributeByTime`이 budget을 인자로 받으므로 상수만 바꾸면 되고 밀집 가산량 전용 상수는 없다(FR-020). 013 리사이즈가 유효해 IMAGE 청크는 장당 1개(원본이면 7~~9개).

### 9. 일기 본문 사진 슬라이드 및 갤러리 뷰 개선 — ✅ 025에서 구현

- **아이디어**: 살펴본 사진 썸네일 목록을 횡 스크롤 스와이프 가능한 슬라이더 형태로 개선하고, 개별 사진을 터치하면 풀스크린 갤러리 모드로 진입하여 좌우 스와이프로 이전/이후 사진을 넘겨볼 수 있는 기능 구현을 구상합니다.
- **구현 결과 (025, 2026-08-31)**: 017이 만든 정적 96×96 썸네일 격자(`flexWrap`)를 `DiaryDetailScreen`의 가로 슬라이더 + 풀스크린 갤러리 모달로 교체했다. **새 의존성 0** — RN 코어 `ScrollView`(`horizontal` + `pagingEnabled` + `disableIntervalMomentum`)와 `Modal`(`onRequestClose`로 안드로이드 뒤로 가기)만 썼다(`react-native-pager-view`·제스처 라이브러리는 네이티브 링크를 동반해 release 재확인이 필요하므로 배제 — research.md 결정 1·2). 저장된 `DiaryEntry.photos[]`(017의 `{ photoId, takenAt, resizedPath }`)를 **읽기 전용으로 소비** — 새 신호·새 저장 필드 없음(SC-006). 갤러리 표시 상태(`{ open, index }`)는 `DiaryDetailScreen`의 `useState`이며 파일에 저장하지 않는다(009 선례) — 같은 Activity 안의 회전·백그라운드에서 React state가 유지되므로 갤러리가 같은 사진에서 살아남는다(FR-015a, 별도 복원 로직 없음). 위치 표시는 `{현재} / {전체}` 순번 텍스트(성능 지표가 아님, FR-018). 핀치 줌·아래로 쓸어 닫기·배경 탭 닫기는 범위 밖(후속 과제). 017 회귀 유지: 0장 "사진: 없었다" / 옛 일기 슬라이더 미렌더 / 사본 실패 "이 사진은 이제 없다"(그 한 장만). `src/ui/` 안에서 완결 — `diary/`·`vision/`·`signals/` 무수정, 새 헌법 검사 규칙 없음. 기기 없는 테스트 2004개 통과, lint·헌법 검사·prettier 클린. **실기기 debug 검증 완료 (2026-08-31, SM-S901N)**: 슬라이더(격자 아님, `1 / 8`, `resizeMode="contain"`), 가로 스와이프 위치 갱신, 사진 탭 → 갤러리가 탭한 순번에서 시작, 갤러리 좌우 스와이프, 마지막에서 멈춤(순환 없음), 닫기 버튼·안드로이드 뒤로 가기로 닫고 스크롤 위치 유지, 생성 중 화면 미노출, 옛 일기/0장 회귀 — 전부 확인. `.maestro/diary-photo-gallery.yml` 전체 PASS + 017 회귀 흐름 PASS. **위치 표시 `<Text>`에 `accessibilityLabel`이 필요했다**(여러 텍스트 조각이 한 `<Text>`면 `testID`가 접근성 트리에 안 뜸 — 실측). 회전 시 갤러리 유지(FR-015a)는 앱이 portrait 고정이라 미재현 — C18a 계약 테스트가 잠금. release 재확인 불필요(새 네이티브 모듈 없음, 012). 상세: `specs/025-diary-photo-gallery/`.

### 10. LLM 모델 다운로드 속도 개선 — ✅ 026에서 구현

- **아이디어**: 최초 혹은 업데이트 시 수 기가바이트에 달하는 LLM 모델 파일의 다운로드 속도를 개선합니다. 기기 내 멀티스레드 분할(세그먼트 병렬) 다운로드 모듈 도입이나, 클라우드 스토리지 배포처(CDN 캐싱 등) 튜닝을 통한 최적화 방안을 설계합니다.
- **구현 결과 (026, 2026-08-31)**: 두 갈래를 한 스펙으로. **(1) 여러 캐릭터 동시 내려받기** — 003 FR-020의 "한 번에 하나"를 해제했다. `acquisition.ts`의 `running: Character|null`을 `Map<Character, Running>`으로 바꾸고, `busy` 거부는 유지하되 의미를 **"같은 캐릭터 중복 요청"**으로 좁혔다(FR-003 — 같은 파일을 두 다운로드가 쓰면 손상). `pause(character?)`, `busyWith(): Character[]`. 공간 판정에 이미 받는 중인 것들의 남은 용량 합산(FR-007). 상한 없음(사용자 요청). `download-view.ts`의 `active`가 `DownloadProgress[]`로, 008의 네 불변식은 전부 유지. **(2) 한 파일 세그먼트 병렬** — 서버가 HTTP Range를 지원하면 파일을 사람이 정한 개수(`SEGMENT_COUNT=4`, `MIN_SEGMENT_BYTES=8MiB` — 012·021·023 선례로 못박은 `readonly` 상수, 잠정·실기기 확정 대기)의 구간으로 나눠 병렬 수신. 미지원·크기 불명이면 조용히 기존 단일 스트림으로 **폴백**(회귀 방지). **세그먼트 이어받기**를 직접 구현 — 각 구간의 받은 바이트를 `state.json`의 `segmented[]`에 저장하고(`PausedDownload`와 상호배타) 재개 시 남은 Range부터. **방식**: 세그먼트 계획 계산(구간 나누기·재개·병합·완료 판정)은 `src/models/segmented/plan.ts`의 순수 함수, 기기에 닿는 것은 `RangeFetchPort`(`probeRange`·`fetchRange`) 하나. `DownloadPort` 계약 뒤에서 `expo-port.ts`가 세그먼트/폴백을 고르므로 `acquisition.ts`·`download-view.ts`는 전송 방식을 모른다(003 경계 유지). **`src/vision/acquisition.ts`는 코드 변경 0줄**(SC-009) — 011이 `DownloadPort`를 캐릭터 없이 재사용하는 구조 덕에 비전 모델도 자동으로 세그먼트 병렬을 얻는다. 헌법 검사 `checkSegmentedFile` 추가(`segmented/*`가 Character·roster·diary import 또는 속도 어휘를 두면 위반). 진행률은 여전히 `{ character, fraction }` 하나(원칙 III·IV — 구간 개수·처리량이 타입에 들어갈 자리 없음). 기기 없는 테스트 2076개 통과, lint·헌법 검사·prettier 클린. 위반 주입 3종 확인. **실기기 검증 완료 (2026-08-31, SM-S901N / Galaxy S22, Android 16, debug)**: Q0(`FileHandle.offset` 시커블 쓰기로 4구간을 흩어 써도 md5가 로스터와 정확히 일치 — `.part` 폴백 불필요), Q1(오드+샤오바이 동시 다운로드, 거부 안내 안 뜸, 둘 다 byte-exact+verified), Q2(오드만 멈춰도 모카 완주 — FR-004), Q3(HF CDN이 리다이렉트 후 Range·Content-Length 유지 → 로스터 5개 모델 전부 세그먼트 경로, `SEGMENT_COUNT=4` 유지), Q5(세그먼트 65%에서 멈춤→`segmented[]` 저장→"이어받기"→68%에서 재개→md5 일치→재개 상태 정리), Q6(`git diff` src/vision 0줄, FR-003 중복 거부 조용히 억제, state.json 스키마 자동 마이그레이션) 전부 PASS. **★ 실기기에서 버그 둘 발견·수정**: (A) 진행률 %가 0%↔100%만 표시(`Math.round(fraction*1)`) → `runSegmented`에 `onSizeResolved` 콜백 추가, (B) 세그먼트 멈춤 후 "다시 받기" 표시 → `readinessOf`가 `segmentedResume`도 보게 수정. 계약 테스트 4개 추가. 미확인 잔여: Q4 강제 폴백 토글(계약 테스트 C9가 대역 검증)·Maestro 실행·prod 게이트는 다음 세션(`findings.md` §8). CDN 배포처 튜닝은 이 저장소가 배포처를 통제하지 않아 범위 밖. 상세: `specs/026-parallel-model-download/`.

### 11. NativeWind 및 React Native Reusables 기반 미니멀 UI 시스템 도입 — ✅ 032에서 구현

- **아이디어**: 획일화된 구글 머티리얼 UI 스타일을 피하고, 모던하고 얇은 미니멀 톤앤매너를 구축하기 위해 React Native Reusables(shadcn-style)와 NativeWind를 도입합니다. 1인 개발자의 디자인 리소스를 보존하기 위해 기본적으로 준비되어 있는 기성 컴포넌트들을 완제품처럼 조립하여 사용하되, 알파리움 고유의 따뜻하고 감성적인 커스텀 스타일은 코딩 에이전트(AI)가 코드 수준에서 전담하여 일괄 깎고 고도화합니다.
- **구현 결과 (032, 2026-09-03)**: `src/ui/theme/tokens.ts` 단일 출처(따뜻한 아이보리·테라코타·벽돌, 전 쌍 WCAG AA)로 `tailwind.config.js`가 값을 가져온다. 재사용 컴포넌트 7종(`Text`/`Button`/`Card`/`SectionHeader`/`ListRow`/`Toggle`/`SelectRow`) — 전부 토큰만 참조, 도메인 import 0, `useColorScheme` 0. 핵심 화면 5개(목록·상세·설정·생성 중·온보딩) + 덮어쓰기 확인 + 탭바 이관, 원시 hex 0. `VisionPicker`·`GeocodingSettingToggle`을 `SelectRow`로 재작성. 031의 라이트 고정 무손상(`darkMode:"class"` + `dark:` 미사용 + `useColorScheme` 미사용). **React Native Reusables 자체(`@rn-primitives/*`)는 채택하지 않았다** — reanimated·gesture-handler 의존이 있어 "직접 작성한 컴포넌트 + shadcn 스타일 참고"로 대체.
  - **★ NativeWind v4.2가 `react-native-reanimated`(네이티브 모듈)를 peerDependency로 끌어왔다** — 애초 "새 네이티브 모듈 없음" 전제가 실측으로 뒤집혔다. Expo SDK 57이 검증한 `reanimated 4.5.1`/`worklets 0.10.1`로 명시 핀(자동 설치된 4.6.0/0.12.1은 `expo-modules-core` C++와 심볼 불일치로 네이티브 빌드가 깨짐 — jest는 못 잡는 결함, 원칙 V). **reanimated는 이 시점까지 실제 애니메이션에는 안 쓰였다** — 21번이 그 활용처.
  - **실기기 검증 완료(SM-S901N, dev debug)**: 5개 화면군 톤·라이트 고정·025 슬라이더/갤러리 회귀 없음·생성 중 지표 미표시. Maestro 14흐름 통과.
  - **미완료 잔여 → 21번으로 이월**: SM-S928N(One UI 8.5) 육안, release 빌드 1회(reanimated 도입분 R8·prod 번들 확인), `CharacterListScreen` 이관(T063, SHOULD로 미룸), 만들었으나 기존 화면 구조에 안 맞아 미적용인 `Card`/`ListRow`/`Toggle`/`Section`. 상세: `specs/032-nativewind-ui-system/`.

### 12. 배포용 앱 패키징 및 기본 설정 구성

- **아이디어**: `app.json`에 `android.package` 및 `ios.bundleIdentifier` 고유 패키지 식별자를 등록하고, 규격에 맞는 고해상도 앱 아이콘 및 스플래시 화면 그래픽 에셋을 프로젝트 내에 바인딩하여 릴리즈 빌드를 완성합니다.

### 13. 앱 출시를 위한 외부 행정 및 마켓 설정

- **아이디어**: 앱 소스코드 수정 없이 외부 웹 사이트 및 스토어 콘솔에서 처리하는 출시 요건 체크리스트입니다. (참고용)
  - 양대 마켓(Google Play Console / App Store Connect) 개발자 계정 등록, 연회비 결제 및 본인 신원 인증 완료
  - 노션이나 깃허브 페이지 등을 이용해 법적 필수 조항이 담긴 개인정보처리방침 웹문서 게시 및 고유 URL 확보
  - 스토어 내 프라이버시 데이터 라벨 작성 및 외부 전송 데이터 없음(데이터 보안) 선언
  - EU 판매자 선언(Trader Status) 및 연령 등급 설문(Content Rating) 작성
  - 구글 플레이 20인 테스터 비공개 트랙 등록 및 14일 연속 모니터링 수행
  - 기기 해상도별 앱 스크린샷 이미지 및 구글 필수 그래픽 이미지(Feature Graphic, 1024x500) 업로드

### 14. 자동 생성용 서술형 모델 재검토 (024 후속) — ✅ 037에서 완료 (2026-09-09)

- **배경**: 024 실기기 세션에서 `narrative`(exaone, 루이) 캐릭터가 자동 생성에서 사실상 쓸 수 없는 상태로 확인됐다. 두 갈래 문제가 같은 뿌리로 보인다:
  - **헤드리스 완주 불가** (024 T034): 배터리 예외를 주고 화면을 강제로 켜도 `a2`(exaone) 로드 후 `loadPrompt` 단계에서 CPU 292%를 26분+ 태우며 산출물이 없다. `GENERATION_TIMEOUT_MS`(180초, `engine.run()` 구간) 가드는 헤드리스/Doze에서 JS 타이머 억제로 무력화돼 `timeout`조차 안 난다. `quiet`만 완주한다(`writingMs` 52.5초).
  - **출력 mojibake** (024 §10): 포그라운드에서도 3회 전부 저장된 일기 본문이 깨진 UTF-8 surrogate로 나왔고 `title`에 금지된 `###`·`**`가 섞였다. `judge()`는 통과시켰다. `llama.rn` + EXAONE-3.5 Q4_K_M 인코딩 문제로 추정.
- **아이디어**: exaone GGUF 재빌드/교체, `llama.rn` 버전 재검토, 또는 로스터에서 `narrative`를 자동 생성 대상에서 제외할지 결정합니다. 이건 단순 버그 수정이 아니라 **헌법 로스터 조항에 닿는 결정**입니다. 019·020·023이 narrative 실기기 검증을 계속 미룬 것과 무관하지 않을 수 있습니다. 참고: `specs/024-background-stability-exceptions/findings.md` §9~10.
- **028 추가 (2026-09-02)**: 외국어 캐릭터 2개도 이 저장소의 프롬프트·`n_predict:512`에서 자동 저장 가능한 일기를 안정적으로 못 낸다 (실기기 SM-S901N, dev, "사진 안 봄" × 3회씩):
  - **샤오바이 (`chinese`/qwen3-1.7b)**: 3/3 `rejected: unfinished` (ending=`length`). Qwen3는 **추론 모델**이라 `<think>...</think>` 사고 사슬을 먼저 내는데, 긴 프롬프트에 대해 `<think>` 안에서 512토큰을 전부 써 `</think>` 닫기 전에 잘린다 → 실제 일기 본문 0줄. **mojibake 아님, `isWrongLanguage` 오탐 아님**(판정이 본문을 볼 기회조차 없음 — `unfinished`가 첫 검사).
  - **모카 (`english`/gemma3-1b)**: 저장 2/3 (그러나 신호 0인데 전부 환각 + `title`에 `**` 마크다운 미제거), 나머지 1/3 `rejected: unfinished` (영어 캐릭터가 **한국어**로 쓰고 같은 문장 12회+ 반복하다 `length`로 잘림). 지시 이행 불안정 — 헌법 로스터가 이미 관측한 "gemma는 프롬프트를 되뱉는다"의 실측 재현.
  - **exaone mojibake와 실패 양상은 다르지만**(qwen3=추론 블록 미완, gemma3=불안정, exaone=인코딩 깨짐) **로스터 5개 중 3개(narrative + 외국어 2개)가 자동 생성에 부적합**이라는 결론은 공통. `acceptance.ts`/`prompt.ts` 수정 불가(`judge()` 완화 = 원칙 I 위반). 모델 교체 또는 로스터 재검토 필요. 참고: `specs/028-chinese-english-diary-failure/findings.md`.

- **구현 결과 (037, 2026-09-09)**: **로스터를 검증된 하나(kanana/금동이)로 줄이고, 원칙 III에 「로스터 진입 기준」을 세웠다.** 저장소 소유자의 판단 — "혼자 하는 프로젝트에서 다섯 모델을 이해하고 길들이는 것은 한계가 있다. 확실하게 검증된 모델만 가지고 진행한 뒤 로스터를 늘려간다." 고친 것은 캐릭터 목록이 아니라 **로스터에 무엇을 담을 자격이 있는가**이며, 목록이 줄어든 것은 그 기준을 적용한 결과다.
  - **헌법 v1.6.0을 코드보다 먼저 개정**(029 v1.3.0·035 v1.4.0·036 v1.5.0 패턴). 원칙 III에 진입 기준 추가 — 이 저장소의 프롬프트로 저장 가능한 일기를 안정적으로 내는 것이 **실기기에서 관측되어야 한다**(MUST). 옆 저장소 벤치는 후보를 좁히는 데 쓸 수 있으나 진입 근거가 되지 못한다(벤치를 근거로 다섯을 담았다가 넷을 뺀 것이 1.6.0의 경위다). "안정적으로"는 **사람이 로그를 읽어 판단한다**(MUST, 원칙 IV — 자동 채점 코드를 만들지 않는다). 로스터는 검증을 감당할 수 있는 크기로 유지한다(SHOULD). 로스터 절에 **"로스터가 하나라는 것은 완성이 아니라 현재 상태다"**를 명시해 늘리는 방향이 정상임을 남겼다.
  - **037 실기기 실측 — 오드(hyperclovax) 3회**(SM-S901N, dev, E2SN, 신호 0): 6.8초(신호 줄 되뇜 — 본문이 `"오늘 내가 본 것은 이렇다."`로 시작), 20.0초(신호 0인데 아침식사·지하철·회사·친구를 지어냄), 13.6초(짐작 어미 0개의 단정형 + 화자가 사람이 됨). 제목은 3회 전부 "오늘의 일기". **my-ollama 리포트(108런)의 예측이 3/3 재현, 반증 없음.** 모델은 로스터 정품 GGUF(md5 일치).
  - **코드**: `Character` 유니온을 좁혀 `tsc`가 변경 대상을 짚게 했다(persona·roster·prompt·acceptance·DiagnosticsScreen). **FR-009·FR-010은 코드 변경 0줄** — `selection-store`의 `isCharacter()`와 `resolve-generation`의 `no-ready-character`가 이미 방어하고 있었다(research R2·R5a). **새로 고친 것은 하나뿐**: `DiaryDetailScreen`이 로스터 밖 캐릭터가 쓴 옛 일기에서 `personaOf() → undefined.name`으로 멈추던 것(035 이전 일기는 `authorName`이 없다). `persona.ts`에 `PERSONA_NAMES`(로스터 밖이면 `undefined`)를 더하고 화면이 작성자 줄만 비우게 했다 — `personaOf()`는 안 고쳤다(로스터 밖에 페르소나를 돌려주면 원칙 III가 흐려진다).
  - **되돌릴 길을 남겼다**(FR-014): 007 선택 규칙·018 P11 접두사 유일성·`assetFor()` 구조·`usesE2SN()`·비-E2SN 프롬프트 경로(`SPEAKER_RULES`·`TITLE_INSTRUCTION`)·`HANJA`/`LATIN` 문자 범위. 캐릭터가 둘 이상이어야 성립하는 계약은 `__tests__/future-character.ts`(식별자만 있는 자리)로 시험하거나, 시험할 수 없으면 `it.skip` + 되살릴 조건을 적었다(15개). Maestro `parallel-model-download.yml`도 같은 이유로 남기고 실행기에 사유를 적었다.
  - 기기 없는 테스트 2592 통과 / 15 skip, `tsc` 0, lint 0 error, 헌법 검사 위반 0, prettier 클린. 위반 주입 4종(V1 레코드 키 불일치 / V2 `personaOf` 기본값 / V3 옛 일기 방어 제거 / V4 캐릭터 하나면 자동 선택) 전부 잡히는 것을 확인했다.
  - **남은 것**: **교체 후보 실측이 다음 과제다.** 리포트가 조건과 첫 확인 대상만 지목했고 재지 않았다 — 중국어는 "비추론 + 한국어 지시문에서 중국어 출력 + 1~2B"(Qwen2.5-1.5B-Instruct), 영어는 "한국어 지시문에서 영어 출력 + 1~3B"(Llama-3.2-1B/3B-Instruct). 후보가 진입 기준을 통과하면 로스터에 들어온다. 상세: `specs/037-roster-verified-only/`.

### 15. 024 잔여 실측 마무리 — ✅ 027에서 완료 (2026-09-01)

- **배경**: 024 스펙이 2·3차 실기기 세션에서 다음을 미판정으로 남겼다(사용자가 매번 건너뜀). 새 스펙이라기보다 024의 완료되지 않은 검증이다.
  - **SC-003·SC-004 미판정** (024 T012~T014 / T032·T033): 배터리 예외/무예외 소크 테스트 — 예외 적용 시 실제 라운드 실행 간격, 무예외 시 억제율.
  - **배터리 최적화 예외 인텐트의 삼성 One UI 실제 도착 화면** 미확인 (`adb whitelist`로 동등 재현만 함).
  - **release APK로 §9 헤드리스 1회 확인** — debug만 확인함(012 기준상 새 네이티브 모듈 없어 재확인 불필요하나, R8 side-effect 트리셰이킹 잔여 위험이 있어 다음 release 세션 1회로 닫힌다).
- **구현 결과 (027, 2026-09-01)**: 코드 변경 0줄로 종료한 검증 마무리 스펙. **US3** — `IGNORE_BATTERY_OPTIMIZATION_SETTINGS` 인텐트가 삼성에서 `com.android.settings/.Settings$AppBatteryUsageActivity`("배터리 사용 관리" 앱 목록)로 라우팅되고, "제한 없음" 선택까지 4탭. 최종 결과가 `adb dumpsys deviceidle whitelist +`와 동일함(`standby-bucket 10 → 5`) 실측. **US4** — release APK(`CN=alpharium`, minify OFF, 19m 8s 빌드)로 헤드리스 강제 실행 시 `No task registered` / `Unregistering task` 부재, `Worker result SUCCESS` → 024 §9 수정(`task.ts` 모듈 최상단 `defineTask`)이 release 빌드(Hermes 바이트코드)에서도 성립함 확인. **계획 단계 발견**: `android/app/build.gradle:69`가 `enableMinifyInReleaseBuilds`를 기본 `false`로 둬 현재 release에 R8/minify가 꺼져 있다 — 024 §11의 "R8 트리셰이킹 위험"은 minify가 켜질 때(4번)의 잠재 위험. **남은 것**: US1(배터리 예외 소크, 15분+ 주기)·US2(무예외 24h 소크) — 14번 세션과 함께. 상세: `specs/027-024-residual-verification/`.

### 16. 일기 쓰기 흐름 단순화 + 최초 실행 필수 에셋 다운로드 — ✅ 029에서 구현 (2026-09-02)

- **구현 결과 (029)**: 헌법을 **v1.3.0**으로 먼저 개정(로스터 조항: "고르지 않은 캐릭터는 내려받지 않는다 MUST NOT + 최초 실행 시 기본 하나는 MAY + '다섯 개 다 받기'는 여전히 금지", 코드보다 먼저 커밋). 홈 화면에서 `CharacterPicker`·`VisionPicker`·`GeocodingSettingToggle` 위젯 3개를 걷어내고 일기 목록 + "일기 쓰기" + 날짜 셀렉트만 남겼다. "일기 쓰기"가 눌리면 배선 계층의 새 순수 함수 `src/app/resolve-generation.ts`(`resolveGenerationParams`)가 캐릭터(마지막에 쓴 것 → 온보딩 기본 quiet, 007 `resolveSelection` 재사용)·하루(셀렉트 값)·사진 설정(설정 "자동"이면 그 날 사진 ≥1장 → `quick`, 없으면 `none`, **임계값 없음** FR-010)·장소명(설정 "자동"이면 위치 권한 유무)을 정한다. `src/diary/prompt.ts` 입력 시그니처 **무변경**(`__tests__/diary/prompt-signature.test.ts`가 소스로 잠금, SC-006). 생성 성공 시 그 캐릭터를 007 `selected-character.json`에 기록(FR-008a — 옮겨졌으면 옮겨진 쪽). "캐릭터" 탭은 제거하고 설정 탭에 "일기 작성자"(`AuthorPicker` 신규 — persona 이름·소개만, 원칙 III)·"사진 보기"(자동+3)·"장소명"(자동/켬/끔) 섹션 + 기존 다운로드 관리(`ModelSection`)를 흡수(Q1=A). `vision-setting.json`·`geocoding-setting.json`이 "auto" 센티넬/`mode` 필드로 확장(기본값이 "auto"). 온보딩(021)에 "필수 에셋 다운로드" 단계 추가 — `src/app/essential-assets-port.ts`(신규, `src/app/`에 두어 `checkOnboardingFile` 회피)가 011 `prepareVision` + 003 `prepare("quiet")`를 부르고 합산 진행률 바 하나로 표시(FR-017), **건너뛸 수 없음**(FR-016). `App.tsx` 진입 게이트가 `shouldShowOnboarding(flag, essentialAssetsReady)`로 판정 — `completed`가 true여도 003·011 readiness 실시간 조회로 필수 에셋이 없으면 온보딩 재노출(FR-020, 028의 model-not-ready 재발 방지). 기기 없는 테스트 2148개 통과, lint(eslint 0 error·tsc·헌법 검사 위반 0·prettier) 클린. 상세: `specs/029-writing-flow-simplification/`. **실기기 검증 완료(2026-09-02, SM-S901N/Galaxy S22, Android 16, dev)**: Q1(온보딩 완료 게이트가 `completed:true`인데 에셋 미준비면 온보딩 재노출 → 권한 뒤 "필수 에셋 다운로드" 단계[건너뛰기 없음·진행률 바 하나] → v1·v2·a1 병렬 세그먼트 다운로드 ~2GB, MD5 3개 전부 검증 통과 → [시작하기] → 홈 1탭 생성, `loadPrompt` 정상·**model-not-ready 없음**, `writingMs` 36초, `selected-character.json`에 `{"character":"quiet"}` 기록), Q2(a1 삭제 후 재실행 시 재노출 + 026 이어받기로 v1·v2 스킵), Q3(기존 사용자 홈 1탭 → 마지막 캐릭터 quiet로 09-01 생성, SC-003 일치), Q4(설정 탭 "일기 작성자"[persona 이름만·모델 정보 없음]·"사진 보기"[자동+3, 기본 자동]·"장소명"[자동/켬/끔] 세 섹션 + "캐릭터" 탭 흡수), Q6(Maestro: 신규 `writing-flow-simplified.yml` + 갱신 6종 + 회귀 7종 PASS). ⚠️ quiet+사진 없는 날(584토큰)은 echo 거부 빈도 높아 재시도로 해소(012 재확인, 원칙 I 방어 정상). 미확인: Q5(세션 중 손상 안내)·Q4 실제 생성 SC-005(seed 하루 필요) — 계약 테스트가 잠금. release 재확인 생략(012 — 새 네이티브 모듈·빌드 설정 없음).

- **배경**: 지금 일기 하나를 쓰려면 홈 화면 하단 "쓰기 자리"에서 캐릭터·하루·사진 설정·장소명 토글 4개 위젯을 거쳐야 한다(007·009·011·012·014·018이 각자 옳게 추가한 단계들이 누적된 결과 — AGENTS.md가 반복 경고하는 "한 축을 깊게 파는" 실패의 축적된 형태). 게다가 온보딩은 권한만 다루고 캐릭터·VLM 모델은 사용자가 "캐릭터" 탭에서 직접 받아야 해서, 앱을 처음 켜면 "일기 쓰기"를 눌러도 `model-not-ready`로 실패한다. **11번(NativeWind UI)의 선행 과제** — 흐름이 잘못된 화면을 예쁘게 만들면 UX 개선으로 화면이 합쳐질 때 그 작업이 버려진다(025에서 017 작업 일부가 날아간 패턴).
- **목표**: 홈에서 **"일기 쓰기" 한 번 탭 → (덮어쓰기 확인 시 1회) → 생성**. 새 기능을 넣지 않고 기존 단계를 자동 판정 + 설정 탭 이동으로 접는 리팩터.
- **설계 결정** (2026-09-01 브레인스토밍):
  - **홈 화면**: 일기 목록 + "일기 쓰기" 버튼 + **날짜 셀렉트 박스**(최근 3일, 기본값 = 당일)만 남긴다. `CharacterPicker`·`VisionPicker`·`GeocodingSettingToggle`과 딸린 안내 문구를 걷어낸다. 날짜는 009의 `write.selectable`을 재사용하고 여전히 파일에 저장하지 않는다(009 FR-010, 매 렌더 재판정). 012 정오 게이트 안내는 유지.
  - **파라미터 자동 결정** (`src/app/`의 새 순수 함수, 배선 계층에서 계산 — 화면 아님): 캐릭터 = 마지막에 쓴 캐릭터(없으면 온보딩 기본 캐릭터) / 하루 = 홈 셀렉트 박스 값 / 사진 설정 = 사진 신호 있으면 `quick`, 없으면 `none` / 장소명 = 위치 권한 있으면 켬, 없으면 끔. **`src/diary/prompt.ts` 무변경** — 여전히 `character`·`day`·`vision`만 받고, 자동 판정은 그 앞에서 값을 정해 넘길 뿐.
  - **온보딩 확장** (`src/onboarding/`): 권한 단계들 뒤에 **"필수 에셋 다운로드" 별도 화면**을 추가한다(모바일 게임의 "캐릭터 선택 → 에셋 로딩" 톤). VLM(`v1`+`v2`, 캐릭터 무관 공용 ~482MB)과 기본 캐릭터 1개(금동이/quiet 유력 — 가장 빠르고 안정적)를 자동 다운로드, 진행률 바 표시. **이 단계만 건너뛸 수 없다**(모델 없이는 앱이 안 돌아감) — 권한 단계는 건너뛰기 유지. `onboarding.json`의 `completed` 게이트에 "필수 에셋 준비됨"을 AND 조건으로 추가.
  - **설정 탭 확장**: "일기 작성자"(준비된 캐릭터 선택 + 미준비 캐릭터 다운로드), "사진 보기"(자동/보지 않음/빠르게 봄/자세히 봄 — 3+1 상태, 기본 "자동"), "장소명"(자동/켬/끔). 고정값이 있으면 자동 판정을 덮어쓴다. `files/preferences/`에 저장(007 캐릭터 선택과 같은 자리).
  - **헌법 개정** (v1.2.0 → v1.3.0, MINOR): 로스터 조항의 MUST를 완화한다 — ~~"사용자가 고른 캐릭터의 모델만 내려받는 구조여야 한다"~~ → "사용자가 고르지 않은 캐릭터의 모델은 내려받지 않는다(MUST NOT). 단, 앱은 최소 하나의 캐릭터 없이 동작할 수 없으므로 최초 실행 시 기본 캐릭터 하나를 자동으로 내려받는 것은 허용한다(MAY) — 사용자는 이후 설정에서 다른 캐릭터로 바꾸거나 추가할 수 있어야 한다(MUST)." "5개 다 받기"는 여전히 금지. Governance("원칙을 어기려면 헌법을 먼저 고친다")에 따라 코드보다 헌법을 먼저 고친다.
- **유지되는 경계**: 헌법 원칙 I(거부 시 파일 안 건드림 — `generate()` 흐름 무변경)·원칙 II(`prompt.ts`가 유일한 통과 지점)·원칙 III(화면이 모델을 모름 — 설정 탭 "작성자"도 persona 이름만)·`day-boundary.ts` 하나뿐·009 최근 3일 범위·014 페르소나.
- **스펙에서 확정할 열린 항목**: 온보딩 기본 캐릭터 고정값(금동이/quiet 유력), "캐릭터" 탭을 설정 탭에 흡수할지 다운로드 관리 전용으로 유지할지, `AutoDiarySettingsScreen` 하나에 섹션이 늘어나면 분리할지.

### 17. 샤오바이·모카 일기 생성 실패 조사 — ✅ 028에서 완료 (2026-09-02)

- **결론**: 둘 다 **모델 부적합**으로 확정. **코드 변경 0줄** (`git diff main -- src/` = 0). 14번(자동 생성용 모델 재검토)으로 병합. 상세: `specs/028-chinese-english-diary-failure/findings.md`.
  - 샤오바이(qwen3-1.7b): 3/3 `rejected: unfinished` (ending=`length`) — 추론 `<think>` 블록이 `n_predict:512`를 소진해 실제 일기 본문 미도달.
  - 모카(gemma3-1b): 저장 2/3(전부 환각+`**`title), `unfinished` 1/3(한국어 혼입+반복 붕괴). 지시 이행 불안정.
  - **초기 추측 3개 전부 정정됨**: `isWrongLanguage` 오탐 아님(판정이 본문을 볼 기회 없음), mojibake 아님(인코딩 깨끗), 프롬프트 문제 아님(`quiet`는 같은 프롬프트로 정상).
- **아래는 조사 착수 시점 기록 (참고용).**

- **증상** (2026-09-01, 사용자 보고): 샤오바이(`chinese`)·모카(`english`)로 일기를 쓰면 **"일기를 다시 쓸 수 있을 것 같다 (실패)"** 화면이 뜨고 목록에 안 남는다. 금동이(`quiet`)는 정상.
- **1차 실측으로 배제한 것** (SM-S901N / Galaxy S22, dev, Metro 실행 중):
  - **모델 파일 있음**: `files/models/`에 a4(1,107,409,472)·a5(806,058,272) 존재, 크기가 `roster.ts`의 `expectedBytes`와 정확히 일치.
  - **검증 통과**: `state.json`에 `a4`(`verifiedMd5: dc4836c71a28a136d2a5b782b8465b6f`)·`a5`(`b00db505c25aa7178848ed1b4aa7af34`) 둘 다 `passed: true` (026 세션에서 채록). `roster.ts`의 `md5`는 여전히 `""`이지만 `readinessOf`는 `state.json` verdict을 보므로 판정상 `ready`.
  - **다운로드·준비 계층 아님** — `readinessOf` 판정상 두 캐릭터는 `ready` 상태여야 한다.
- **의심 지점**: 증상 4번(생성은 끝나는데 저장이 안 됨)이고 메시지가 `describeFailure()`의 "다시 시도해 볼 만하다"류 → 세 갈래 중 하나: (a) `rejected` — `acceptance.ts` 4갈래(`empty`/`echo`/`language`/`unfinished`) 중 하나에 걸림. **`isWrongLanguage`가 유력** — 샤오바이는 중국어, 모카는 한국어가 아닌 언어로 써야 하는데 판정이 언어를 잘못 보거나 모델이 엉뚱한 언어를 냄. (b) `timed-out` — `GENERATION_TIMEOUT_MS`(180초, `engine.run()` 구간) 초과. (c) `generation-failed` — 추론 자체 실패. **024 §10의 EXAONE mojibake와 같은 계열(GGUF 인코딩)일 가능성** — qwen3·gemma3 Q4_K_M + `llama.rn` 조합에서 출력이 깨지면 `judge()`가 `language`/`empty`로 거부할 수 있다.
- **다음 세션 할 일**: `adb logcat`(`ReactNativeJS`·`llama` 태그)을 걸고 샤오바이/모카로 "보지 않음" 설정 생성 → 실패 갈래(`rejected: <why>` / `timed-out` / `generation-failed`)를 로그에서 확인 → 저장된(거부된) 본문을 `stopCompletion` 없이 캡처해 mojibake 여부 확인. 결과에 따라 14번(서술형 모델 재검토)과 병합하거나 `acceptance.ts` 언어 판정을 고친다. **판정 갈래는 늘리지 않는다**(헌법 원칙 IV — `REJECT_REASONS` 4개 고정).

### 18. 입력 프롬프트 텍스트 최적화 — ✅ 036에서 구현 (2026-09-08, 실기기 검증 완료)

- **구현 결과 (036)**: my-ollama 실험 리포트(kanana 1,242런 + Haiku·Sonnet·Opus
  기준선 136편, `docs/superpowers/specs/2026-09-07-diary-concept-prompt-experiment-report.md`)의
  결정 12를 저장소 소유자가 **E2SN 채택**으로 정했다.
  - **헌법 1.5.0 선행 커밋**(`5a061b6`, 코드보다 먼저). 원칙 II에 「화자는 본 것으로
    주인의 하루를 짐작한다」 조항 추가: 짐작 MAY(짐작의 말투로), 면책·되뇜 SHOULD NOT,
    **기록에 없는 사람·관계·사물·장면을 만들거나 짐작 어미 없이 단언하는 것은 MUST NOT**.
    프롬프트에서 "모른다고 쓴 일기가 지어낸 일기보다 낫다"와 예시 나열을 뺀다(면책
    문단을 만들었다, 리포트 §5.4·§5.6). 원칙 V에 일기 끝을 면책으로 맺는 것이 소음의
    전형이라는 SHOULD NOT 한 줄. 로스터 kanana 항에 §5.5 관측(짐작 중심 머리를 주면
    단서 무관한 일상 틀로 채운다).
  - **`src/diary/prompt.ts` 세 자리** — `LANGUAGE[character] === "한국어"`로 분기해
    **한국어 캐릭터(quiet·narrative·imaginative)만** E2SN, chinese·english는 현행 유지
    (036 Clarification Q1=B):
    1. **새 머리** — `SPEAKER_RULES`(8줄) → `E2_RULES`(5줄), `TITLE_INSTRUCTION`(6문장)
       → `E2_TITLE`(4문장, 이름 든 반례·기호 나열 제거), 톤 줄은 **금동이만**
       (`E_TONE.quiet` = "담담하게, 짧게 쓴다.", 조건부 spread — narrative·imaginative는
       빈 문자열이라 줄이 안 붙음, §3.1 "채택 안 함"). 호칭 줄은 접두사에 유지
       (`displayNameOf`, 035 FR-020 / 018 P11).
    2. **문장형 신호 + 날짜 삭제** — `sentenceSignalLines()` 신규. "사진: 5장" →
       "사진은 다섯 장이 남았다. 아침 여덟 시, …에 찍혔다." (한국어 숫자 낱말
       `koHour`/`koCount`/`koMeters`). `buildPrompt()`의 날짜 머리줄(`${date}에 네가
       본 것:`) 삭제 — `signals.date` 필드는 유지, 본문에서만 안 씀(FR-007). `none`/
       `unknown` 구분 유지, 통로 없는 축 제외 유지.
    3. **캡션 감싸기** — `wrappedCaptionLines()` 신규. "사진에 담긴 것:" 목록 →
       "내가 N시에 담은 장면: {캡션}" + `SCENE_LIMIT` 고정 줄. A-rule(머리 인물 조항)
       기각 — kanana 화자 ok 17%로 떨어진다(§4.1). VLM·캡션 언어(영어) 무변경.
  - **판정 4갈래 불변** — `acceptance.ts`·`llama-port.ts` diff 0줄. 면책·되뇜·인물형
    지어내기를 재는 코드 없음(원칙 IV). 꼬리에 제목 규칙(T 손잡이) 안 붙임 — kanana가
    지시문을 베낀다(§5.6).
  - **바이트 일치 확인** — my-ollama `scripts/concept-prompt/gen-baseline.ts`가 036
    `prompt.ts`를 직접 import해 뽑은 30프롬프트를 `verify-036.mjs`가 대조: **세 한국어
    캐릭터 × 6케이스 = 18프롬프트가 `buildCandidate('E2SN', …)` 조립과 바이트 일치**
    (SC-001), **chinese·english × 6 = 12는 구현 전과 동일**(SC-001a, 회귀 없음). 18프롬프트
    전문은 `specs/036-diary-concept-prompt/logs/e2sn-prompts.txt`. (Windows에서
    `gen-baseline.ts`의 동적 import를 `pathToFileURL`로 고쳐 my-ollama에 커밋 —
    리포트는 macOS에서 작성돼 안 드러났던 결함.)
  - **기기 없는 테스트 2626개 통과**, lint(eslint 0 error·tsc·헌법 검사 위반 0·prettier)
    클린. `prompt.test.ts` 회귀는 언어 분기에 맞춰 갱신(현행 문안·라벨형 신호·목록형
    캡션 검사는 `chinese`로 재타깃, E2SN 계약은 신규 `prompt-e2sn.test.ts` 32개가 잠금).
    `prompt-preview.test.ts`(035)·`generate.test.ts`(011)도 갱신. Maestro
    `prompt-preview.yml`의 `사진: 2장` assert를 `사진은 두 장이 남았다`로 갱신.
  - **✅ 실기기 검증 완료**(2026-09-08, SM-S901N/Galaxy S22, Android, dev debug —
    `specs/036-diary-concept-prompt/logs/device-session-2026-09-08.md`). Metro
    `--clear` 필요(첫 시도에 스테일 번들이 옛 프롬프트 렌더). 개발자 탭 프롬프트
    미리보기가 E2SN 확인(신호 없음 844자, `logs/e2sn-prompts.txt`와 일치).
    - **SC-004**(금동이 6편, 사진 없는 날 3 + 있는 날 3 seed): 면책 문단으로 안
      끝남 **5/6**. #5(09-07 사진 3장)만 "먹었거나 만났는지는 기록에 없으므로 알 수
      없다"로 끝남 — 리포트 §5.6 "E2SN 끝 문단 면책 2/18" 예측과 일치(제로 아님).
      현행 base(4/16)·BA(8/16) 대비 크게 줄었다. `unfinished`·`echo` 거부 0편.
    - **SC-005**(짐작 어미 없는 인물형 지어내기 0편): 명명된 사람·단정된 관계
      **0편**. 헤지된 "친구/가족" 언급(#4·#5·#6, 활동 예시로 짐작 어미와 함께)은
      §7-12가 예고한 "셋 중 하나꼴 사람·관계"이나 단정형 아님. 사진 없는 날의
      단정형 장소·시각 추측(#2·#3)은 헌법 1.5.0 용인 범위.
    - **SC-007**(writingMs): 사진 없는 날 19~22초(024 base 콜드 54초 대비 감소),
      사진 있는 날 VLM 포함 31~45초. 회귀 없음.
    - **캡션 미끄러짐**(원칙 II): `SCENE_LIMIT`으로 3편(캡션 3~19장) 전부 사진 속
      인물이 등장인물이 안 됨. base 관측 "여성/그녀" 3인칭 미끄러짐 없음.
    - **T039 Maestro**: `prompt-preview.yml`(D1 assert `너는 주인의 휴대폰이다` →
      `주인의 휴대폰이다` + `본 것으로 주인의 하루를 짐작하는 글이다` 갱신)·
      `diary-user-path.yml`·`generate-diary.yml` 3흐름 PASS.
    - **SC-004a(루이·오드) 미수행** — `a2`/`a3` 모델 파일 기기 부재(~2.4GB). E2SN
      머리는 세 한국어 캐릭터에 적용되나(계약 테스트·바이트 대조로 확인) 두
      캐릭터의 짐작 중심 머리 실측은 **로드맵 14번 세션으로 이관**. 리포트 §5.5는
      kanana만 실측.
    - release 재확인 생략(012 — 새 네이티브 모듈·빌드 설정 없음).

- **배경** (2026-09-01, 사용자 지적: "프롬프트가 상당히 길고 중구난방"): 확인 결과 **아키텍처는 이미 옳다** — `buildPrompt()` 하나가 유일한 통과 지점(헌법 원칙 II), `messages` 배열·채팅 템플릿 없이 **5개 모델에 바이트 단위로 같은 형태의 평문 하나**를 넘긴다(005 research.md §4). 캐릭터에서 오는 차이는 이름 한 줄(`너는 '금동이'이라 불린다.`)과 출력 언어 한 줄(`한국어로 써라.`)뿐. **따라서 "단일화"는 이미 됐고 남은 것은 텍스트 자체의 압축이다.**
- **문제**: `SPEAKER_RULES`·`TITLE_INSTRUCTION`·사진 한계 문구들이 005~017에 걸쳐 실기기 위반을 볼 때마다 덧붙어 누적됐다:
  - 화자 규칙 **8줄** (005 3줄 → 2026-08-20 실기기 지어내기 관측 후 5줄 추가 → 014 짐작 어미 1줄)
  - 제목 지시문 **6문장** (014 3문장 → 017 실기기 후 마크다운 기호 금지·본문 첫 줄 규칙 3문장 추가)
  - 사진 한계 문구 **5종** (`TRUNCATED_WARNING`·`PLACES_LIMITATION`·`VISION_PARTIAL`·`VISION_UNREAD`·`VISION_NONE_READ`)
  - `DAY_STILL_OPEN` (012)
  - 각 줄은 그 스펙에서 정당한 이유로 추가됐으나 **아무도 전체를 놓고 "중복은 없나, 더 짧게 같은 효과를 낼 수 없나"를 재검토하지 않았다** — 16·17번과 같은 "한 축을 깊게 판" 누적.
- **접근**: (1) 022의 개발자 탭 프롬프트 미리보기(`SIGNAL_PRESETS`)로 현재 전체 길이를 자·토큰 근사값으로 파악. (2) 중복·장황한 문구를 압축한 후보 프롬프트를 만들고, **실기기에서 기존 vs 압축본을 같은 신호로 대조 생성**해 지어내기·되뱉기·언어 위반이 재발하지 않는지 확인(005~017이 각 줄을 추가한 근거를 역으로 검증). (3) `promptPrefix()`/`fixedHead()`의 바이트 동일성(018 KV 캐시 프리필)과 `instructionLines()`의 되뱉기 판정 비교 대상 일치(P7 계약)를 깨지 않도록 유지.
- **제약**: 프롬프트는 `prompt.ts`에만(005 FR-013b). 판정 갈래 안 늘림(원칙 IV). 캐릭터에서 오는 것은 이름·언어뿐(원칙 III). 자동 채점 코드 금지(원칙 IV — 압축 전후 비교는 사람이 실기기 로그로 판단, `check-constitution.mts`가 재는 게 아님).
- **2026-09-03 재정의 (14번과 합류, 사용자 브레인스토밍)**: 압축만으로 끝날 문제가 아니라는 것이 드러났다 — 025 검증 중 나온 실제 일기("여성은 근처 물가로 산책을 나섰다. 그녀는 하얀 블라우스에...")가 화자(휴대폰)에서 사진 속 인물의 3인칭 시점으로 미끄러지는 것을 관측했다. **프롬프트를 어떻게 구성하느냐(페르소나 세팅)가 출력을 "휴대폰의 일기 / 소설 / 스토커 시점" 사이에서 가른다** — 문구 압축이 아니라 컨셉·페르소나 설계의 문제.
  - **온디바이스로는 반복 실험이 안 된다**(캐릭터당 웜 2~3초~콜드 240초) → **API 반복 실험은 `my-ollama`에서, 알파리움에서는 컨셉만 정립**한다(원칙 IV — 알파리움은 측정 장치가 아니다).
  - **산출물(2026-09-03)**: 브랜치 `033-diary-concept-prompt-handoff`, `docs/superpowers/specs/2026-09-03-diary-concept-prompt-experiment-handoff-design.md`. 알파리움 코드 0줄.
    - 컨셉 고정 뼈대: 화자=표면 제3의 서술자·실체는 휴대폰(온디바이스가 특장점이라 정체는 열림) / 아는 범위=허용받은 권한만큼 / 사진 속 인물은 정체·관계 불명("그녀"로 단정 금지) / 수신자는 독백 / **로스터 5개 전부가 재평가 대상**(1개로 미리 안 좁힘).
    - 페르소나가 돌리는 변수: **톤·태도·성격을 프롬프트에서 지시** — 헌법 원칙 III("성격 지시 금지"에 가까웠던 현행 persona.md P4)을 완화, **헌법 개정이 선행**되어야 함(16·19번과 같은 패턴). 길이·구조 압력도 페르소나별.
    - 현재 지시문(`SPEAKER_RULES` 8줄·`TITLE_INSTRUCTION` 6문장·사진 한계 5종)의 스펙별 출처·근거표, 불변 제약 6가지(평문 하나·판정 4갈래·`promptPrefix()` 바이트 동일성·P7 되뱉기 판정), 화자 미끄러짐 관측 사례 전문.
    - 프롬프트 후보 3개 스케치(캡션 재서술 / 페르소나 블록+압축 / "내가 본 것" 통합 목록) + 페르소나 5종 톤 지시 초안.
  - **왕복 구조**: 이 문서 → `my-ollama` API 실험 → **실험 결과 리포트**(모델 추천 5가지·확정 페르소나 세트·입력 조합 규칙·압축 지시문·제약 준수 확인) → 그 리포트를 근거로 알파리움이 별도 speckit 스펙에서 `prompt.ts`·`persona.ts`·헌법 개정. **아직 리포트 대기 중 — 리포트가 오면 `033` 브랜치에 함께 커밋해 PR로 처리.**

### 19. 모델 준비 완료 연출 + 캐릭터 작명

- **아이디어**: 캐릭터·VLM 모델의 다운로드와 검증이 끝나 `ready`가 되는 순간을, 침묵하는 상태 전이가 아니라 "휴대폰에 새 생명이 깃든" 첫 만남으로 연출합니다. 모델이 준비되면 백그라운드에서 정상 동작을 가볍게 확인하고("안녕?" 수준 — 응답이 오는가만 보고 품질은 채점하지 않습니다, 원칙 IV), 성공하면 "오! 주인님 반가워요. 제 이름을 지어주세요" 톤의 환영 메시지를 띄웁니다. 그 흐름에서 사용자가 캐릭터(금동이 등)의 이름을 직접 지어주고, 이후 설정에서 준비된 캐릭터마다 이름을 바꿀 수 있게 합니다.
- **제약**: 사용자가 짓는 것은 **이름뿐**입니다 — 말투·소개(`persona.ts`의 tagline)와 성격 지시는 코드 안에 사람이 설계한 것을 유지합니다(원칙 III 씨앗·페르소나). 사용자 지정 이름은 화면 표시와 프롬프트의 이름 한 줄(`너는 '___'이라 불린다.`)에만 흐릅니다. 이건 헌법 원칙 III 페르소나 조항("사용자가 자유롭게 지어내게 하지 않는다")에 닿는 결정이므로 **코드보다 헌법을 먼저 고칩니다**(16번의 로스터 조항 개정과 같은 패턴). 선행: 16번(온보딩 에셋 다운로드 흐름·설정 탭 "일기 작성자").

- **✅ 스펙 035에서 구현 (2026-09-08, 브랜치 `035-model-ready-welcome-naming`, 실기기 검증 완료)**:
  - **헌법 1.4.0 개정이 선행 커밋**(`94a1df9`, 코드보다 먼저). 원칙 III 「씨앗과 페르소나」의 "페르소나는 코드 안에 있다(MUST) / 사용자가 지어내게 하지 않는다(MUST NOT)"를 **이름에 한해** 완화했다. 근거: **이름은 호칭이지 씨앗의 서술이 아니므로 씨앗과 어긋날 수 없다** — 「금동이」를 「복실이」라 불러도 그 모델이 짧게 쓴다는 관측은 바뀌지 않는다. 말투·tagline·성격 지시는 그대로 MUST NOT.
  - **★ FR-020(018 KV 캐시와의 상호작용)이 이 스펙의 핵심 설계 결정이었다.** 사용자 지정 이름이 `promptPrefix()`에 들어가므로 018의 프리필과 어긋날 수 있었다. 두 가지를 **하지 않기로** 확정했다: (1) **호칭 줄을 접두사에서 빼지 않는다** — 빼면 `quiet`·`narrative`·`imaginative` 셋이 전부 같은 접두사가 되어(셋 다 한국어) **018 P11이 막으려던 상황이 정확히 발생한다**(위반 주입으로 확인). (2) **프리필 무효화 로직을 만들지 않는다** — 이름이 바뀌면 캐시가 부분 재사용될 뿐 **느려질 뿐 틀리지 않으며**, 이는 018 계약 E10이 이미 명시적으로 허용한 상태다. 무효화 판정을 넣으면 "언제 무효화하는가"를 검증하려고 시간을 재게 되고 그것이 원칙 IV다.
  - **`prewarm(character, prefix)`로 접두사를 인자화**했다 — `llama-port.ts`가 더 이상 `diary/prompt`를 import하지 않아 경계가 오히려 깨끗해졌다. **반환값은 여전히 `void`**(018 E6가 막는 것은 반환값이지 인자가 아니다).
  - **`personaOf()`를 고치지 않았다.** 비동기로 바꾸면 6개 호출처가 전염되고 `buildPrompt()`의 결정성(005 P6)이 깨진다. 대신 `displayNameOf(character, custom)` 순수 함수가 표시 이름의 단일 통과 지점이 됐고, 파일 읽기는 조립부(`App.tsx`)가 해서 문자열로 흘려보낸다. `persona.ts`는 **한 줄도 안 고쳤다**(014 계약 P2·P3·P4 보존).
  - **`DiaryEntry.authorName?`** — 생성 시점 이름 스냅샷(사용자 확정: 현재 이름 표시가 아니라 스냅샷). 옵셔널이라 옛 일기에는 없고 없으면 현재 이름으로 폴백하며, **소급 생성하지 않는다**(원칙 V — 그 시점 이름은 관측된 적이 없다). `serializeEntry`가 `JSON.stringify` 하나라 직렬화는 무변경.
  - **새 경계 `src/welcome/`** — 순수 판정 넷(`liveness`·`naming`·`decision`) + 기기 통로(`names-port`). `checkWelcomeFile`이 로스터·프롬프트·판정·저장소·시간 토큰을 막고, `checkPromptFile`이 **반대 방향**(프롬프트 → 연출 계층)을 막는다. 화면 → 연출 계층은 `UI_TOUCHES_WELCOME`이 막는다. 위반 주입 20종이 전부 잡히는 것을 확인했다.
  - **정상 동작 확인**은 `load()` → `run("안녕?")` → `judgeLiveness()`이며 **응답이 비었는가만** 본다(길이·품질·언어를 재지 않는다 — 1자와 500자가 둘 다 `ok`인 테스트가 임계값 부재의 증명). `LivenessOutcome`이 문자열 둘이라 시간·토큰을 담을 자리가 구조적으로 없다. `prewarm()`으로 갈음할 수 없었던 이유는 반환값이 없어(018 E6) 성공·실패를 알 수 없기 때문.
  - **확정 상수**: `LIVENESS_TIMEOUT_MS = 60_000`(024 실측 `quiet` 콜드 54초 대비 여유, `GENERATION_TIMEOUT_MS`의 1/3), `NAME_MAX_LENGTH = 12`(현행 이름 2~4자). 둘 다 **사람이 정한 값**이며 코드가 재서 정하지 않는다.
  - 기기 없는 테스트 **2593개 통과**(138 스위트), lint(eslint 0 error)·tsc·헌법 검사 위반 0·prettier 클린.
  - **✅ 실기기 검증 완료 (2026-09-08, SM-S901N, debug)**: US1 게이트(pre-035 `onboarding.json` 폴백 → 환영 흐름이 홈보다 먼저, 작명 후 `welcomeShown:true`로 재실행 시 미재등장), 확인 프롬프트가 `num_prompt_tokens=18`으로 일기 프롬프트보다 훨씬 짧음(logcat), US2 네 곳 반영(목록·설정·**진단 미리보기**·상세 폴백), US3 rename·비우기·미준비 캐릭터 진입점 없음, **SC-005a 스냅샷**(일기 A `authorName:"금동이"` / 이름 변경 후 일기 B `authorName:"복실이"`, 소급 없음). 회귀 `prompt-preview.yml`·`diary-user-path.yml` PASS.
  - **실기기 검증 중 발견·수정한 결함 2건**: (1) **FR-018의 "진단 화면" 반영 자리가 코드 기본 이름을 보였다** — `collectPromptPreviews()`가 `customNames`를 안 받았다. `buildRequest`에 옵셔널 인자를 더해 `prompt-preview`→`report`→`DiagnosticsScreen`→`App.tsx`로 흘렸다(`/speckit-converge`가 F1~F4를 잡을 때 이 경로는 놓쳤다 — 저장·읽기가 아니라 인자 전달 누락). (2) **`AuthorPicker`의 줄 `key={opt.name}`이 rename 시 줄을 리마운트**시켜 편집 상태가 사라졌다 → `key={index}`.
  - **⏳ 미확인으로 남은 것**(원칙 V): 첫 실행 전체 경로(`pm clear`+~2GB 다운로드 — 게이트 판정만 재현), 모델 손상 실패 갈래(계약 테스트로 갈음), `.maestro/welcome-naming.yml` rename 블록(Maestro가 NativeWind `AuthorPicker` 좌표를 잘못 봄 — raw adb로는 정상, 재작성 필요), `unified-permission-onboarding.yml`(맨 마지막, 다른 세션과 함께).

### 20. One UI 8.5+ 버그 — ① 다크 모드 시 화면 dimmed/까맣게 + ② 온보딩 photo-location 단계 "허용" 무반응

- **증상** (2026-09-03, 사용자 보고 + 실기기 재현 SM-S928N/S24 Ultra, **One UI 8.5** `ro.build.version.oneui=80500`, Android 16/SDK 36, release APK):
  - **① 다크 모드 시 화면 dimmed (CRITICAL, 재현 완료)**: 사용자가 어제(2026-09-02) **22시대**에 찍은 스크린샷 2장(에셋 다운로드 단계 22:03, 일기 상세 화면 22:28) — 권한 다이얼로그가 없는데도 **화면 전체가 어두운 회색**으로 나온다(흰 배경 → 회색, 검은 텍스트 → 흐릿). `adb shell "cmd uimode night yes"`로 다크 모드를 강제하면 **화면이 거의 새까맣게** 재현된다(라이트 모드로 설계된 흰 배경 뷰에 force-dark가 적용돼 텍스트까지 안 보임). 사용자 기기는 다크 모드가 **`auto`**(시간대 자동)라 밤에만 나타난다 — S22/S20+에서 덜 보인 것은 그 기기들을 주로 낮에 썼거나 One UI 8.5의 force-dark가 더 공격적이기 때문.
  - **② 온보딩 photo-location 단계에 갇힘 (CRITICAL, 재현 완료)**: 새 설치 온보딩 1단계(사진)에서 "모두 허용" → 2단계(`photo-location`, `ACCESS_MEDIA_LOCATION`)로 진행. 여기서 "허용"을 누르면 `GrantPermissionsActivity`가 **뜨자마자 즉시 destroyed**(화면에 안 보임, `adb logcat`의 `SurfaceFlinger ... GrantPermissionsActivity ... destroyed`로만 확인). 화면은 **2/5 그대로**, `onboarding-allow` 버튼 그대로 — **사용자 눈에는 "버튼이 안 눌린다 / 아무 반응 없음"**. 유일한 탈출구는 **"건너뛰기"**(사용자가 정확히 관찰: "건너뛰기만 해야 하는 경험"). S22/S20+에서 안 나타난 것은 우연(그 기기들에선 다이얼로그가 잠깐 보였거나 사용자가 건너뛰기만 눌렀을 것).
  - **부수 관측**: `adb logcat`에 `W unknown:ReactNative: StatusBarModule: Ignored status bar change, current activity is edge-to-edge.`가 **수십 회 연속** 반복 — RN `<StatusBar>` 컴포넌트가 `targetSdk 36`의 edge-to-edge 강제로 완전히 무력화됨. 권한 다이얼로그가 뜨는 동안 뒤 화면 scrim은 정상 동작이나, One UI 8.5의 `navigationBars ... mFlags=SUPPRESS_SCRIM` + `isTopActivityTransparent=true` 조합에서 ②처럼 다이얼로그가 즉시 죽을 때 scrim 걷힘 타이밍이 어긋날 여지가 있다(별도 확인).
- **근본 원인 (Phase 1 조사 완료)**:
  - **① 다크 모드**: `app.json:8`에 `"userInterfaceStyle": "light"`를 선언했지만 **`expo-system-ui` 패키지가 없어 적용되지 않는다**(`npx expo prebuild` 로그: `» android: userInterfaceStyle: Install expo-system-ui in your project to enable this feature.`). `AndroidManifest.xml`의 `MainActivity`는 `android:configChanges="...uiMode..."`라 다크 모드 전환 시 Activity 재생성도 안 한다. 결과: 시스템 다크 모드가 켜지면 One UI가 흰 배경 RN 뷰에 **force-dark** 변환을 적용 → dimmed. **앱 전체가 라이트 모드 전용으로 그려지는데(흰 배경·검은 텍스트, `src/ui/` 어디에도 `useColorScheme`·다크 팔레트 없음) 시스템 다크 모드를 막지 못하고 있다.**
  - **② photo-location**: `src/signals/expo-port.ts`의 `requestLocationPermission()`(line 125-128)이 `ACCESS_MEDIA_LOCATION`이 아니라 **`PHOTO_ONLY`(`READ_MEDIA_IMAGES`)를 다시 요청**한다 — `expo-media-library 57`이 `ACCESS_MEDIA_LOCATION` 전용 요청·조회 API를 주지 않기 때문(021에서 확인된 제약, line 95-97 주석). 1단계에서 이미 granted라 이 재요청은 no-op이고, One UI는 `GrantPermissionsActivity`를 띄웠다가 즉시 종료한다. `locationPermission()`(line 109-118)은 사진이 granted면 **항상 `"undetermined"` 반환** → `decision.ts`의 `statusOf("undetermined", false)` → **`"actionable"`** → `nextStep`이 photo-location 단계를 영원히 반환 → **무한 루프**. 즉 **온보딩의 `photo-location` 단계는 "허용" 버튼이 구조적으로 아무것도 못 하는 판정 불가능한 단계**다. 021이 이 제약을 `collect.ts`에는 흡수했지만 온보딩 UI는 못 했다.
- **수정 방향 후보** (스펙에서 확정):
  - **① 다크 모드**: (A) `npx expo install expo-system-ui` + `app.json`의 `userInterfaceStyle: "light"`가 실제 먹히게 → 시스템 다크 모드와 무관하게 라이트 고정(가장 작은 수정, **새 네이티브 모듈이라 release 재확인 필요** 012). (B) `android:forceDarkAllowed="false"`를 테마에 추가(plugin으로 — `android/`는 gitignore). (C) 앱을 실제 다크 모드 대응(`src/ui/` 전면 팔레트 작업) — **11번(NativeWind UI)의 범위**, 큼. **단기: (A)+(B), 장기: (C)를 11번에서.**
  - **② photo-location**: (A) **photo-location 단계를 온보딩에서 제거**(권장) — 판정도 요청도 불가능하고 `collect.ts`가 실제 좌표 읽기로 이미 처리한다(FR-013a). 021 `PERMISSION_REQUIREMENTS`에서 빼거나 `order` 조정, 설정 탭 "권한" 섹션 해당 행도 재검토. (B) "안내만" 단계로("허용" 대신 "다음", `statusOf`가 `satisfied`로). (C) 네이티브로 `ACCESS_MEDIA_LOCATION` 직접 요청 — 범위 큼, 비권장.
  - edge-to-edge 대응(`react-native-edge-to-edge`/`SystemBars`)은 **11번에서 함께**.
- **제약**: 판정 갈래 안 늘림(원칙 IV). 온보딩은 건너뛸 수 있어야 함(원칙 I) — photo-location을 제거해도 다른 단계의 건너뛰기는 유지. `collect.ts`의 좌표 읽기 판정(FR-013a)은 무변경. **실기기 재확인은 One UI 8.5 기기(S24U) 필수 + 다크 모드 `auto`로 두고 밤 시간대 확인** — S22/S20+ 낮에는 두 버그 모두 안 보인다. ① (A) 채택 시 `expo-system-ui`가 새 네이티브 모듈이므로 release 재확인 1회.
- **선행/연관**: ②는 021(통합 권한 온보딩)의 후속 결함. ①·edge-to-edge는 11번(NativeWind UI)과 범위 공유(11번이 다크 모드 팔레트를 하므로 순서 조율 필요). **12번(배포용 패키징)보다 먼저** — 새 설치 사용자가 밤에 열면 화면이 안 보이고(①), 온보딩에서 막힌다(②).

- **✅ 스펙 031에서 수정 (2026-09-03, 브랜치 `031-oneui85-darkmode-photolocation`)**:
  - **① 다크 모드** — 근본 원인이 **실기기 조사로 정정**됐다. 로드맵의 "force-dark 반전" 진단은 틀렸다: `forceDarkAllowed=false`를 `AppTheme`·`Theme.App.SplashScreen` 양쪽(+aapt2 `-v29` variant)에 넣은 debug 빌드에서도 배경이 정확히 **`#303030`**(`background_material_dark`)으로 나왔다 — force-dark였다면 글자·이미지까지 반전됐을 것. `dumpsys activity`로 확정: `mLastConfigurationFromResources`에 `night` 없음(= `expo-system-ui`의 `setDefaultNightMode(MODE_NIGHT_NO)`는 작동, 리소스 해석은 라이트)이나 `mCurrentConfig`에 `night` 잔존. 즉 **`AppTheme`의 부모 `Theme.AppCompat.DayNight.NoActionBar`가 시스템 night 모드에서 윈도우 데코 배경을 night 리소스로 칠한 것**이고, `android:configChanges`의 `uiMode` 때문에 Activity 재생성도 안 돼 스테일한 다크 배경이 잔존했다. **수정: `expo-system-ui` 설치 + config plugin(`plugins/with-force-light-theme.js`)으로 `AppTheme` 부모를 `Theme.AppCompat.Light.NoActionBar`로 교체.** `Theme.App.SplashScreen`은 `AppTheme` 상속이라 자동으로 따라온다. `forceDarkAllowed=false`는 제조사 force-dark 대비 방어로 양쪽 유지.
  - **② photo-location** — `PERMISSION_REQUIREMENTS`(`src/onboarding/requirements.ts`)에서 `photo-location` 항목·`PermissionKey` 멤버를 제거하고 `order`를 1..4로 재배치(사진·위치·알림·배터리 예외). `OnboardingScreen`·`PermissionsSection`·`App.tsx`의 `photo-location` 분기와 계약 테스트를 함께 정리. `collect.ts`(실제 좌표 읽기, FR-013a)·매니페스트 `ACCESS_MEDIA_LOCATION` 선언·`expo-media-library` 플러그인 설정은 무변경.
  - **실기기 관측 (SM-S928N/One UI 8.5, `cmd uimode night yes`, debug)**: 온보딩 1단계·에셋 다운로드 단계·"1/4" 재게이트 전부 배경 `rgb(250,250,250)` + 텍스트 검정 + 대비 또렷 — 어제 22:03·22:28 dimmed(`#303030`) 재현 **0건**. `cmd uimode night no`에서도 `rgb(250,250,250)` 동일(회귀 없음). 온보딩 4단계가 `photos → location → notifications → battery-exception` 순서로 정확히 나오고 `photo-location` 단계 **부재**, 4개 전부 [건너뛰기]로 통과 → 에셋 다운로드 단계 도달(**갇힘 없음**). `cmd uimode night auto` 복원 완료.
  - **✅ 나머지 화면 검증 완료 (2026-09-11, SM-S928N/One UI 8.5, debug, `cmd uimode night yes`)**: 검증용 모델 3개(`a1`·`v1`·`v2`, `run-as` 배치 + `state.json` verdict)로 온보딩 게이트 통과 후 — **목록·상세·설정·개발자 탭 4화면 전부 배경 아이보리(`rgb(250,250,250)`) + 텍스트 검정 + 대비 또렷**, `#303030` 재현 0건. 생성중 화면(진행률 숫자·경과 시간 없음)도 아이보리. 설정 "권한" 섹션 **행 정확히 4개**(`permission-row-photos`·`-location`·`-notifications`·`-battery-exception`), `permission-row-photo-location` **부재**(소스 grep 0건). 온보딩 4단계 순서(`onboarding-step-photos → -location → -notifications → -battery-exception`) `uiautomator dump`로 직접 확인, `onboarding-step-photo-location` 부재. Maestro `unified-permission-onboarding.yml`(4단계 갱신본, 로스터 모델명 미노출)·`scheduled-diary-notification.yml` PASS. `cmd uimode night auto` 복원.
  - **✅ T031 신호 수집 회귀 완료 (2026-09-11, SM-S901N)**: `seed:day rich 2026-09-10`(좌표 3장) + 사진 설정 auto로 생성 2회 — **위치 권한 허용** 시 `placeName={"kind":"known","value":"중구"}` + 본문에 "중구", **`pm revoke ACCESS_FINE/COARSE_LOCATION` 후 재생성** 시 `placeName=null` + 본문 지명 없음. `signalsUsed.places`는 두 경우 다 `kind:"known"`(좌표는 사진 EXIF에서 오므로 위치 권한 무관). 021 T030 원래 관측과 동일 — `collect.ts` 무변경이라 031이 이 갈래를 안 건드렸음이 확인됐다.
  - **✅ T034 S22 회귀 완료 (2026-09-11, SM-S901N, One UI 8.0)**: `night no`/`night yes` 대조 — 목록·상세·설정·개발자 탭 4화면이 두 모드에서 **픽셀 동일**(아이보리, `#303030` 재현 0건). 031의 `AppTheme` 부모 교체가 One UI 8.0에서도 성립. 로스터 밖 일기(09-08 오드)도 다크에서 정상.
  - **미확인 잔여**: **release APK 재확인 하나** — 2026-09-09 저장소 소유자 지시로 dev-only 검증 정책 확정(PR #56), release 세션 명시 요청 시에만. `expo-system-ui`는 표준 autolinking 모듈이라 minify 생존 위험 낮음(012). 상세는 `specs/031-oneui85-fixes/tasks.md` Phase 6.

### 21. 032 후속 — 미이관 화면 마무리 + 새 인터랙션/애니메이션 — ✅ 033에서 구현 (2026-09-07, 실기기 debug 검증 완료)

- **배경** (2026-09-05 제안): 032가 NativeWind + 디자인 토큰 + 재사용 컴포넌트 7종을 도입하고 핵심 화면 5개를 이관했지만, 두 갈래가 미완으로 남았다.
  1. **미이관 화면·미적용 컴포넌트** — `CharacterListScreen.tsx`가 여전히 `StyleSheet` + 원시 hex(`#fdf3d8` 등)로 남아 있다(T063, SHOULD로 미룸). 032가 만든 `Card`·`ListRow`·`Toggle`·`Section` 컴포넌트는 계약 테스트는 통과하지만 **어느 화면에도 실제로 안 쓰인다** — 기존 화면 구조(다중 행·상태별 버튼 하나·저장 공간 표시)가 안 맞아 만들고 안 썼다(032 T062 판단). `ListRow`는 `CharacterListScreen`의 행 구조(label=이름+소개, value=상태, right=action 버튼)와 형태가 가장 가까워 보인다 — 이관 시 실측이 필요하다.
  2. **reanimated가 들어왔지만 안 쓰인다** — NativeWind v4.2가 `react-native-css-interop`의 peerDependency로 `react-native-reanimated`(+ `worklets`)를 끌어왔고(032, SDK 57 정합 버전 4.5.1/0.10.1로 고정), release 재확인까지 필요해졌다. 그런데 이 시점까지 **실제 애니메이션·인터랙션에는 전혀 안 쓰였다** — 이미 치른 빌드 크기·복잡도 비용을 활용하지 않는 상태.
- **아이디어**:
  - `CharacterListScreen`을 토큰·`ListRow`(또는 다른 032 컴포넌트)로 이관해 032의 톤을 완성한다. 기존 동작 계약(원칙 III — 모델 정보 안 새게 하는 코드 주석들, FR-004~006 등)과 `character-row-*`·`action-*`·`pause-*` testID는 무변경.
  - reanimated로 버튼 눌림 피드백, 화면 전환 트랜지션, 새로고침 인디케이터 같은 가벼운 인터랙션을 추가한다. **생성 중인 글을 보여주지 않는다는 원칙 IV, 진행률 숫자를 노출하지 않는다는 제약은 애니메이션을 더해도 유지**해야 한다(005 FR-028b) — 진행 "표시"의 부드러움을 더하는 것과 진행 "수치"를 드러내는 것은 다르다.
- **선행 확인 필요**: SM-S928N 육안·release 빌드 재확인(032가 이월한 잔여)을 이 스펙에서 함께 닫을지, 별도로 유지할지. `CharacterListScreen`은 032 스펙이 명시적으로 범위 밖(T063 SHOULD)이라 표시했던 화면이라, 이관 시 032의 계약(`contracts/screen-migration.md`)을 그대로 재사용할 수 있는지부터 확인한다.
- **✅ 033에서 구현 — 실기기 debug 검증 완료**(2026-09-07, SM-S901N/Galaxy S22,
  One UI 7 / Android 16, `specs/033-character-screen-press-feedback/`). 위 다섯 물음의 답:
  1. **`CharacterListScreen` 이관** — `ListRow`로 이관했다. `label`을
     `string | ReactNode`로 넓히자(순수 확장, 기존 6개 테스트 무수정 GREEN)
     032 T062의 "구조가 안 맞는다"는 전제가 사라졌다. 032
     `contracts/screen-migration.md` 공통 원칙을 그대로 재사용했고 별도
     계약(CS1~CS10)만 더했다. 버튼은 공용 `Button`으로 교체(지우기만 danger).
  2. **미적용 컴포넌트** — `ListRow`만 실제로 적용했다. `Card`·`Toggle`·
     `Section`은 032 T062 판단을 유지한다(쓸 자리를 억지로 만들지 않는다).
  3. **애니메이션 범위** — **눌림 피드백만**(`scale 0.97` / `120ms`,
     `tokens.ts`의 `PRESS` 상수 한 곳). 화면 전환·목록 등장·인디케이터
     재작성은 범위 밖으로 명시했다. **새 컴포넌트 0개** — 032의 7종 그대로.
  4. **032 이월 잔여** — **별도 유지**. 다만 032 T059 잔여 (2)(release 빌드)에
     "눌림 반응이 배포 빌드에서 동작하는가"를 확인 항목으로 추가했다.
  5. **Maestro** — **새 흐름 0개**. ⚠️ 조사 중 정정: 이 화면을 지나는 흐름은
     `diary-character-select.yml`이 **아니라**(029가 `AuthorPicker`로 분리)
     `download-conflict`·`parallel-model-download`·`photo-vision` 셋이다.
- **★ 구현 중 발견 — `babel.config.js`에 `react-native-worklets/plugin`이
  없었다.** reanimated 4.x는 이것 없이 worklet이 컴파일되지 않는데, 실패가
  조용하다(오류 없이 애니메이션만 안 돎). 032가 남긴 "이 플러그인이 설치돼
  있지 않다"는 주석이 스테일이었다 — 실제로는 설치돼 있었다. 033이 활성화했다.
- **✅ 실기기 검증 결과**(2026-09-07): 눌림 반응 실측 — 버튼 내부 노드가
  평상시 117×66 → 누른 채 **113×64**(비율 0.966/0.970, `PRESS.scale = 0.97`과
  일치), 바깥 `action-*` bounds는 불변(transform만 바뀌어 주변이 안 밀림).
  logcat에 `libworklets.so`·`libreanimated.so` 적재 확인 — T001(babel worklets
  플러그인)이 유효했다. 화면 이관 육안(아이보리 톤·문안·testID 전부 이관 전과
  동일, 모델 식별자 0건), 생성 중 화면 텍스트 5개뿐(금지어 7종 0건),
  Maestro `photo-vision.yml`·`parallel-model-download.yml` 무갱신 PASS.
  ⚠️ `download-conflict.yml`은 026이 「한 번에 하나」 제약을 풀어 구조적으로
  PASS 불가 — 로드맵 이관(SC-004 부분 미충족). 검증 중 stale 결함 셋을 함께
  고쳤다(023·025·020 계열, 033 회귀 아님).
- **미확인 잔여**: release 빌드에서의 눌림 반응(dev-only 검증 정책상 요청 시에만,
  PR #56), One UI 8.5(SM-S928N) 육안(032 이월 잔여 (1), 재현 기기 필요).

### 22. 엔드유저 화면 전체를 NativeWind/토큰으로 이관 (033 후속)

- **배경** (2026-09-07 사용자 요청): 032가 다섯 화면군을, 033이
  `CharacterListScreen`·`DayPicker`를 이관했다. 그런데 **`src/ui/`의 17개 파일이
  아직 자체 `StyleSheet.create`를 쓴다.** 다만 그중 **15개는 이미 원시 hex 0개**로
  토큰만 참조하므로, 남은 것은 "원시 색값 제거"가 아니라 **"className 병행 패턴의
  일관성"**이다.
- **현황** (2026-09-07 실측):
  - **원시 hex가 남은 파일 0개** — 033이 `DayPicker`(`#ccc`·`#333`)를 이관해
    마지막이 사라졌다. `CharacterPicker.tsx`에 2개가 남아 있으나 **029가 홈에서
    걷어내 어느 화면도 렌더하지 않는 죽은 코드**다(제거 여부도 이 스펙에서 정한다).
  - **`className`이 아예 없는 파일**: `AuthorPicker`·`AutoDiaryTriggerButton`·
    `BuildErrorScreen`·`DiagnosticsScreen`·`GenerationProbe`·`OverwriteConfirmScreen`·
    `PermissionPanel`·`PermissionsSection`·`PromptPreviewPanel`·`SignalProbe`.
    이 중 개발자 탭 전용(`DiagnosticsScreen`·`SignalProbe`·`GenerationProbe`·
    `PromptPreviewPanel`)은 **배포 빌드에서 닿을 수 없으므로 범위 밖**이다(원칙 III).
- **아이디어**: 032 `contracts/screen-migration.md`의 공통 원칙("표현만 바꾼다",
  문안·`testID` 불변, 기존 테스트 무수정 통과)을 그대로 재사용해 남은 엔드유저
  화면에 className 병행을 넣는다. 033이 `DayPicker`에서 쓴 패턴(`ROW`/`ROW_SELECTED`
  상수 + `className` 문자열)이 선례다.
- **⚠️ 선행 확인 필요 — 이 작업의 진짜 위험은 레이아웃이다.** 025·023이 겪은 대로
  **행 높이·여백이 바뀌면 문안·`testID`가 전부 불변이어도 Maestro
  `scrollUntilVisible`이 깨진다**(033 CS10이 같은 이유로 `paddingVertical: 12`를
  명시적으로 유지했다). 화면 하나씩 이관하고 그때마다 관련 흐름을 돌리는 편이,
  한꺼번에 바꾸고 19개 흐름을 한 번에 돌리는 것보다 원인 추적이 쉽다.
- **함께 정할 것**: 설정 탭의 좌우 여백을 `App.tsx`의 `settingsSection`으로
  감싸는 지금 방식(033)을 유지할지, `SelectRow` 같은 공용 컴포넌트가 자체 여백을
  갖게 할지. 후자는 그 컴포넌트를 쓰는 모든 자리에 영향이 간다.
- **🔄 034에서 구현 — 코드 완료, 실기기 검증 대기**(2026-09-07,
  `specs/034-enduser-nativewind-migration/`). 위 물음들의 답:
  - **범위 정정**: 사용자 요청이 든 6파일 중 `AutoDiaryTriggerButton`·
    `PermissionPanel`은 실제로 `DiagnosticsScreen`(dev 게이트) 안에서만 렌더된다
    (`src/ui/DiagnosticsScreen.tsx:113,130`) — 배포 빌드에서 엔드유저가 못 보므로
    개발자 탭 4종과 함께 범위 밖. **실제 대상은 4파일**: `AuthorPicker`·
    `BuildErrorScreen`·`OverwriteConfirmScreen`·`PermissionsSection`.
  - **이관 단위** (Clarify OQ-1): **일괄 이관** — 네 파일을 한꺼번에 옮기고
    `npm test` 통과 후 실기기 Maestro 회귀를 한 세션으로. 여백을 안 바꾸기로 했으니
    화면별로 끊을 필요 없다는 판단.
  - **설정 탭 여백** (OQ-2): **`App.tsx` 조립부가 좌우 여백 소유**. `PermissionsSection`의
    `section` 스타일을 `{ gap: 14 }`만 남기고 `App.tsx`에서 `settingsSection`
    (`paddingHorizontal: 20`) 래퍼로 감쌌다 — 033이 `AuthorPicker`·`VisionPicker`·
    `GeocodingSettingToggle`에 쓴 방식에 편입. `App.tsx` 1곳 변경. `SelectRow` 무변경.
  - **미적용 컴포넌트** (OQ-3): **`Card`·`SectionHeader`를 `PermissionsSection`에
    처음 적용**했다 — 각 권한 행을 `Card`(`style={{ padding: 12 }}`로 기본 `padding: 16`
    오버라이드)로 감싸고 머리글을 `<SectionHeader>`로. `Section`(섹션 전체 `Card`
    래핑)·`Toggle`은 톤 불일치·해당 없음으로 미적용(research R3).
  - **`AuthorPicker`는 `SelectRow`로 안 바꿨다** — `SelectRow`가 선택 표식을 `"선택"`으로
    하드코딩하고 미준비 사유 캡션 슬롯이 없어 `author-picker.test.tsx`가 잠근
    `"작성자"` 표식·`"아직 준비되지 않음"` 캡션을 못 낸다(research R2). 033 `DayPicker`
    방식(`AppText` + 토큰 + `className` 병행 + 모듈 상수).
- **★ 검증 완료 (기기 없는)**: 130 suites / 2378 tests GREEN(+69, 신규 계약 스위트
  `enduser-screen-migration.test.tsx` ES1~ES14). 기존 4개 스위트(`author-picker`·
  `build-error`·`overwrite-confirm`·`permissions-section`)·`card`·`section-header`
  전부 **무수정 GREEN**. eslint 0 error, `tsc` 0, 헌법 검사 위반 0, prettier 클린.
  위반 주입 5종(원시 hex / `useColorScheme` / `dark:` / `models/roster` import /
  좌우 padding 되살림) 전부 잡힘. `git diff`: `src/ui/` 4파일 + `App.tsx` 1곳 +
  신규 테스트 1스위트. 도메인 계층(`diary/`·`models/`·`inference/`·`signals/`·
  `vision/`·`schedule/`·`onboarding/`) **0줄**. `FLOWS` 19개 불변.
- **★ 실기기 검증 완료 (2026-09-07, SM-S901N/Galaxy S22, Android, dev debug)**:
  - **Maestro 7흐름 무갱신 PASS**: `diary-character-select`(033이 안 돌린 흐름 —
    stale 아님, 갱신 없이 PASS), `writing-flow-simplified`, `generate-diary`,
    `past-day-diary`, `writing-monologue-expansion`, `skeleton`, `model-acquisition`.
  - **★ 새 `OverwriteConfirmScreen` Button 실기기 확인**: `generate-diary`가
    `.*덮어쓸지 확인.*` → "확인"(primary Button) 탭, `past-day-diary`가 "취소"
    (secondary Button) 탭 — 두 Button이 텍스트 렌더 + 탭 수신.
  - **설정 탭 육안**: "일기 작성자" 선택 행 테라코타 테두리 + "작성자" 표식,
    미준비 행 회색 + `opacity-50` + 캡션. "권한" 5개 행이 `Card`로 렌더,
    `permissions-section`·`permission-row-*`·`permission-restart-onboarding` 문안 그대로.
    **좌우 정렬선 통일 확인** — 네 설정 섹션이 화면 끝에서 ~20px 한 세로선(ES14 —
    `App.tsx` `settingsSection` 래퍼가 `PermissionsSection` 편입).
  - **`photo-vision.yml` PASS** — 033의 `CharacterListScreen` 지정 흐름. 설정 탭
    `vision-row`·`action-vision`·`vision-auto`/`vision-quick` 무회귀 확인.
  - **FAIL 2건 — 원인 규명, 034 회귀 아님, 이 브랜치에서 해소 불가**:
    - `photo-selection-over-limit`: `SEED_DAY=2026-09-01`이 009 선택 범위 밖(오늘
      09-07 → 09-05/06/07). 범위 안으로 재심기 시도했으나 **seed 도구의 시간대 한계**
      (요청일 +1일 착지 — 023·010 기록)로 09-05에 착지 불가(06·07은 일기 있음, 08은
      범위 밖). 유일한 034-관련 단계(옵셔널 `OverwriteConfirmScreen` "확인" 탭)는
      `generate-diary`·`past-day-diary`가 이미 통과한 동일 상호작용이라 중복.
    - `parallel-model-download`: 기기에 **`a5.bin`(english/모카)이 이미 완전 다운로드·
      검증됨** → `action-english`가 다운로드가 아니라 삭제를 부름 → `pause-chinese`
      영영 안 뜸. 흐름 주석이 이 상태를 "SKIPPED가 아니라 FAILED로 드러난다 — 손으로
      확인(원칙 V)"으로 **명시**. 이 흐름은 `CharacterListScreen`만 지나고 034는 그
      파일을 한 줄도 안 건드림(`git diff --stat main` = App.tsx + 4개 화면). 해소하려면
      `a5.bin` 삭제가 필요한데 다른 흐름의 테스트 데이터 파괴 + 026 세션 셋업 영역.
  - **덮어쓰기 확인 화면 톤 육안**: 「취소」=secondary Button(흰 배경+회색 테두리),
    「확인」=primary Button(테라코타 배경+오프화이트 텍스트). "확인" 탭 → 생성 시작 →
    생성 중 화면 금지어 0건(FR-017 회귀 없음). "그만두기"로 중단 → 홈 복귀.
  - **빌드 오류 화면 톤 육안**(`EXPO_PUBLIC_APP_ENV=bogus`로 재현): 아이보리 배경,
    제목 `variant="title"` 중앙 정렬, 본문 `variant="body"`+opacity 0.8. 환경 변수
    이름·"다시 시도" 문구·모델 식별자 0건(원칙 III·S10). 검증 후 dev 환경 복원.
  - **release 재확인 불필요**(새 네이티브 모듈 0 — 012).

### 23. 완성된 일기 첫 표시를 타자기 연출로

- **배경** (2026-09-08 사용자 제안): 지금은 "일기 쓰기"를 누르면 회전 표시 +
  독백 한 줄(`writing` 화면)만 보다가, 완성되면 `written` 화면에서 일기 **전체가
  한 번에** 나타난다(`DiaryHomeScreen`의 `written` 케이스 → `DiaryDetailScreen`).
  사용자는 그 첫 표시를, 완성된 본문이 **타자기처럼 글자 단위로 흐르는** 연출로
  바꾸고 싶다("클로드 코드가 답을 글자씩 흘려보내는 것처럼"). "완성의 순간"을
  느끼게 하는 것이 목적.
- **헌법 관계** — **금지 대상 아님.** 원칙이 막는 것은 *생성 중인 글*을 보여주는
  것(005 FR-028b — 토큰 콜백을 `completion()`에 아예 안 넘긴다)이다. 이 연출은
  이미 **생성 완료·4갈래 판정 통과·저장까지 끝난** 본문 문자열을 자르는 것이라
  그 금지에 해당하지 않는다. **다만 톤 위험**: 타자기가 "실시간으로 쓰는 중"처럼
  *보이면* 015·016이 반복 확인한 "생성 중엔 회전 표시만" 경계를 화면상 흐린다 —
  `writing`(회전 표시)과 `written`(저장된 본문 타이핑)이 명확히 다른 상태임을
  유지한다. 새 헌법 검사 규칙은 불필요하나 이 위험을 설계 문서에 명시한다.
- **결정된 사항** (2026-09-08 브레인스토밍):
  1. **연출 방식** — 타자기(글자가 하나씩 흐름). 문단 페이드인·전체 슬라이드인
     아님.
  2. **흘릴 범위** — 제목 + 본문. 제목이 먼저 타이핑되고 이어서 본문. 그 아래
     "이 일기가 본 것"(사진·장소명·소요 시간, 017)과 사진 슬라이더·갤러리(025)는
     본문 타이핑이 끝난 뒤 나타난다.
  3. **속도** — 글자당 ~15ms(빠름, "기다림"보다 "드러남"). `tokens.ts` 상수 한
     곳에 두고 나중에 조정 가능.
  4. **건너뛰기** — 화면 아무 곳이나 탭하면 즉시 전체 표시 + 하단 절 등장.
  5. **완료 후** — 그 자리가 **그대로 상세 화면**이 된다. 별도 화면 전환 없음.
  6. **노출 시점** — **생성 직후 첫 표시(`written` 케이스)만.** 나중에 목록에서
     그 일기를 다시 열면(`detail` 케이스) 즉시 전체. 재생 안 됨.
- **접근** (A안 채택):
  - **A. `written` 케이스에서 `DiaryDetailScreen`이 타이핑 상태를 prop으로
    받는다** — `<DiaryDetailScreen reveal ... />`. `reveal`이 있으면 제목→본문을
    점진 노출, 끝나면 로컬 state `revealDone`으로 하단 절 렌더. `reveal`이 없으면
    (목록에서 연 `detail` 케이스) 지금과 100% 동일. 화면 전환 없음 → "그 자리가
    그대로 상세"에 정확히 맞음. `src/ui/` 안에서 완결(025 갤러리와 같은 성격).
  - B. `written`을 별도 `DiaryRevealScreen`으로 분리 — 화면 전환이 한 번 생기고
    상세 렌더 로직을 두 곳에서 관리. 기각.
  - C. `App.tsx` 레벨 애니메이션 래퍼 — 과함. `written` 상태 하나에만 필요. 기각.
- **새 컴포넌트** — `src/ui/components/TypewriterText.tsx`. 순수 표시. 완성
  문자열을 받아 `Array.from(text)`(서로게이트·이모지·한글 완성 글자 단위 안전)로
  잘라 `useEffect` 타이머로 점진 노출. `skipToEnd` prop이 참이 되면 즉시 전체 +
  `onDone` 1회. `text` 교체 시 처음부터. 언마운트 시 타이머 정리. **reanimated
  불필요** — 투명도 전환이 아니라 문자열 슬라이스라 `setState`로 충분.
- **경계** — `src/diary/`·`src/inference/`·`src/vision/` 무변경. 파이프라인·
  `RunResult`·판정 무변경. `writing` 케이스(회전 표시) 무변경. 새 네이티브 모듈
  0개 → debug 실기기 1회로 충분(012).
- **테스트** — `TypewriterText` 계약(`.tsx`, jest-expo): `jest.useFakeTimers` +
  `act(() => jest.advanceTimersByTime(...))`로 노출 글자 수 증가, `skipToEnd`로
  전체+`onDone` 1회, `text` 교체 재시작. RNTL 14 — `render`·`fireEvent` `await`.
  `DiaryDetailScreen` 계약: `reveal` 없으면 하단 절 즉시 존재, 있으면 타이핑
  완료 전엔 부재. 위반 주입: `skipToEnd` 무시 → FAIL, `reveal` 없이도 잘리게 →
  목록 화면 회귀 FAIL.
- **위험/미해결**:
  - **Maestro 타이밍** — 타자기가 도는 동안 `assertVisible`이 본문 일부를 못 볼
    수 있다. 생성 후 상세를 보는 기존 흐름(`diary-photo-gallery.yml` 등)의 시작부에
    "화면 탭(건너뛰기)"을 넣어 해소. 025가 겪은 `scrollUntilVisible` 함정과 같은
    계열.
  - **`written`에서 뒤로 갔다 재진입** — "첫 표시만"이므로 목록에서 다시 열면
    `detail` = 즉시 전체. 재생 안 됨(의도).
- **선행 확인** — 21번(033)의 reanimated·눌림 피드백 작업과 겹치지 않는다(이건
  `setState` 타이핑, reanimated 안 씀). 순서 무관.

### 24. 초기 권한 획득 UI/UX 개선 — 로고 + 자동 권한 요청 + 작명·다운로드·첫 일기 병렬화

- **배경** (2026-09-11 사용자 제안): 다른 앱들의 최초 실행은 대체로
  **전체화면 로고 하나 → 각 권한이 어떤 목적인지 짧게 보여주며 시스템 권한
  팝업이 버튼 인터랙션 없이 순차로 뜨는** 구조다. 지금 우리 온보딩(021·029의
  `OnboardingScreen`)은 단계마다 설명 문구 + [허용]/[건너뛰기] 버튼을 사용자가
  일일이 눌러야 다음으로 간다 — 사용자가 보기에 "많이 다른 방식"이고 손이 더
  간다. 이 항목은 **최초 권한 획득 경험을 그 통용 패턴에 가깝게** 다듬고,
  이어서 **19번(모델 준비 연출·작명)과 하나의 첫 실행 흐름으로 합치는** 것이다.

- **합쳐진 첫 실행 흐름** (2026-09-11 사용자 제안, 상세는 speckit 스펙에서 확정):
  1. 전체화면 로고 → 권한 목적 설명 + 시스템 팝업 순차.
  2. 권한 획득이 끝나면 **백그라운드에서 LLM(기본 캐릭터)·VLM 모델 다운로드**를
     시작한다(029의 "필수 에셋 다운로드" 단계를 별도 대기 화면이 아니라 백그라운드
     작업으로 돌린다).
  3. **포어그라운드에서는 캐릭터 작명**(035의 환영/작명)을 진행한다 — 사용자가
     다운로드 진행률 바만 보며 기다리지 않고, 그 시간에 이름을 짓는다.
  4. 작명을 마쳤는데 다운로드가 아직이면 **다운로드 완료까지 대기**한다.
  5. 다운로드가 끝나면 **첫 일기를 자동으로 작성**한다(홈에서 사용자가 "일기 쓰기"를
     누르는 단계를 첫 실행에 한해 생략).
  - **재배치되는 것**: 029의 에셋 단계(건너뛰기 불가·진행률 바 하나)와 035의
    환영/작명·liveness("안녕?" 왕복, FR-019) 게이트의 순서·동시성. 지금은
    `OnboardingScreen`(에셋 다운로드 완료까지 대기) → `WelcomeScreen`(liveness →
    작명) → 홈으로 **순차**다. 이걸 다운로드(백그라운드)와 작명(포어그라운드)이
    겹치도록 바꾼다. liveness 검증을 유지할지, 첫 일기 생성이 그걸 겸하게 할지는
    스펙에서 정한다.
- **지금 구조** (건드릴 대상):
  - `src/onboarding/` — `requirements.ts`(사람이 못 박은 `PERMISSION_REQUIREMENTS`
    4갈래: 사진·위치·알림·배터리 예외, 고정 순서), `decision.ts`(`planOnboardingSteps`
    — 매번 실시간 권한 상태로 재판정), `flag.ts`(`onboarding.json`의 `completed`).
  - `src/ui/OnboardingScreen.tsx` — 단계별 문구 + [허용]/[건너뛰기] + 마지막
    [시작하기]. 뒤로 가기 없음. `src/ui/PermissionsSection.tsx`(설정 탭 "권한"
    섹션)가 같은 `requirements`를 재사용.
  - `App.tsx` `AppFrame` 진입 게이트 = `shouldShowOnboarding(flag, essentialAssetsReady)`.
  - 029가 권한 단계 뒤에 붙인 **"필수 에셋 다운로드" 단계**(건너뛸 수 없음, 진행률
    바 하나).
- **설계 긴장 — 스펙에서 반드시 다뤄야 할 것**:
  1. **원칙 I과 「건너뛰기」** — 021이 "온보딩은 건너뛸 수 있어야 한다(원칙 I)"를
     명시적 요구로 세웠고 각 단계에 [건너뛰기]를 뒀다. "버튼 인터랙션 없이
     팝업만" 패턴은 이 요구와 정면으로 부딪친다. **팝업의 [거부]가 곧 건너뛰기
     역할을 하므로 원칙 I은 지켜진다**고 볼 수도 있으나(시스템 팝업은 항상
     거부할 수 있음), 배터리 예외처럼 **팝업이 아니라 설정 화면으로 보내는 항목**은
     그 논리가 안 통한다. 스펙이 항목별로 "건너뛰기 경로가 무엇인가"를 답해야 한다.
  2. **OS가 제스처 없는 연속 팝업을 허용하는가** — Android는 `requestPermissions`를
     연달아 호출하면 시스템이 큐잉해 하나씩 보여준다(가능). 단 **한 번 거부된
     권한은 재요청해도 팝업이 안 뜨고 즉시 거부로 돌아온다**(`shouldShowRequestPermissionRationale`).
     iOS는 권한별 1회만 팝업, 이후 설정으로. **"목적 설명 화면 → 그 위에 팝업"**
     순서와 타이밍을 실기기로 확인해야 한다(021·031이 온보딩 팝업에서 겪은
     함정 계열 — 031 ②의 `GrantPermissionsActivity` 즉시 종료).
  3. **배터리 예외** — 권한이 아니라 `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`
     인텐트(027 US3 실측: 삼성 One UI는 `AppBatteryUsageActivity`로 라우팅,
     "제한 없음"까지 4탭). 팝업으로 만들 수 없다 — 로고 흐름 **뒤에 별도 안내
     카드**로 남기거나 완전히 설정 탭으로 미루는 선택.
  4. **로고 화면과 스플래시·에셋 단계의 경계** — 12번(배포용 패키징)이 스플래시
     그래픽을 만든다. 이 "전체화면 로고"가 그 스플래시인지, 스플래시 다음의
     별도 화면인지. 그리고 029의 "필수 에셋 다운로드"(~2GB, 건너뛰기 불가)가
     권한 흐름 앞인지 뒤인지 — 로고 → 에셋 다운로드(진행률) → 권한 팝업들이
     자연스러울 수 있다.
  5. **`completed` 게이트·재노출** — 팝업을 다 거부하고 지나가도 `onboarding.json`
     `completed:true`가 되어야 하는가(021은 그렇다). 설정 탭 [권한 안내 다시
     보기](`forceOnboarding`)가 이 새 흐름을 다시 태우는가.
  6. **다운로드(백그라운드) ∥ 작명(포어그라운드) 동시성** — 지금은 에셋 다운로드가
     끝나야 `WelcomeScreen`으로 넘어간다. 이걸 겹치려면 (a) 다운로드를 화면과
     독립된 작업으로 돌려야 하고(024가 `expo-background-task`로 검증한 헤드리스
     경로와는 다른, 앱이 떠 있는 동안의 진행), (b) 작명이 먼저 끝났을 때 "다운로드
     대기" 상태를 어디서 그리는가(작명 화면에 머무는가, 별도 대기 표시인가), (c)
     다운로드가 먼저 끝나고 작명이 아직이면 그냥 기다린다. `essential-assets-port.ts`의
     `downloadEssentials(onProgress)`는 이미 Promise라 화면 언마운트와 분리해 돌릴
     수 있는지 확인이 필요하다(009·025가 "화면 state에 안 남긴다"로 푼 것과 반대
     방향 — 여기서는 진행이 화면 생명주기보다 오래 살아야 한다).
  7. **liveness 검증의 자리** — 035는 작명 전에 `load() → run("안녕?") → judgeLiveness()`로
     "모델이 응답하는가"만 본다(품질 안 봄). 병렬 흐름에서는 모델 다운로드가 작명
     뒤에 끝나므로 liveness를 그 시점에 돌리거나, **첫 일기 자동 생성이 liveness를
     겸하게** 할 수 있다(생성이 실패하면 곧 모델 문제). 후자면 035의 `src/welcome/liveness.ts`
     경로가 첫 실행에서 죽는가 — 유지할지 스펙에서 정한다.
  8. **첫 일기 자동 생성** — 다운로드 완료 후 홈의 "일기 쓰기"를 사용자가 누르지
     않아도 생성이 시작된다(첫 실행 한정). 029의 `resolveGenerationParams`(캐릭터=기본,
     하루=당일, 사진 설정=자동, 장소명=자동)를 그대로 쓰되 트리거만 자동. 012 정오
     게이트(정오 전이면 당일을 못 씀)와 부딪칠 때 무엇을 쓰는가, 생성 중 화면
     (`writing`, 회전 표시)에서 사용자가 "그만두기"를 누르면 첫 실행이 어디로
     떨어지는가(홈), echo/unfinished 거부 시(029가 관측한 quiet+사진없는날 빈도)
     재시도를 자동으로 하는가 사용자에게 맡기는가.
- **유지되는 경계**: `PERMISSION_REQUIREMENTS`는 사람이 못 박은 상수로 유지(원칙 V
  — 코드가 항목을 판정하지 않음). 문안에 모델 식별자·파라미터 없음(원칙 III).
  `decision.ts`의 실시간 재판정(파일에 단계 완료를 저장하지 않음)은 유지.
  `collect.ts`의 좌표 읽기 판정(FR-013a)·`PermissionsSection` 재사용 구조 무변경.
  031이 뺀 `photo-location`은 다시 넣지 않는다.
- **선행/연관**: 021(이 흐름의 원본)·029(에셋 단계)·031(온보딩 팝업 함정 실측)·
  **035(환영 연출·작명·liveness — 이 스펙이 035를 흡수·재배치한다)**의 후속.
  **11번(NativeWind)·22번(엔드유저 화면 이관) 이후** — 이관 안 된 화면을 다시
  그리면 그 작업이 버려진다(025→017 패턴, 029 배경이 경고한 것). 12번(스플래시
  그래픽)과 로고 화면 범위를 조율. 실기기 검증은 **021·031이 함정을 겪은 그
  자리**라 dev 실기기에서 팝업 순서·타이밍·거부 후 재요청 + **작명 중 백그라운드
  다운로드 진행·완료 후 첫 일기 자동 생성**을 반드시 눈으로 본다. 첫 실행 전체
  경로(`pm clear` + ~2GB 다운로드)는 035가 "게이트 판정만 재현"으로 미룬 자리라
  이번엔 실제로 통과시킨다.
