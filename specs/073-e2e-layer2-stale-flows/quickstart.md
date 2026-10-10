# Quickstart: 073 검증

전제: 전용 테스트 기기(SM-G986N, dev 빌드, 모델·권한·배터리 예외 있음), Metro가 dev 환경(`CI=1`)으로 떠 있고 `adb reverse tcp:8081 tcp:8081`, 기기 잠금 해제.

## 기기 없는 검증
- `npm run test:logic` — layer2-runner·source-contract·flow-map 통과
- `npm run lint`

## A. 낡은 흐름
1. `contracts/stale-flows.md` 절차로 셋을 판정, 고치거나 지운다.
2. 고친 흐름을 `npm run test:layer1 -- .maestro/<흐름>.yml`로 돌려 통과를 본다. **`node scripts/run-device-tests.mjs`(인자를 줘도)는 쓰지 않는다** — `pm clear`가 모델을 지운다.
3. 위반 주입: 고친 흐름의 단언 하나를 틀리게 → 실패(치환 적용 확인 먼저).

## B. 층 2
1. `npm run test:layer2` — 흐름 넷 통과, 끝에 흐름별 표와 `.cache/layer2/<시각>/` 일기 경로가 출력된다.
2. 출력된 일기를 열어 본문을 읽는다(사람).
3. 위반 주입: `layer2-write-and-read.yml`의 `stop-button` 소멸 대기 id를 틀리게 → 그 흐름 실패(나머지 3개는 돈다).
4. 위반 주입: `LAYER2_FLOWS`에서 한 흐름을 빼기 → `flow-map`/계약 테스트 실패.
5. 모델 없는 상태(= `files/models` 이름을 잠시 바꿈 — 끝나면 되돌린다)에서 → aborted.

## 문서
- `docs/e2e/layer2-release-checklist.md`를 따라 한 번 해 본다. AGENTS.md 링크 확인.
