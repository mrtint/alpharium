/**
 * 096 — 이번 versionCode가 Play에 이미 올라간 번호보다 큰지 판정한다. 순수 모듈이다(파일·환경변수·네트워크를 만지지 않는다).
 *
 * 계약: specs/096-release-build-number-check/contracts/scripts-contract.md A1~A5
 *
 * versionCode는 모든 트랙을 통틀어 단조 증가해야 하므로 스토어 번호 전체의 최댓값과 견준다. 이미 있는 번호는 최댓값보다
 * 작아도 같음으로 다룬다(Play가 거부하는 이유가 중복이라서다).
 */

export type VersionCodeVerdict =
  | { ok: true; last: number | undefined }
  | {
      ok: false;
      relation: "same" | "lower";
      last: number;
      /** 올려야 할 가장 작은 값 */
      minimum: number;
      message: string;
    };

export function decideVersionCode(current: number, stored: number[]): VersionCodeVerdict {
  if (stored.length === 0) return { ok: true, last: undefined };
  const last = Math.max(...stored);
  if (current > last) return { ok: true, last };
  const minimum = last + 1;
  const relation = stored.includes(current) ? "same" : "lower";
  const message =
    relation === "same"
      ? `versionCode ${current} 은(는) Play에 이미 있다 (스토어 마지막 ${last}). app.json의 expo.android.versionCode 를 ${minimum} 이상으로 올려 커밋한다`
      : `versionCode ${current} 은(는) Play의 마지막 번호 ${last} 보다 작다. app.json의 expo.android.versionCode 를 ${minimum} 이상으로 올려 커밋한다`;
  return { ok: false, relation, last, minimum, message };
}

/** 통과했을 때 실행 요약에 남기는 한 줄 — 어느 번호가 어느 커밋에서 나왔는지 찾는 단서다 */
export function describeVersionCode(args: {
  version: string;
  current: number;
  last: number | undefined;
  commit: string;
}): string {
  return `버전 ${args.version} · versionCode ${args.current} · 커밋 ${args.commit.slice(0, 7)} · 스토어 마지막 ${args.last ?? "없음"}`;
}
