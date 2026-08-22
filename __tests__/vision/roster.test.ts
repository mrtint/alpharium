import { readFileSync } from "node:fs";
import { join } from "node:path";

import { visionAssets } from "../../src/vision/roster";

/**
 * 사진 보는 모델 출처의 계약 테스트.
 *
 * 계약: specs/011-photo-vision-summary/research.md §6
 *       specs/011-photo-vision-summary/data-model.md
 *
 * 003의 `roster.test.ts`와 같은 구조다. 다른 점은 **캐릭터를 받지 않는다**는 것이며,
 * 그것이 이 기능의 핵심 설계다.
 */

const SOURCE = readFileSync(join(__dirname, "../../src/vision/roster.ts"), "utf8");
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("visionAssets — 캐릭터와 무관한 하나다 (FR-025)", () => {
  it("인자를 받지 않는다 — 캐릭터마다 다른 모델을 줄 수 없다", () => {
    expect(visionAssets.length).toBe(0);
  });

  // 위 `length` 검사만으로는 부족하다 — 009가 배운 것이다.
  // `visionAssets(character?)`처럼 기본값을 두면 `length`가 여전히 0이다.
  it("선언에 인자가 없다 — 기본값 인자로 우회하지 못한다", () => {
    const declaration = CODE.match(/export function visionAssets\([^)]*\)/);
    expect(declaration).not.toBeNull();
    expect(declaration?.[0]).toBe("export function visionAssets()");
  });

  it("본체와 mmproj 둘을 준다", () => {
    const assets = visionAssets();
    expect(Object.keys(assets).sort()).toEqual(["base", "projector"]);
  });
});

describe("자산의 값 — 실측이며 짐작이 아니다 (원칙 V)", () => {
  const assets = visionAssets();

  it("본체와 mmproj의 주소가 다르다", () => {
    expect(assets.base.url).not.toBe(assets.projector.url);
  });

  /**
   * ⚠️ 옆 저장소가 2026-08-10에 확인한 함정이며, 2026-08-22에 다시 확인했다.
   *
   * 본체는 `450M`, mmproj는 `450m`이다. **대문자 URL은 404다.**
   * 놓치면 「내려받기가 안 된다」로 나타나고 원인이 URL이라는 것을 알기 어렵다.
   */
  it("mmproj 주소가 소문자 450m이다 — 대문자는 404다", () => {
    expect(assets.projector.url).toContain("mmproj-LFM2.5-VL-450m-Q8_0.gguf");
    expect(assets.projector.url).not.toContain("450M-Q8_0.gguf");
  });

  it("본체 주소는 대문자 450M이다", () => {
    expect(assets.base.url).toContain("LFM2.5-VL-450M-Q8_0.gguf");
  });

  it("크기가 실제 Content-Length다 (2026-08-22 실측)", () => {
    expect(assets.base.expectedBytes).toBe(379_219_104);
    expect(assets.projector.expectedBytes).toBe(102_815_168);
  });

  it("파일 이름이 되는 key가 서로 다르고 모델을 드러내지 않는다 (원칙 III)", () => {
    expect(assets.base.key).not.toBe(assets.projector.key);
    for (const asset of [assets.base, assets.projector]) {
      expect(asset.key).not.toMatch(/lfm|vl|mmproj|gguf|vision/i);
    }
  });
});

/**
 * ★ 003의 R3과 같은 구조다.
 *
 * **빈 md5는 실패가 아니라 「아직 재지 않았다」를 드러내는 장치다.** 통과시키려고
 * 그럴듯한 문자열을 넣는 순간 헌법 원칙 V가 깨진다 — 미리 적는 지문은 어디서 왔든
 * 짐작이다.
 *
 * quickstart D1이 첫 내려받기에서 채록하며, 그때 이 테스트를 뒤집는다.
 */
describe("md5 — 아직 채록되지 않았다 (원칙 V)", () => {
  const assets = visionAssets();

  it("아직 비어 있다 — 첫 내려받기에서 채록한다 (FR-031)", () => {
    expect(assets.base.md5).toBe("");
    expect(assets.projector.md5).toBe("");
  });

  it("지어낸 지문이 들어 있지 않다", () => {
    for (const asset of [assets.base, assets.projector]) {
      // 32자 hex는 md5의 모양이다. 비어 있거나 진짜 채록값이어야 한다.
      if (asset.md5 !== "") {
        expect(asset.md5).toMatch(/^[0-9a-f]{32}$/);
      }
    }
  });
});

/**
 * ★ 원칙 III — 두 로스터가 섞이지 않는다.
 *
 * 합치면 「캐릭터가 사진을 본다」는 잘못된 모양이 코드에 생기고, 003이 지킨
 * 「캐릭터 → 자산은 있고 자산 → 캐릭터는 없다」의 한 방향성이 흐려진다.
 */
describe("003의 캐릭터 로스터와 섞이지 않는다 (원칙 III)", () => {
  it("models/roster를 import 하지 않는다", () => {
    expect(CODE).not.toMatch(/from\s+["'][^"']*models\/roster["']/);
  });

  it("Character 타입에 닿지 않는다 — 캐릭터를 모른다", () => {
    expect(CODE).not.toMatch(/\bCharacter\b/);
    expect(CODE).not.toMatch(/from\s+["'][^"']*diary\/types["']/);
  });

  it("캐릭터별 자산을 담는 자리가 없다", () => {
    expect(CODE).not.toMatch(/quiet|narrative|imaginative|chinese|english/);
  });
});
