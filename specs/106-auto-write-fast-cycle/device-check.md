# 106 기기 확인 기록

## 기준선 (T001, 2026-10-26, 브랜치 `106-auto-write-fast-cycle`, 구현 전)

- `npm test`: 376 스위트 통과, 7686 테스트 통과(7 건너뜀) — 건너뛴 7건은 기존 건너뜀이다.
- `npm run lint`: eslint·tsc·헌법 검사(위반 0)·prettier 모두 통과.

## 구현 뒤 기기 없는 검증 (T053·T054·T056, 2026-10-26)

- `npm test`: 395 스위트 통과, 7960 테스트 통과(7 건너뜀 — 기준선과 같은 건너뜀). 기준선 7686 → 7960(+274: 시간 규칙·기록·리셋·훅·화면·엔진·소스 계약 테스트).
- `npm run lint`: eslint 오류 0(경고 둘은 106 이전부터 있던 `release-signing.test.ts`·`safe-area.test.tsx`), tsc 0, 헌법 검사 위반 0(`FAST_CYCLE_LEAKS` FL1~FL3 포함), prettier 통과.
- 위반 주입 3종(T021·T026·T031)이 모두 잡혔고 원복했다: `task.ts`/훅의 리셋 호출 제거 → 조립·호출 자리 테스트 실패, `timing-source`의 가드 제거 → 소스 계약·prod 가드 테스트·헌법 검사 FL2, `src/ui`에서 `loadFastCycle` import → FL1, 훅에서 `resetFastCycleIfDue` 호출 → FL3, `llama-port` 직렬화 제거 → 경합 테스트 2건 실패.
- 같은 규칙 복제 점검(T054): `targetHour`를 읽는 곳은 설정·UI 표시(`target-hour.ts`·`SettingsScreen.tsx`)·`manual.ts`·`settings-effects.ts`·`reminder-plan.ts`(배포 7일치 경로 — 빠른 주기는 `timing`을 통한다)·`timing.ts`뿐이다. 옛 `isInTargetWindow` export는 없다. `getHours()`는 DB11 허용 목록(`timing.ts` 포함) 안에서만 쓰인다. 시도 기록 결과 갈래(`AttemptOutcome`)는 106 전후가 같다(FR-015).
- e2e 문서 점검(T056): 빠른 주기는 개발 빌드 전용이고 층 1 기준 상태가 `dev-fast-cycle.json`을 지우므로(`scripts/layer1/baseline.ts`에 `delete` 항목을 더했다) `docs/e2e/layer2-release-checklist.md`·`feature-flow-map.md`의 흐름·표는 바꾸지 않았다.
- **새 화면 문구는 보드 밖 초안이다** — 소유자 확정 대기(최종 보고의 표).

## 실기기 SM-S901N (2026-10-26, dev 빌드 + Metro 번들, 진행 중 — T058 일부)

- 재료: 표본 사진 3장(캐시 사진에 EXIF를 입힌 것, `scripts/samples/with-gps/`, gitignore)을 `seed:day rich 2026-10-26`으로 오늘에 심었다 → 홈에 사진 3장·장소 2곳.
- 개발자 메뉴 「빠른 주기」 구역이 보이고 30분을 골랐다 → 「지금 주기 2026-10-26#25」·「다음 주기 시작 13:00」.
- **본 것**: 「자동으로 쓰기」를 12:42에 켜자 주기 25(창 12:30~12:45) 안에서 앱 열기 경로가 오늘 일기를 스스로 써 12:43에 저장했다(제목·사진 3장 캐러셀·본문). 쓸 차례 알림이 다음 주기 시작 13:00 + 7분 = 13:07로 예약돼 있다(배터리 예외 있음, 지연 상한 ⌊15/2⌋ — 설계와 같다).
- **아직 못 본 것**: 화면을 끈 채 주기 26·27의 백그라운드 판정·리셋, 13:07 알림 발화, 완성 알림, 10분 주기·강제 잡(T059), 적재 겹침(T060), 끄기(T061).
