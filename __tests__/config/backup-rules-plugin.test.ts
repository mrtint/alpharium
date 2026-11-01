/**
 * 099 BX4 · 109 — 안드로이드 백업 규칙. 모델(`models/`)과 시도 기록 장부(`attempt-ledger/`)만 빼고 일기·설정·일기의 사진 사본은 OS 기본대로 둔다(D4=A).
 * 규칙을 잘못 쓰면 일기까지 빠져 기기를 바꾼 사용자의 일기가 조용히 사라진다 — 그래서 산출물을 글자 단위로 잠근다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const plugin = require("../../plugins/with-backup-rules") as {
  BACKUP_RULES_NAME: string;
  DATA_EXTRACTION_RULES_NAME: string;
  EXCLUDED_PATHS: string[];
  fullBackupContentXml(): string;
  dataExtractionRulesXml(): string;
  applyBackupAttributes(manifest: ManifestLike): ManifestLike;
};

type ManifestLike = { manifest: { application: { $: Record<string, string> }[] } };

const ROOT = join(__dirname, "../..");
const manifest = (): ManifestLike => ({
  manifest: { application: [{ $: { "android:allowBackup": "true" } }] },
});
const excludes = (xml: string) => [...xml.matchAll(/<exclude\b[^>]*>/g)].map((m) => m[0]);

describe("BX4 — 안드로이드 백업 규칙 산출물", () => {
  it("full-backup-content(API 30 이하)는 models/와 attempt-ledger/ 둘만 뺀다", () => {
    const xml = plugin.fullBackupContentXml();
    expect(xml).toContain("<full-backup-content>");
    expect(excludes(xml)).toEqual([
      '<exclude domain="file" path="models/"/>',
      '<exclude domain="file" path="attempt-ledger/"/>',
    ]);
  });

  it("data-extraction-rules(API 31+)는 클라우드 백업·기기 간 이전 두 섹션 모두에서 models/와 attempt-ledger/ 둘만 뺀다", () => {
    const xml = plugin.dataExtractionRulesXml();
    const cloud = xml.match(/<cloud-backup[^>]*>([\s\S]*?)<\/cloud-backup>/)?.[1] ?? "";
    const transfer = xml.match(/<device-transfer[^>]*>([\s\S]*?)<\/device-transfer>/)?.[1] ?? "";
    expect(excludes(cloud)).toEqual([
      '<exclude domain="file" path="models/"/>',
      '<exclude domain="file" path="attempt-ledger/"/>',
    ]);
    expect(excludes(transfer)).toEqual([
      '<exclude domain="file" path="models/"/>',
      '<exclude domain="file" path="attempt-ledger/"/>',
    ]);
    expect(excludes(xml)).toHaveLength(4);
  });

  it("일기·설정·일기의 사진 사본은 제외되지 않는다 — 두 파일 모두 include도 다른 경로도 없다", () => {
    for (const xml of [plugin.fullBackupContentXml(), plugin.dataExtractionRulesXml()]) {
      expect(xml).not.toMatch(/<include\b/);
      for (const kept of ["preferences", "vision-cache", "diary"]) expect(xml).not.toContain(kept);
    }
    expect(plugin.EXCLUDED_PATHS).toEqual(["models/", "attempt-ledger/"]);
    // 장부 디렉터리 이름은 소스와 같아야 한다 — 다르면 규칙이 헛돈다 (109 FR-012)
    const src = readFileSync(join(ROOT, "src/app/auto-write-attempts.ts"), "utf8");
    expect(src).toContain('const LEDGER_DIRECTORY = "attempt-ledger";');
  });

  it("매니페스트의 application에 두 속성을 걸고 allowBackup은 건드리지 않는다", () => {
    const out = plugin.applyBackupAttributes(manifest());
    const app = out.manifest.application[0]!.$;
    expect(app["android:fullBackupContent"]).toBe(`@xml/${plugin.BACKUP_RULES_NAME}`);
    expect(app["android:dataExtractionRules"]).toBe(`@xml/${plugin.DATA_EXTRACTION_RULES_NAME}`);
    expect(app["android:allowBackup"]).toBe("true");
  });

  it("두 번 적용해도 같은 결과다(멱등)", () => {
    const once = plugin.applyBackupAttributes(manifest());
    const twice = plugin.applyBackupAttributes(JSON.parse(JSON.stringify(once)) as ManifestLike);
    expect(twice).toEqual(once);
  });

  it("app.json이 이 플러그인을 등록한다", () => {
    const app = JSON.parse(readFileSync(join(ROOT, "app.json"), "utf8")) as {
      expo: { plugins: unknown[] };
    };
    expect(app.expo.plugins).toContain("./plugins/with-backup-rules");
  });
});
