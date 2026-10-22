/**
 * 099 — 안드로이드 Auto Backup에서 모델(`files/models/`)만 뺀다 (C4).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **왜 규칙 파일을 직접 만들지 않는가**: `/android`는 gitignore된 생성물이라 `prebuild --clean`에 지워진다
 * (`with-battery-exception.js`와 같은 이유). 그래서 규칙 파일과 매니페스트 속성을 모두 이 플러그인이 선언한다.
 *
 * **무엇을 빼는가**: 도메인 `file`(= 앱의 `files/` = `Paths.document`)의 `models/` 하나. 다시 받을 수 있는 약 2GB이고
 * Auto Backup 한도(앱당 25MB)를 넘는다. **`<include>`를 쓰지 않는다** — include를 하나라도 쓰면 나머지(일기·설정·일기의
 * 사진 사본 `vision-cache/`)가 백업에서 빠진다. 일기·설정은 OS 기본 동작 그대로 둔다(D4 — 소유자 결정 A, 2026-10-22).
 * `android:allowBackup`도 건드리지 않는다.
 *
 * 규칙 형식이 둘이다: API 30 이하는 `fullBackupContent`, API 31+는 `dataExtractionRules`(클라우드 백업·기기 간 이전).
 * 파일 이름은 `pocketlog_` 접두사로 다른 라이브러리의 규칙 파일과 겹치지 않게 한다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

const BACKUP_RULES_NAME = "pocketlog_backup_rules";
const DATA_EXTRACTION_RULES_NAME = "pocketlog_data_extraction_rules";
/** 도메인 `file` 기준 상대 경로. `src/models/expo-port.ts`의 `DIRECTORY`("models")와 같아야 한다 */
const EXCLUDED_PATH = "models/";

const EXCLUDE = `<exclude domain="file" path="${EXCLUDED_PATH}"/>`;

function fullBackupContentXml() {
  return `<?xml version="1.0" encoding="utf-8"?>\n<full-backup-content>\n  ${EXCLUDE}\n</full-backup-content>\n`;
}

function dataExtractionRulesXml() {
  return (
    `<?xml version="1.0" encoding="utf-8"?>\n<data-extraction-rules>\n` +
    `  <cloud-backup>\n    ${EXCLUDE}\n  </cloud-backup>\n` +
    `  <device-transfer>\n    ${EXCLUDE}\n  </device-transfer>\n` +
    `</data-extraction-rules>\n`
  );
}

/** `<application>`에 두 속성을 건다. 여러 번 적용해도 같은 결과다. */
function applyBackupAttributes(androidManifest) {
  const app = androidManifest.manifest.application[0];
  app.$["android:fullBackupContent"] = `@xml/${BACKUP_RULES_NAME}`;
  app.$["android:dataExtractionRules"] = `@xml/${DATA_EXTRACTION_RULES_NAME}`;
  return androidManifest;
}

/** @param {object} config */
module.exports = function withBackupRules(config) {
  config = withDangerousMod(config, [
    "android",
    (modConfig) => {
      const xmlDir = path.join(
        modConfig.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "xml",
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, `${BACKUP_RULES_NAME}.xml`), fullBackupContentXml());
      fs.writeFileSync(
        path.join(xmlDir, `${DATA_EXTRACTION_RULES_NAME}.xml`),
        dataExtractionRulesXml(),
      );
      return modConfig;
    },
  ]);
  return withAndroidManifest(config, (manifestConfig) => {
    manifestConfig.modResults = applyBackupAttributes(manifestConfig.modResults);
    return manifestConfig;
  });
};

// 테스트가 순수 함수만 검증할 수 있도록 함께 내보낸다(기기·prebuild 없이 돈다).
module.exports.BACKUP_RULES_NAME = BACKUP_RULES_NAME;
module.exports.DATA_EXTRACTION_RULES_NAME = DATA_EXTRACTION_RULES_NAME;
module.exports.EXCLUDED_PATH = EXCLUDED_PATH;
module.exports.fullBackupContentXml = fullBackupContentXml;
module.exports.dataExtractionRulesXml = dataExtractionRulesXml;
module.exports.applyBackupAttributes = applyBackupAttributes;
