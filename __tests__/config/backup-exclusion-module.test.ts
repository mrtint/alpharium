/**
 * 099 BX1 — iOS 백업 제외 로컬 모듈. 이름 하나만 어긋나도 모듈을 못 찾아 제외가 오류 없이 건너뛰어진다(조용한 실패 — 2GB가
 * iCloud에 실린다). jest에는 네이티브가 없어 소스를 대조하는 것이 유일한 방어다.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  BACKUP_EXCLUSION_IS_EXCLUDED_FUNCTION,
  BACKUP_EXCLUSION_MODULE_NAME,
  BACKUP_EXCLUSION_SET_FUNCTION,
} from "../../src/models/backup-exclusion-port";

const ROOT = join(__dirname, "../..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const SWIFT = read("modules/pocketlog-backup-exclusion/ios/PocketlogBackupExclusionModule.swift");

describe("BX1 — 로컬 백업 제외 모듈의 이름 대조", () => {
  it("모듈·함수 이름이 JS 포트와 같다", () => {
    expect(SWIFT).toContain(`Name("${BACKUP_EXCLUSION_MODULE_NAME}")`);
    expect(SWIFT).toContain(`Function("${BACKUP_EXCLUSION_SET_FUNCTION}")`);
    expect(SWIFT).toContain(`Function("${BACKUP_EXCLUSION_IS_EXCLUDED_FUNCTION}")`);
    expect(SWIFT).toContain("public class PocketlogBackupExclusionModule: Module");
  });

  it("제외 속성을 거는 호출이 실제로 있다", () => {
    expect(SWIFT).toMatch(/isExcludedFromBackup\s*=\s*true/);
    expect(SWIFT).toContain("setResourceValues");
  });

  it("expo-module.config.json은 apple 전용이고 모듈 클래스를 가리킨다", () => {
    const config = JSON.parse(
      read("modules/pocketlog-backup-exclusion/expo-module.config.json"),
    ) as { platforms: string[]; apple: { modules: string[] } };
    expect(config.platforms).toEqual(["apple"]);
    expect(config.apple.modules).toEqual(["PocketlogBackupExclusionModule"]);
  });

  it("podspec이 있고 ExpoModulesCore에 의존한다", () => {
    const podspec = read("modules/pocketlog-backup-exclusion/ios/PocketlogBackupExclusion.podspec");
    expect(podspec).toContain("s.name           = 'PocketlogBackupExclusion'");
    expect(podspec).toContain("s.dependency 'ExpoModulesCore'");
  });
});
