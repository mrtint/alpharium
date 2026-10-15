/**
 * 기기 브라우저로 주소를 여는 통로 (086).
 *
 * 계약: specs/086-privacy-policy/contracts/settings-rows.md B1~B3
 *       research.md R5
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 설정 「정보」의 「개인정보처리방침」·「도움말·문의」가 쓴다. 열었으면 `true`, 열지 못했으면 `false` — 예외를 던지지 않는다
 * (화면은 그 행 아래 한 줄로 알린다, FR-014).
 *
 * **★ `react-native`를 `await import`하지 않는다 — 호출 시점 `require`다**(066). 동적 import는 Metro가 index의 모든
 * export getter를 훑고 iOS에서 `PushNotificationIOS` getter가 던져 앱이 죽는다(`os-settings-port.ts`와 같은 까닭).
 *
 * **`canOpenURL`을 부르지 않는다** — 안드로이드 11+는 매니페스트에 `<queries>`가 없으면 열 수 있는 주소에도 거짓을 줄 수
 * 있다. 매니페스트를 건드리지 않으려 `openURL`의 거부만 본다(처리할 앱이 없으면 RN이 거부한다).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export async function openInBrowser(url: string): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Linking } = require("react-native") as {
      Linking: { openURL(url: string): Promise<unknown> };
    };
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
