# Data Model

새 저장 데이터 없음. 프로세스 메모리 한 칸:

**RearmGate** `{ pending(): boolean; done(): void }` — 초기 `pending() === true`, `done()` 뒤 `false`. 프로세스(모듈 인스턴스)당 하나. 앱 재시작·강제 중지·재부팅·업데이트로 새 프로세스가 되면 초기화된다.
