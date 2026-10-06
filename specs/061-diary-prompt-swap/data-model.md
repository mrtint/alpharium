# Data Model — 061

저장 형식은 바뀌지 않는다(`DiaryEntry` 그대로). 새로 생기는 것은 **저장되지 않는** 판정 값 둘이다.

## 날의 갈래 (DayKind, 프롬프트 안에서만)

| 갈래     | 조건 (`request.signals.photos`, `vision`)     | 꼬리        | 제목 질문         |
| -------- | --------------------------------------------- | ----------- | ----------------- |
| ① scenes | `vision?.captions.length > 0`                 | `TAIL`      | `TITLE_ASK_SCENE` |
| ② zero   | 캡션 없음 ∧ (`kind === "none"` ∨ `known` 0장) | `X_TAIL(②)` | `TITLE_ASK`       |
| ③ unread | 캡션 없음 ∧ `known` 1장 이상                  | `X_TAIL(③)` | `TITLE_ASK`       |
| ④ unseen | 캡션 없음 ∧ `kind === "unknown"`              | `X_TAIL(④)` | `TITLE_ASK`       |

순서: ①을 먼저 본다(캡션이 있으면 사진 신호와 무관하게 ①). 053 `decideMaterial`과 같은 사실(`none`=없었다, `unknown`=모른다)을 보며
그 함수를 바꾸거나 부르지 않는다.

## 프롬프트의 모양

```
[호칭 줄]                         ← 머리 (promptPrefix와 같은 배열)
[머리 2~5줄]
""
"한국어로 써라. 영어로 적힌 장면도 한국어로 풀어 쓴다."
""
[기록]                            ← ①: S_DAY_OPEN?·머리줄·사진·자리·장소·캡션·S_VISION_PARTIAL?
                                    ②③④: 사진·자리·장소 (머리줄·S_DAY_OPEN 없음)
""
[꼬리]
```

## instructionLines 순서

`H2[1..4]` → (①이고 하루 안 끝남: `S_DAY_OPEN`) → `S_TRUNCATED`? → `S_PLACES`? → (①: `S_VISION_PARTIAL`?) → 제목 질문 → 언어 줄 →
(②③④: 꼬리)

## 제목 합치기 (TitleMerge, on-device 안에서만)

입력: 판정 통과 본문 `body`, 제목 호출 결과 `{ text, ending }` 또는 시간 초과.
출력: `ending.kind === "eos"` ∧ `text.trim()` 비지 않음 ∧ 줄바꿈 없음 ∧ 길이 ≤ `MAX_TITLE_LENGTH`(40) → `` `${title}\n\n${body}` ``,
그 밖 → `body`. 글자를 고치지 않는다(trim만).
