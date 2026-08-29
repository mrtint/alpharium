// UI 테스트(`jest-expo` 프로젝트) 공통 설정.
//
// `jest-expo`는 워커마다 React Native 런타임을 세우고, CI 러너는 2코어
// (`--maxWorkers=2`)라 첫 `render()`가 기본 5초 타임아웃을 넘길 수 있다. 2026-08-29에
// generation-probe·signal-probe·permission-panel 등 서로 다른 스위트가 CI 스케줄이
// 불운할 때 산발적으로 5초 초과로 깨졌다 — **코드 결함이 아니라 워커 경합이다**
// (AGENTS.md "Windows에서 느린 것은 Defender", 006의 `--maxWorkers=50%` 조정과 같은
// 계열).
//
// 개별 `.tsx`마다 `jest.setTimeout(30000)`을 흩뿌리는 대신(이미 여러 파일이 그렇게
// 하고 있었다) 한 자리에서 프로젝트 전체에 건다. 순수 로직(`.ts`, node 환경)은 이
// 파일을 로드하지 않으므로 7초대 속도가 그대로다.
jest.setTimeout(30000);
