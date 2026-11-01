# `src/app/` — 화면과 도메인·통로 사이의 순수 상태·조립

**사용자 경로를 조립하고 화면(`src/ui/`)이 쓸 순수 상태·판정·훅을 두는 자리다.**

001의 `config/policy.ts`가 원칙 I의 방어선을, 003의 `models/roster.ts`가 원칙 III을,
005의 `diary/prompt.ts`가 원칙 II를 한 곳에 모은 것과 같은 구조다.

## 여기서 지키는 것

- **`wiring.ts`** — 추론 어댑터(`inference/select.ts`), 일기 저장소(`diary/store.ts`), 살아 있는 쓰기 등록부(`diary/live-write.ts`), 신호 수집을 파이프라인과 첫 실행·미리보기 통로로 묶는 유일한 조립 지점이다.
- **순수 화면 상태와 판정** — `state.ts`(홈 상태 전이), `day-preview.ts`·`material.ts`(쓸 재료 판정), `written-day.ts`·`reading-scroll.ts`(쓴 날 지면·접힘 판정), `calendar.ts`·`target-hour.ts`·`photo-viewer.ts`, `diagnostics-view.ts`(진단 화면 뷰 모델), `simulation.ts`(개발 환경 상태 흉내) 등 기기 없이 검증되는 순수 함수를 둔다.
- **자동 쓰기·기록·동의 상태** — `use-auto-write-handoff.ts`·`use-auto-write-claim.ts`(앱 열기 자동 쓰기 판정·소모 훅), `auto-write-attempts.ts`(자동 쓰기 시도 기록 — 날짜별 장부 `attempt-ledger/`, 109), `write-failures.ts`(쓰기 실패 11갈래 기록), `wipe-diaries.ts`(일기 모두 지우기 순서 조합), `consent-gate.ts`·`use-consent-gate.ts`(모바일 데이터 동의 분기).

## 여기에 두지 않을 것

- 화면 컴포넌트와 스타일 — `src/ui/`의 몫이다(`src/app/`은 `src/ui/`를 import하지 않는다).
- 추론 위치 판단 — `inference/select.ts`가 한다. 여기서 다시 고르면 방어선이 갈라진다.
- 모델 출력 채점·생성 시간·토큰 수 지표 — 헌법 원칙 IV.
