/**
 * 091 — iOS Info.plist `BGTaskSchedulerPermittedIdentifiers`에 배터리 요청의 식별자를 더한다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `expo-background-task` 패치(`patches/`)가 요청을 둘 낸다 — 충전 요청(090, 기존 식별자)과 배터리 요청(외부 전원 불요). iOS는 Info.plist에
 * 허용되지 않은 식별자의 등록·제출을 거부하므로(`BGTaskScheduler`가 앱을 멈춘다), expo 플러그인이 기존 식별자를 넣는 방식 그대로 하나를 더한다.
 * **`app.json` plugins에서 `expo-background-task` 뒤에 둔다** — 그 플러그인이 배열을 만든 뒤에 더한다(`bg-task-request-patch.test.ts`가 자리를 잠근다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { withInfoPlist } = require("@expo/config-plugins");

const BATTERY_IDENTIFIER = "com.expo.modules.backgroundtask.processing.battery";

/** 배열에 배터리 식별자를 한 번만 더한다. 배열이 없으면 만든다. */
function addBatteryIdentifier(plist) {
  const current = Array.isArray(plist.BGTaskSchedulerPermittedIdentifiers)
    ? plist.BGTaskSchedulerPermittedIdentifiers
    : [];
  return {
    ...plist,
    BGTaskSchedulerPermittedIdentifiers: current.includes(BATTERY_IDENTIFIER)
      ? current
      : [...current, BATTERY_IDENTIFIER],
  };
}

function withBatteryBgTask(config) {
  return withInfoPlist(config, (mod) => {
    mod.modResults = addBatteryIdentifier(mod.modResults);
    return mod;
  });
}

module.exports = withBatteryBgTask;
module.exports.addBatteryIdentifier = addBatteryIdentifier;
