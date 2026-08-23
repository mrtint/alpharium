import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { CHARACTERS, type Character } from "../diary/types";
import { personaOf } from "../diary/persona";
import type {
  DownloadRejection,
  DownloadView,
  ModelReadiness,
  StorageUsage,
} from "../models/types";

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
  /**
   * 무엇을 보일 것인가 — **판정은 `download-view.ts`가 끝냈다**(008).
   *
   * 006까지 이 자리가 `progress: DownloadProgress | null`이었고, 화면이 「받는 중인가」를
   * 스스로 갈랐다. 그 구조에서 **거부가 진행 표시를 지우면 멈추기 버튼이 함께 사라졌다** —
   * 화면은 그것을 알 방법이 없었다. 이제 **화면은 그리기만 한다.**
   */
  view: DownloadView;
  /** 캐릭터별 저장 공간. 비어 있으면 표시하지 않는다 */
  usage?: StorageUsage[];
  onPrepare: (character: Character) => void;
  onPause: () => void;
  onRemove: (character: Character) => void;
  /** 거부 안내를 닫는다 (008 FR-005) */
  onDismissNotice: () => void;

  /* ───────────── 011 — 사진을 보는 데 필요한 것 ───────────── */

  /**
   * 사진 보는 모델의 준비 상태 (FR-026).
   *
   * **옵셔널이다** — 003~010의 기존 테스트가 그대로 통과해야 한다. 003의
   * `isModelReady?`, 009의 `onSelectDay?`와 같은 방식이며 계약을 넓히는 것이다.
   *
   * **캐릭터가 아니므로 `readiness`와 따로 온다.** 같은 Record에 넣으면 그것이 곧
   * 「캐릭터가 사진을 본다」는 잘못된 모양이다(FR-025).
   */
  visionReadiness?: ModelReadiness;
  /** 받는 중이면 0~1, 모르면 null. 없으면 받는 중이 아니다 */
  visionProgress?: number | null;
  onPrepareVision?: () => void;
  onRemoveVision?: () => void;
  /** 사진 보는 모델이 차지하는 자리. **두 파일을 합친 하나의 수다**(FR-029) */
  visionBytes?: number;
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
function progressText(fraction: number | null): string {
  if (fraction === null) return "받는 중…";
  return `받는 중… ${Math.round(fraction * 100)}%`;
}

/**
 * 거부 안내 (008 FR-001·002·003·005·006).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **006까지 이 자리가 아예 없었다.** `App.tsx`가 `prepare()`의 반환값을 버려서 `busy`
 * 거부가 사용자에게 한 글자도 닿지 않았고, 화면에는 **아무 일도 일어나지 않았다** —
 * 「버튼이 고장났다」로 보이는 상태였다.
 *
 * **문구에 들어가는 것**: 거부되었다는 것, 받는 중인 **캐릭터 이름**, 그리고 **멈추면
 * 된다는 것**(FR-003).
 *
 * **★ 마지막이 빠지면 안내가 무의미하다.** 「거부됨」만 말하고 빠져나갈 길을 말하지
 * 않으면 사용자는 여전히 갇힌다 — 003 FR-020a가 막으려던 바로 그 상태다.
 *
 * **모델 정보가 들어가지 않는다**(FR-004). 크기·주소·식별자·남은 시간·속도가 없으며,
 * 이 파일이 `assetFor`에 닿을 수 없으므로 **알 방법 자체가 없다.**
 * ─────────────────────────────────────────────────────────────────────────────
 */
function DownloadNotice({
  notice,
  onDismiss,
}: {
  notice: DownloadRejection;
  onDismiss: () => void;
}) {
  return (
    <View testID="download-notice" style={styles.notice}>
      <Text style={styles.noticeText}>
        {notice.busyWith}을(를) 받는 중이라 지금은 받을 수 없다. {notice.busyWith}을(를) 멈추면 받을
        수 있다.
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        testID="dismiss-notice"
        onPress={onDismiss}
        style={styles.dismiss}
      >
        <Text>닫기</Text>
      </TouchableOpacity>
    </View>
  );
}

export function CharacterListScreen(props: CharacterListProps) {
  const { readiness, view, usage, onPrepare, onPause, onRemove, onDismissNotice } = props;
  const { visionReadiness, visionProgress, onPrepareVision, onRemoveVision, visionBytes } = props;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>캐릭터</Text>

      {/*
        안내는 **하나뿐이다**(FR-006). `view.notice`가 배열이 아니므로 쌓일 수 없고,
        받던 것이 끝나면 판정이 `null`을 주므로 **여기서 지우는 코드가 필요 없다**.
      */}
      {view.notice !== null && <DownloadNotice notice={view.notice} onDismiss={onDismissNotice} />}

      {/*
        다섯 자리가 **처음부터 전부** 보인다(FR-005a). 아무것도 준비되지 않은 첫 화면에서도
        마찬가지이며, 고를 대상이 보이지 않으면 고를 수 없다.
      */}
      {CHARACTERS.map((character) => {
        const state = readiness[character];
        // **`view.active`만 본다**(008 FR-010). `view.notice`는 이 판정에 관여하지
        // 않으므로, **거부당한 줄이 받는 중으로 보이는 일도 받는 중인 줄이 거부로
        // 지워지는 일도 없다.**
        const busy = view.active?.character === character;
        const bytes = usage?.find((u) => u.character === character)?.bytes ?? 0;

        return (
          <View key={character} testID={`character-row-${character}`} style={styles.row}>
            <View style={styles.info}>
              {/*
                014 — persona.ts의 이름·소개로 보인다(FR-001·004). 003의 FR-004a
                주석("이름은 사람이 짓는다")이 가리키던 빈자리를 이제 채운다.
              */}
              <Text style={styles.name}>{personaOf(character).name}</Text>
              <Text style={styles.tagline}>{personaOf(character).tagline}</Text>
              {/*
                거부당한 줄도 **평소대로다**(008 FR-007). 거부는 그 캐릭터의 준비
                상태를 바꾸지 않았으므로 「받아야 함」이던 것은 그대로 「받아야 함」이다.
              */}
              <Text style={styles.status}>
                {busy && view.active ? progressText(view.active.fraction) : statusText(state)}
              </Text>
              {/* 저장 공간은 **캐릭터 단위**로만 보인다(FR-028a) */}
              {bytes > 0 && <Text style={styles.usage}>{formatBytes(bytes)}</Text>}
            </View>

            {busy ? (
              // **멈추기는 받는 중인 줄에만 있다**(008 FR-011). 한 번에 하나뿐이므로
              // (003 FR-020) 무엇이 멈추는지 사용자에게도 분명하다.
              <TouchableOpacity
                accessibilityRole="button"
                testID={`pause-${character}`}
                onPress={onPause}
                style={styles.button}
              >
                <Text>멈추기</Text>
              </TouchableOpacity>
            ) : (
              /*
                **버튼에 직접 testID를 준다**(008, 2026-08-21 실측).

                줄(`character-row-*`)에 testID가 있어도 **Maestro가 이 버튼을 그 줄의
                자식으로 보지 않는다** — 좌표로는 줄 안(x=824~968 ⊂ 68~1013)인데
                접근성 트리에서는 형제로 평탄화된다. `childOf`로 좁힐 수 없으므로
                버튼 자신이 이름을 가져야 한다.
              */
              <TouchableOpacity
                accessibilityRole="button"
                testID={`action-${character}`}
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

      {/*
        **사진을 보는 데 필요한 것**(011 FR-026·031a).

        캐릭터 다섯 아래에 따로 온다 — **캐릭터가 아니기 때문이다**(FR-025). 한 번
        준비하면 다섯 캐릭터 어느 것으로도 사진을 본다(SC-008).

        **모델 이름·파일명·크기가 없다**(FR-031a) — 「사진을 보는 데 필요한 것」으로만
        보이며, 파일이 둘이라는 것도 드러나지 않는다(FR-026).
      */}
      {visionReadiness !== undefined && (
        <View testID="vision-row" style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.name}>사진을 보는 데 필요한 것</Text>
            <Text style={styles.status}>
              {visionProgress !== undefined && visionProgress !== null
                ? progressText(visionProgress)
                : statusText(visionReadiness)}
            </Text>
            {visionBytes !== undefined && visionBytes > 0 && (
              <Text style={styles.usage}>{formatBytes(visionBytes)}</Text>
            )}
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            testID="action-vision"
            onPress={() =>
              visionReadiness.kind === "ready" ? onRemoveVision?.() : onPrepareVision?.()
            }
            style={styles.button}
          >
            <Text>{actionLabel(visionReadiness)}</Text>
          </TouchableOpacity>
        </View>
      )}
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
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "#fdf3d8",
    borderRadius: 8,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19 },
  dismiss: { paddingHorizontal: 12, paddingVertical: 6 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 16 },
  tagline: { fontSize: 12, color: "#666" },
  status: { fontSize: 13, color: "#666" },
  usage: { fontSize: 12, color: "#999" },
  button: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#eee", borderRadius: 6 },
});
