import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { CHARACTERS, type Character } from "../diary/types";
import type { DownloadProgress, ModelReadiness, StorageUsage } from "../models/types";

/**
 * 캐릭터 목록 — **엔드유저가 보는 첫 화면이다.**
 *
 * 계약: specs/003-character-model-files/contracts/roster.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **헌법 원칙 III이 여기서 실제로 시험받는다.**
 *
 * 001·002에는 진단 화면뿐이어서 사용자가 볼 것이 없었다. 이 화면이 처음으로 캐릭터를
 * 사람 앞에 내놓으며, 그래서 모델 정보가 새는지 여부가 여기서 판가름난다.
 *
 * **이 파일은 `ModelAsset`을 import 하지 않는다.** 자산키·주소·크기·지문에 닿는 경로가
 * 아예 없으므로, 조심해서 안 쓰는 것이 아니라 **쓸 수 없다**(FR-003, FR-004).
 *
 * **표시 이름과 설명 문안을 짓지 않는다**(FR-004a, FR-005c). 헌법이 "캐릭터 이름은 사람이
 * 짓는다"고 했고, 성격 설명은 실측 관측에 근거해야 하는데 그 관측은 이 저장소의 몫이
 * 아니다(원칙 IV). 자리와 상태만 보인다.
 *
 * **추천하거나 미리 고르지 않는다**(FR-005b). 다섯이 같은 자격으로 보인다 — 추천에는
 * 근거가 필요하고 그 근거가 없다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type CharacterListProps = {
  /** 캐릭터별 준비 상태 */
  readiness: Record<Character, ModelReadiness>;
  /** 지금 받는 중인 것. 없으면 null */
  progress: DownloadProgress | null;
  /** 캐릭터별 저장 공간. 비어 있으면 표시하지 않는다 */
  usage?: StorageUsage[];
  onPrepare: (character: Character) => void;
  onPause: () => void;
  onRemove: (character: Character) => void;
};

/**
 * 상태를 사람의 말로 옮긴다.
 *
 * **모델 정보가 들어가지 않는다**(FR-004). "3.2GB를 받아야 합니다"가 아니라 "받아야
 * 합니다"이며, 크기를 말하는 순간 모델 규모가 드러난다.
 */
function statusText(readiness: ModelReadiness): string {
  switch (readiness.kind) {
    case "ready":
      return "쓸 수 있음";
    case "not-downloaded":
      return "받아야 함";
    case "partial":
      return readiness.resumable ? "받다 멈춤 — 이어받을 수 있음" : "받다 멈춤";
    case "unusable":
      return "다시 받아야 함";
  }
}

/** 이 상태에서 무엇을 할 수 있는가. */
function actionLabel(readiness: ModelReadiness): string {
  switch (readiness.kind) {
    case "ready":
      return "지우기";
    case "partial":
      return readiness.resumable ? "이어받기" : "다시 받기";
    default:
      return "준비하기";
  }
}

/**
 * 진행률을 사람의 말로 옮긴다.
 *
 * **"모름"을 지어내지 않는다**(원칙 V). 서버가 총량을 알려주지 않으면 백분율이 없고,
 * 그때 그럴듯한 숫자를 만들어 보이지 않는다.
 */
function progressText(progress: DownloadProgress): string {
  if (progress.fraction === null) return "받는 중…";
  return `받는 중… ${Math.round(progress.fraction * 100)}%`;
}

export function CharacterListScreen(props: CharacterListProps) {
  const { readiness, progress, usage, onPrepare, onPause, onRemove } = props;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>캐릭터</Text>

      {/*
        다섯 자리가 **처음부터 전부** 보인다(FR-005a). 아무것도 준비되지 않은 첫 화면에서도
        마찬가지이며, 고를 대상이 보이지 않으면 고를 수 없다.
      */}
      {CHARACTERS.map((character) => {
        const state = readiness[character];
        const busy = progress?.character === character;
        const bytes = usage?.find((u) => u.character === character)?.bytes ?? 0;

        return (
          <View key={character} style={styles.row}>
            <View style={styles.info}>
              {/* 자리표시 식별자를 그대로 보인다 — 이름은 사람이 짓는다(FR-004a) */}
              <Text style={styles.name}>{character}</Text>
              <Text style={styles.status}>
                {busy && progress ? progressText(progress) : statusText(state)}
              </Text>
              {/* 저장 공간은 **캐릭터 단위**로만 보인다(FR-028a) */}
              {bytes > 0 && <Text style={styles.usage}>{formatBytes(bytes)}</Text>}
            </View>

            {busy ? (
              <TouchableOpacity onPress={onPause} style={styles.button}>
                <Text>멈추기</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() =>
                  state.kind === "ready" ? onRemove(character) : onPrepare(character)
                }
                style={styles.button}
              >
                <Text>{actionLabel(state)}</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}

/**
 * 바이트를 사람이 읽는 단위로.
 *
 * 이것은 **사용자가 지운 뒤 공간이 얼마나 비는지** 알기 위한 것이며(FR-028), 캐릭터 단위로
 * 합산된 값이다. 파일별로 쪼개지 않는다 — 쪼개면 한 캐릭터가 파일 몇 개를 쓰는지 드러난다.
 */
function formatBytes(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)}GB`;
  return `${Math.round(bytes / 1024 ** 2)}MB`;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 16 },
  status: { fontSize: 13, color: "#666" },
  usage: { fontSize: 12, color: "#999" },
  button: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#eee", borderRadius: 6 },
});
