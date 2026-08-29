/**
 * adb에 닿는 유일한 자리.
 *
 * 계약: specs/010-synthetic-day-fixture/contracts/seeding.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **004의 `expo-port.ts`, 003의 `expo-port.ts`와 같은 구조다.** 기기에 닿는 자리를
 * 하나로 모으면 나머지는 순수 함수가 되어 기기 없이 검증된다.
 *
 * **어떤 함수도 던지지 않는다.** 실패는 값으로 돌아온다 — 004가 `locationOf()`에서
 * 같은 결정을 했고, 그 이유도 같다: 한쪽의 실패가 전체를 무너뜨리면 어느 단계에서
 * 멈췄는지 말할 수 없다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { spawnSync } from "node:child_process";

/**
 * 심은 사진이 사는 자리.
 *
 * **`Pictures/` 아래여야 미디어 스캐너가 훑는다**(research.md §5, 실측). 그리고
 * 기기의 사진 앱에서 **별도 앨범으로 보이므로** 사람이 눈으로 구분한다(FR-016b).
 *
 * **`DCIM/Camera/`에 두지 않는다** — 사용자의 진짜 사진 자리이며, 섞이면 「폴더 안의
 * 것만 지운다」(FR-016a)가 위험해진다.
 */
export const SEED_FOLDER = "/sdcard/Pictures/AlphariumSeed";

/**
 * 023 — 하위 폴더 이름을 붙인 심을 자리.
 *
 * `folder`가 있으면 `SEED_FOLDER/<folder>/` 아래로 간다. 023의
 * `folderNameOf()`가 "마지막 `/` 앞 세그먼트"를 뽑으므로 그 사진의 폴더
 * 이름이 `folder`가 되어 스크린샷·다운로드로 분류된다.
 *
 * **`SEED_FOLDER` 밖으로 나가지 않는다** — `queryFolder()`의 `%AlphariumSeed%`
 * LIKE와 `removeSeedFolder()`의 `rm -rf SEED_FOLDER`가 하위 폴더까지 그대로
 * 잡으므로 FR-016a(폴더 밖을 못 지운다)가 유지된다. 실제 시스템
 * 폴더(`DCIM/Camera` 등)에 흩뿌리지 않는다.
 */
export function seedPathFor(fileName: string, folder?: string): string {
  return folder === undefined
    ? `${SEED_FOLDER}/${fileName}`
    : `${SEED_FOLDER}/${folder}/${fileName}`;
}

/** 하위 폴더를 만든다. 이미 있으면 아무 일도 안 한다(`mkdir -p`). */
export function makeSeedSubfolder(folder: string): Outcome<void> {
  const made = run(["shell", `mkdir -p ${SEED_FOLDER}/${folder}`]);
  return made.ok ? { ok: true, value: undefined } : made;
}

export type Outcome<T> = { ok: true; value: T } | { ok: false; detail: string };

/** MediaStore에서 읽은 행 하나 */
export type MediaRow = { path: string; datetakenMs: number | null };

function run(args: string[]): Outcome<string> {
  const result = spawnSync("adb", args, { encoding: "utf8", shell: true });

  if (result.error) return { ok: false, detail: `adb를 부르지 못했다: ${result.error.message}` };
  if (result.status !== 0) {
    const message = (result.stderr || result.stdout || "").trim();
    return { ok: false, detail: `adb ${args[0]} 실패 (${result.status}): ${message}` };
  }
  return { ok: true, value: result.stdout };
}

/**
 * 붙어 있는 기기의 수.
 *
 * **여럿이면 실패시킨다.** `expo run:android --device`가 `IP:포트`를 못 받는 것과 같은
 * 이유로 여기서도 대상을 특정할 수 없다(AGENTS.md 실측). 에이전트에게 알려 사람이
 * 정하게 한다 — 임의로 고르면 엉뚱한 기기에 심는다.
 */
export function connectedDevices(): Outcome<string[]> {
  const listed = run(["devices"]);
  if (!listed.ok) return listed;

  const devices = listed.value
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.endsWith("\tdevice"))
    .map((line) => line.split("\t")[0]);

  return { ok: true, value: devices };
}

export function pushFile(localPath: string, devicePath: string): Outcome<void> {
  const pushed = run(["push", localPath, devicePath]);
  return pushed.ok ? { ok: true, value: undefined } : pushed;
}

/**
 * 파일 하나를 미디어 라이브러리에 색인시킨다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **⚠️ 이 방법만 실제로 동작한다**(research.md §3, 실측). 물린 것 둘:
 *
 * | 방법 | 결과 |
 * | --- | --- |
 * | `am broadcast MEDIA_SCANNER_SCAN_FILE` | `result=0` — **아무도 받지 않는다** |
 * | `content update --bind datetaken:l:...` | **조용히 아무것도 안 한다.** 오류도 없다 |
 *
 * **둘 다 성공한 것처럼 보인다.** 그래서 이 함수가 방법을 못 박는다 — 「비슷해 보이는
 * 다른 방법」으로 바꾸면 조용히 아무 일도 일어나지 않는다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function scanFile(devicePath: string): Outcome<void> {
  const scanned = run([
    "shell",
    `content call --uri content://media/external --method scan_file --arg ${devicePath}`,
  ]);
  return scanned.ok ? { ok: true, value: undefined } : scanned;
}

/**
 * 볼륨 전체를 다시 훑는다. **지운 뒤에 반드시 부른다.**
 *
 * 파일만 지우면 **MediaStore에 유령 행이 남고**(research.md §5 실측) 앱이 계속 그
 * 사진을 본다 — 다음 검증이 유령 위에서 돈다.
 */
export function scanVolume(): Outcome<void> {
  const scanned = run([
    "shell",
    "content call --uri content://media/external --method scan_volume --arg external_primary",
  ]);
  return scanned.ok ? { ok: true, value: undefined } : scanned;
}

/**
 * 심은 폴더의 MediaStore 행들.
 *
 * **`datetaken`을 함께 읽는 것이 핵심이다**(FR-018d). 행이 있어도 그 값이 NULL이면
 * 앱은 그 사진을 어느 하루에서도 보지 못한다 — research.md §1이 실측한 실패다.
 */
export function queryFolder(): Outcome<MediaRow[]> {
  const queried = run([
    "shell",
    `"content query --uri content://media/external/images/media ` +
      `--projection _data:datetaken --where \\"_data LIKE '%AlphariumSeed%'\\""`,
  ]);
  if (!queried.ok) return queried;

  // 없으면 "No result found." — 오류가 아니라 0행이다
  if (/No result found/.test(queried.value)) return { ok: true, value: [] };

  const rows: MediaRow[] = [];
  for (const line of queried.value.split(/\r?\n/)) {
    const path = /_data=([^,]+)/.exec(line);
    const taken = /datetaken=(\S+)/.exec(line);
    if (path === null) continue;

    rows.push({
      // 같은 CRLF 문제 — 경로 끝의 \r를 걷어내지 않으면 파일명 비교가 빗나간다
      path: path[1].replace(/\r/g, "").trim(),
      datetakenMs: taken === null || taken[1] === "NULL" ? null : Number(taken[1]),
    });
  }
  return { ok: true, value: rows };
}

/** 기기의 파일 하나를 지운다 */
export function removeFile(devicePath: string): Outcome<void> {
  const removed = run(["shell", `rm -f ${devicePath}`]);
  return removed.ok ? { ok: true, value: undefined } : removed;
}

/**
 * 심은 폴더를 통째로 지운다.
 *
 * **인자를 받지 않는다.** 지울 자리가 `SEED_FOLDER` 하나뿐이면 「폴더 밖을 지운다」가
 * 애초에 불가능하다(FR-016a) — 조심해서 안 하는 것이 아니라 할 수 없는 것이 방어다.
 */
export function removeSeedFolder(): Outcome<void> {
  const removed = run(["shell", `rm -rf ${SEED_FOLDER}`]);
  return removed.ok ? { ok: true, value: undefined } : removed;
}

/**
 * 폴더 안의 파일 목록. 없으면 빈 배열이다 — 오류가 아니다.
 *
 * **⚠️ `adb shell`의 줄 끝이 CRLF다** (2026-08-22 실측). `\r`를 걷어내지 않으면
 * 파일명이 `"2026-08-20-000.jpg\r"`이 되어 `/\.jpg$/` 같은 검사가 **전부 빗나간다** —
 * 오류는 나지 않고 목록이 비어 보일 뿐이라 「심은 게 없다」로 오독한다.
 *
 * 실제로 이 도구를 처음 돌렸을 때 사진 3장이 기기에 멀쩡히 있는데 `seed:list`가
 * 「없다」고 답했다. **이 기능이 막으려는 것과 같은 종류의 조용한 실패다.**
 *
 * **⚠️ 셸 연산자를 명령에 넣지 않는다** (2026-08-22 실측). `2>/dev/null || true`를
 * 붙였더니 그것을 **기기가 아니라 개발 기계의 셸이 삼켜** 출력이 통째로 사라졌다 —
 * `spawnSync`에 `shell: true`를 주기 때문이다. 종료 코드는 0이고 stdout만 비어서
 * **「폴더가 없다」와 구분되지 않았다.** 폴더가 없을 때의 처리는 아래 `filter`가 한다.
 */
export function listSeedFolder(): Outcome<string[]> {
  // 023 — `-R`로 하위 폴더(Camera/·Screenshots/·Download/)까지 센다. `ls -R`은
  // "디렉터리:" 헤더와 빈 줄을 섞어 내므로 `.jpg`로 끝나는 줄만 남긴다.
  const listed = run(["shell", `ls -R ${SEED_FOLDER}`]);
  // 폴더가 없으면 adb가 non-zero로 끝난다. 그것은 「0장」이지 오류가 아니다.
  if (!listed.ok) return { ok: true, value: [] };

  return {
    ok: true,
    value: listed.value
      .split(/\r?\n/)
      .map((line) => line.replace(/\r/g, "").trim())
      .filter((line) => line.length > 0 && /\.jpg$/i.test(line) && !/No such file/.test(line)),
  };
}
