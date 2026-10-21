# Data Model: 095

새 저장 데이터는 없다. 화면 상태 하나의 의미가 넓어진다.

## GateState (`src/app/use-consent-gate.ts`)

| 필드 | 형 | 074 | 095 |
| --- | --- | --- | --- |
| `view` | `"reading" \| "standard" \| "cellular" \| "deferred"` | 그대로 | 그대로 |
| `sizeLabel` | `string \| null` | `cellular`에서만 값, 그 밖 `null` | `standard`·`cellular` 모두 읽은 값 또는 `null`. `reading`·`deferred`는 `null` |

전이:

```text
reading ──(연결·양 둘 다 끝남 또는 한도)──▶ standard{sizeLabel} | cellular{sizeLabel}
cellular ──defer()──▶ deferred{null} ──recheck()/active──▶ reading
```

## 받을 양 문자열 (sizeLabel)

- 출처: `readSizeLabel()` → 남은 필수 모듈 바이트 → `formatModuleBytes`(1000 기준, 「2.0GB」·「350MB」).
- 거부·한도 초과 → `null`. 화면은 `null`이면 양 없는 문장.
