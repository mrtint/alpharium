/**
 * 자동 생성 설정의 영속화 (020).
 *
 * 계약: specs/020-scheduled-diary-notification/contracts/auto-diary-settings.md
 *       S1·S3·S4·S7
 *       specs/020-scheduled-diary-notification/data-model.md §1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **007의 `selection-store.ts`·017의 `geocoding-setting-store.ts`와 같은
 * 모양이다** — 기기에 닿는 자리이며 판정을 하지 않는다. `expo-file-system`을
 * 쓴다(새 저장 계층 0개, spec Assumptions).
 *
 * **`selection-store`와 다른 점**: 자동 생성 설정은 「고른 적 없음」을 화면에서
 * 구분해 보여줄 이유가 없다 — 꺼짐이 기본값이므로(FR-009). 그래서 `null`이
 * 아니라 **항상 `AutoDiarySettings`를 돌려준다**(geocoding 설정과 같은 판단).
 *
 * **부수 효과는 이 파일이 하지 않는다**(S6) — 태스크 등록·알림 권한·배터리
 * 인텐트는 호출부(`App.tsx`/`AutoDiarySettingsScreen`)가 한다. 007의
 * `saveSelection`이 파일만 쓰고 화면이 나머지를 하는 것과 같다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * 자동 생성 설정.
 *
 * **필드는 셋뿐이다**(S7, 원칙 IV) — "마지막 실행 시각" 같은 필드를 넣으면
 * 실행 이력 로그로 자란다. 스케줄 판정은 매번 `store.listDays()`(일기 존재
 * 여부)로 충분하다.
 */
export type AutoDiarySettings = {
  /** 자동 생성 켜짐 여부 (FR-009). 기본값 false — 사용자가 명시적으로 켠다. */
  enabled: boolean;
  /**
   * 대략적인 목표 시각. 기기 현지 시간대 기준 "시" (0–23). 기본값 7 (FR-001).
   * 분은 두지 않는다 — 근사치(FR-002)이므로 분 단위 정밀도를 암시하지 않는다.
   */
  targetHour: number;
  /**
   * 배터리 최적화 예외 요청을 이미 1회 띄웠는가 (FR-010).
   * true가 되면 다시는 자동으로 요청 인텐트를 띄우지 않는다(MUST NOT).
   */
  batteryExceptionPrompted: boolean;
};

/** 파일 없음·손상 시의 값. geocoding 설정처럼 명시적 기본값이 있다(S3). */
export const DEFAULT_AUTO_DIARY_SETTINGS: AutoDiarySettings = {
  enabled: false,
  targetHour: 7,
  batteryExceptionPrompted: false,
};

/** 설정이 담기는 통로. 테스트가 기기 없이 갈아끼운다. */
export interface AutoDiarySettingsPort {
  read(): Promise<string | null>;
  write(serialized: string): Promise<void>;
}

/** 0–23의 정수인가. 밖이면 기본값으로 대체한다. */
function validHour(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 23;
}

/**
 * 자동 생성 설정을 읽는다.
 *
 * **항상 `AutoDiarySettings`를 돌려준다**(S3) — 파일 없음·깨짐·통로 예외
 * 전부 `DEFAULT_AUTO_DIARY_SETTINGS`로 귀결된다.
 *
 * **부분 손상에 관대하다**: `targetHour`가 0–23 정수가 아니면 그 필드만 7로,
 * `enabled`/`batteryExceptionPrompted`가 boolean이 아니면 false. 나머지
 * 필드는 살린다(`store.ts`의 방식).
 */
export async function loadAutoDiarySettings(
  port: AutoDiarySettingsPort,
): Promise<AutoDiarySettings> {
  try {
    const raw = await port.read();
    if (raw === null) return { ...DEFAULT_AUTO_DIARY_SETTINGS };

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return { ...DEFAULT_AUTO_DIARY_SETTINGS };
    }

    const obj = parsed as Record<string, unknown>;
    return {
      enabled: typeof obj.enabled === "boolean" ? obj.enabled : false,
      targetHour: validHour(obj.targetHour)
        ? obj.targetHour
        : DEFAULT_AUTO_DIARY_SETTINGS.targetHour,
      batteryExceptionPrompted:
        typeof obj.batteryExceptionPrompted === "boolean" ? obj.batteryExceptionPrompted : false,
    };
  } catch {
    return { ...DEFAULT_AUTO_DIARY_SETTINGS };
  }
}

/**
 * 자동 생성 설정을 담는다.
 *
 * **설정 말고 아무것도 담지 않는다**(S7, 원칙 III·IV) — 캐릭터·모델 정보,
 * 실행 이력을 담지 않는다.
 */
export async function saveAutoDiarySettings(
  port: AutoDiarySettingsPort,
  settings: AutoDiarySettings,
): Promise<void> {
  await port.write(
    JSON.stringify({
      enabled: settings.enabled,
      targetHour: settings.targetHour,
      batteryExceptionPrompted: settings.batteryExceptionPrompted,
    }),
  );
}

/* ────────────────────────── 기기 통로 ────────────────────────── */

const DIRECTORY = "preferences";
const SETTING_FILE = "auto-diary.json";

/** 디렉터리를 연다. **지연 import다** — 웹·테스트 환경에서 무너지지 않게 한다. */
async function openDirectory() {
  const { Directory, File, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, DIRECTORY);
  if (!dir.exists) dir.create({ intermediates: true });
  return { dir, File };
}

/**
 * 기기의 설정 통로.
 *
 * 007의 `selected-character.json`과 **같은 디렉터리**(`preferences/`) —
 * spec Assumptions "기존 설정 저장 경로 재사용".
 */
export function expoAutoDiarySettingsPort(): AutoDiarySettingsPort {
  return {
    async read() {
      const { dir, File } = await openDirectory();
      const file = new File(dir, SETTING_FILE);
      return file.exists ? file.text() : null;
    },

    /** 임시 파일에 쓰고 제자리로 옮긴다 — 쓰는 도중 죽어도 반쯤 쓰인 파일이 안 남는다. */
    async write(serialized) {
      const { dir, File } = await openDirectory();

      const temporary = new File(dir, `${SETTING_FILE}.writing`);
      if (temporary.exists) temporary.delete();
      temporary.create();
      temporary.write(serialized);

      const target = new File(dir, SETTING_FILE);
      if (target.exists) target.delete();
      temporary.moveSync(target);
    },
  };
}
