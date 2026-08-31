# Quickstart: 모델 병렬·동시 내려받기 — 검증 가이드

기기 없는 테스트는 `npm run test:logic` / `npm test` / `npm run lint`로 돈다. 이 문서는
**실기기에서 무엇을 어떻게 확인하는가**를 적는다(원칙 V — "건너뛴 실기기 테스트는 통과가
아니다"). 새 네이티브 모듈이 없으므로 **debug 1회로 충분**하다(012 기준). release 재확인
불필요.

## 사전 조건 (AGENTS.md 「도구 사용법」)

1. Metro를 dev 환경으로: `EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client --clear`
2. `adb reverse tcp:8081 tcp:8081` (재부팅으로 사라짐)
3. 기기 잠금 해제 + 화면 켜짐 (`adb shell dumpsys trust`의 `deviceLocked=0`)
4. debug APK 설치: `npx expo run:android`
5. 검증용 상태 초기화: 캐릭터 모델을 전부 지운 상태에서 시작(설정 "권한"·개발자 탭 무관).

---

## Q0 — `expo-file-system` 57의 오프셋 쓰기 확인 (구현 첫 단계, research §2)

세그먼트 코어를 짜기 전에 **한 구간을 파일 오프셋에 쓰고 되읽어 일치하는지** 확인한다.
실패하면 세그먼트 전송 설계를 재검토한다(별도 concat 단계 필요 등).

- 개발자 탭 또는 임시 스크립트로: 빈 파일 생성 → `file.write(bytesB, { position: 1MB })` →
  `file.write(bytesA, { position: 0 })` → 되읽어 `[0,1MB)=A`, `[1MB, ...)=B` 확인.
- 결과를 `findings.md §1`에 기록(정확한 API 시그니처 포함).

## Q1 — 여러 캐릭터 동시 다운로드 (SC-001, SC-002, User Story 1)

1. 캐릭터 목록에서 A("준비하기") 탭 → 진행 표시 뜨는 것 확인.
2. A가 받는 중일 때 B("준비하기") 탭.
   - **기대**: "A를 받는 중이라..." 거부 안내가 **뜨지 않는다**. A·B 두 줄에 진행 표시 +
     "멈추기"가 **동시에** 보인다.
3. C도 탭 → 셋 다 동시.
4. A의 "멈추기"만 탭.
   - **기대**: A는 "받다 멈춤 — 이어받을 수 있음"으로. B·C는 **끊김 없이 계속**.
   - `adb logcat`에서 B·C의 다운로드 로그가 A 멈춤 전후로 연속인지 확인.
5. B·C 완주 → 각각 검증 통과, "쓸 수 있음".
6. 같은 캐릭터 A를 빠르게 두 번 탭.
   - **기대**: 두 번째는 거부(008 안내), A의 진행 표시는 흔들리지 않는다.

## Q2 — 탭 복귀 시 전부 복원 (SC-003, User Story 1 시나리오 4)

1. A·B·C 동시 다운로드 시작.
2. 다른 탭(설정/개발자)으로 이동 후 캐릭터 목록으로 복귀.
   - **기대**: A·B·C **셋 다** "받는 중…" 표시 복원. 하나도 누락 없음.
   - 백분율은 처음엔 없다가 다음 진행 콜백에서 붙는다 — **0%로 시작하지 않는다**.

## Q3 — 세그먼트 병렬 속도 대조 (SC-004, SC-005, User Story 2)

1. 한 모델(예: quiet, 1.5GB)을 받되 세그먼트를 **끈** 빌드/플래그로 1회 — 완료까지 벽시계
   시간 기록(`adb logcat` 타임스탬프).
2. 같은 모델을 지우고, 세그먼트 **켠** 상태로 1회 — 벽시계 시간 기록.
   - 가능하면 **같은 네트워크 세션 안에서** 연달아(003의 md5 채록이 같은 실행 안 대조).
   - **기대**: 켠 쪽이 **더 짧거나 최소한 길지 않다**.
3. 두 경우 모두 최종 파일의 무결성 지문이 로스터 값과 **일치**(단일 스트림으로 받은 것과
   동일 파일).
4. `adb logcat`에서 세그먼트 켠 경우 **여러 Range 요청**(`Range: bytes=...`)이 병렬로 나가는
   것 확인. 동시 연결 수가 `SEGMENT_COUNT`(=4)를 넘지 않는지.
5. HF CDN이 리다이렉트 후 `Accept-Ranges: bytes` + `Content-Length`를 주는지
   `findings.md §2`에 기록. **안 주면**: 폴백 경로가 탄 것 → Q4로.
6. `SEGMENT_COUNT`·`MIN_SEGMENT_BYTES`가 이 기기·CDN에서 적정한지 판단 → `plan.ts` 주석을
   실측으로 갱신(잠정 → 확정). `findings.md §3`.

## Q4 — 폴백 (SC-006, User Story 3)

- HF가 Range를 지원하면 실기기에서 폴백 경로는 자연 발생하지 않을 수 있다(dead path).
  그 경우: `probeRange`를 강제로 `unsupported` 반환하도록 임시 패치해 1회 확인 —
  단일 스트림으로 완주 + 검증 통과.
- 이 갈래의 주 검증은 계약 테스트(C9, segmented-transfer.md). 실기기는 "폴백이 실제로도
  완주한다" 확인용.
- `findings.md §4`에 기록.

## Q5 — 세그먼트 이어받기 (SC-007, User Story 4)

- **재개 상태가 주어졌을 때**(정상 경로): 세그먼트 다운로드 중 "멈추기" → `state.json`의
  `segmented[]`에 `receivedBytes` 기록 확인(`adb pull`로 파일 확인, MSYS_NO_PATHCONV=1) →
  "이어받기" 탭 → `adb logcat`에서 각 구간이 `bytes=<이미받은지점>-<끝>`으로 요청되는지
  (처음부터가 아님) → 완주 후 지문 일치.
- **앱 강제 종료 타이밍**(재현 어려움 — 012·025 계열): 세그먼트 다운로드 중
  `adb shell am force-stop <package>` → 재시작 → 그 캐릭터가 `partial` + (재개 상태가 저장
  안 됐으면) "받다 멈춤"(resumable false)로 → 처음부터 다시.
  - 강제 종료가 정확히 "쓰기 도중"에 걸리는지는 타이밍 제어 불가. 계약 테스트(C12·C13)가
    이 계산을 잠그고, 재현 불가분은 `findings.md §5`에 **"미확인"**으로 명시.

## Q6 — 회귀

1. **`src/vision/acquisition.ts` 무변경** (SC-009): `git diff --stat main -- src/vision/acquisition.ts`
   → 0줄.
2. **비전 모델 다운로드**: 캐릭터와 동시에 "사진을 보는 데 필요한 것" 준비 → 여전히 동작.
   세그먼트 병렬을 자동으로 얻는지 `adb logcat`에서 Range 요청 확인(011 코드는 안 바뀜).
3. **008 거부 안내**: 같은 캐릭터 빠르게 두 번 → 안내 뜸 → 그 캐릭터 완주 → 안내 자동 소멸.
4. **003 지우기**: 받은 모델 "지우기" → 파일·부분 파일·`verdicts`·`segmented` 전부 사라짐,
   일기는 남음.
5. **Maestro**: `.maestro/parallel-model-download.yml` (신규, `run-device-tests.mjs`
   `FLOWS`에 등록) + `.maestro/download-conflict.yml`(008 회귀) PASS.

---

## findings.md 채울 항목

| §   | 내용                                                                           |
| --- | ------------------------------------------------------------------------------ |
| §1  | `expo-file-system` 57 오프셋 쓰기 시그니처·동작 (Q0)                           |
| §2  | HF CDN이 리다이렉트 후 Range·Content-Length 유지 여부 (Q3-5)                   |
| §3  | `SEGMENT_COUNT`·`MIN_SEGMENT_BYTES` 실측 판단, 세그먼트 켬/끔 벽시계 대조 (Q3) |
| §4  | 폴백 경로 실기기 완주 여부, dead path인지 (Q4)                                 |
| §5  | 세그먼트 이어받기 — 정상 재개 확인 + 강제종료 타이밍 미확인 명시 (Q5)          |
| §6  | 회귀 결과, Maestro PASS (Q6)                                                   |
| §7  | 미확인 잔여 (prod 게이트, release 재확인 판정 등)                              |

---

## 완료 판정

- [ ] `npm run test:logic` / `npm test` 전부 통과 (신규 스위트 포함)
- [ ] `npm run lint` 클린 (eslint·tsc·헌법 검사 위반 0·prettier)
- [ ] 위반 주입 확인: `SEGMENT_COUNT` 값 변경 → 계약 테스트 실패 / `segmented/*`가
      `Character` import → `checkSegmentedFile` 실패 / `acquisition`이 `busy`를 다른
      캐릭터에도 반환 → A1 실패
- [ ] 실기기 Q0~Q6 수행, `findings.md` 작성
- [ ] `src/vision/acquisition.ts` git diff 0줄
- [ ] `.maestro/parallel-model-download.yml`이 `FLOWS`에 등록됨
