/**
 * 고른 캐릭터의 영속화.
 *
 * 계약: specs/007-diary-ui-refinement/contracts/selection.md §2
 *
 * **통로를 주입받으므로 기기 없이 돈다** — 002의 `FileSystemPort`, 003의
 * `MetadataPort`와 같은 구조다. 기기가 필요한 것은 「앱을 껐다 켜도 남는가」(표 6번)
 * 하나뿐이며 그것은 Maestro가 본다.
 */

import { loadSelection, saveSelection, type SelectionPort } from "../../src/app/selection-store";

/** 메모리 대역 통로. 실제 파일 대신 문자열 하나를 들고 있는다. */
function fakePort(initial: string | null = null): SelectionPort & { stored: string | null } {
  return {
    stored: initial,
    async read() {
      return this.stored;
    },
    async write(serialized: string) {
      this.stored = serialized;
    },
  };
}

describe("selection-store (007 contracts/selection.md §2 검증 표)", () => {
  it("1. 저장한 뒤 조회하면 같은 캐릭터가 나온다(FR-003)", async () => {
    const port = fakePort();

    await saveSelection(port, "narrative");

    expect(await loadSelection(port)).toBe("narrative");
  });

  it("2. 저장한 적이 없으면 null이다(FR-008)", async () => {
    // **자동으로 하나 고르지 않는다.** 「없다」가 정직한 답이다.
    expect(await loadSelection(fakePort(null))).toBeNull();
  });

  it("3. 파일 내용이 깨졌으면 null이다 — 예외를 던지지 않는다(원칙 V)", async () => {
    // 앱이 뜨지 못하게 만들지 않는다. 사용자가 다시 고르면 된다.
    expect(await loadSelection(fakePort("{ 이것은 JSON이 아니다"))).toBeNull();
  });

  it("4. 로스터 밖 이름이 들어 있으면 null이다(원칙 V)", async () => {
    // ─────────────────────────────────────────────────────────────────────────
    // **지어내지 않는다.** 파일에 무엇이 있든 로스터에 없는 것은 캐릭터가 아니다.
    // 그대로 통과시키면 준비 판정·프롬프트가 알 수 없는 값을 받게 된다.
    // ─────────────────────────────────────────────────────────────────────────
    expect(await loadSelection(fakePort('{"character":"gpt-9"}'))).toBeNull();
  });

  it("5. 통로가 예외를 던져도 null이다 — 화면이 무너지지 않는다", async () => {
    const broken: SelectionPort = {
      read: () => Promise.reject(new Error("파일 통로가 없다")),
      write: () => Promise.resolve(),
    };

    expect(await loadSelection(broken)).toBeNull();
  });

  it("7. 덮어 저장하면 마지막 값이 나온다(FR-001)", async () => {
    const port = fakePort();

    await saveSelection(port, "quiet");
    await saveSelection(port, "english");

    expect(await loadSelection(port)).toBe("english");
  });

  it("다섯 캐릭터 전부가 왕복한다", async () => {
    for (const character of ["quiet", "narrative", "imaginative", "chinese", "english"] as const) {
      const port = fakePort();
      await saveSelection(port, character);
      expect(await loadSelection(port)).toBe(character);
    }
  });

  /**
   * **모델 정보를 담지 않는다**(원칙 III).
   *
   * 저장 형식에 파일 이름·자산 키·바이트가 들어가면 그것이 새는 경로가 된다.
   * data-model.md §1이 필드를 하나로 둔 이유다.
   */
  it("저장된 내용에 캐릭터 말고 아무것도 없다(원칙 III)", async () => {
    const port = fakePort();

    await saveSelection(port, "quiet");

    const parsed = JSON.parse(port.stored ?? "{}");
    expect(Object.keys(parsed)).toEqual(["character"]);
  });
});
