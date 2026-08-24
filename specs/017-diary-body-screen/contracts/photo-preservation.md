# Contract: 캡션 사본 보존

FR-001·FR-001a·FR-002 (clarify 2026-08-23 Q1)의 계약이다.

## 불변식

**P1. 캡션 계층은 스스로 지우지 않는다(성공한 캡션에 한해).** `caption.ts`의
`captionAll()`이 리사이즈에 성공하고 캡션도 성공한 장(`result.text !== ""`)의
`shouldCleanup === true`인 사본은, 그 장의 루프 반복이 끝나도 **즉시 지우지
않는다** — `PhotoCaption.resizedPath`에 경로만 실어 반환한다.

**P2. 캡션이 실패한 장의 사본은 즉시 지운다.** 리사이즈에는 성공했으나 캡션
결과가 빈 문자열이거나(`caption.ts:143`) 엔진이 던진 경우, 그 장의 사본은
`captions` 배열에 실리지 않으므로 아무도 참조할 수 없다 — 기존과 동일하게
`finally`에서 즉시 `cleanup()`한다. **미루는 대상은 성공한 캡션의 사본뿐이다.**

**P3. 원본과 같은 경로(013 C1)인 사본은 이 계약의 대상이 아니다.** `shouldCleanup
=== false`인 경우 지우지도 보존 목록에 올리지도 않는다 — 원본이므로 013의 FR-006
(원본 보호)이 그대로 적용된다.

**P4. 최종 보존/정리는 파이프라인이 저장 결과를 확인한 뒤에만 일어난다.**
- 판정 거부(`GenerationFailure`의 `rejected`/`vision-failed`/`timed-out`/
  `interrupted`/`model-load-failed` 등 모든 실패 갈래) → `on-device.ts`의
  `generate()`가 실패를 반환하기 직전에, 그 요청 안에서 캡션 성공한 사본 전부를
  스스로 정리한다. 실패 반환값(`GenerationFailure`)에는 `usedPhotos`가 없다
  (data-model.md §5 불변식).
- 저장 실패(`PipelineResult`의 `{ ok: false; stage: "storage" }`) →
  `pipeline.ts`가 `deps.store.save()` 실패를 확인한 시점에 `generated.usedPhotos`
  (있다면)의 사본 전부를 정리한다.
- 성공(`{ ok: true }`) → 정리하지 않는다. `usedPhotos`를 그대로
  `DiaryEntry.photos`로 옮긴다. **이 시점부터 그 사본은 그 일기가 존재하는 한
  보존된다.**

**P5. 정리는 최선을 다하되 실패해도 파이프라인을 막지 않는다.** 파일 삭제가
실패해도(`.catch(() => {})`, 기존 `cleanupResizedPhoto`와 같은 관용) 사용자에게
드러나는 실패로 번지지 않는다 — 디스크에 고아 파일이 남는 것은 사용자가 볼 수
있는 실패보다 낫다(013 FR-008이 이미 같은 판단을 내렸다).

## 화면이 보존된 사진을 읽지 못하는 경우 (FR-002)

**P6.** `DiaryEntry.photos[i].resizedPath`가 가리키는 파일이 실제로 없으면(드문
경우 — 예: 사용자가 기기 저장소를 수동으로 정리함), 화면은 그 사진 하나를 "이
사진은 이제 없다"로 표시하고 나머지 사진은 그대로 보여준다. **일기 전체를
읽기 실패로 처리하지 않는다** — 011의 E4(한 장의 실패가 나머지를 무너뜨리지
않는다)와 같은 원칙이 화면 레벨에서도 반복된다.

## 테스트로 확인해야 하는 것

- `caption.test.ts`: 성공한 캡션의 사본이 `captionAll()` 반환 직후 여전히
  파일로 존재하는지(cleanup이 호출되지 않았는지), 실패한 캡션의 사본은
  `captionAll()` 반환 전에 이미 지워졌는지.
- `on-device.test.ts`: 실패로 끝나는 모든 `GenerationFailure` 갈래에서
  캡션 성공한 사본이 정리되는지(파일 존재 여부로 확인), 성공 시
  `DiaryDraft.usedPhotos`가 캡션 성공한 것만(실패한 장 제외) 담는지.
- `pipeline.test.ts`: 저장 실패 시 `usedPhotos`의 사본이 정리되는지, 저장 성공
  시 `entry.photos`에 그대로 남는지 — 재시도(같은 하루를 다시 생성)에서
  파일이 누적되지 않는지(`resizedFileNameFor()`의 결정론 재확인).
