/**
 * EXIF 패치 — 템플릿의 날짜·좌표만 덮어쓴다.
 *
 * 계약: specs/010-synthetic-day-fixture/contracts/seeding.md 「2단계 — EXIF 패치」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜 EXIF를 처음부터 만들지 않는가** (research.md §4, 실기기 실측):
 *
 * 규격대로 손으로 만든 EXIF를 안드로이드가 **무시한다.** 내가 짠 파서로는 정확히
 * 파싱되는데 미디어 스캐너는 `datetaken`을 NULL로 둔다. 시도한 것 전부:
 *
 *  - 1×1 JPEG + 손으로 만든 EXIF        → NULL
 *  - `ExifVersion`(0x9000) 추가          → NULL
 *  - 4032×2268 실제 크기에 이식          → NULL
 *  - **진짜 사진의 EXIF에서 날짜만 덮어씀 → 정확히 들어간다** ✅
 *
 * 그래서 **템플릿의 필드만 길이를 유지한 채 갈아끼운다.** 오프셋이 하나도 움직이지
 * 않으므로 IFD를 다시 계산할 필요가 없고, 안드로이드가 받아들이는 구조가 그대로 남는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  patchDate,
  patchLocation,
  readDate,
  readLocation,
  templatePath,
} from "../../scripts/seed/exif";

const withGps = () => readFileSync(templatePath(true));
const withoutGps = () => readFileSync(templatePath(false));

describe("EXIF 패치 — 길이가 변하지 않는다", () => {
  /**
   * **이것이 이 모듈의 가장 중요한 불변식이다.**
   *
   * 길이가 바뀌면 뒤의 모든 오프셋이 어긋나고, 그 순간 research.md §4가 보여준
   * 「안드로이드가 무시하는 EXIF」가 된다. 오류는 나지 않고 `datetaken`만 NULL이 된다.
   */
  it("날짜를 패치해도 바이트 수가 같다", () => {
    const before = withGps();
    const after = patchDate(before, new Date(2026, 7, 20, 9, 12, 0));

    expect(after.length).toBe(before.length);
  });

  it("좌표를 패치해도 바이트 수가 같다", () => {
    const before = withGps();
    const after = patchLocation(before, 37.5665, 126.978);

    expect(after.length).toBe(before.length);
  });

  it("둘 다 패치해도 바이트 수가 같다", () => {
    const before = withGps();
    const after = patchLocation(patchDate(before, new Date(2026, 7, 20, 9, 12)), 37.5665, 126.978);

    expect(after.length).toBe(before.length);
  });

  /** 원본을 건드리지 않는다 — 템플릿은 여러 번 쓰인다 */
  it("원본 버퍼를 바꾸지 않는다", () => {
    const original = withGps();
    const copy = Buffer.from(original);

    patchDate(original, new Date(2026, 7, 20, 9, 12));

    expect(original.equals(copy)).toBe(true);
  });
});

describe("EXIF 패치 — 쓴 것이 다시 읽힌다", () => {
  it("날짜가 왕복한다", () => {
    const at = new Date(2026, 7, 20, 9, 12, 34);
    const patched = patchDate(withGps(), at);

    expect(readDate(patched)?.getTime()).toBe(at.getTime());
  });

  /** 자정과 04:00 근처는 하루 경계가 걸린 자리다 — 특별히 확인한다 */
  it.each([
    ["자정 직후", new Date(2026, 7, 20, 0, 0, 1)],
    ["04:00 직전", new Date(2026, 7, 20, 3, 59, 59)],
    ["04:00 정각", new Date(2026, 7, 20, 4, 0, 0)],
    ["하루의 끝", new Date(2026, 7, 20, 23, 59, 59)],
  ])("%s도 왕복한다", (_label, at) => {
    expect(readDate(patchDate(withGps(), at))?.getTime()).toBe(at.getTime());
  });

  it("좌표가 왕복한다", () => {
    const patched = patchLocation(withGps(), 37.5665, 126.978);
    const read = readLocation(patched);

    // 도분초로 저장되므로 완전히 같지는 않다. 004의 100m 판정에 견딜 만큼이면 된다.
    expect(read).not.toBeNull();
    expect(read!.latitude).toBeCloseTo(37.5665, 4);
    expect(read!.longitude).toBeCloseTo(126.978, 4);
  });

  it("남반구·서반구 좌표도 왕복한다", () => {
    const read = readLocation(patchLocation(withGps(), -33.8688, -151.2093));

    expect(read!.latitude).toBeCloseTo(-33.8688, 4);
    expect(read!.longitude).toBeCloseTo(-151.2093, 4);
  });
});

describe("EXIF 패치 — 거부해야 하는 것", () => {
  /**
   * **`(0,0)`은 004가 「못 읽었다」로 보고 버리는 값이다**(`isUsableCoordinate`).
   *
   * 심은 좌표가 버려지면 검증이 조용히 헛돈다 — 사진은 있는데 자리가 안 잡힌다.
   * 그래서 심기 전에 막는다.
   */
  it("(0,0)을 거부한다", () => {
    expect(() => patchLocation(withGps(), 0, 0)).toThrow();
  });

  it("범위를 벗어난 좌표를 거부한다", () => {
    expect(() => patchLocation(withGps(), 91, 0)).toThrow();
    expect(() => patchLocation(withGps(), 0, 181)).toThrow();
  });

  /**
   * GPS IFD가 없는 템플릿에 좌표를 넣으려 하면 **조용히 넘어가지 않고 실패한다.**
   *
   * 넘어가면 「좌표를 심었다고 믿는데 사진에는 없는」 상태가 되고, 그것이 이 저장소가
   * 반복해서 당한 조용한 실패다.
   */
  it("GPS 자리가 없는 템플릿에 좌표를 넣으려 하면 실패한다", () => {
    expect(() => patchLocation(withoutGps(), 37.5665, 126.978)).toThrow();
  });
});

describe("템플릿 — 두 판이 다르다", () => {
  it("GPS 있는 템플릿에서는 좌표가 읽힌다", () => {
    expect(readLocation(withGps())).not.toBeNull();
  });

  it("GPS 없는 템플릿에서는 좌표가 읽히지 않는다", () => {
    expect(readLocation(withoutGps())).toBeNull();
  });

  /** 둘 다 날짜 자리는 있어야 한다 — 좌표 없는 사진도 하루에는 속한다 */
  it("둘 다 날짜 자리를 가진다", () => {
    expect(readDate(withGps())).not.toBeNull();
    expect(readDate(withoutGps())).not.toBeNull();
  });

  /**
   * **개인정보가 템플릿에 남으면 안 된다** — 저장소에 커밋되기 때문이다.
   *
   * 원본은 실기기 사진이었고 `Make=samsung`·`Model=SM-G986N`·`Software=G986NKSS8IYC2`가
   * 들어 있었다. 만들 때 덮어썼고, 그것이 유지되는지 검사한다.
   */
  it.each([
    ["GPS 있는 판", true],
    ["GPS 없는 판", false],
  ])("%s에 기기 식별 정보가 없다", (_label, gps) => {
    const raw = readFileSync(templatePath(gps)).toString("latin1");

    expect(raw).not.toContain("SM-G986N");
    expect(raw).not.toContain("samsung");
    expect(raw).not.toContain("G986NKSS");
  });
});

describe("템플릿 — 저장소에 있다", () => {
  it.each([
    ["seed-template.jpg", true],
    ["seed-template-nogps.jpg", false],
  ])("%s이 있고 JPEG이다", (name, gps) => {
    const path = templatePath(gps);

    expect(path.endsWith(name)).toBe(true);

    const buf = readFileSync(path);
    // SOI
    expect(buf[0]).toBe(0xff);
    expect(buf[1]).toBe(0xd8);
    // 첫 세그먼트가 APP1(Exif)이어야 한다 — 실기기에서 확인된 구조다
    expect(buf[2]).toBe(0xff);
    expect(buf[3]).toBe(0xe1);
    expect(buf.subarray(6, 10).toString("ascii")).toBe("Exif");
  });

  it("템플릿이 scripts/ 아래에 있다 — src/가 아니다", () => {
    // 앱의 일부가 아니다(FR-001). src/에 있으면 번들에 들어갈 수 있다.
    expect(templatePath(true)).toContain(join("scripts"));
    expect(templatePath(true)).not.toContain(join("src"));
  });
});
