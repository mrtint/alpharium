/**
 * 진단 화면의 권한 자리.
 *
 * 계약: specs/004-photo-signal-collection/contracts/diagnostics.md
 *
 * **사용자용 화면이 아니라 진단 경로다**(FR-022). 003이 캐릭터 설명 문안을 짓지 않은 것과
 * 같은 이유로, 004도 사용자에게 보일 설득 문안("일기를 쓰려면 사진이 필요해요")을 짓지
 * 않는다. 상태 이름과 버튼이면 된다.
 *
 * **이 자리가 없으면 실기기에서 영원히 `unknown`만 나온다** — 권한을 허용할 길이 없어
 * SC-008을 만족할 방법이 사라진다. 그것이 이 컴포넌트의 존재 이유다.
 *
 * `DiagnosticsScreen`에서 떼어 둔 것은 그 파일이 이미 하는 일이 있고, 권한은 상태와 동작을
 * 함께 가져 성격이 다르기 때문이다.
 */

import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { PermissionState, PhotoPort } from "../signals/port";

/** 권한 상태를 사람이 읽을 말로. **개발자가 보는 문안이다**(FR-022) */
function describe(state: PermissionState): string {
  switch (state) {
    case "granted":
      return "허용됨";
    case "limited":
      return "일부만 허용됨 — 그날의 전부를 볼 수 없다";
    case "denied":
      return "거절됨 — 다시 요청할 수 있다";
    case "blocked":
      return "거절됨 — 다시 요청해도 창이 뜨지 않는다";
    case "undetermined":
      return "아직 묻지 않음";
  }
}

/**
 * 요청이 소용 있는 상태인가.
 *
 * **`blocked`에서 버튼을 눌러도 안드로이드가 창을 띄우지 않는다**(FR-023). 그것을 모르면
 * 사용자가 버튼을 반복해서 누른다.
 */
function canRequest(state: PermissionState): boolean {
  return state !== "granted" && state !== "blocked";
}

type RowProps = {
  label: string;
  state: PermissionState | null;
  onRequest: () => void;
  testID: string;
};

function PermissionRow({ label, state, onRequest, testID }: RowProps) {
  if (state === null) {
    return (
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value} testID={`${testID}-state`}>
          확인 중…
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} testID={`${testID}-state`}>
        {describe(state)}
      </Text>

      {canRequest(state) ? (
        <Pressable style={styles.button} onPress={onRequest} testID={`${testID}-request`}>
          <Text style={styles.buttonText}>권한 요청</Text>
        </Pressable>
      ) : (
        <Text style={styles.note} testID={`${testID}-note`}>
          {state === "blocked" ? "설정에서 직접 바꿔야 한다" : "요청할 것이 없다"}
        </Text>
      )}
    </View>
  );
}

/**
 * 사진·좌표 권한의 상태와 요청.
 *
 * **둘을 따로 보인다**(FR-020). 합치면 "사진은 되는데 좌표가 안 되는" 상태를 진단할 수
 * 없고, 그 상태가 FR-013a가 다루는 바로 그것이다.
 */
export function PermissionPanel({ port }: { port: PhotoPort }) {
  const [photo, setPhoto] = useState<PermissionState | null>(null);
  const [location, setLocation] = useState<PermissionState | null>(null);

  const refresh = useCallback(async () => {
    // **조회만 한다. 요청하지 않는다**(FR-011). 화면이 열렸다는 이유로 권한 창을 띄우면
    // 사용자는 맥락 없이 창을 만나고 대개 거절한다 — 그러면 blocked가 되어 되돌리기 어렵다.
    // expo 튜토리얼이 useEffect에서 requestPermission()을 부르지만 그것을 따라 하면 위반이다.
    const [p, l] = await Promise.all([port.photoPermission(), port.locationPermission()]);
    return { photo: p, location: l };
  }, [port]);

  useEffect(() => {
    let alive = true;
    refresh().then(({ photo: p, location: l }) => {
      if (!alive) return;
      setPhoto(p);
      setLocation(l);
    });
    return () => {
      alive = false;
    };
  }, [refresh]);

  // 사람이 눌렀을 때만 요청한다(FR-021).
  const requestPhoto = useCallback(async () => {
    setPhoto(await port.requestPhotoPermission());
    setLocation(await port.locationPermission());
  }, [port]);

  const requestLocation = useCallback(async () => {
    setLocation(await port.requestLocationPermission());
  }, [port]);

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>권한</Text>

      <PermissionRow
        label="사진 접근"
        state={photo}
        onRequest={requestPhoto}
        testID="photo-permission"
      />
      <PermissionRow
        label="좌표 접근"
        state={location}
        onRequest={requestLocation}
        testID="location-permission"
      />

      <Text style={styles.caveat}>
        좌표 접근은 따로 물을 방법이 없어 읽어 봐야 안다. 실제 판정은 신호 조회에서 드러난다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 12, marginTop: 8 },
  title: { fontSize: 12, opacity: 0.6 },
  row: { gap: 2 },
  label: { fontSize: 12, opacity: 0.6 },
  value: { fontSize: 16 },
  button: {
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  buttonText: { fontSize: 14 },
  note: { fontSize: 12, opacity: 0.5, marginTop: 4 },
  caveat: { fontSize: 11, opacity: 0.5 },
});
