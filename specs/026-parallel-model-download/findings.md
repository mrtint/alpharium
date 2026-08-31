# 026 실측 로그 — 모델 병렬·동시 내려받기

**실기기 검증 완료 (2026-08-31, SM-S901N / Galaxy S22, Android 16 / SDK 36, debug,
`EXPO_PUBLIC_APP_ENV=dev`, WiFi 5GHz ~300Mbps).** quickstart.md Q0~Q6 대응.

---

## §1 — `expo-file-system` 57 오프셋 쓰기 (Q0) ✅

`expoRangeFetchPort().fetchRange`는 `File.open(FileMode.ReadWrite)` → `FileHandle.offset`을
구간 시작으로 옮긴 뒤 스트림 청크를 `writeBytes`로 이어 쓴다.

**실기기 확인**: 세그먼트 병렬로 받은 `a3.bin`(imaginative, 1,133,974,368 바이트)이
**로스터 md5 `4a3b9821b970df32e3d201a208f8ee14`와 정확히 일치**했다. 4개 구간이 각자
파일의 흩어진 오프셋(0·283M·567M·850M 근처)에 동시에 `writeBytes`한 결과가 바이트
단위로 온전하다. **`.part.<n>` + concat 폴백 불필요** — `FileHandle.offset` 시커블
쓰기가 이 기기에서 정상 동작한다.

부수 관측: 오프셋 쓰기는 파일을 "가장 높은 오프셋까지" 늘린다 — 65% 받은 시점에
`a3.bin` 크기가 1,035MB(전체의 91%)였다. 이것이 §7의 readiness 버그를 드러냈다.

---

## §2 — HuggingFace CDN이 Range·Content-Length를 유지하는가 (Q3) ✅

**유지한다.** `probeRange`(`Range: bytes=0-0` fetch → 리다이렉트 따라간 최종 응답)가
`a3`에 대해 `{ kind: "supported", totalBytes: 1133974368 }`을 반환했다 —
`state.json`의 세그먼트 재개 상태에 `"totalBytes":1133974368`(= `expectedBytes`
정확히)로 저장된 것으로 확인. HF의 302 → cloudfront/S3 리다이렉트 후에도
`Accept-Ranges`/`Content-Length`가 온다.

**따라서 로스터 5개 모델 전부 세그먼트 병렬 경로를 탄다.** 폴백은 dead path에
가깝다(계약 테스트 C9가 대역으로 검증).

---

## §3 — `SEGMENT_COUNT` / `MIN_SEGMENT_BYTES` 실측 판단 (Q3) ✅ 유지

`SEGMENT_COUNT = 4`, `MIN_SEGMENT_BYTES = 8 * 1024 * 1024`. **실기기에서 4구간 병렬이
정상 동작했고 상수를 바꿀 이유가 없다.**

- **동시 다운로드 관측**: 오드(a3, 1.13GB) + 샤오바이(a4, 1.11GB)를 동시에 받아
  두 파일이 병렬로 커졌다(약 60초에 각 928MB / 903MB 도달 — 합산 ~30MB/s+).
  6모델 상한이라도 6×4=24 커넥션인데, 실제로 2모델×4=8 커넥션이 안정적이었다.
- **세그먼트 재개 상태**: `receivedBytes: [185346516, 185307666, 185334022,
185283848]` — 4구간이 거의 균등하게 진행(각 ~185MB). `planSegments`의 균등 분할이
  실제로 균등하게 채워진다.
- **켬/끔 벽시계 대조는 정밀 측정 미실시** — 세션 중 다운로드가 여러 번 중단·재개돼
  깨끗한 A/B가 안 나왔다. 다만 세그먼트 병렬이 명백히 동작하고(§2 근거), 단일 모델
  1.1GB를 ~3분에 완주했다. `SEGMENT_COUNT` 튜닝은 미미할 것으로 판단 — 상수 유지.

**결론**: `plan.ts` 주석의 "잠정 — 실기기 T037(Q3)에서 확정"을 **"실기기 확인:
4구간 병렬 정상, 상수 유지 (2026-08-31, SM-S901N)"**로 갱신 가능.

---

## §4 — 폴백 경로 (Q4) — 계약 테스트로 검증, 실기기 미실시

HF가 Range를 지원하므로(§2) 실기기에서 폴백은 자연 발생하지 않는다(dead path).
`__DEV__ && globalThis.__FORCE_DOWNLOAD_FALLBACK__` 강제 스위치는 디버그 콘솔이
필요해 이 세션에서 토글하지 못했다. **이 갈래의 주 검증은 계약 테스트 C9
(`segmented-transfer.test.ts` — `probeRange` 대역이 `unsupported` → `{ kind:
"fallback" }`, 구간 fetch 0회)이며 GREEN.** 다음 릴리즈 세션에서 스위치 1회 확인으로
닫힌다.

---

## §5 — 세그먼트 이어받기 (Q5) ✅

**정상 재개 실기기 확인.**

1. 오드(a3) 세그먼트 병렬 다운로드를 65%에서 "멈추기".
2. `state.json`에 `"segmented":[{"assetKey":"a3","totalBytes":1133974368,
"segmentCount":4,"receivedBytes":[185346516,185307666,185334022,185283848]}]`
   저장 — `"paused":[]`(026 분기: 세그먼트 pause → `withSegmentedResume`, 단일
   스트림 `withPaused` 아님).
3. 앱 재시작 후 오드 행이 **"받다 멈춤 — 이어받을 수 있음" + [이어받기]** (§7 fix 후).
4. "이어받기" 탭 → 진행률이 **68%에서 시작**(0%가 아님). `remainingSegments`가
   `receivedBytes`에서 각 구간의 남은 Range를 계산해 그만큼만 fetch.
5. 완주 후 `a3.bin` = 1,133,974,368(정확히 `expectedBytes`),
   **verdict `verifiedMd5: 4a3b9821b970df32e3d201a208f8ee14` = 로스터 md5 정확히
   일치**, `"segmented":[]`(`withoutAsset`이 재개 상태 정리, FR-024/A11).

**앱 강제 종료 타이밍**(재현 어려움 — 012·025 계열): `am force-stop` 후 재시작하면
부분 파일 + 저장된 `segmentedResume`로 이어받기가 되는 것을 위 흐름으로 확인.
"쓰기 정확히 그 순간"의 강제 종료는 타이밍 제어 불가 — 계약 테스트 C12·C13이 그
계산을 잠근다.

---

## §6 — 회귀 (Q6) ✅

- **`src/vision/acquisition.ts` git diff = 0줄** (SC-009, FR-027) ✅
- **FR-003 (같은 캐릭터 중복 거부)**: 오드 준비하기를 빠르게 두 번 탭 → 두 번째는
  조용히 거부되고 **download-notice가 뜨지 않는다**(`noticeFor`가 `requested ===
busyWith === active`인 거부를 자동 억제, 008 FR-010). 진행 표시(1%)는 흔들리지
  않음.
- **FR-004 (멈추기 격리)**: 오드 + 모카를 동시에 받는 중, 오드만 "멈추기" → **모카는
  끊김 없이 계속 받아 완주**(a5.bin = 806,058,272 = `expectedBytes`, verdict
  `b00db505...` passed). 오드는 "받다 멈춤".
- **FR-015 (세그먼트 완료 → 003 지문 검증)**: a3·a4·a5 세 모델 전부 세그먼트 병렬로
  받아 003의 `verifyDownloaded`를 거쳤고, a3(md5 있음)는 로스터와 정확히 일치,
  a4·a5(md5 빈 문자열)는 지문을 채록(`dc4836c7...` / `b00db505...`).
- **003 지우기**: 오드 "지우기" → `a3.bin` 삭제, `verdicts`에서 a3 제거,
  `segmented`에서 a3 제거. 일기는 그대로.
- **state.json 스키마 마이그레이션**: 026 이전 `state.json`(no `segmented` key)이
  `readState`에서 `"segmented":[]`로 자동 확장 — 마이그레이션 코드 없이 동작.
- **기기 없는 테스트 2076개 통과**, lint(eslint 0 error, tsc, 헌법 검사 위반 0,
  prettier) 클린. 위반 주입 3종(SEGMENT_COUNT 변경 → 계약 테스트 실패 / segmented가
  Character import → checkSegmentedFile 실패 / acquisition이 다른 캐릭터에도 busy →
  A13 실패) 전부 잡힘.
- **Maestro**: `.maestro/parallel-model-download.yml`이 `FLOWS`에 등록됨. 이 세션은
  수동 `adb`/`uiautomator`로 검증(Maestro 실행은 다음 세션).

---

## §7 — 실기기에서 발견·수정한 버그 둘

### 버그 A — 진행률 % 가 0%↔100%만 표시 (F1, 컨버전스에서 지목됨)

**증상**: 세그먼트 다운로드 중 진행률이 "받는 중… 0%"에 머물다 완료 직전 "100%"로
점프. 중간값이 전혀 안 보임.

**원인**: `expo-port.ts`의 `segmentedOrFallback.run()`에서 `wrapProgress(lastTotal || 1,
...)` — `lastTotal`은 재대입되지 않고 `void lastTotal`이 no-op이라, 처음(재개 아님)
다운로드에서 `total = 1`. `wrapProgress`가 `{ bytesWritten: Math.round(fraction * 1),
totalBytes: 1 }`를 넘겨 → `acquisition.ts`의 `fractionOf(round(f), 1, X)` = `min(1,
round(f))` = **f < 0.5면 0, f ≥ 0.5면 1**.

**수정**: `runSegmented`에 `onSizeResolved(totalBytes)` 콜백 추가 — `probeRange`
성공(또는 `resume`)으로 전체 크기가 정해지는 순간 1회 호출. 기기 통로가 그 값으로
003 `TransferProgress` 모양을 정확히 복원한다. **순수 코어는 여전히 `fraction` 하나만
`onProgress`로 낸다**(원칙 III — `onSizeResolved`는 폴백 경로에서 호출 안 됨).
계약 테스트 3개 추가(`segmented-transfer.test.ts`). **수정 후 실기기에서 3% → 25% →
36% → 56% → 68% 매끄럽게 증가 확인.**

### 버그 B — 세그먼트 일시정지 후 "이어받기" 대신 "다시 받기" 표시 (FR-023 gap)

**증상**: 세그먼트 다운로드를 멈춘 뒤 그 캐릭터가 "받다 멈춤 — 다시 받기"로 표시,
저장된 재개 상태가 있는데도 처음부터 받게 함.

**원인**: `readinessOf`의 "파일 존재 + 크기 불일치" 분기가 `resumable: paused !== null`만
봤다. 세그먼트 병렬은 각 구간을 파일 오프셋에 흩어 쓰므로 65% 받았어도 파일 크기가
이미 91%(가장 높은 오프셋)라 이 분기에 걸리는데, `paused`는 null이고(`segmented`에
있음) → `resumable: false`.

**수정**: `resumable: paused !== null || input.segmentedResume != null`. 계약 테스트
1개 추가(`readiness.test.ts`). **수정 후 실기기에서 "받다 멈춤 — 이어받을 수 있음" +
[이어받기] 확인, 68%에서 재개.**

---

## §8 — 미확인 잔여

- **prod 게이트**: `__FORCE_DOWNLOAD_FALLBACK__` 분기가 `__DEV__` 거짓일 때
  트리셰이킹되는지 (release 번들). 새 네이티브 모듈 없어 release 재확인은 012 기준상
  생략 가능하나, `File.open()`/`FileHandle`이 R8에서 살아남는지는 다음 release 세션
  1회로 닫힌다.
- **Q4 강제 폴백 실기기 토글** — 디버그 콘솔 필요, 다음 세션. 계약 테스트 C9가 대역
  검증.
- **세그먼트 켬/끔 벽시계 A/B** — 정밀 측정 미실시(§3). 세그먼트 병렬은 명백히
  동작하나 정량 이득은 미측정.
- **Maestro `parallel-model-download.yml` 실행** — 다음 세션.
