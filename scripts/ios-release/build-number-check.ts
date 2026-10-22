/**
 * 096 — 이번 buildNumber가 App Store Connect에 이미 올라간 같은 버전의 빌드 번호보다 큰지 판정한다. 순수 모듈이다.
 *
 * 계약: specs/096-release-build-number-check/contracts/scripts-contract.md I1~I5
 *
 * 빌드 번호는 `expo.version` 안에서만 증가하면 된다. 정수로 읽히지 않는 스토어 번호(`1.2.3` 꼴 등)는 비교에서 빼고 개수를 알린다.
 */

export type BuildNumberVerdict =
  | { ok: true; last: number | undefined; ignored: number }
  | {
      ok: false;
      relation: "same" | "lower";
      last: number;
      /** 올려야 할 가장 작은 값 */
      minimum: number;
      ignored: number;
      message: string;
    };

export function decideBuildNumber(
  current: string,
  version: string,
  stored: string[],
): BuildNumberVerdict {
  const numbers = stored.filter((value) => /^\d+$/.test(value)).map(Number);
  const ignored = stored.length - numbers.length;
  const currentNumber = Number(current);
  if (numbers.length === 0) return { ok: true, last: undefined, ignored };
  const last = Math.max(...numbers);
  if (currentNumber > last) return { ok: true, last, ignored };
  const minimum = last + 1;
  const relation = numbers.includes(currentNumber) ? "same" : "lower";
  const base =
    relation === "same"
      ? `버전 ${version}에 빌드 ${current} 은(는) App Store Connect에 이미 있다 (스토어 마지막 ${last})`
      : `버전 ${version}의 빌드 ${current} 은(는) App Store Connect의 마지막 번호 ${last} 보다 작다`;
  const note = ignored > 0 ? ` (정수가 아니라 비교에서 뺀 스토어 번호 ${ignored}개)` : "";
  return {
    ok: false,
    relation,
    last,
    minimum,
    ignored,
    message: `${base}${note}. app.json의 expo.ios.buildNumber 를 ${minimum} 이상으로 올려 커밋한다`,
  };
}

/** 통과했을 때 실행 요약에 남기는 한 줄 — 어느 번호가 어느 커밋에서 나왔는지 찾는 단서다 */
export function describeBuildNumber(args: {
  version: string;
  current: string;
  last: number | undefined;
  commit: string;
  ignored?: number;
}): string {
  const note = args.ignored ? ` (비교에서 뺀 스토어 번호 ${args.ignored}개)` : "";
  return `버전 ${args.version} · 빌드 ${args.current} · 커밋 ${args.commit.slice(0, 7)} · 스토어 마지막 ${args.last ?? "없음"}${note}`;
}
