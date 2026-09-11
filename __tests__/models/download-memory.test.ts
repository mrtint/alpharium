/**
 * 041 — 구간 수신이 JS 힙에 구간을 통째로 올리지 않는다.
 *
 * 계약: specs/041-model-download-oom/spec.md FR-001·FR-005·FR-006, SC-003
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜 소스를 읽는가.** 이 결함은 기기 없는 테스트가 구조적으로 못 잡는다 —
 * jest 환경의 `fetch` 대역은 `res.body`를 주므로 스트리밍 분기가 도는 것처럼
 * 보이고, 실기기(`whatwg-fetch`)에서만 `body`가 없어 `arrayBuffer()` 폴백이
 * 탄다. 즉 **대역이 실제 런타임과 다른 쪽 갈래를 검증하고 있었다.**
 * 011의 `has_media=0`, 013의 URI 계약 불일치와 같은 계열이며, 007 이후
 * 이 저장소의 관례대로 소스 선언을 직접 읽어 잠근다.
 *
 * 여기서 잠그는 것은 "어떤 API를 쓰지 않는가"다 — 응답 전체를 한 값으로
 * 물질화하는 API(`arrayBuffer`·`blob`·`text`)가 수신 경로에 없으면, 바이트가
 * JS 힙에 구간 단위로 쌓일 자리 자체가 없다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

/** 주석을 걷어낸 소스. 규칙을 **설명하는 것**과 **코드로 쓰는 것**은 다르다(011 선례). */
const PORT_SOURCE = readFileSync(join(__dirname, "../../src/models/expo-port.ts"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

/** `fetchRange` 본문만 떼어 본다 — 구간 수신 경로가 이 함수다. */
function fetchRangeBody(): string {
  const start = PORT_SOURCE.indexOf("async fetchRange(");
  expect(start).toBeGreaterThan(-1);
  // 다음 최상위 멤버(`}` + `;`로 닫히는 return 객체)까지. 넉넉히 잘라도
  // 아래 검사는 "없어야 할 것"을 보므로 과잉 포착이 안전한 방향이다.
  const end = PORT_SOURCE.indexOf("export function expoDownloadPort", start);
  return PORT_SOURCE.slice(start, end === -1 ? undefined : end);
}

describe("FR-001 — 구간 전체를 메모리에 담지 않는다", () => {
  it("수신 경로가 응답을 통째로 물질화하는 API를 부르지 않는다", () => {
    const body = fetchRangeBody();
    // 이 셋 중 하나라도 부르면 구간(약 380MB)이 통째로 JS 힙에 올라온다 —
    // 관측된 힙 한계는 268MB였고 4구간이 동시에 이것을 시도했다.
    expect(body).not.toMatch(/\.arrayBuffer\s*\(/);
    expect(body).not.toMatch(/\.blob\s*\(/);
    expect(body).not.toMatch(/\bres\.text\s*\(/);
  });

  it("전역 fetch로 본문을 받지 않는다 — RN의 fetch는 스트림을 주지 않는다", () => {
    const body = fetchRangeBody();
    /*
     * React Native 0.86의 전역 `fetch`는 `whatwg-fetch` 폴리필이고, 그 `Body`에는
     * `body` 속성이 아예 없다(XHR 기반이라 `ReadableStream`이 없다). 따라서
     * `res.body`를 읽는 코드는 실기기에서 **언제나** null 분기를 탄다 —
     * 스트리밍처럼 보이는 코드가 실제로는 버퍼링 폴백이었다.
     */
    expect(body).not.toMatch(/\bres\.body\b/);
    expect(body).not.toMatch(/getReader\s*\(/);
  });

  it("네이티브 DownloadTask로 구간을 받는다(바이트가 JS를 거치지 않는다)", () => {
    const body = fetchRangeBody();
    expect(body).toMatch(/DownloadTask/);
    // 구간 요청은 Range 헤더로 네이티브에 넘긴다.
    expect(body).toMatch(/Range:/);
  });
});

describe("FR-005 — 임시 산출물을 남기지 않는다", () => {
  it("구간 임시 파일을 정리하는 finally가 있다", () => {
    const body = fetchRangeBody();
    expect(body).toMatch(/finally\s*\{/);
    // 성공·실패·취소 어느 경로에서도 지운다.
    expect(body).toMatch(/delete\s*\(\)/);
  });
});

describe("FR-006 — 속도를 재지 않는다 (원칙 IV)", () => {
  it("수신 경로에 속도·처리량 어휘가 없다", () => {
    const body = fetchRangeBody();
    expect(body).not.toMatch(
      /\b(?:elapsed|bytesPerSecond|throughput|speed|Mbps|kbps|transferRate|downloadSpeed)\b/,
    );
  });
});

describe("FR-002 — 계약과 순수 코어는 그대로다", () => {
  it("port.ts의 fetchRange 시그니처가 유지된다", () => {
    const port = readFileSync(join(__dirname, "../../src/models/port.ts"), "utf8");
    expect(port).toMatch(/fetchRange\(/);
    expect(port).toMatch(/onBytes:\s*\(delta:\s*number\)\s*=>\s*void/);
    expect(port).toMatch(/signal\?:\s*AbortSignal/);
  });

  it("세그먼트 순수 코어가 기기 통로를 import하지 않는다", () => {
    for (const name of ["plan.ts", "transfer.ts", "types.ts"]) {
      const code = readFileSync(join(__dirname, "../../src/models/segmented", name), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      expect(code).not.toMatch(/expo-file-system/);
      expect(code).not.toMatch(/DownloadTask/);
    }
  });
});
