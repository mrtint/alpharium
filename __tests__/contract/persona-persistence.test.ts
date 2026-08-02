/**
 * T009 ⚖️ 원칙 IV — 퍼소나 지속성
 *
 * - 001 SC-005: 기기 식별자가 달라져도 이름·성격이 동일하다
 * - 005 FR-404: 저장된 것에 기기 식별자가 없다
 * - 001 FR-007: 부여 후 조회 시 활성 퍼소나가 정확히 하나다
 * - 001 FR-006 / 002 FR-142: 관측 환경·이름 변경 이력을 담을 자리가 없다
 */
import { assignPersona } from "../../src/persona/assign";
import { createPersona } from "../../src/persona/persona";
import { TRAIT_CATALOG, resolveTrait } from "../../src/persona/catalog";
import { PersonaStore } from "../../src/storage/persona-store";
import { InMemoryKeyValueStore } from "../../src/storage/kv";

const anyTraitId = () => TRAIT_CATALOG[0].id;

describe("퍼소나 엔티티", () => {
  it("이름과 성격 식별자만 보유한다", () => {
    const persona = createPersona({ name: "네모", traitId: anyTraitId() });
    expect(Object.keys(persona).sort()).toEqual(["name", "traitId"]);
  });

  it("이름은 1~20자다", () => {
    expect(() => createPersona({ name: "", traitId: anyTraitId() })).toThrow();
    expect(() => createPersona({ name: "가".repeat(21), traitId: anyTraitId() })).toThrow();
    expect(createPersona({ name: "가".repeat(20), traitId: anyTraitId() }).name).toHaveLength(20);
  });

  it("카탈로그에 없는 성격 식별자를 거부한다", () => {
    expect(() => createPersona({ name: "네모", traitId: "없는-성격" })).toThrow();
  });

  it("성격의 표시명·서술은 저장하지 않고 카탈로그에서 해소한다 (005)", () => {
    const persona = createPersona({ name: "네모", traitId: anyTraitId() });
    expect(persona).not.toHaveProperty("traitLabel");
    expect(persona).not.toHaveProperty("traitDescription");

    const trait = resolveTrait(persona.traitId);
    expect(trait.label).toBeTruthy();
    expect(trait.description).toBeTruthy();
  });
});

describe("퍼소나 최초 부여 (001 FR-002, 002 FR-140)", () => {
  it("앱이 이름과 성격을 부여한다 — 사용자가 고르지 않는다", () => {
    const persona = assignPersona();
    expect(persona.name.length).toBeGreaterThanOrEqual(1);
    expect(persona.name.length).toBeLessThanOrEqual(20);
    expect(TRAIT_CATALOG.map((t) => t.id)).toContain(persona.traitId);
  });

  it("부여된 퍼소나는 이름과 성격 식별자만 갖는다", () => {
    expect(Object.keys(assignPersona()).sort()).toEqual(["name", "traitId"]);
  });
});

describe("퍼소나 저장·조회", () => {
  let store: PersonaStore;

  beforeEach(() => {
    store = new PersonaStore(new InMemoryKeyValueStore());
  });

  it("부여 후 조회하면 활성 퍼소나가 정확히 하나다 (001 FR-007)", async () => {
    expect(await store.loadActive()).toBeNull();

    await store.saveActive(assignPersona());
    await store.saveActive(assignPersona());

    expect(await store.countActive()).toBe(1);
    expect(await store.loadActive()).not.toBeNull();
  });

  it("저장된 것에 기기 식별자가 없다 (005 FR-404)", async () => {
    const persona = createPersona({ name: "네모", traitId: anyTraitId() });
    await store.saveActive(persona);

    const raw = JSON.stringify(await store.dumpRaw());
    expect(raw).not.toMatch(/device|기기|installationId|androidId|deviceId/i);
  });

  it("저장된 것에 관측 환경·이름 변경 이력의 자리가 없다 (001 FR-006, 002 FR-142)", async () => {
    await store.saveActive(createPersona({ name: "네모", traitId: anyTraitId() }));
    const loaded = await store.loadActive();

    expect(Object.keys(loaded!).sort()).toEqual(["name", "traitId"]);
  });

  it("기기 식별자가 달라져도 이름·성격이 동일하다 (001 SC-005)", async () => {
    const kv = new InMemoryKeyValueStore();
    const original = createPersona({ name: "네모", traitId: anyTraitId() });
    await new PersonaStore(kv).saveActive(original);

    // 기기 교체 — 저장된 내용만 옮겨 오고, 새 기기의 식별자는 어디에도 관여하지 않는다.
    const migratedKv = new InMemoryKeyValueStore(kv.snapshot());
    const onNewDevice = await new PersonaStore(migratedKv).loadActive();

    expect(onNewDevice).toEqual(original);
  });
});
