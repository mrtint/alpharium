/**
 * 되돌리기 — **전용 폴더 밖에 닿지 않는다** (FR-012·016a).
 *
 * 계약: specs/010-synthetic-day-fixture/contracts/seeding.md 「되돌리기의 단계」
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **개발자의 개인 기기에서 돌아야 한다.**
 *
 * 「지울 것을 고르는 판단」이 틀려도 진짜 사진에 닿을 길이 없어야 한다. 그래서 방어를
 * 두 겹으로 둔다:
 *
 *  1. `removeSeedFolder()`가 **인자를 받지 않는다** — 지울 자리가 하나뿐이면 밖으로
 *     나가는 것이 애초에 불가능하다. 조심해서 안 하는 것이 아니라 **할 수 없는 것**이다
 *  2. 하루별로 지울 때는 경로를 우리가 만들고, 파일명에 `/`나 `..`가 있으면 건너뛴다
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { SEED_FOLDER } from "../../scripts/seed/device";

const sourceOf = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), "utf8");

/** 주석을 걷어낸다 — 설명이 위반으로 잡히면 아무도 설명을 쓰지 않는다(008의 교훈) */
function codeOnly(source: string): string {
  return source
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/.*$/, ""))
    .filter((line) => !/^\s*\*/.test(line) && !/^\s*\/\*/.test(line))
    .join("\n");
}

describe("심은 자리가 안전한 곳이다", () => {
  it("Pictures/ 아래다 — 미디어 스캐너가 훑고 앨범으로 보인다", () => {
    expect(SEED_FOLDER.startsWith("/sdcard/Pictures/")).toBe(true);
  });

  /**
   * **`DCIM/Camera/`는 사용자의 진짜 사진 자리다.** 거기 두면 섞이고, 그러면
   * 「폴더 안의 것만 지운다」가 위험해진다.
   */
  it("DCIM/Camera가 아니다", () => {
    expect(SEED_FOLDER).not.toContain("DCIM");
  });

  it("전용 폴더 이름이 있다 — Pictures/ 바로 아래가 아니다", () => {
    expect(SEED_FOLDER.replace("/sdcard/Pictures/", "").length).toBeGreaterThan(0);
  });
});

describe("폴더 밖으로 나갈 수 없다 (FR-016a)", () => {
  const deviceSource = codeOnly(sourceOf("scripts", "seed", "device.ts"));
  const clearSource = codeOnly(sourceOf("scripts", "seed-clear.mts"));

  /**
   * **`removeSeedFolder()`가 인자를 받지 않는 것이 방어다.**
   *
   * 받으면 부르는 쪽이 무엇이든 넘길 수 있고, 그 순간 「폴더 밖을 지운다」가 가능해진다.
   * 자리가 없으면 담을 수 없다 — 007의 `ActivityIndicator`와 같은 종류의 방어다.
   */
  it("폴더째 지우는 함수가 인자를 받지 않는다", () => {
    expect(deviceSource).toMatch(/export function removeSeedFolder\(\s*\)/);
  });

  it("폴더째 지우기가 SEED_FOLDER만 쓴다", () => {
    const body = deviceSource.slice(deviceSource.indexOf("export function removeSeedFolder"));
    const upToNext = body.slice(0, body.indexOf("export function", 10));

    expect(upToNext).toContain("SEED_FOLDER");
    // 다른 경로 문자열이 섞이면 안 된다
    expect(upToNext).not.toMatch(/["'`]\/sdcard\/(?!Pictures)/);
  });

  /** 되돌리기가 `rm -rf`를 스스로 만들지 않는다 — device 계층을 거친다 */
  it("seed-clear가 rm 명령을 직접 만들지 않는다", () => {
    expect(clearSource).not.toMatch(/rm\s+-rf/);
    expect(clearSource).not.toMatch(/spawnSync/);
  });

  /**
   * 하루별로 지울 때 **파일명이 폴더를 벗어나게 하는 것**을 막는다.
   * `../../DCIM/Camera/x.jpg` 같은 이름이 들어오면 건너뛴다.
   */
  it("경로를 벗어나는 파일명을 걸러낸다", () => {
    expect(clearSource).toMatch(/includes\(["']\.\.["']\)/);
    expect(clearSource).toMatch(/includes\(["']\/["']\)/);
  });
});

describe("치운 뒤 볼륨 스캔을 반드시 돈다", () => {
  const clearSource = codeOnly(sourceOf("scripts", "seed-clear.mts"));

  /**
   * **★ 빠뜨리면 MediaStore에 유령 행이 남는다**(research.md §5 실측).
   *
   * ```
   * rm -rf /sdcard/Pictures/AlphariumProbe
   * content call ... scan_volume
   * → 이후 질의: No result found.   ✅
   * ```
   *
   * 스캔을 안 하면 파일은 없는데 앱은 계속 그 사진을 보고, **다음 검증이 유령 위에서
   * 돈다.**
   */
  it("scanVolume을 부른다", () => {
    expect(clearSource).toContain("scanVolume");
  });

  it("유령 행이 남았는지 확인한다", () => {
    expect(clearSource).toContain("queryFolder");
  });

  it("유령이 남으면 실패로 끝낸다", () => {
    expect(clearSource).toMatch(/ghosts\s*>\s*0/);
  });
});

describe("지우지 못한 것을 조용히 넘기지 않는다 (FR-012b)", () => {
  const clearSource = codeOnly(sourceOf("scripts", "seed-clear.mts"));

  it("실패한 수를 센다", () => {
    expect(clearSource).toMatch(/failed\+\+|failed\s*=/);
  });

  it("실패가 있으면 ok: false다", () => {
    expect(clearSource).toMatch(/failed\s*>\s*0/);
    expect(clearSource).toContain("remove-failed");
  });
});

describe("지울 것이 없어도 오류가 아니다", () => {
  const clearSource = codeOnly(sourceOf("scripts", "seed-clear.mts"));

  it("0장을 지운 것을 성공으로 돌려준다", () => {
    expect(clearSource).toMatch(/removed:\s*0/);
    expect(clearSource).toContain("EXIT_OK");
  });
});

describe("자동으로 치우지 않는다 (FR-011a, 명확화 Q4)", () => {
  /**
   * **★ 심은 하루는 검증의 대상이지 부산물이 아니다.**
   *
   * `seed-day.mts`가 끝나면서 치우면 사람이 그 화면을 눈으로 볼 수 없고, 여러
   * 캐릭터로 같은 하루를 써 보는 것도 불가능해진다 — **검증이 한 번으로 끝난다.**
   */
  it("seed-day가 치우기를 부르지 않는다", () => {
    const daySource = codeOnly(sourceOf("scripts", "seed-day.mts"));

    expect(daySource).not.toContain("removeSeedFolder");
    expect(daySource).not.toContain("seed-clear");
    expect(daySource).not.toContain("forgetSeeding");
  });

  /**
   * 다만 **실패했을 때는 이번에 넣은 것을 치운다**(FR-019) — 절반만 심긴 상태를
   * 남기지 않는다. 그것은 「자동으로 치우기」가 아니라 「실패를 되돌리기」다.
   */
  it("실패하면 이번에 넣은 것만 치운다", () => {
    const daySource = codeOnly(sourceOf("scripts", "seed-day.mts"));

    expect(daySource).toContain("cleanup(pushed)");
    expect(daySource).toContain("removeFile");
  });
});

describe("목록은 기기를 세어 답한다 (FR-011c)", () => {
  const listSource = codeOnly(sourceOf("scripts", "seed-list.mts"));

  /**
   * **기록이 아니라 폴더가 경계다**(data-model.md). 기록만 읽으면 어긋난 것을 못 본다 —
   * 기기를 초기화했거나 사람이 손으로 지웠을 때.
   */
  it("기기의 폴더를 읽는다", () => {
    expect(listSource).toContain("listSeedFolder");
  });

  it("개수를 기록에서 가져오지 않는다", () => {
    // 기록은 「어느 모양이었나」에만 쓴다. 개수는 기기가 답한다.
    const countPart = listSource.slice(listSource.indexOf("const counts"));
    expect(countPart.slice(0, countPart.indexOf("const ledger"))).not.toContain("ledger");
  });
});
