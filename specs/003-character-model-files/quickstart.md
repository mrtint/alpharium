# Quickstart: 이 기능이 됐는지 확인하는 법

**기능**: 캐릭터별 모델 파일 확보 | **Date**: 2026-08-13

계약의 검증 표를 실제로 돌리는 순서다. 자세한 규칙은 [contracts/](contracts/)에 있고 여기는
**어떻게 확인하는가**만 적는다.

**이 기능은 002와 다르다 — 실기기 검증이 완료 조건이다**(FR-036, FR-037). 기기 없이 전부
초록불이어도 끝난 것이 아니다(헌법 원칙 V).

---

## 준비

```bash
npm install          # expo-file-system이 선언에 올라간다 (research.md §7)
npm run lint         # eslint + tsc + 헌법 검사
```

---

## A. 기기 없이 도는 것 — `npm test`

```bash
npm test
```

계약의 검증 표가 여기서 돈다. **판정 로직이 순수 함수라 전부 기기 없이 검증된다.**

| 무엇 | 어디 | 표 |
| --- | --- | --- |
| 매핑의 한 방향 경계 | `__tests__/models/roster.test.ts` | R1~R8 |
| 준비 상태 넷 | `__tests__/models/readiness.test.ts` | D1~D15 |
| 내려받기·중단·재개·공간 | `__tests__/models/acquisition.test.ts` | A1~A20 |
| 내용 검증 | `__tests__/models/verification.test.ts` | D11 중심 |
| 보관과 삭제 | `__tests__/models/storage.test.ts` | S1~S14 |

**가장 중요한 세 줄** — 이것들이 실패하면 헌법이 깨진 것이다:

- **D5** — 넷이 서로 구분된다 (원칙 V, SC-003)
- **D11** — 크기는 같고 내용이 다른 파일이 검증에서 걸린다 (SC-015)
- **A15** — 둘째 요청이 거부된다 (FR-020, SC-013)

---

## B. 원칙 I 확인 — 대체 모델이 없다

실패 갈래 어디에도 "대신 쓸 자산"이 없어야 한다(FR-035).

```bash
# DownloadFailure에 자산·경로 필드가 없다
grep -n "asset\|url\|fallback\|substitute" src/models/types.ts
```

**기대**: `DownloadFailure` 정의 안에 위 낱말이 없다. 002의 `GenerationFailure`에 `text`
필드가 없는 것과 같은 구조 — **타입 수준에서 대체가 불가능해야 한다.**

---

## C. 원칙 III 확인 — 매핑이 새지 않는다

**이 기능의 핵심 위험이므로 가장 꼼꼼히 본다.**

```bash
# 1. 자산을 만드는 곳이 roster.ts 하나인지
grep -rn "expectedBytes\|md5\|assetFor" src/ --include=*.ts --include=*.tsx | grep -v "roster.ts"
```
**기대**: `src/ui/` 아래에 한 줄도 없다. `models/` 안쪽에서 조각을 인자로 받는 것은 정상.

```bash
# 2. 화면이 자산을 만지지 않는지
grep -rn "ModelAsset\|assetKey\|roster" src/ui/
```
**기대**: 0건. 화면은 `Character`와 `ModelReadiness`만 안다.

```bash
# 3. 진행률·공간 타입에 바이트가 없는지
grep -n "bytes\|Bytes" src/models/types.ts
```
**기대**: `StorageUsage.bytes`만 있고 `DownloadProgress`에는 없다 — **`totalBytes`가 곧
모델 크기다**(설계 중 찾은 누출 경로).

```bash
# 4. 환경 변수로 매핑을 바꿀 수 없는지
grep -rn "process.env" src/models/
```
**기대**: 0건 (FR-002). 001이 `process.env`를 `environment.ts`에만 둔 것보다 강하다.

---

## D. 원칙 IV 확인 — 속도를 재지 않는다

```bash
grep -rn "Date.now\|performance.now\|elapsed\|duration\|speed\|bytesPerSecond" src/models/
```

**기대**: 0건. 내려받기 속도 측정은 무해해 보이지만 **모델 비교의 시작점**이다(FR-034).
남은 시간을 보여주고 싶어도 담지 않는다.

```bash
npm run check:constitution
```

---

## E. 원칙 V 확인 — 모르는 것을 지어내지 않는다

```bash
# 진행률이 "모름"을 표현할 수 있는지
grep -n "unknown\|null" src/models/types.ts
```

**기대**: `DownloadProgress`의 `fraction`이 "모름"을 가진다. 서버가 `Content-Length`를 주지
않으면 `totalBytes`가 `-1`이고(research.md §1), 그때 **백분율을 지어내지 않는다.**

---

## F. 실기기 — **이 기능의 완료 조건** (FR-036, FR-037)

```bash
npm run test:device
```

기기가 없으면 건너뛴다. **건너뛴 것은 통과가 아니다** — 001의 실행기가 그 둘을 구분해
보고한다.

### 자동으로 확인되는 것 (`.maestro/model-acquisition.yml`)

| 확인 | 근거 |
| --- | --- |
| 캐릭터 목록에 다섯 자리가 보인다 | FR-005a, SC-017 |
| 아무것도 없을 때 다섯이 "받아야 함"이다 | FR-005a |
| 화면에 모델 정보가 없다 | FR-004, SC-001 |
| 하나를 골라 받으면 진행률이 캐릭터 단위로 보인다 | FR-013a |
| 다 받으면 그 캐릭터가 "쓸 수 있음"이 된다 | FR-036, SC-010 |

### 손으로 확인하는 것 — 자동화되지 않는다

Maestro로 재현하기 어려운 것들이다. **한 번은 반드시 손으로 한다.**

| # | 무엇 | 어떻게 | 근거 |
| --- | --- | --- | --- |
| F1 | **앱을 죽였다가 이어받기** | 받는 도중 앱 강제 종료 → 다시 열기 → 이어받기. 진행률이 0부터 시작하지 않아야 한다 | FR-016, FR-037, SC-006 |
| F2 | **삭제로 공간이 실제로 빈다** | 설정에서 저장 공간 확인 → 캐릭터 삭제 → 다시 확인 | FR-025, FR-037, SC-008 |
| F3 | **부분 파일도 정리된다** | 받다 중단 → 삭제 → 공간 확인 | FR-029, SC-008 |
| F4 | **일기가 남는다** | 일기 있는 상태에서 모델 삭제 → 일기 조회 | FR-030, SC-009 |
| F5 | **공간 부족이 시작 전에 걸린다** | 기기를 거의 채운 뒤 받기 시도 | FR-019, SC-007 |
| F6 | **여유 비율이 맞는지 실측** | 받은 뒤 남은 공간을 잰다. 15%가 과한지 모자란지 | **FR-019c** |
| F7 | **파일 관리자에서 모델명이 안 보인다** | 파일 관리자로 `models/` 열기 | FR-004 |

**F6이 research.md §3의 잠정값을 확정하는 자리다.** 지금 15%는 **추측이며**, 실측 후 이
문서와 research.md를 함께 고친다(헌법 원칙 V — 실측인지 짐작인지 구분해 적는다).

**F1이 가장 중요하다.** GB 파일에서 재시작은 사용자의 데이터를 두 번 쓰는 것이고, 모의로는
검증되지 않는다.

---

## 끝났다고 말할 수 있는 조건

- [ ] `npm test` 통과 (A)
- [ ] `npm run lint` 통과 (D 포함)
- [ ] B·C·D·E의 grep이 전부 기대대로
- [ ] `npm run test:device`가 **실제로 돌아서** 통과 (건너뜀이 아니다)
- [ ] F1~F7을 손으로 한 번 확인
- [ ] F6의 실측값으로 여유 비율을 확정하고 research.md §3을 고침

**마지막 둘이 빠지면 이 기능은 끝나지 않았다.** 헌법 원칙 V — 건너뛴 실기기 테스트는
통과가 아니다.

---

## 이 기능이 끝나도 안 되는 것

- **일기는 여전히 나오지 않는다.** `generate()`는 `not-implemented`다(FR-009). 파이프라인은
  이제 두 곳에서 멈출 수 있다 — 준비되지 않은 캐릭터면 그 앞에서, 준비됐으면 생성에서.
- **캐릭터에 이름과 설명이 없다.** 자리와 상태만 보인다(FR-004a, FR-005c).
- **사진을 다루지 않는다.** 시각 인코더는 범위 밖이다(FR-033).
