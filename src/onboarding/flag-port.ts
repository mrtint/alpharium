/**
 * 온보딩 완료 플래그 파일 통로 (021).
 *
 * 계약: specs/021-unified-permission-onboarding/contracts/onboarding-flag.md F2
 *       spec.md FR-010a·FR-012, data-model.md §3·§7
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `files/preferences/onboarding.json` — 020의 `auto-diary.json`·`notified.json`과
 * 같은 층위. 원자적 쓰기(`.writing` → move)는 `src/schedule/notified-store.ts`에서
 * 복제했다.
 *
 * **`readAutoDiaryRaw()`는 `auto-diary.json`을 경로 하드코딩으로 직접 읽는다** —
 * `schedule/settings.ts`를 import하지 않는다(`onboarding/` → `schedule/` 의존 금지,
 * `checkOnboardingFile`이 막는다). 시드(FR-010a)에만 쓰인다.
 *
 * 지연 import: `expo-file-system`을 메서드 안에서 `await import`한다 — 웹·테스트
 * 환경에서 무너지지 않게.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const DIRECTORY = "preferences";
const FLAG_FILE = "onboarding.json";
/** 020의 자동 생성 설정 파일 — 시드용으로만 읽는다(FR-010a). */
const AUTO_DIARY_FILE = "auto-diary.json";

/** 플래그 파일이 담기는 통로. 테스트가 기기 없이 갈아끼운다. */
export interface OnboardingFlagPort {
  /** onboarding.json 원문. 없으면 null. */
  read(): Promise<string | null>;
  write(serialized: string): Promise<void>;
  /** 시드용 auto-diary.json 원문. 없으면 null (F4). */
  readAutoDiaryRaw(): Promise<string | null>;
}

/** 디렉터리를 연다. **지연 import다.** */
async function openDirectory() {
  const { Directory, File, Paths } = await import("expo-file-system");
  const dir = new Directory(Paths.document, DIRECTORY);
  if (!dir.exists) dir.create({ intermediates: true });
  return { dir, File };
}

/**
 * 기기의 온보딩 플래그 통로.
 *
 * `preferences/onboarding.json`에 둔다 — 007이 `preferences/`를 `diary/` 밖에 둔
 * 이유와 같다(`store.ts`의 `listDays()`가 안 건드리게).
 */
export function expoOnboardingFlagPort(): OnboardingFlagPort {
  return {
    async read() {
      try {
        const { dir, File } = await openDirectory();
        const file = new File(dir, FLAG_FILE);
        return file.exists ? file.text() : null;
      } catch {
        return null;
      }
    },

    /** 임시 파일에 쓰고 제자리로 옮긴다 — 쓰는 도중 죽어도 반쯤 쓰인 파일이 안 남는다. */
    async write(serialized) {
      const { dir, File } = await openDirectory();

      const temporary = new File(dir, `${FLAG_FILE}.writing`);
      if (temporary.exists) temporary.delete();
      temporary.create();
      temporary.write(serialized);

      const target = new File(dir, FLAG_FILE);
      if (target.exists) target.delete();
      temporary.moveSync(target);
    },

    async readAutoDiaryRaw() {
      try {
        const { dir, File } = await openDirectory();
        const file = new File(dir, AUTO_DIARY_FILE);
        return file.exists ? file.text() : null;
      } catch {
        // 시드는 편의다 — 읽지 못하면 기본값으로 간다.
        return null;
      }
    },
  };
}
