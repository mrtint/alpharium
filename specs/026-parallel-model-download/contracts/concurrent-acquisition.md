# 계약: 동시 내려받기 — acquisition.ts 확장

**대응 요구사항**: FR-001~FR-010, FR-027, FR-028

**구현 위치**: `src/models/acquisition.ts`

**확장하는 계약**: `specs/003-character-model-files/contracts/acquisition.md`

---

## 이 계약이 지키는 것

- 003의 「사용자가 고른 캐릭터의 모델만 내려받는다」(로스터 MUST)는 유지된다 —
  `prepareAll()`이 없다(FR-008).
- 003의 실패 갈래(`busy`/`insufficient-space`/`network`/`verification-failed`)는 제거되지
  않는다(FR-028). `busy`의 **의미만** 좁아진다.
- 003의 「진행 중은 메모리에만」(FR-009)은 유지 — `Map`도 메모리다.

---

## 003에서 바뀌는 것

| 항목             | 003                                               | 026                                                                                  |
| ---------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 진행 슬롯        | `let running: Character \| null`                  | `const running = new Map<Character, { pause(): Promise<void> }>()`                   |
| `busy` 거부 조건 | `running !== null && running !== character`       | `running.has(character)` (같은 캐릭터만)                                             |
| `prepare`        | `prepare(character, onProgress?)`                 | (동일 시그니처)                                                                      |
| `pause`          | `pause(): Promise<void>` (전부 멈춤 — 하나뿐이라) | `pause(character?: Character): Promise<void>` — 인자 없으면 전부, 있으면 그 캐릭터만 |
| `busyWith`       | `busyWith(): Character \| null`                   | `busyWith(): Character[]`                                                            |
| 공간 판정        | `available < asset.expectedBytes * HEADROOM`      | `available - Σ(받는 중인 것들의 remainingCapacity) < asset.expectedBytes * HEADROOM` |

**`SPACE_HEADROOM`은 003 상수 재사용** — 새 상수 아님.

---

## 시작하기 전에 보는 것 — 순서 (003 표 + 변경점)

| 순서 | 확인                                                       | 실패하면                         | 026 변경                        |
| ---- | ---------------------------------------------------------- | -------------------------------- | ------------------------------- |
| 1    | **같은 캐릭터**를 이미 받는 중인가                         | `busy` (그 캐릭터 자신을 알린다) | 「다른 캐릭터」→「같은 캐릭터」 |
| 2    | 이미 `ready`인가                                           | 시작하지 않는다                  | 무변경                          |
| 3    | 공간이 (남은 것들 제외하고) 여유까지 있는가                | `insufficient-space`             | 합산 판정 (FR-007)              |
| 4    | 이어받을 것이 있는가 (`paused` **또는** `segmentedResume`) | 있으면 이어받고 없으면 처음부터  | 세그먼트 재개 추가              |

**1번의 자리 선점** (003의 「`await` 사이 끼어듦」 방어): `running.set(character, handle)`을
첫 `await` 전에. 003과 동일한 이유 — JS가 단일 스레드여도 `await` 사이에 다른 `prepare`가
끼어든다.

---

## `prepare` 흐름 (026)

```
prepare(character, onProgress):
  1. running.has(character) → return { ok:false, failure:{ kind:"busy", busyWith:character } }
  2. running.set(character, placeholder)          // 자리 선점
  try:
    3. asset = assetFor(character)
       state = await readState(metadata)
       paused = pausedFor(state, asset.key)
       segmented = segmentedFor(state, asset.key)  // ← 신규
    4. 공간:
       if asset.expectedBytes > 0:
         inFlight = Σ over running keys k≠character of remainingCapacity(assetFor(k).expectedBytes, lastBytesOf(k))
         available = await disk.availableBytes()
         if available - inFlight < asset.expectedBytes * SPACE_HEADROOM:
           return { ok:false, failure:{ kind:"insufficient-space" } }
    5. task = segmented != null ? download.resume(asset.key, asset.url, segmented, report)
            : paused   != null ? download.resume(asset.key, asset.url, paused.state, report)
            :                     download.start(asset.key, asset.url, report)
       running.set(character, task)               // placeholder 교체
    6. outcome = await task.wait()
    7-a. outcome.paused:
         state' = readState()
         if outcome.state has segmentCount:  writeState(withSegmentedResume(state', { assetKey, ...outcome.state }))
         else:                                writeState(withPaused(state', { assetKey, state: outcome.state }))
         return { ok:false, failure:{ kind:"network", reason:"받다가 멈췄다" } }
    7-b. outcome.failed → return { ok:false, failure:{ kind:"network", reason } }
    8. verdict = verifyDownloaded(files, { assetKey, expectedBytes, expectedMd5 })
       state' = withVerdict(withoutAsset(readState(), asset.key), verdict)   // ← withoutAsset이 segmented도 비움
       writeState(state')
       if !verdict.passed → return { ok:false, failure:{ kind:"verification-failed" } }
       return { ok:true, verified: asset.md5 !== "" }
  finally:
    running.delete(character)                     // 성공·실패 무관
```

**`report` 콜백**은 003과 동형: `onProgress?.({ character, fraction: fractionOf(bytesWritten, totalBytes, asset.expectedBytes) })`. 세그먼트든 폴백이든 `expo-port.ts`가 `TransferProgress`
모양으로 맞춰 주므로(segmented-transfer.md 참조) `fractionOf`가 그대로 동작.

**`lastBytesOf(k)`**: `report` 콜백이 올 때마다 `acquisition.ts`가 `Map` 항목 옆에 최신
바이트를 기록해 둔다(공간 판정용, 밖으로 안 나감). 003엔 없던 것 — 동시 다운로드에서만 필요.

---

## `pause(character?)`

```
pause(character?):
  if character === undefined:
    for handle of running.values(): await handle.pause()
  else:
    await running.get(character)?.pause()
```

멈춘 캐릭터의 `prepare`가 7-a로 진행되어 재개 상태를 저장하고 `finally`에서
`running.delete`. **다른 캐릭터는 영향 없음**(FR-004) — 각자의 `task`가 독립.

---

## 검증 표 (기기 없이)

| #   | 확인                                                                                        | 방법                                                                                         |
| --- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| A1  | 서로 다른 캐릭터 `prepare` 두 번 → 둘 다 시작                                               | 대역 `DownloadPort`, `running.size === 2`                                                    |
| A2  | 같은 캐릭터 `prepare` 두 번 → 두 번째 `{ busy, busyWith: 그 캐릭터 }`                       | —                                                                                            |
| A3  | `busyWith()`가 받는 중인 전부를 배열로                                                      | 셋 시작 후 `busyWith().sort()`                                                               |
| A4  | `pause(A)` → A만 멈춤, B 계속                                                               | 대역 `pause` 호출 여부 확인                                                                  |
| A5  | `pause()` (인자 없음) → 전부 멈춤                                                           | —                                                                                            |
| A6  | 공간 판정이 받는 중인 것들의 남은 용량을 뺀다                                               | `disk.availableBytes` 대역 + `running`에 항목 주입 → 세 번째가 `insufficient-space` (FR-007) |
| A7  | `prepare` 완료 후 `running.delete` (finally)                                                | 완료·실패·거부 세 경로                                                                       |
| A8  | 자리 선점: `await` 사이 두 번째 `prepare` → `busy`                                          | 003 T0xx와 동형, 같은 캐릭터로                                                               |
| A9  | 세그먼트 재개: `segmentedFor`가 non-null → `download.resume`에 그 값 전달                   | 대역 `resume` 인자 확인                                                                      |
| A10 | pause 시 `outcome.state`에 `segmentCount` 있으면 `withSegmentedResume`, 없으면 `withPaused` | `storage` 왕복                                                                               |
| A11 | `withoutAsset`이 `segmented`도 비운다                                                       | 검증 통과 후 `segmentedFor === null`                                                         |
| A12 | 003 기존 테스트: `insufficient-space`/`network`/`verification-failed` 갈래 유지             | 003 `acquisition.test.ts` 회귀                                                               |
| A13 | 003 기존 테스트 중 "다른 캐릭터 받는 중 → busy"는 **"이제 둘 다 시작"으로 갱신**            | 003 테스트 수정, 갈래 자체는 안 지움                                                         |

---

## 003 계약과의 관계

003 `contracts/acquisition.md`의 「한 번에 하나 (FR-020)」 절은 **이 계약이 대체**한다.
003 스펙 본문은 역사적 기록으로 남기되, 026이 FR-020을 명시적으로 해제한다는 것을 026
spec.md 배경 절에 적었다. 003의 나머지(진행률 불변식, 공간 여유 배수, 「진행 중 vs 중단됨」
구분)는 전부 유지된다.
