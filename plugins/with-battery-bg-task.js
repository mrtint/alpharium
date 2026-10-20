/**
 * 091 — iOS Info.plist `BGTaskSchedulerPermittedIdentifiers`에 배터리 요청의 식별자를 더한다.
 * 092 — 같은 배열에 이어 쓰기(`BGContinuedProcessingTask`)의 와일드카드를 더한다(이름은 091 그대로 둔다).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `expo-background-task` 패치(`patches/`)가 요청을 둘 낸다 — 충전 요청(090, 기존 식별자)과 배터리 요청(외부 전원 불요). iOS는 Info.plist에
 * 허용되지 않은 식별자의 등록·제출을 거부하므로(`BGTaskScheduler`가 앱을 멈춘다), expo 플러그인이 기존 식별자를 넣는 방식 그대로 하나를 더한다.
 * **`app.json` plugins에서 `expo-background-task` 뒤에 둔다** — 그 플러그인이 배열을 만든 뒤에 더한다(`bg-task-request-patch.test.ts`가 자리를 잠근다).
 *
 * 092 — 이어 쓰기는 신청마다 꼬리를 붙인 식별자(`com.a810labs.pocketlog.write.<UUID>`)를 쓴다. Info.plist에는 와일드카드 하나만 둔다
 * (`BGTaskRequest.h` — 접두는 번들 ID를 담고 `.*`로 끝난다). 처리기는 로컬 모듈이 온전한 식별자로 등록한다(`continued-write-module.test.ts`).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { withInfoPlist } = require("@expo/config-plugins");

const BATTERY_IDENTIFIER = "com.expo.modules.backgroundtask.processing.battery";
const CONTINUED_WRITE_IDENTIFIER = "com.a810labs.pocketlog.write.*";

/** 배열에 식별자를 한 번만 더한다. 배열이 없으면 만든다. */
function addIdentifier(plist, identifier) {
  const current = Array.isArray(plist.BGTaskSchedulerPermittedIdentifiers)
    ? plist.BGTaskSchedulerPermittedIdentifiers
    : [];
  return {
    ...plist,
    BGTaskSchedulerPermittedIdentifiers: current.includes(identifier)
      ? current
      : [...current, identifier],
  };
}

function addBatteryIdentifier(plist) {
  return addIdentifier(plist, BATTERY_IDENTIFIER);
}

function addContinuedWriteIdentifier(plist) {
  return addIdentifier(plist, CONTINUED_WRITE_IDENTIFIER);
}

function withBatteryBgTask(config) {
  return withInfoPlist(config, (mod) => {
    mod.modResults = addContinuedWriteIdentifier(addBatteryIdentifier(mod.modResults));
    return mod;
  });
}

module.exports = withBatteryBgTask;
module.exports.addBatteryIdentifier = addBatteryIdentifier;
module.exports.addContinuedWriteIdentifier = addContinuedWriteIdentifier;
module.exports.CONTINUED_WRITE_IDENTIFIER = CONTINUED_WRITE_IDENTIFIER;
