# 026 실측 로그 — 모델 병렬·동시 내려받기

quickstart.md Q0~Q6에 대응. **실기기 세션 전까지는 "미확인"으로 채워져 있다** — 이
스펙은 새 네이티브 모듈이 없어 debug 실기기 1회로 충분하다(012 기준).

---

## §1 — `expo-file-system` 57 오프셋 쓰기 (Q0)

**미확인 (실기기 세션 대기).**

`expoRangeFetchPort().fetchRange`는 `File.open(FileMode.ReadWrite)` → `FileHandle`의
`offset` 프로퍼티를 구간 시작으로 옮긴 뒤 `writeBytes(chunk)`를 이어 부르는 방식으로
구현했다(`src/models/expo-port.ts`). 타입 정의(`expo-file-system/build/File.types.d.ts`)에
`FileHandle { offset: number | null; writeBytes(bytes); readBytes(length); close() }`가
있고 `File`에 `open(mode?: FileMode): FileHandle`가 있음을 확인했다.

**실기기에서 확인할 것**: 빈 파일에 `offset = 1MiB` 설정 후 `writeBytes(A)`, 다시
`offset = 0` 후 `writeBytes(B)` → 되읽어 `[0, 1MiB)=B`, `[1MiB, …)=A`인지. 안드로이드에서
`open()`이 실제 시커블 핸들을 주는지(SAF 경로가 아닌 `Paths.document` 아래이므로 될
것으로 예상하나 미확인).

**폴백**: 만약 오프셋 쓰기가 안 되면, 각 구간을 별도 `.part.<n>` 파일에 받아 마지막에
순서대로 이어 붙이는 방식으로 바꾼다(`transfer.ts`는 무변경 — `RangeFetchPort` 구현만
교체). 이 경우 병합 단계가 추가되고 디스크 피크가 2배가 되므로 `SPACE_HEADROOM`
재검토가 필요할 수 있다.

---

## §2 — HuggingFace CDN이 Range·Content-Length를 유지하는가 (Q3-5)

**미확인 (실기기 세션 대기).**

로스터의 모델은 `huggingface.co/.../resolve/main/...`에서 받고, HF는 302로
cloudfront/S3에 넘긴다. `probeRange`는 `Range: bytes=0-0` fetch → 최종 응답의
`206 + Content-Range` 또는 `Accept-Ranges: bytes + Content-Length`를 본다. 애매하면
`unsupported` → 폴백(원칙 V).

**실기기에서 확인할 것**: `adb logcat`에서 세그먼트 다운로드 시 여러 `Range` 요청이
나가는지, `probeRange`가 `supported`를 반환하는지. 유지 안 하면 폴백 경로가 기본이 되며
그 경우에도 동시 다운로드(US1)는 독립적으로 유효하다.

---

## §3 — `SEGMENT_COUNT` / `MIN_SEGMENT_BYTES` 실측 판단 (Q3)

**미확인 (실기기 세션 대기).**

현재 잠정값: `SEGMENT_COUNT = 4`, `MIN_SEGMENT_BYTES = 8 * 1024 * 1024` (근거
research.md §3). 003의 `SPACE_HEADROOM` 전례를 따라 `src/models/segmented/plan.ts`
주석에 "잠정 — 실기기 T037(Q3)에서 확정"으로 표기.

**실기기에서 확인할 것**: 같은 모델(예: quiet, 1.5GB)을 `__FORCE_DOWNLOAD_FALLBACK__`
on/off로 각각 1회 받아 완료까지 벽시계 시간 대조. 켠 쪽이 더 짧거나 최소한 길지
않아야 한다(SC-004). 동시 연결 수가 `SEGMENT_COUNT`(=4)를 넘지 않는지. 4가 적정한지,
CDN 스로틀이 있는지 판단해 상수·주석 갱신.

---

## §4 — 폴백 경로 실기기 완주 (Q4)

**미확인 (실기기 세션 대기).**

HF가 Range를 지원하면 폴백은 자연 발생하지 않을 수 있다(dead path). 그 경우 개발자
콘솔에서 `globalThis.__FORCE_DOWNLOAD_FALLBACK__ = true` 설정 후 1회 받아 단일 스트림
경로로 완주 + 검증 통과하는지 확인. 이 갈래의 주 검증은 계약 테스트 C9
(`segmented-transfer.test.ts`).

---

## §5 — 세그먼트 이어받기 (Q5)

**미확인 (실기기 세션 대기).**

- **정상 재개**: 세그먼트 다운로드 중 "멈추기" → `state.json`의 `segmented[]`에
  `receivedBytes` 기록 확인(`adb pull`, `MSYS_NO_PATHCONV=1`) → "이어받기" 탭 →
  `adb logcat`에서 각 구간이 `bytes=<이미받은지점>-<끝>`으로 요청되는지 → 완주 후 지문
  일치.
- **앱 강제 종료 타이밍** (재현 어려움 — 012·025 계열): `adb shell am force-stop` →
  재시작 → 그 캐릭터가 `partial` + `resumable: false`(재개 상태 저장 안 됨)로 →
  처음부터 다시. **강제 종료가 정확히 "쓰기 도중"에 걸리는지는 타이밍 제어 불가** —
  계약 테스트 C12·C13(`remainingSegments` 계산)이 이 갈래를 잠그고, 재현 불가분은
  여기 "미확인"으로 남긴다(brainstorming Q5=A 합의).

---

## §6 — 회귀 (Q6)

**미확인 (실기기 세션 대기).**

- `git diff --stat main -- src/vision/acquisition.ts` = **0줄** ✅ (기기 없이 확인,
  SC-009)
- 008 거부 안내: 같은 캐릭터 빠르게 두 번 → 안내 뜸 → 그 캐릭터 완주 → 안내 자동 소멸
- 003 지우기: 받은 모델 "지우기" → 파일·부분 파일·`verdicts`·`segmented` 전부 사라짐,
  일기는 남음
- Maestro: `.maestro/parallel-model-download.yml` (신규, `run-device-tests.mjs`
  `FLOWS`에 등록됨 ✅) + `.maestro/download-conflict.yml`(008 회귀)

---

## §7 — 미확인 잔여

- **prod 게이트**: `__FORCE_DOWNLOAD_FALLBACK__` 분기가 `__DEV__` 거짓일 때 실제로
  트리셰이킹되는지 (release 번들 확인). 새 네이티브 모듈이 없어 release 재확인은 012
  기준상 생략 가능하나, `File.open()`/`FileHandle`이 R8에서 살아남는지는 다음 release
  세션 1회로 닫힌다.
- **`FileHandle` 동시 열기**: 6모델 × 4구간 = 24개 핸들이 동시에 열릴 수 있다. 안드로이드
  파일 디스크립터 한도(기본 1024)에는 여유가 크나 실측 미확인.
- **기기 없는 테스트**: 2072개 통과, lint(eslint 0 error, tsc, 헌법 검사 위반 0,
  prettier) 클린. 위반 주입 3종(SEGMENT_COUNT 변경 → 계약 테스트 실패 / segmented가
  Character import → checkSegmentedFile 실패 / acquisition이 다른 캐릭터에도 busy →
  A13 실패) 전부 잡히는 것 확인.
