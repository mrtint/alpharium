import { View } from "react-native";

import { AppText } from "./components/Text";
import { Button } from "./components/Button";
import { ListRow } from "./components/ListRow";
import { COLORS, RADIUS } from "./theme/tokens";
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
  /** 멈춘다. **026 — 어느 캐릭터를 멈출지 인자로 받는다** (동시 다운로드) */
  onPause: (character: Character) => void;
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
    <View
      testID="download-notice"
      className="flex-row items-center gap-3 p-3 rounded-card"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        // 033 — 옛 노란 배경이던 자리. 안내는 배경이 살짝 도드라져야 눈에 든다.
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.card,
      }}
    >
      <AppText variant="caption" style={{ flex: 1 }}>
        {notice.busyWith}을(를) 받는 중이라 지금은 받을 수 없다. {notice.busyWith}을(를) 멈추면 받을
        수 있다.
      </AppText>
      <Button variant="secondary" testID="dismiss-notice" onPress={onDismiss}>
        닫기
      </Button>
    </View>
  );
}

/**
 * 033 — 한 줄의 좌측 내용.
 *
 * `ListRow`의 `label`이 노드를 받게 되면서(033 data-model §2) 이 자리가 생겼다.
 * 이름·소개·상태·저장공간이 **세로로 쌓이므로** 문자열 하나에 안 담긴다 —
 * 032 T062가 "구조가 안 맞는다"고 판단했던 바로 그 이유이며, 타입을 넓히자
 * 전제가 사라졌다.
 */
function RowLabel({
  name,
  tagline,
  status,
  usage,
}: {
  name: string;
  tagline?: string;
  status: string;
  usage?: string;
}) {
  return (
    <View className="flex-1 gap-0.5" style={{ flex: 1, gap: 2 }}>
      <AppText variant="body">{name}</AppText>
      {tagline !== undefined && <AppText variant="caption">{tagline}</AppText>}
      <AppText variant="caption">{status}</AppText>
      {usage !== undefined && <AppText variant="caption">{usage}</AppText>}
    </View>
  );
}

/**
 * 033 — 행의 세로 여백을 현행(12)에 맞춘다 (contracts CS10).
 *
 * **`ListRow`의 기본값은 14다.** 다섯 행 + 사진 모델 행이 2px씩 커지면 누적
 * 12px이 밀리고, 025가 실측한 "`scrollUntilVisible`이 컨테이너 상단에서 멈춘다"
 * 성질과 겹치면 그 아래 버튼이 화면 밖에 남는다 — **문안·`testID`가 전부
 * 불변인데도 Maestro가 깨지는 경로다**(`download-conflict`·
 * `parallel-model-download`·`photo-vision` 셋이 이 화면을 스크롤로 찾는다).
 *
 * **`ListRow`의 기본값은 안 고친다** — 공용 컴포넌트를 이 화면 하나 때문에
 * 바꾸지 않는다.
 */
const ROW_OVERRIDE = { paddingVertical: 12 } as const;

export function CharacterListScreen(props: CharacterListProps) {
  const { readiness, view, usage, onPrepare, onPause, onRemove, onDismissNotice } = props;
  const { visionReadiness, visionProgress, onPrepareVision, onRemoveVision, visionBytes } = props;

  return (
    <View
      /* 033 — 좌우 20은 설정 탭의 다른 섹션과 같은 값이다
         (`AutoDiarySettingsScreen`·`PermissionsSection`·`App.tsx`의
         `settingsSection`). 이 화면은 설정 탭 안에 살므로 같은 세로선에 선다. */
      className="flex-1 px-5 py-6 gap-3"
      style={{
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 24,
        gap: 12,
        backgroundColor: COLORS.bg,
      }}
    >
      <AppText variant="title" style={{ marginBottom: 8 }}>
        캐릭터
      </AppText>

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
        //
        // **026 — `active`가 배열이다.** 여러 줄이 동시에 받는 중일 수 있다.
        const inFlight = view.active.find((p) => p.character === character);
        const busy = inFlight !== undefined;
        const bytes = usage?.find((u) => u.character === character)?.bytes ?? 0;

        return (
          <ListRow
            key={character}
            testID={`character-row-${character}`}
            style={ROW_OVERRIDE}
            label={
              <RowLabel
                /*
                  014 — persona.ts의 이름·소개로 보인다(FR-001·004). 003의 FR-004a
                  주석("이름은 사람이 짓는다")이 가리키던 빈자리를 이제 채운다.
                */
                name={personaOf(character).name}
                tagline={personaOf(character).tagline}
                /*
                  거부당한 줄도 **평소대로다**(008 FR-007). 거부는 그 캐릭터의 준비
                  상태를 바꾸지 않았으므로 「받아야 함」이던 것은 그대로 「받아야 함」이다.
                */
                status={inFlight ? progressText(inFlight.fraction) : statusText(state)}
                /* 저장 공간은 **캐릭터 단위**로만 보인다(FR-028a) */
                usage={bytes > 0 ? formatBytes(bytes) : undefined}
              />
            }
            right={
              busy ? (
                // **멈추기는 받는 중인 줄에만 있다**(008 FR-011). 026 — 여러 줄이 동시에
                // 이 버튼을 가질 수 있으므로, **어느 캐릭터를 멈출지 인자로 넘긴다**.
                <Button
                  variant="secondary"
                  testID={`pause-${character}`}
                  onPress={() => onPause(character)}
                >
                  멈추기
                </Button>
              ) : (
                /*
                  **버튼에 직접 testID를 준다**(008, 2026-08-21 실측).

                  줄(`character-row-*`)에 testID가 있어도 **Maestro가 이 버튼을 그 줄의
                  자식으로 보지 않는다** — 좌표로는 줄 안(x=824~968 ⊂ 68~1013)인데
                  접근성 트리에서는 형제로 평탄화된다. `childOf`로 좁힐 수 없으므로
                  버튼 자신이 이름을 가져야 한다.

                  033 — **지우기만 위험색이다**(spec FR-009a). 되돌릴 수 없는 동작이고,
                  나머지(준비·이어받기·다시 받기)는 보조 갈래다.
                */
                <Button
                  variant={state.kind === "ready" ? "danger" : "secondary"}
                  testID={`action-${character}`}
                  onPress={() =>
                    state.kind === "ready" ? onRemove(character) : onPrepare(character)
                  }
                >
                  {actionLabel(state)}
                </Button>
              )
            }
          />
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
        <ListRow
          testID="vision-row"
          style={ROW_OVERRIDE}
          label={
            <RowLabel
              name="사진을 보는 데 필요한 것"
              status={
                visionProgress !== undefined && visionProgress !== null
                  ? progressText(visionProgress)
                  : statusText(visionReadiness)
              }
              usage={
                visionBytes !== undefined && visionBytes > 0 ? formatBytes(visionBytes) : undefined
              }
            />
          }
          right={
            <Button
              variant={visionReadiness.kind === "ready" ? "danger" : "secondary"}
              testID="action-vision"
              onPress={() =>
                visionReadiness.kind === "ready" ? onRemoveVision?.() : onPrepareVision?.()
              }
            >
              {actionLabel(visionReadiness)}
            </Button>
          }
        />
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
