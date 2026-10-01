/**
 * 설정의 권한 꼬리표를 읽고 다시 읽는다 (055 FR-027, contracts C7).
 *
 * 설정 겹이 마운트될 때 한 번, 앱이 전경으로 돌아올 때(`AppState` `change → active`) 다시 읽는다 — 앱 정보 화면에서
 * 권한을 바꾸고 돌아온 경우를 반영한다(021 SC-006과 같다). **`AppState`는 「언제 다시 읽나」만 고른다** — 판정에 쓰지
 * 않는다(AGENTS). 재료를 모으는 `read`는 조립부가 넘긴다 — 이 훅은 `expo-*`를 모른다.
 *
 * 읽기 전에는 모든 행이 `unread`다(꼬리표를 그리지 않는다 — 모르는 것을 거부로 채우지 않는다, 원칙 V).
 */

import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import {
  permissionTagFor,
  type PermissionFacts,
  type PermissionTag,
  type TaggedPermission,
} from "../app/permission-tags";

export type PermissionTags = Record<TaggedPermission, PermissionTag>;

const UNREAD: PermissionTags = { photos: "unread", location: "unread", notifications: "unread" };

export function usePermissionTags(read: () => Promise<PermissionFacts>): PermissionTags {
  const [tags, setTags] = useState<PermissionTags>(UNREAD);
  const readRef = useRef(read);
  useEffect(() => {
    readRef.current = read;
  });

  useEffect(() => {
    let alive = true;
    const load = () =>
      void readRef
        .current()
        .then((facts) => {
          if (!alive) return;
          setTags({
            photos: permissionTagFor("photos", facts),
            location: permissionTagFor("location", facts),
            notifications: permissionTagFor("notifications", facts),
          });
        })
        .catch(() => {
          if (alive) setTags(UNREAD);
        });
    load();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") load();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return tags;
}
