/**
 * 066 — iOS 푸시 entitlement(`aps-environment`)를 걷는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `expo-notifications`의 config plugin이 원격 푸시용 `aps-environment`를 entitlements에
 * 넣는다. 이 앱은 완성 알림을 기기 안에서만 예약한다(로컬 알림, `src/schedule/notification-port.ts`) —
 * 서버도 푸시 토큰도 없다. 그런데 배포 프로파일(`Pocketlog App Store`, 개인 계정이 만들어
 * 준 것)에 Push Notifications 기능이 없어, 그 키가 남아 있으면 아카이브가 서명 단계에서
 * 실패한다(`Provisioning profile … doesn't include the aps-environment entitlement`,
 * 2026-10-08 실측). 프로파일에 기능을 더하는 대신 쓰지 않는 키를 걷는다 — 065가
 * `blockedPermissions`로 안드로이드 권한을 걷은 것과 같은 판단이다.
 *
 * **`app.json` plugins의 맨 마지막에 둔다** — 넣는 플러그인 뒤에서 돌아야 걷힌다
 * (`__tests__/plugins/no-push-entitlement.test.ts`가 자리를 잠근다). `ios/`는 생성물이라
 * `Pocketlog.entitlements`를 직접 고치지 않는다(`prebuild --clean`에 지워진다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { withEntitlementsPlist } = require("@expo/config-plugins");

const PUSH_ENTITLEMENT = "aps-environment";

/** entitlements에서 푸시 키만 뺀다. 없으면 그대로다. */
function removePushEntitlement(entitlements) {
  const next = { ...entitlements };
  delete next[PUSH_ENTITLEMENT];
  return next;
}

/**
 * @param {object} config
 */
module.exports = function withNoPushEntitlement(config) {
  return withEntitlementsPlist(config, (entitlementsConfig) => {
    entitlementsConfig.modResults = removePushEntitlement(entitlementsConfig.modResults);
    return entitlementsConfig;
  });
};

module.exports.removePushEntitlement = removePushEntitlement;
module.exports.PUSH_ENTITLEMENT = PUSH_ENTITLEMENT;
