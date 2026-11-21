#!/usr/bin/env bash
# 맥 쪽에서 N초(기본 300)마다 기기 상태를 남긴다. 케이블이 빠지거나 맥이 잠들면 끊긴다 —
# 끊긴 동안의 근거는 아침에 batterystats --history · usagestats · logcat으로 읽는다.
# 사용: scripts/android-bg/collect.sh <출력 디렉터리> [간격초] [시리얼]
set -u
OUT="${1:?출력 디렉터리}"; INT="${2:-300}"; SER="${3:-R3CTB084WDP}"
ADB="${ADB:-$HOME/Library/Android/sdk/platform-tools/adb}"
P=com.a810labs.pocketlog
mkdir -p "$OUT"; F="$OUT/samples.log"
a() { "$ADB" -s "$SER" "$@" | tr -d '\r'; }
while true; do
  {
    echo "##### $(date '+%F %T') mac"
    echo "--- device: $(a shell "date '+%F %T'" 2>&1)"
    echo "--- battery"; a shell dumpsys battery | egrep "^  (AC|USB|wireless|level|status)" 
    echo "--- job"; a shell dumpsys jobscheduler | awk '/JOB #u0a[0-9]+\/[0-9]+: .*pocketlog/{f=1} f{print} f&&/Num Dropped/{exit}' | egrep "JOB #|Minimum latency|Satisfied|Unsatisfied|Ready|Restricted|Required constraints"
    echo "--- deviceidle"; a shell dumpsys deviceidle | egrep "mState|mLightState|mCharging|mScreenOn"
    echo "--- power"; a shell dumpsys power | egrep -m2 "mWakefulness=|mIsPowered"
    echo "--- alarm(pocketlog)"; a shell dumpsys alarm | grep "RTC_WAKEUP #.*$P}" | sed 's/.*origWhen \([0-9]*\) whenElapsed \([0-9]*\).*/origWhen=\1 whenElapsed=\2/' | head -2
    echo "--- bucket"; a shell am get-standby-bucket $P
  } >> "$F" 2>&1
  sleep "$INT"
done
