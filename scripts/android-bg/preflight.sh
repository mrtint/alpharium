#!/usr/bin/env bash
# 케이블을 빼기 전 점검 (AGENTS 「도구 사용법」 1번). 하나라도 실패면 종료 코드 1 — 빼지 않는다.
# 사용: scripts/android-bg/preflight.sh [adb 시리얼]   (기본 R3CTB084WDP)
set -u
ADB="${ADB:-$HOME/Library/Android/sdk/platform-tools/adb}"
SER="${1:-R3CTB084WDP}"
P=com.a810labs.pocketlog
a() { "$ADB" -s "$SER" "$@"; }
fail=0
chk() { # 이름, 통과여부(0=통과), 상세
  if [ "$2" -eq 0 ]; then echo "PASS  $1  $3"; else echo "FAIL  $1  $3"; fail=1; fi
}
TODAY=$(date +%Y-%m-%d)
S=$(( $(date -j -f "%Y-%m-%d %H:%M:%S" "$TODAY 00:00:00" +%s) * 1000 ))
E=$(( S + 86400000 ))

APK=$(a shell pm path $P | head -1 | sed 's/package://' | tr -d '\r')
a shell unzip -l "$APK" 2>/dev/null | grep -q "assets/index.android.bundle"; chk "APK에 내장 번들" $? "$APK"

a shell run-as $P ls files/BridgelessReactNativeDevBundle.js >/dev/null 2>&1; r=$?
chk "옛 Metro 번들 캐시 없음" $([ $r -ne 0 ] && echo 0 || echo 1) ""

n=$(a reverse --list | tr -d '\r' | grep -c .)
chk "adb reverse 없음" $([ "$n" -eq 0 ] && echo 0 || echo 1) "$n개"

ad=$(a shell run-as $P cat files/preferences/auto-diary.json | tr -d '\r')
echo "$ad" | grep -q '"enabled":true'; chk "자동 쓰기 켬" $? "$ad"

fc=$(a shell run-as $P cat files/preferences/dev-fast-cycle.json 2>/dev/null | tr -d '\r')
if [ -z "$fc" ] || ! echo "$fc" | grep -q '"enabled":true\|"minutes"'; then r=0; else r=1; fi
chk "빠른 주기 꺼짐" $r "${fc:-파일 없음}"

a shell run-as $P ls files/diary/$TODAY.json >/dev/null 2>&1; r=$?
chk "오늘 일기 없음" $([ $r -ne 0 ] && echo 0 || echo 1) "$TODAY"

np=$(a shell "content query --uri content://media/external/images/media --projection _id:datetaken --where \"datetaken>=$S AND datetaken<$E\"" | tr -d '\r' | grep -c '^Row')
chk "오늘 사진 있음" $([ "$np" -gt 0 ] && echo 0 || echo 1) "${np}장"

JS=$(a shell dumpsys jobscheduler | tr -d '\r' | awk '/JOB #u0a[0-9]+\/[0-9]+: .*pocketlog/{f=1} f{print} f&&/Num Dropped/{exit}')
[ -n "$JS" ]; chk "이 앱 잡 있음" $? "$(echo "$JS" | grep -o 'JOB #[^ ]*')"
echo "$JS" | grep -q "NETWORK\|CONNECTIVITY\|Network"; r=$?
chk "잡에 네트워크 제약 없음" $([ $r -ne 0 ] && echo 0 || echo 1) ""

# 쓸 차례 알람은 RTC_WAKEUP, 태그 없이 패키지만 보인다 — origWhen을 읽어 시각을 적는다
alw=$(a shell dumpsys alarm | tr -d '\r' | grep "RTC_WAKEUP #.*com.a810labs.pocketlog}" | sed 's/.*origWhen \([0-9]*\).*/\1/')
al=$(echo "$alw" | grep -c .)
first=$(echo "$alw" | head -1)
chk "쓸 차례 알람 있음" $([ "$al" -gt 0 ] && echo 0 || echo 1) "${al}개, 첫째 $( [ -n "$first" ] && date -r $((first/1000)) '+%m-%d %H:%M' )"

lv=$(a shell dumpsys battery | tr -d '\r' | awk '/^  level:/{print $2}')
chk "배터리 50% 이상" $([ "${lv:-0}" -ge 50 ] && echo 0 || echo 1) "${lv}%"

echo; [ $fail -eq 0 ] && echo "=> 모두 통과: 케이블을 빼도 된다" || echo "=> 실패 있음: 빼지 않는다"
exit $fail
