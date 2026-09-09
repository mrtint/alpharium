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
import { FUTURE_CHARACTER } from "../future-character";
import { CHARACTERS } from "../../src/diary/types";

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

    await saveSelection(port, FUTURE_CHARACTER);

    expect(await loadSelection(port)).toBe(null); // 037 — 로스터 밖은 null (C3)
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
    await saveSelection(port, "quiet");

    expect(await loadSelection(port)).toBe("quiet");
  });

  it("로스터의 캐릭터 전부가 왕복한다", async () => {
    for (const character of CHARACTERS) {
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

/**
 * 037 계약 C3 — 로스터 밖 값을 만나면 지어내지 않는다 (FR-009).
 *
 * 계약: specs/037-roster-verified-only/contracts/roster-entry.md
 *
 * **코드 변경 없이 통과해야 한다**(research R2). `isCharacter()`가 `CHARACTERS`로
 * 검사하므로 로스터가 줄면 옛 값이 자동으로 `null`이 된다 — 통과하지 않으면 R2의
 * 판단이 틀린 것이므로 그때는 기록하고 고친다.
 */
describe("037 C3 — 로스터 밖 캐릭터가 저장돼 있을 때", () => {
  it("C3 — loadSelection()이 null을 준다 (마이그레이션 코드 없이)", async () => {
    const port = fakePort();
    port.stored = JSON.stringify({ character: "imaginative" });

    expect(await loadSelection(port)).toBe(null);
  });

  it("C3 — 그래서 '고른 적 없음'과 같은 자리로 간다 (캐릭터를 지어내지 않는다)", async () => {
    const port = fakePort();
    port.stored = JSON.stringify({ character: "chinese" });

    const loaded = await loadSelection(port);
    expect(loaded).toBe(null);
    // 007 `resolveSelection`이 null을 "고른 적 없음"으로 다룬다 — 그 갈래는
    // selection.test.ts가 검사한다. 여기서는 **값이 새지 않는 것**만 본다.
    expect(loaded).not.toBe("chinese");
  });
});
