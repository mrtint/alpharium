/**
 * 개발자 화면 「모듈」 그룹의 두 줄 — 읽는 모듈·쓰는 모듈의 상태와 크기 (059, 보드 `6e` ①·`6j`).
 *
 * 계약: specs/059-developer-menu/contracts/developer-menu.md MD1~MD5, research R4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **키 판정은 여기서만 한다**(원칙 III, 헌법 검사 `UI_TOUCHES_ASSET`) — 「쓰는」 키는 기본 캐릭터의 자산 키, 「읽는」은 필수 목록에서 그것을 뺀
 * 나머지다. 화면은 완성된 문자열(「loaded · 610MB」)만 받는다. 모델 이름·파라미터·양자화·키·URL은 어디서도 문자열에 섞지 않는다.
 *
 * 상태어는 **파일 준비 상태**를 짧은 영문으로 옮긴 것이다 — `ready`→`loaded`(보드 원문), `partial`→`partial`, `not-downloaded`→`missing`,
 * `unusable`→`unusable`. **`loaded`는 메모리에 올라갔다는 뜻이 아니다**(진단의 `moduleStatus`와 다른 값 — 알려진 어휘 어긋남, spec 미확인 잔여).
 * 읽지 못한 줄은 `null`이다 — 상태만이나 크기만 있는 반쪽 값을 지어내지 않는다(원칙 V).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { ONBOARDING_DEFAULT_CHARACTER, ESSENTIAL_ASSET_KEYS } from "../onboarding/essential-assets";
import { expoModelPorts } from "../models/expo-port";
import type { ModelFilePort } from "../models/port";
import { assetFor } from "../models/roster";
import { readEssentialStatuses } from "./essential-assets-port";
import { formatModuleBytes } from "./module-size";

export type ReadinessKind = "ready" | "partial" | "not-downloaded" | "unusable";

export type ModuleLines = { reading: string | null; writing: string | null };

export type ModuleLinesDeps = {
  essentialKeys: readonly string[];
  writingKey: string;
  /** 읽는 쪽(사진 모듈 둘이 하나로)·쓰는 쪽의 준비 상태 */
  readStatuses(): Promise<{ reading: ReadinessKind; writing: ReadinessKind }>;
  files: Pick<ModelFilePort, "bytesUsed">;
};

const STATUS_WORD: Record<ReadinessKind, string> = {
  ready: "loaded",
  partial: "partial",
  "not-downloaded": "missing",
  unusable: "unusable",
};

/** 필수 키를 「읽는」 둘과 「쓰는」 하나로 가른다 */
export function moduleKeyGroups(
  essentialKeys: readonly string[],
  writingKey: string,
): { reading: string[]; writing: string } {
  return { reading: essentialKeys.filter((key) => key !== writingKey), writing: writingKey };
}

export async function readModuleLines(deps: ModuleLinesDeps): Promise<ModuleLines> {
  const groups = moduleKeyGroups(deps.essentialKeys, deps.writingKey);

  const statuses = await deps.readStatuses().catch(() => null);
  const sizeOf = (keys: readonly string[]) =>
    Promise.all(keys.map((key) => deps.files.bytesUsed(key))).then(
      (sizes) => sizes.reduce((sum, n) => sum + n, 0),
      () => null,
    );
  const [readingBytes, writingBytes] = await Promise.all([
    sizeOf(groups.reading),
    sizeOf([groups.writing]),
  ]);

  const line = (kind: ReadinessKind | undefined, bytes: number | null): string | null =>
    kind === undefined || bytes === null
      ? null
      : `${STATUS_WORD[kind]} · ${formatModuleBytes(bytes)}`;

  return {
    reading: line(statuses?.reading, readingBytes),
    writing: line(statuses?.writing, writingBytes),
  };
}

/** 기기 통로로 이은 기본 구현 — `AppFrame`이 개발자 겹이 열릴 때 부른다 */
export function readDeviceModuleLines(): Promise<ModuleLines> {
  return readModuleLines({
    essentialKeys: ESSENTIAL_ASSET_KEYS,
    writingKey: assetFor(ONBOARDING_DEFAULT_CHARACTER).key,
    readStatuses: readEssentialStatuses,
    files: expoModelPorts().files,
  });
}
