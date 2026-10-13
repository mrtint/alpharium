# Quickstart: 살아 있는 쓰기 등록부와 합류 (080) — 확인 절차

계약은 [contracts/live-write.md](./contracts/live-write.md), 값은 [data-model.md](./data-model.md). 여기는 「돌려서 본다」만 적는다. **재는 코드를 넣지 않는다** — 보는 것은 라이브러리가 debug에서 찍는 로그·자동 쓰기 시도 기록(078)·쓰기 실패 기록(060)·일기 파일이다.

## 1. 기기 없이

```bash
npm run test:logic      # 등록부·파이프라인·태스크·지우기·배선
npm run test:ui         # 홈 합류(home-join) + 기존 홈 테스트 회귀
npm test                # 커밋 전 전체
npm run lint            # eslint + tsc + 헌법 검사 + prettier
```

**위반 주입**(각각 주입 → 치환이 적용됐는지 grep → 실패 확인 → 되돌림 → 되돌아왔는지 grep):

| 주입 | 잡혀야 하는 곳 |
| --- | --- |
| 찬 칸에도 `beginWrite`가 손잡이를 준다 | `live-write.test.ts` R1·100회 시뮬레이션 |
| `pipeline.run()`의 `finally`에서 `end()`를 뺀다 | `pipeline.live-write.test.ts` P3 |
| 그만둠을 결과에 싣지 않는다 | `pipeline.live-write.test.ts` P6, `background-generation.test.ts` T2 |
| 합류한 동안 `running`을 세운다(앞을 벗어나면 끊긴다) | `home-join.test.tsx` H3 |
| 합류한 쓰기의 실패에 토스트를 띄운다 | `home-join.test.tsx` H6 |
| 남의 쓰기 중에 미리 준비를 부른다 | `home-join.test.tsx` H8 |
| 남의 쓰기가 끝난 뒤 목록을 다시 읽지 않고 057을 시작한다 | `home-join.test.tsx` H12 |
| 지우기가 남의 쓰기를 기다리지 않고 지운다 | `wipe-diaries.test.ts` W2 |
| `cancelled` 결과를 쓰기 실패로 기록한다 | `write-failures.test.ts` P9 |

## 2. 안드로이드 실기기 — SM-S901N, dev

**전제**: 기기의 debug APK를 그대로 둔다(네이티브 변경 없음 — 지우지 않는다). 맥의 Metro로 이 브랜치 번들을 올린다. 화면을 끄지 않는다 — 기기를 잠그지 않으므로 PIN이 필요 없다.

```bash
export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"
P=com.a810labs.pocketlog
adb reverse tcp:8081 tcp:8081
# Metro (다른 터미널): npx expo start --dev-client   (.env.development.local 에 EXPO_PUBLIC_APP_ENV=dev)
# 번들 확인: curl -s "localhost:8081/index.bundle?platform=android&dev=true" | grep -c "createLiveWrites"   → 1 이상
#           같은 번들에서 grep -c "STALE_LOCK_MS" → 0
```

**백업** (끝에 되돌린다 — md5 대조):

```bash
adb exec-out run-as $P tar c files/diary files/preferences files/locks > "$SCRATCH/080-backup.tar"
```

**준비**: 어제에 진짜 사진을 심는다(`npm run seed:day -- one-place <어제>` — `scripts/samples/with-gps/`에 표본이 있어야 한다, 심은 뒤 `sips -g pixelWidth`로 1×1이 아닌지 본다). `preferences/auto-diary.json`을 `{"enabled":true,"targetHour":22}`로 둔다(낮이면 창 밖 — 어제를 따라잡는다). 어제 일기 파일을 뺀다. 오늘 일기는 둔다. `preferences/auto-write-catch-up.json`을 지운다(오늘 몫이 남아 있어야 잡이 판정에 들어간다).

잡 번호는 재등록마다 바뀐다: `adb shell dumpsys jobscheduler | grep -B1 -A3 "$P"`의 `JOB #u0a…/<번호>`.

| | 절차 | 볼 것 (SC) |
| --- | --- | --- |
| **D1 합류** | 앱을 띄웠다가 홈 버튼 → `adb shell cmd jobscheduler run -f $P <번호>` → `adb logcat \| grep "Attached ggml threadpool"`에 첫 줄(사진 모델, `n_threads=2`)이 찍힌 뒤 `adb shell am start -n $P/.MainActivity` | 홈이 어제를 고른 「쓰는 중」(`screencap`). 로그의 `Attached ggml threadpool`이 **두 줄뿐**이고 둘 다 `n_threads=2`(사진·본문) — `n_threads=4` 줄이 끼지 않는다(SC-001, 전제 R1). 끝나면 어제의 쓴 날 홈, 시도 기록 `백그라운드 · 썼음`, 완성 알림 |
| **D2 그만두기** | 어제 일기를 다시 빼고 따라잡기 기록을 지운 뒤 D1과 같이 합류 → 「그만두기」 | 쓰기 전 홈. `files/diary/<어제>.json` 없음. `write-failures.json` 줄 수 그대로. 시도 기록 `백그라운드 · 사용자가 그만둠`. 알림 없음. 1분 지켜봐도 홈이 저절로 쓰지 않는다(SC-003) |
| **D3 죽은 쓰기** | 따라잡기 기록을 지우고 홈 버튼 → 강제 잡 → 사진 모델 로그가 찍힌 뒤 `adb shell am force-stop $P` → 곧바로 `am start` | 홈이 어제의 「쓰는 중」으로 시작해 저장한다(로그 `n_threads=4` 두 줄) — 기다림 없음(SC-002). 시도 기록에 앞 실행의 `백그라운드 · 시작한 뒤 끝나지 않음`이 남아 있다(사실이다) |
| **D4 지우기** | D1과 같이 합류한 뒤 설정 → 「일기 모두 지우기」 확인 | 설정이 닫히고 홈이 오늘, 일기 0편. 2분 뒤에도 0편(지운 뒤 저장 없음). `write-failures.json` 줄 수 그대로. **백업을 먼저 확인하고 한다** |
| **D5 회귀** | 평소 「쓰기」 한 번 · 쓰기 → 그만두기 → 곧바로 다시 쓰기(071) · 진단 「자동 쓰기 지금 실행」 · 진단이 도는 동안 진단 겹을 닫기(홈이 합류하는가) | 종전과 같다. 수동 실행 도중 겹을 닫으면 홈이 그 날의 「쓰는 중」(주체와 무관한 합류 — FR-006) |

합류한 쓰기가 **실패로 끝나는 경로**는 안드로이드에서 깨끗하게 만들 수단이 없다 — iOS 시뮬레이터 §3 S1로 본다.

곁에서 볼 것(적기만 한다): D1에서 앱이 앞에 있을 때 완성 알림이 어떻게 보이는가(research R6).

**되돌리기**

```bash
adb shell am force-stop $P
adb shell "run-as $P sh -c 'rm -rf files/diary files/preferences files/locks'"
adb exec-in run-as $P tar x < "$SCRATCH/080-backup.tar"     # 되돌린 뒤 md5 대조
npm run seed:clear
```

## 3. iOS 시뮬레이터 (iPhone 17, Debug) — SC-004

079 quickstart §3과 같은 준비다(일기·설정 복사 백업, 어제 날짜 사진 `simctl addmedia`, `auto-diary.json` 켬, 오늘 일기를 자리표시자로). 조작은 Maestro 일회용 흐름(`launchApp: { stopApp: false }`).

| | 절차 | 볼 것 |
| --- | --- | --- |
| **S1 멈췄다 돌아와 실패 → 이어 쓰기** | 진단 「자동 쓰기 지금 실행」 → 약 20초 뒤 `pressKey: Home` → 660초 → 복귀 → 진단·개발자·설정 겹을 닫는다 | 복귀 몇 초 안에 시도 기록 `지금 실행 · 실패`. 겹을 닫으면 홈이 어제의 「쓰는 중」으로 새로 쓰기 시작해 저장한다(앞 쓰기가 끝난 뒤다 — 겹침 없음). 앱이 살아 있고 `~/Library/Logs/DiagnosticReports/Pocketlog-*.ips` 새 파일 0 |
| **S2 합류** | 진단 「자동 쓰기 지금 실행」 → 곧바로 겹을 닫는다 | 홈이 어제의 「쓰는 중」, 끝나면 쓴 날 홈, 시도 기록 `지금 실행 · 썼음` |

끝나면 백업으로 되돌린다(`diff -r`).

## 4. 보지 않는 것 (미확인으로 남긴다)

실제 iPhone 전부(전제 R1 포함) · OS가 스스로 깨운 잡 · 다른 안드로이드 기기 · release 빌드 · 안드로이드에서 합류한 쓰기가 실패로 끝나는 경로(기기 없는 테스트와 iOS 시뮬레이터로만) · 안드로이드에서 JobScheduler가 30분에 잡을 끊은 뒤 런타임이 갈리는가.

## 실측 (구현 뒤에 채운다)

_아직 없다._
