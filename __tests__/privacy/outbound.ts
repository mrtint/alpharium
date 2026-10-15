/**
 * 086 — 방침이 기대는 사실의 표 (data-model.md §3).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **제품이 읽지 않는 검증 자료다** — `src/`에 두면 이유 문장의 한글이 062 화면 문구 검사에 걸리고 번들에 실린다
 * (research R4). 테스트 셋이 이 표 하나를 본다:
 *
 * - `site-pages.test.ts` S5 — `OUTBOUND`의 식별자마다 방침(`site/privacy/index.html`)에 `data-outbound` 절이 정확히 하나
 * - `policy-facts.test.ts` F1~F6 — 금지 SDK·외부 주소·지오코딩 통로
 *
 * **범위**: 이 표와 테스트는 **소스에서 보이는 것만** 잠근다. 네이티브 라이브러리가 스스로 하는 통신, OS 백업, OS 지오코더
 * 뒤의 서버는 보지 못한다. 표를 고치면 방침(`site/privacy/index.html`)과 선언 초안(`docs/store/privacy-declarations.md`)을
 * 함께 고친다 — 순서는 방침 → 선언 초안 → 이 표.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type OutboundEntry = {
  /** 방침의 `data-outbound` 값과 같다 */
  id: string;
  /** 무엇이 어디로 가는가 */
  what: string;
  /** 근거 자리 — 코드 경로(저장소 기준, 파일이 있어야 한다 — F6) 또는 플랫폼 문서 */
  evidence: { kind: "code"; paths: readonly string[] } | { kind: "platform"; note: string };
};

export const OUTBOUND: readonly OutboundEntry[] = [
  {
    id: "model-download",
    what: "모듈 내려받기 — Hugging Face 서버가 일반 웹 요청 정보(IP 주소 등)를 받는다",
    evidence: { kind: "code", paths: ["src/models/roster.ts", "src/vision/roster.ts"] },
  },
  {
    id: "place-name",
    what: "일기 한 편당 대표 좌표 하나 → 운영체제의 지도 서비스(iOS는 Apple, 안드로이드는 기기의 지오코더 제공자)",
    evidence: { kind: "code", paths: ["src/signals/geocoding-port.ts"] },
  },
  {
    id: "os-diagnostics",
    what: "운영체제의 진단 보고 — 사용자 설정에 따라 Apple·Google이 모은다. 앱이 보내지 않는다",
    evidence: {
      kind: "platform",
      note: "앱 코드 없음 — Xcode Organizer·Play Console vitals(설계 §1.3)",
    },
  },
];

export type AllowedHost = { host: string; reason: string };

/** 앱 소스(`src/`·`App.tsx`)에 상수로 나와도 되는 외부 호스트 (F3·F5) */
export const ALLOWED_HOSTS: readonly AllowedHost[] = [
  { host: "huggingface.co", reason: "모듈 내려받기(model-download)" },
  {
    host: "mrtint.github.io",
    reason: "방침·지원 페이지 — 앱이 접속하지 않고 OS 브라우저에 넘긴다(src/app/policy-links.ts)",
  },
];

/** 외부 주소 검사에서 빼는 파일 — 저장소 기준 경로와 이유 */
export const URL_SCAN_EXCLUDED: readonly { path: string; reason: string }[] = [
  {
    path: "src/ui/pretendard-license.ts",
    reason: "OFL 1.1 원문 문자열(083) — 화면에 보이는 글이고 앱이 접속하지 않는다",
  },
];

/**
 * 앱에 실리는 의존성(`package.json` `dependencies`)에 있으면 안 되는 SDK — 정확한 이름, 또는 `/`로 끝나면 접두사.
 * 분석·크래시·광고·원격 푸시 서비스·원격 업데이트. `expo-notifications`는 로컬 알림에만 쓰므로 목록에 없고,
 * 원격 푸시는 F2(푸시 토큰 호출 0)가 막는다. D2(2026-10-15) — 크래시 SDK를 넣지 않는다.
 */
export const FORBIDDEN_SDKS: readonly string[] = [
  "@sentry/",
  "sentry-expo",
  "@react-native-firebase/",
  "firebase",
  "@bugsnag/",
  "@datadog/",
  "@amplitude/",
  "mixpanel-react-native",
  "@segment/",
  "react-native-appsflyer",
  "react-native-adjust",
  "react-native-branch",
  "react-native-onesignal",
  "react-native-google-mobile-ads",
  "expo-ads-admob",
  "expo-firebase-analytics",
  "expo-insights",
  "expo-updates",
];

/** 실패 메시지의 꼬리 — 무엇을 함께 고쳐야 하는가 */
export const FIX_POLICY =
  "방침(site/privacy/index.html)과 선언 초안(docs/store/privacy-declarations.md)을 함께 고쳐라 — 그다음 __tests__/privacy/outbound.ts";
