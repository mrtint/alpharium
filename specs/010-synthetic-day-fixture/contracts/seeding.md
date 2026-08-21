# 계약 — 심기·확인·되돌리기

**이 문서가 정하는 것은 「무엇을 어떤 순서로 하고, 어디서 실패하는가」다.**
명령의 모양은 [cli.md](cli.md)에 있다.

---

## 왜 확인이 계약의 일부인가

**research.md §1의 실측**:

```
adb push probe.jpg /sdcard/Pictures/AlphariumProbe/probe.jpg
→ 1 file pushed. 성공.

content query ... --projection _id:_data:datetaken
→ Row: 0 _id=1000000639, _data=..., datetaken=NULL
```

**파일이 있고, MediaStore에 행도 있는데, `datetaken`이 NULL이라 앱은 못 본다.**

앱의 질의가 `CREATION_TIME`의 범위를 보기 때문이다([expo-port.ts](../../../src/signals/expo-port.ts)).
`datetaken`이 NULL이면 **어느 하루에도 걸리지 않는다.**

**그러므로 「push 성공」은 「심겼다」가 아니다.** 확인이 계약이 아니면 이 도구는
006의 `GenerationProbe`·007의 끊긴 배선·008의 버려진 반환값·009의 `day:` 한 줄과
**같은 종류의 조용한 실패**를 하나 더 만든다.

---

## 심기의 단계

### 0단계 — 심기 전 확인 (아무것도 안 만진다)

| 확인 | 실패 시 | 왜 |
| --- | --- | --- |
| `adb devices`에 기기가 하나 있다 | `no-device` | 절반만 심긴 상태를 만들지 않기 위해 **가장 먼저** |
| 하루가 `selectableDays(now)`에 있다 | `day-out-of-range` | FR-005a. **심기 전에 거부한다** |
| 모양 이름이 있다 | `unknown-shape` | 오타로 다른 하루를 만들지 않기 위해 |

**기기가 여럿이면 실패한다.** `expo run:android --device`가 `IP:포트`를 못 받는 것과
같은 이유로 여기서도 대상을 특정할 수 없다(AGENTS.md 실측). 에이전트에게 「기기가
여럿이다」를 알려 사람이 정하게 한다.

### 1단계 — 이미 있는 것 세기 (FR-011b)

```
adb shell ls /sdcard/Pictures/<전용폴더>/ | wc -l
```

**심기 전에 센다.** 자동으로 치우지 않기로 했으므로(명확화 Q4) 이 숫자가 결과의
`existing`이 되고, 에이전트가 「기대하는 사진 수」를 조정한다.

**폴더가 없으면 0이다** — 오류가 아니다.

### 2단계 — EXIF 패치 (개발 기계 안, 순수)

```
템플릿 JPEG  ──┬─ DateTimeOriginal  ← takenAtMs (20바이트 고정)
               ├─ DateTimeDigitized ← takenAtMs (20바이트 고정)
               └─ GPS lat/lon       ← location  (각 24바이트 고정)
```

**계약**:

1. **길이가 바뀌지 않는 자리 교체만 한다.** 오프셋이 움직이면 IFD를 다시 계산해야 하고,
   그 순간 research.md §4가 보여준 「손으로 만든 EXIF는 무시된다」의 영역에 들어간다.
2. 좌표가 없는 사진은 **GPS 태그가 없는 템플릿**을 쓴다. 태그를 지우지 않는다 — 지우면
   엔트리 수가 바뀐다.
3. **패치 결과를 다시 읽어 값이 맞는지 확인한다.** 기계 안에서 하는 확인이므로 싸다.

**이 단계는 기기에 닿지 않으므로 `jest`로 검증된다.**

### 3단계 — 밀어 넣기

```
adb push <임시파일> /sdcard/Pictures/<전용폴더>/<파일명>
```

**파일명 규칙**: 어느 하루의 몇 번째인지 알아볼 수 있어야 한다 — 되돌리기가 하루별로
가능해야 하기 때문이다(`seed:clear -- 2026-08-20`).

실패하면 `push-failed`. **이미 넣은 것을 치우고** 끝낸다(FR-019 — 절반만 심긴 상태를
남기지 않는다).

### 4단계 — 색인 (research.md §3)

```
adb shell content call --uri content://media/external \
  --method scan_file --arg <기기경로>
```

**⚠️ 이 방법만 실제로 동작한다.** 실측에서 물린 것 둘:

| 방법 | 결과 |
| --- | --- |
| `am broadcast MEDIA_SCANNER_SCAN_FILE` | `result=0` — **아무도 받지 않는다** |
| `content update --bind datetaken:l:...` | **조용히 아무것도 안 한다.** 오류도 없다 |

**둘 다 성공한 것처럼 보인다.** 그래서 이 계약이 방법을 못 박는다.

### 5단계 — ★ 되읽어 확인 (FR-018d)

```
adb shell content query --uri content://media/external/images/media \
  --projection _id:datetaken --where "_data LIKE '%<전용폴더>%'"
```

**두 가지를 본다**:

1. **행이 있고 `datetaken`이 NULL이 아닌가** — 아니면 `index-failed`
2. **`datetaken`이 `dayBounds(day)`의 `[startMs, endMs)` 안인가** — 아니면
   `verify-mismatch`

**2번이 시간대 어긋남을 잡는다**(research.md §8). 개발 기계와 기기의 시간대가 다르면
심은 사진이 옆 하루에 걸리는데, **그것을 여기서 잡지 못하면 검증이 조용히 헛돈다.**

**색인이 즉시 끝나지 않을 수 있다.** 실측에서 2초면 됐으나 **표본이 적다**(원칙 V) —
짧은 간격으로 몇 번 다시 묻고, 그래도 없으면 `index-failed`.

### 6단계 — 기록

`SeedEntry`를 개발 기계의 기록에 더한다. **기기에 쓰지 않는다**(FR-017 방어).

---

## 실패했을 때 (FR-019)

**절반만 심긴 상태를 남기지 않는다.**

```
3~5단계 중 실패
  → 이번 실행이 넣은 파일들을 지운다
  → 볼륨 스캔 (유령 행 제거)
  → 실패로 끝낸다 (종료 코드 1)

치우다가 또 실패하면
  → 종료 코드 2 + reason: "cleanup-failed"
  → 기기가 어긋난 채로 남았다는 것을 명시한다
```

**이번 실행이 넣은 것만 치운다.** `existing`으로 센 것은 앞선 실행의 것이며, 사람이
치우라고 하지 않았으므로 건드리지 않는다(FR-011a).

---

## 되돌리기의 단계

**사람이 지시할 때만 돈다**(FR-011a).

```
1. 폴더의 파일을 센다 (지우기 전)
2. adb shell rm -rf /sdcard/Pictures/<전용폴더>[/<하루의 것들>]
3. ★ 볼륨 스캔 — content call ... --method scan_volume --arg external_primary
4. 질의로 유령 행이 없는지 확인
5. 기록에서 지운다
```

### 3단계를 빠뜨리면 (research.md §5 실측)

파일을 지워도 **MediaStore에 행이 남는다.** 앱은 그 행을 보고 사진이 있다고 판정하며,
**다음 검증이 유령 위에서 돈다.**

실측:
```
rm -rf /sdcard/Pictures/AlphariumProbe
content call ... scan_volume
→ 이후 질의: No result found.   ✅
```

### 계약

1. **전용 폴더 밖에 닿지 않는다**(FR-016a) — 어떤 인자를 받아도.
2. 지우지 못한 것은 **조용히 넘기지 않는다**(FR-012b).
3. 지울 것이 없으면 **그 사실을 알린다** — 오류가 아니다.

---

## 도구가 하지 않는 것 (계약의 일부)

| 안 하는 것 | 근거 |
| --- | --- |
| 권한을 주거나 거두기 | FR-014. `unknown` 갈래는 사람이 `pm revoke`로 만든다 |
| 앱의 저장 영역에 쓰기 | FR-004 |
| **일기를 읽기** | FR-022, 원칙 IV. **헌법 검사가 막는다** |
| 기기 날짜 바꾸기 | root가 필요하고 조용히 실패한다(009 실측) |
| 걸음·배터리·연결 심기 | FR-009. 통로가 없다 |
| 자동으로 치우기 | FR-011a (명확화 Q4) |

---

## 앱과의 경계 — 이 계약의 근본

```
도구                          기기                        앱
────                          ────                        ──
EXIF 패치
  ↓
adb push ──────────────→ /sdcard/Pictures/<폴더>/
  ↓
scan_file ─────────────→ MediaStore (datetaken)
  ↓                            │
되읽어 확인 ←──────────────────┘
                               │
                               └──────────────→ photosBetween()
                                                 (CREATION_TIME 범위)
                                                     ↓
                                                 locationOf()
                                                 (EXIF GPS)
```

**도구와 앱이 만나는 자리는 MediaStore 하나뿐이다.** 도구는 앱을 부르지 않고, 앱은
도구를 모른다.

**그래서 앱 코드가 한 줄도 바뀌지 않는다**(FR-004a, SC-009) — 이 계약의 가장 강한 주장이며,
`git diff --stat src/ App.tsx`가 0줄인 것으로 검증된다.
