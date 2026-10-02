/**
 * 개발자 메뉴가 켜져 있는가 (059 FR-007~FR-009·FR-023·FR-024, research R1·R2).
 *
 * 계약: specs/059-developer-menu/contracts/developer-menu.md HK1~HK5
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **환경이 이긴다.** 개발 환경(`devEnvironment` — 호출부가 `showsOnScreen`으로 판정해 마운트 때 한 번 넘긴다, D2)은 저장된 값과 무관하게 켜짐이고
 * 파일을 읽지도 쓰지도 않는다 — 끄기는 **그 실행 동안만**(세션 상태, `sessionOff`)이다. 배포 환경은 `preferences/developer-menu.json`을
 * 마운트 때 한 번 읽고(읽기 전·읽기 실패는 꺼짐 — 모르는 것을 켜짐으로 채우지 않는다, 원칙 V) 켜면 쓰고 끄면 지운다. 쓰기·지우기가 실패해도
 * 그 실행의 상태는 사용자가 한 대로 둔다(FR-009) — 다음 실행에는 파일이 말한다.
 *
 * `process.env`·`currentEnvironment()`를 여기서 부르지 않는다 — 환경은 인자다(FR-009a, 055 「`currentEnvironment()`는 부를 때마다 새 객체」).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useState } from "react";

import {
  clearDeveloperMenu,
  loadDeveloperMenu,
  saveDeveloperMenu,
  type DeveloperMenuStorePort,
} from "../app/developer-menu-store";

export type DeveloperMenu = {
  enabled: boolean;
  enable: () => void;
  disable: () => void;
};

export function useDeveloperMenu({
  devEnvironment,
  port,
}: {
  devEnvironment: boolean;
  /** 안정된 참조여야 한다(호출부가 `useMemo`) */
  port: DeveloperMenuStorePort;
}): DeveloperMenu {
  const [persisted, setPersisted] = useState(false);
  const [sessionOff, setSessionOff] = useState(false);

  useEffect(() => {
    if (devEnvironment) return;
    let alive = true;
    void loadDeveloperMenu(port).then((on) => {
      if (alive) setPersisted(on);
    });
    return () => {
      alive = false;
    };
  }, [devEnvironment, port]);

  const enable = useCallback(() => {
    if (devEnvironment) {
      setSessionOff(false);
      return;
    }
    setPersisted(true);
    void saveDeveloperMenu(port).catch(() => {});
  }, [devEnvironment, port]);

  const disable = useCallback(() => {
    if (devEnvironment) {
      setSessionOff(true);
      return;
    }
    setPersisted(false);
    void clearDeveloperMenu(port).catch(() => {});
  }, [devEnvironment, port]);

  return { enabled: devEnvironment ? !sessionOff : persisted, enable, disable };
}
