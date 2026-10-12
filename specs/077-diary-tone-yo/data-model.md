# Data Model: 077 일기 말투 교체

저장되는 데이터는 바뀌지 않는다(`DiaryEntry`·설정 파일 무변경). 새로 생기는 것은 코드 안의 상수 둘이다.

## 첫 문장 틀 (`FIRST_SENTENCE_FRAMES`, `src/diary/prompt.ts`)

- 문자열 11개의 읽기 전용 배열. 순서는 v5 `user-prompt.md` 「첫 문장 틀」 블록 그대로(인덱스가 고르는 규칙의 일부).
- 각 원소: `~` 하나, `요`로 끝남, 「나」·「내」가 꾸미는 말 안에 있음(지시서 §3 — 틀을 더할 때의 기준).
- 고르기: `frameFor(day: DayDate): string` = `FIRST_SENTENCE_FRAMES[daysSinceEpoch(day) % 11]`. 순수 함수, 저장하지 않음.

## 로마자 차단 문법 (`ROMAN_LETTER_BLOCK_GRAMMAR`, `src/inference/sampling.ts`)

- 값: `root ::= [^A-Za-z]*` (줄바꿈 없음).
- 쓰는 곳: 온디바이스 본문·제목 생성 호출(`complete()`), 데스크톱 서버 요청(`ServerRequest.grammar`).

## 날의 갈래 (`DayKind`, 무변경)

`scenes`·`zero`·`unread`·`unseen` 그대로. 틀은 `scenes`에서만 쓰인다.
