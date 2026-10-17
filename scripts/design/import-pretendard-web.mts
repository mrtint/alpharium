/**
 * 089 — 웹 서체 가져오기: npm `pretendard@1.3.9`의 분할 배포본(`woff2-dynamic-subset`)에서 정본의 `webWeights` 굵기를
 * `site/assets/fonts/`에 **바이트 그대로** 복사하고 `fonts.css`·`source.json`·`LICENSE.txt`를 쓴다.
 *
 *   node --no-warnings=MODULE_TYPELESS_PACKAGE_JSON scripts/design/import-pretendard-web.mts
 *
 * 네트워크가 필요하다(레지스트리 tarball). 받은 것은 새 임시 폴더에만 풀고 이 스크립트 폴더에서 실행하지 않는다.
 * **무결성(sha512)이 다르면 아무것도 쓰지 않고 실패한다.** 서체 파일을 변환·서브셋하지 않는다(OFL — 수정판은 예약
 * 서체명을 못 쓴다, 083). `fonts.css`는 배포처 굵기별 CSS의 `unicode-range`·`font-weight`를 그대로 두고 `src`만 우리
 * 경로의 woff2 한 줄로 쓴 선언이다. 계약: specs/089-design-system-web/contracts/generated-outputs.md 서체 절.
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = "1.3.9";
const TARBALL = `https://registry.npmjs.org/pretendard/-/pretendard-${VERSION}.tgz`;
/** 레지스트리 `dist.integrity` (2026-10-18 `npm view pretendard@1.3.9 dist.integrity`) */
const INTEGRITY =
  "sha512-PaQAADyLY5v4kYFwkpSJHbSSYIkiriY/1xXw75TKoZ9UQQqeU+tvP05yTdZAWibiIYoo8ZKtRv8PM7w0IaywSw==";
const WEIGHT_NAMES: Record<string, string> = {
  "400": "Regular",
  "500": "Medium",
  "600": "SemiBold",
  "700": "Bold",
  "800": "ExtraBold",
};

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = join(root, "site", "assets", "fonts");
const cssOut = join(root, "site", "assets", "fonts.css");
const tokens = JSON.parse(readFileSync(join(root, "design", "tokens.json"), "utf8")) as {
  font: { family: string; webWeights: string[] };
};

const sha256 = (buf: Buffer): string => createHash("sha256").update(buf).digest("hex");

const res = await fetch(TARBALL, { signal: AbortSignal.timeout(120_000) });
if (!res.ok) {
  console.error(`내려받기 실패: ${TARBALL} → ${res.status}`);
  process.exit(1);
}
const tgz = Buffer.from(await res.arrayBuffer());
const integrity = `sha512-${createHash("sha512").update(tgz).digest("base64")}`;
if (integrity !== INTEGRITY) {
  console.error(`무결성이 다르다 — 아무것도 쓰지 않는다.\n  기대 ${INTEGRITY}\n  실제 ${integrity}`);
  process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), "pretendard-web-"));
try {
  const tgzPath = join(work, "pretendard.tgz");
  writeFileSync(tgzPath, tgz);
  execFileSync("tar", ["-xzf", tgzPath, "-C", work], { stdio: "pipe" });
  const dist = join(work, "package", "dist");
  const staticDir = join(dist, "web", "static");

  // 라이선스는 앱에 넣은 v1.3.9 것과 바이트 같아야 한다.
  const license = readFileSync(join(dist, "LICENSE.txt"));
  const appLicense = readFileSync(join(root, "assets", "fonts", "pretendard", "LICENSE.txt"));
  if (!license.equals(appLicense)) {
    console.error("배포 패키지의 LICENSE.txt가 앱의 것과 다르다 — 버전이 어긋났다. 아무것도 쓰지 않는다.");
    process.exit(1);
  }

  const files: { file: string; weight: string; sha256: string }[] = [];
  const blocks: string[] = [];
  const copies: { from: string; file: string }[] = [];

  for (const weight of tokens.font.webWeights) {
    const name = WEIGHT_NAMES[weight];
    if (name === undefined) throw new Error(`알 수 없는 굵기 ${weight}`);
    const css = readFileSync(join(staticDir, `Pretendard-${name}.css`), "utf8");
    const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
    if (faces.length === 0) throw new Error(`Pretendard-${name}.css 에 @font-face 가 없다`);
    for (const face of faces) {
      const w = /font-weight:\s*(\d+)/.exec(face)?.[1];
      const file = /woff2-dynamic-subset\/([^)]+\.woff2)/.exec(face)?.[1];
      const range = /unicode-range:\s*([^;]+);/.exec(face)?.[1].trim();
      if (w !== weight || file === undefined || range === undefined) {
        throw new Error(`Pretendard-${name}.css 의 선언을 읽지 못했다: ${face.trim().slice(0, 80)}`);
      }
      copies.push({ from: join(staticDir, "woff2-dynamic-subset", file), file });
      blocks.push(
        [
          "@font-face {",
          `  font-family: ${JSON.stringify(tokens.font.family)};`,
          "  font-style: normal;",
          "  font-display: swap;",
          `  font-weight: ${weight};`,
          `  src: url(./fonts/${file}) format("woff2");`,
          `  unicode-range: ${range};`,
          "}",
        ].join("\n"),
      );
    }
  }

  // 복사할 원본이 모두 있는지 지우기 전에 확인한다 — 새 배포본에서 조각이 빠졌을 때 276개를 지운 채 멈추지 않게.
  for (const c of copies) {
    if (!existsSync(c.from)) throw new Error(`배포 패키지에 ${c.file} 가 없다 — 아무것도 쓰지 않는다`);
  }
  if (new Set(copies.map((c) => c.file)).size !== copies.length) {
    throw new Error("같은 조각이 둘 이상 선언돼 있다 — 아무것도 쓰지 않는다");
  }

  // 여기까지 오면 모두 읽고 확인했다 — 이제 쓴다.
  mkdirSync(outDir, { recursive: true });
  for (const f of readdirSync(outDir)) if (f.endsWith(".woff2")) rmSync(join(outDir, f));
  for (const c of copies) {
    copyFileSync(c.from, join(outDir, c.file));
    const weight = tokens.font.webWeights.find((w) => c.file.startsWith(`Pretendard-${WEIGHT_NAMES[w]}.`))!;
    files.push({ file: c.file, weight, sha256: sha256(readFileSync(join(outDir, c.file))) });
  }
  files.sort((a, b) => a.file.localeCompare(b.file, "en", { numeric: true }));

  writeFileSync(join(outDir, "LICENSE.txt"), license);
  writeFileSync(
    join(outDir, "source.json"),
    JSON.stringify(
      {
        name: "pretendard",
        version: VERSION,
        tarball: TARBALL,
        integrity,
        license: { file: "LICENSE.txt", sha256: sha256(license) },
        weights: tokens.font.webWeights,
        files,
      },
      null,
      2,
    ) + "\n",
  );
  writeFileSync(
    cssOut,
    "/* Pretendard v" +
      VERSION +
      " 분할 배포본(npm) — scripts/design/import-pretendard-web.mts가 만든다. 손으로 고치지 않는다. */\n" +
      blocks.join("\n\n") +
      "\n",
  );
  console.log(`woff2 ${files.length}개 · fonts.css · source.json · LICENSE.txt 를 썼다 (${outDir})`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
