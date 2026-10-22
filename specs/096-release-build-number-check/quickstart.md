# Quickstart: 096 검증

## 기기·비밀 없이 (항상 돈다)

```bash
npx jest __tests__/scripts/version-check.test.ts __tests__/scripts/build-number-check.test.ts \
  __tests__/scripts/play-upload.test.ts __tests__/scripts/testflight-notes.test.ts \
  __tests__/ci --maxWorkers=2
npm test && npm run lint && npx tsc --noEmit
```

기대: 모두 통과. 위반 주입(순서 뒤바꿈·허용 밖 비밀·`contents: write`·`run`에 `${{ secrets }}` 보간)이 각각 계약 테스트를 실패시키고 되돌리면 통과한다.

## 실제 실행 (소유자 요청 때만 — 이 작업에서는 하지 않았다)

1. `android-release`/`ios-release`를 스토어에 이미 있는 번호로 시작 → 「번호 점검」 단계에서 실패하고 prebuild는 돌지 않는다.
2. 스토어보다 큰 번호로 시작 → 요약에 `버전 · 번호 · 커밋 · 스토어 마지막` 줄이 남는다.
3. 403이 나면 소유자가 서비스 계정(Play Console 앱 정보 보기·릴리스 보기) 또는 API 키 역할을 확인한다.

## 못 본 것

Play `bundles.list`·ASC `builds` 실응답과 권한 (research.md 「못 본 것」). 소유자 확인 전까지 「통과」라고 쓰지 않는다.

## 위반 주입 (2026-10-22, 치환이 적용됐는지 먼저 단언한 뒤 실패를 확인하고 되돌림)

| ID    | 어긴 것                                   | 결과                      |
| ----- | ----------------------------------------- | ------------------------- |
| A1·I1 | 번호 점검을 `npm ci` 뒤로 옮김            | 잡힘(N1)                  |
| A2·I2 | 허용 밖 `secrets.EXTRA` 추가              | 잡힘(W5·N2)               |
| A3·I3 | `contents: write`                         | 잡힘(W4·N6)               |
| A4·I4 | 번호 점검 `run`에 `${{ secrets.… }}` 보간 | 잡힘(W5·N3)               |
| A5    | 사전 점검에서 `node` 호출                 | 잡힘(W17)                 |
| A6·I5 | `push`/`pull_request` 트리거 추가         | 잡힘(W2)                  |
| A7    | 번호 점검 단계 이름 변경                  | 잡힘(W13·N1~N5)           |
| S1·S2 | 진입점이 서비스 계정·API 키를 출력        | 잡힘(소스 계약)           |
| S3    | 번들 조회가 `edits.commit`을 부름         | 잡힘(소스 계약·동작 시험) |
| S4    | `links.next` 호스트 검사 제거             | 잡힘(T3)                  |
| S5·S6 | 판정이 같은 번호를 통과시킴               | 잡힘(A3·I3)               |
