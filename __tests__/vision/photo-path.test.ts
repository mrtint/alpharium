/**
 * 사진의 파일 경로를 얻는다 (011 D2에서 실기기가 가르쳐 준 것).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **★ 이 파일은 실기기에서 찾은 결함을 못 박는 자리다.**
 *
 * 011을 처음 세울 때 `on-device.ts`가 `resolvePath: async (photo) => photo.id`로
 * 두고 「기기에서 확인하며 정한다」고 주석에 적었다. **그 확인이 D2였고, 틀렸다.**
 *
 * 안드로이드에서 `Photo.id`는 **`content://media/external/images/media/1000000871`**
 * 꼴의 contentUri다(`expo-media-library` 57의 `Asset` 타입 주석이 그렇게 적는다).
 * 네이티브(`llama.rn`)는 그것을 파일로 열지 못하고 **조용히 빈 캡션을 돌려준다.**
 *
 * **조용한 것이 이 결함의 성질이다**(2026-08-22 실측): 오류가 나지 않고, 일기는
 * 멀쩡히 나오고, 다섯 장이 **92밀리초 만에** 「처리」된다. 로그의 `has_media=0`과
 * 견주어야 드러난다 — 006의 `GenerationProbe`, 007의 끊긴 `stop` 배선, 009의
 * `day:` 한 줄과 **같은 종류의 실패**다.
 *
 * **「일기가 나왔다」가 「사진을 봤다」의 증거가 아니라는 quickstart D2의 경고가
 * 정확히 이것을 잡았다.**
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";

import { captionAll } from "../../src/vision/caption";
import type { Photo } from "../../src/signals/types";
import type { VisionEngine } from "../../src/vision/vision-port";

const photo = (id: string, iso: string): Photo => ({ id, takenAt: new Date(iso) });

/** 무엇을 받았는지 기록하는 대역 */
function recordingEngine() {
  const seen: string[] = [];
  const engine: VisionEngine = {
    async load() {
      return { ok: true };
    },
    async caption(path: string) {
      seen.push(path);
      return { text: `본 것: ${path}` };
    },
    async stop() {},
    async unload() {},
  };
  return { engine, seen };
}

describe("★ contentUri를 그대로 넘기지 않는다 (D2 실측)", () => {
  /**
   * **`on-device.ts`가 `photo.id`를 그대로 넘기던 것이 이 기능의 핵심 결함이었다.**
   *
   * 소스를 직접 읽어 막는다 — 007이 배운 것이며, 이런 한 줄은 타입이 잡지 못한다
   * (`string`을 넘기는 것은 어느 쪽이든 옳다).
   */
  it("resolvePath가 photo.id를 그대로 돌려주지 않는다", () => {
    const source = readFileSync("src/inference/on-device.ts", "utf8");

    // 주석은 걷어낸다 — 설명이 위반으로 잡히면 아무도 설명을 쓰지 않는다(008).
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

    expect(code).not.toMatch(/resolvePath:\s*async\s*\(photo\)\s*=>\s*photo\.id/);
  });

  /**
   * **경로를 얻지 못한 사진은 건너뛴다** — 이미 `captionAll`이 그렇게 되어 있다.
   * contentUri를 넘기던 시절에는 네이티브가 실패해 **빈 캡션**이 왔고, 그것도
   * 건너뛰어졌다. **두 갈래 모두 「본 것이 없다」로 끝나므로 값만 봐서는 구분되지
   * 않는다** — 그래서 위의 소스 검사가 필요하다.
   */
  it("경로가 null이면 그 장을 건너뛰고 나머지는 읽는다", async () => {
    const { engine, seen } = recordingEngine();

    const vision = await captionAll(
      engine,
      [photo("a", "2026-08-21T09:00:00"), photo("b", "2026-08-21T18:00:00")],
      2,
      async (p) => (p.id === "a" ? null : "/storage/emulated/0/DCIM/b.jpg"),
    );

    expect(seen).toEqual(["/storage/emulated/0/DCIM/b.jpg"]);
    // 읽으려 한 수는 둘이다 — 한 장을 못 읽은 것이 값에 남는다(FR-006)
    expect(vision?.considered).toBe(2);
    expect(vision?.captions).toHaveLength(1);
  });

  /** 넘어간 경로가 실제 파일 경로의 모양이어야 한다 */
  it("파일 경로를 받으면 그대로 엔진에 넘긴다", async () => {
    const { engine, seen } = recordingEngine();

    await captionAll(engine, [photo("x", "2026-08-21T12:00:00")], 1, async () => "/a/b/c.jpg");

    expect(seen).toEqual(["/a/b/c.jpg"]);
    expect(seen[0]).not.toMatch(/^content:\/\//);
  });
});
