# Contract: release 헤드리스 확인 (US4)

**대상**: [spec.md](../spec.md) US4, SC-004·SC-005 · [data-model.md](../data-model.md) §3·§4 · [research.md](../research.md) §3·§4

절차 계약(RH1~RH3, RH6) + 조건부 코드 계약(RH4~RH5). 기본 경로는 코드 변경
0줄이며, RH3 실패 시에만 RH4·RH5가 발동한다.

---

## RH1 — 빌드 절차 (AGENTS.md "release 빌드와 서명")

```
npx expo prebuild --platform android --clean
cp ~/.alpharium-signing/alpharium.jks android/app/     # ★ prebuild가 지웠다
cd android && NODE_ENV=production ./gradlew assembleRelease
```

- `--clean` 생략 금지(004에서 권한 빠진 APK 설치됨).
- 가운데 줄(키 복원) 생략 금지(`prebuild --clean`이 키를 지움).
- `NODE_ENV=production` 필수(없으면 `.env.production` 미로드 → 앱이 "이 빌드는
  잘못 만들어졌다").
- 산출물: `android/app/build/outputs/apk/release/app-release.apk`.
- **전제**: `~/.alpharium-signing/alpharium.jks` 존재 +
  `~/.gradle/gradle.properties`의 `ALPHARIUM_STORE_PASSWORD`·
  `ALPHARIUM_KEY_PASSWORD`. 없으면 US4 수행 불가 → 사용자에게 알린다(새 키를
  만들면 기존 설치를 못 덮어써 일기 손실 — AGENTS.md 경고).

## RH2 — 확인 게이트 (AGENTS.md 표)

| 무엇 | 어떻게 | 통과 |
|---|---|---|
| 서명 | `apksigner verify --print-certs <apk>` | `CN=Android Debug`가 **아니다** |
| 키 비커밋 | `git ls-files \| grep -i jks` | 빈 결과 |
| Metro 없이 도는가 | Metro 끄고 USB 뽑고 앱 연다 | `Unable to load script` 없음 |
| 환경 | 앱 화면 | "이 빌드는 잘못 만들어졌다"가 **아니다** |

## RH3 — 헤드리스 강제 실행 판정 (SC-004)

**전제**: 검증용 `quiet` 모델(`a1.bin` + `state.json` verdict)이 배치돼
있어야 한다. release는 `run-as`가 안 되므로(`package not debuggable`),
release APK 설치 **전에** debug 빌드로 배치 후 release로 덮어 설치(서명 같으면
데이터 유지). `quiet`만 필요(`narrative`·VLM은 14번 세션).

**절차**:
1. 설정 탭 진입 → `dumpsys jobscheduler | grep -A30 alpharium`에
   `JOB #<uid>/<id> com.anonymous.alpharium/androidx.work.impl.background.systemjob.SystemJobService`
   등록 + `Minimum latency: +14m59s...` 확인 → `jobRegisteredOnSettingsTab`.
2. `adb shell dumpsys deviceidle whitelist +com.anonymous.alpharium`(삼성
   절전이 `run -f`를 도즈 중 거부하므로 예외 부여).
3. `adb shell input keyevent KEYCODE_POWER` → `dumpsys trust`
   `deviceLocked=1`.
4. `adb shell cmd jobscheduler run -f com.anonymous.alpharium <id>`.
5. `adb logcat -d` 확인:

| 필드 | 통과 조건 |
|---|---|
| `noTaskRegisteredErrorAbsent` | `No task registered for key expo-task-manager` 및 `Unregistering task 'alpharium-auto-diary'`가 **없음** |
| `registeredTaskLogPresent` | `Registered task with name 'alpharium-auto-diary'` 있음 |
| `quietCompleted` | `quiet` 일기가 그 날짜로 정확히 1개 저장 + 판정 4갈래 통과(완료 알림 로그로 확인 — `run-as` 불가) |
| `workerResult` | `WM-WorkerWrapper: Worker result SUCCESS` |

**MUST**: 위 4개가 전부 통과하면 SC-004 충족, 024 §11을 "release 세션에서
확인 완료"로 갱신.

## RH4 — 조건부 코드 수정 (FR-007, RH3 실패 시만)

RH3의 `noTaskRegisteredErrorAbsent`가 false면(release에서 `No task registered`
재현) — 이것은 검증 차단 결함(배포 빌드로 자동 생성이 아예 안 됨).

- **원인 후보**(minify OFF이므로 R8 아님): Hermes 바이트코드 사전 컴파일의
  DCE, 또는 Metro `@__PURE__` 주입이 `task.ts` 모듈 최상단
  `registerAutoDiaryTask()` 부수 효과를 "결과 미사용"으로 제거.
- **최소 수정 (research §4 옵션 A)**: `src/schedule/task.ts`에서
  `AUTO_DIARY_TASK_REGISTERED` 상수를 DCE가 제거 불가한 방식으로 참조 —
  주석 + 명시적 참조 1~3줄. 새 파일 없음.
- **금지**: `proguard-rules.pro` `-keep` 규칙(minify OFF에서 무효),
  `gradle.properties` minify 토글(로드맵 4번 몫), `metro.config.js` 변경
  (전역 영향, 범위 밖) — FR-008.
- 수정 후 release 재빌드 → RH1~RH3 재실행 → 통과 확인. `findings.md` §11에
  `fixApplied` 기록.

## RH5 — 조건부 계약 테스트 (FR-012, RH4 수행 시만)

RH4로 `task.ts`를 고쳤다면:

- `__tests__/schedule/background-generation.test.ts`의 B1a를 확장 — R-DCE
  방어 구문(`AUTO_DIARY_TASK_REGISTERED` 명시적 참조 + "제거 불가" 주석)이
  `src/schedule/task.ts` 소스에 있는지 `readFileSync` 검사(007·009·012 관례).
- **위반 주입**: 그 참조 구문을 지우면 테스트가 실패한다. 실제로 지워 보고
  확인.
- `npm run test:logic` 통과, `npm run lint`(헌법 검사 포함) 통과.

## RH6 — 기본 경로 (RH3 통과 시)

- RH3의 4개 필드가 전부 통과하면 RH4·RH5는 **발동하지 않는다**.
- `git diff src/`가 0줄. 계약 테스트 추가 없음. 이 스펙은 순수 검증으로 끝난다
  (SC-005).
- `findings.md` §11: "현재 release 빌드 구성(minify OFF)에서 §9 헤드리스
  등록·완주 확인 완료. R8 트리셰이킹은 minify가 켜질 때(로드맵 4번)의 잠재
  위험으로 남으며 그때 재검토"로 갱신.
