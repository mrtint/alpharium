/**
 * 069 — 기능→흐름 대응표(`docs/e2e/feature-flow-map.md`)의 정합성 검사 (순수 함수).
 *
 * 계약: specs/069-e2e-layer1-screen-flows/contracts/flow-map.md M-1~M-10
 *
 * 기계가 보는 것은 「표가 실제 파일·실행기 배열과 맞는가」까지다. 「그 계약 테스트가 정말 그 성질을 단언하는가」는 기계가 못 본다 —
 * 표를 쓰는 사람이 파일을 열어 확인한다(FR-003).
 */

export type FlowMapInput = {
  /** 대응표 문서 전문 */
  doc: string;
  /** 저장소에 실제로 있는 `.maestro/**\/*.yml` (저장소 상대 경로) */
  flowFiles: readonly string[];
  /** 저장소에 실제로 있는 파일인지 묻는다 (계약 테스트 경로 검사) */
  exists: (path: string) => boolean;
  /** `run-device-tests.mjs`의 배열들 */
  flows: readonly string[];
  layer1: readonly string[];
  /** 새 흐름 셋 */
  newFlows: readonly string[];
  /** 새 흐름 파일 전문(주석을 걷은 것) — 본문 단언 금지(M-10) 검사용 */
  newFlowSources: Readonly<Record<string, string>>;
  /** 픽스처 본문에서 가져온 조각들 — 흐름이 이것을 단언하면 안 된다 */
  fixtureTexts: readonly string[];
};

type Row = string[];

/** 마크다운 표를 첫 헤더 칸 이름으로 모은다. 헤더·구분선 줄은 뺀다. */
export function parseTables(doc: string): Record<string, Row[]> {
  const tables: Record<string, Row[]> = {};
  let current: Row[] | null = null;
  let skipSeparator = false;
  for (const line of doc.split(/\r?\n/)) {
    if (!line.trim().startsWith("|")) {
      current = null;
      continue;
    }
    // 셀 분리: 백틱 안의 `|`는 없다고 가정한다(이 문서는 경로만 적는다)
    const cells = line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
    if (current === null) {
      current = [];
      tables[cells[0]] = current;
      skipSeparator = true;
      continue;
    }
    if (skipSeparator) {
      skipSeparator = false;
      continue;
    }
    current.push(cells);
  }
  return tables;
}

/** 셀에서 백틱으로 감싼 저장소 경로들을 뽑는다 */
export function pathsIn(cell: string): string[] {
  return [...cell.matchAll(/`([^`]+)`/g)]
    .map((m) => m[1])
    .filter((p) => /^(\.maestro\/|__tests__\/)/.test(p));
}

const hasContent = (cell: string | undefined) => cell !== undefined && cell !== "" && cell !== "—";

export function checkFlowMap(input: FlowMapInput): string[] {
  const problems: string[] = [];
  const tables = parseTables(input.doc);
  const features = tables["기능"];
  const inventory = tables["흐름 파일"];
  if (features === undefined) problems.push("기능 표(헤더 첫 칸 「기능」)가 없다");
  if (inventory === undefined) problems.push("흐름 인벤토리 표(헤더 첫 칸 「흐름 파일」)가 없다");
  if (features === undefined || inventory === undefined) return problems;

  const inventoryFiles = inventory.map((row) => pathsIn(row[0])[0] ?? row[0]);

  // M-1 — 모든 흐름 파일이 인벤토리에 있다
  for (const file of input.flowFiles) {
    if (!inventoryFiles.includes(file)) problems.push(`M-1: 인벤토리에 없는 흐름 파일: ${file}`);
  }
  // M-2 — 인벤토리의 경로가 실제 파일이다
  for (const file of inventoryFiles) {
    if (!input.flowFiles.includes(file)) problems.push(`M-2: 인벤토리의 파일이 저장소에 없다: ${file}`);
  }

  const column = (name: "flows" | "layer1") => {
    const index = name === "flows" ? 1 : 2;
    return inventory
      .filter((row) => row[index] === "○")
      .map((row) => pathsIn(row[0])[0] ?? row[0])
      .sort();
  };
  // M-3 — 인벤토리 ○ 집합 == 실행기 배열
  const sameSet = (a: readonly string[], b: readonly string[]) =>
    JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  if (!sameSet(column("flows"), input.flows)) {
    problems.push("M-3: 인벤토리의 FLOWS ○ 집합이 run-device-tests.mjs의 FLOWS와 다르다");
  }
  if (!sameSet(column("layer1"), input.layer1)) {
    problems.push("M-3: 인벤토리의 층 1 ○ 집합이 run-device-tests.mjs의 LAYER1_FLOWS와 다르다");
  }
  // M-4 — LAYER1_FLOWS ⊆ FLOWS
  for (const file of input.layer1) {
    if (!input.flows.includes(file)) problems.push(`M-4: LAYER1_FLOWS의 흐름이 FLOWS에 없다: ${file}`);
  }
  // M-5 — 층 1이 아닌 FLOWS 흐름에는 이유가 있다
  for (const row of inventory) {
    if (row[1] === "○" && row[2] !== "○" && !hasContent(row[4])) {
      problems.push(`M-5: 층 1이 아닌 이유가 없다: ${row[0]}`);
    }
  }
  // M-6 — 기능 표의 각 행에 층 1 / 계약 / 사람이 봄 중 하나
  for (const row of features) {
    if (!hasContent(row[1]) && !hasContent(row[2]) && !hasContent(row[4])) {
      problems.push(`M-6: 지키는 곳도 사람이 보는 이유도 없는 기능: ${row[0]}`);
    }
  }
  // M-7 — 표에 적힌 경로가 실제 파일이다
  const cited = new Set<string>();
  for (const row of features) for (const cell of row) for (const p of pathsIn(cell)) cited.add(p);
  for (const p of cited) {
    if (!input.exists(p)) problems.push(`M-7: 표에 적힌 파일이 없다: ${p}`);
  }
  // M-8 — 새 흐름은 FLOWS와 LAYER1_FLOWS 양쪽에 있다
  for (const file of input.newFlows) {
    if (!input.flows.includes(file)) problems.push(`M-8: 새 흐름이 FLOWS에 없다: ${file}`);
    if (!input.layer1.includes(file)) problems.push(`M-8: 새 흐름이 LAYER1_FLOWS에 없다: ${file}`);
  }
  // M-10 — 새 흐름은 픽스처 본문을 단언하지 않는다
  for (const [file, source] of Object.entries(input.newFlowSources)) {
    for (const fragment of input.fixtureTexts) {
      if (fragment.length >= 6 && source.includes(fragment)) {
        problems.push(`M-10: ${file}이(가) 픽스처 본문 조각을 단언한다: ${fragment}`);
      }
    }
  }
  return problems;
}

/** 주석을 걷은 소스에서 `const NAME = [ "...", ... ];` 배열의 문자열들을 꺼낸다 */
export function stringArray(source: string, name: string): string[] {
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const match = new RegExp(`const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`).exec(stripped);
  if (match === null) throw new Error(`${name} 배열을 찾지 못했다`);
  return [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}
