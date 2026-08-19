/**
 * 일기 저장.
 *
 * 계약: specs/002-diary-pipeline-contracts/contracts/storage.md
 *
 * **저장은 인터페이스 뒤에 둔다.** 파일 방식이 맞지 않으면 구현만 갈아끼우고 파이프라인은
 * 그대로 둔다. 테스트는 메모리 대역으로 돈다.
 *
 * 직렬화가 이 파일에서 가장 조심할 부분이다. `SignalValue`가 합 타입이므로 왕복에서
 * `unknown`이 `null`로 뭉개지면 "모름"이 "없음"이 되고, 그 순간 헌법 원칙 V가 조용히
 * 깨진다(SC-007).
 */

import type { DayDate } from "../config/day-boundary";
import type { DiaryEntry } from "./types";

/**
 * 저장 결과.
 *
 * `overwrote`가 있는 이유: **덮어썼다는 사실이 호출자에게 드러나야 한다(FR-023a).**
 * 조용히 덮어쓰면 사용자는 이전 일기가 사라진 줄도 모른다. 온디바이스 생성은 비용이 크고
 * 사라진 일기는 되돌릴 수 없다.
 */
export type SaveResult = { ok: true; overwrote: boolean } | { ok: false; reason: string };

/**
 * 일기 저장소.
 *
 * **불변식**:
 *  1. 한 날짜에 일기는 하나(FR-023). 여러 개를 쌓지 않는다.
 *  2. 저장한 것과 꺼낸 것이 같다(SC-007). `unknown`도 그대로 살아남는다.
 *  3. 덮어쓰기는 성공한 저장에서만 일어난다(FR-023b). 쓰기가 실패해도 기존 일기가 남는다.
 *  4. 저장 실패가 드러난다(FR-024). 예외를 삼키지 않는다.
 */
export interface DiaryStore {
  save(entry: DiaryEntry): Promise<SaveResult>;
  load(day: DayDate): Promise<DiaryEntry | null>;
  has(day: DayDate): Promise<boolean>;
  listDays(): Promise<DayDate[]>;
}

/* ────────────────────────────── 직렬화 ────────────────────────────── */

/**
 * 일기를 문자열로 만든다.
 *
 * **합 타입을 그대로 보존한다.** `{ kind: 'unknown', reason }`을 `null`이나 `undefined`로
 * 줄이지 않는다 — 줄이는 순간 "관측 못 함"이 "관측했고 없음"과 같아진다(원칙 V).
 * JSON은 합 타입의 태그(`kind`)를 그대로 담으므로 특별한 처리 없이 보존된다.
 *
 * 다루어야 하는 것은 `Date`뿐이다. JSON에 Date 타입이 없어 문자열이 되므로, 꺼낼 때
 * 되돌린다.
 */
export function serializeEntry(entry: DiaryEntry): string {
  return JSON.stringify(entry);
}

/** JSON이 되돌려준 값에서 Date로 복원할 자리들. */
function reviveDates(entry: DiaryEntry): DiaryEntry {
  const photos = entry.signalsUsed.photos;

  return {
    ...entry,
    createdAt: new Date(entry.createdAt),
    signalsUsed: {
      ...entry.signalsUsed,
      photos:
        photos.kind === "known"
          ? {
              kind: "known",
              // 004에서 값이 `Photo[]`에서 `PhotoObservation`으로 한 겹 깊어졌다.
              // **`complete`를 함께 옮긴다** — 여기서 떨어뜨리면 잘린 하루가 온전한 것으로
              // 되살아나고, 그것이 FR-014d가 막으려는 거짓이다.
              value: {
                ...photos.value,
                photos: photos.value.photos.map((photo) => ({
                  ...photo,
                  takenAt: new Date(photo.takenAt),
                })),
              },
            }
          : photos,
    },
  };
}

/**
 * 문자열에서 일기를 되돌린다.
 *
 * `unknown`은 `unknown`으로, `none`은 `none`으로 돌아온다. 둘을 뭉개는 처리를 여기에
 * 넣지 않는다.
 */
export function deserializeEntry(serialized: string): DiaryEntry {
  return reviveDates(JSON.parse(serialized) as DiaryEntry);
}

/* ─────────────────────────── 목록 읽기 (006) ─────────────────────────── */

/**
 * 목록 한 줄 (006 data-model.md §1).
 *
 * **전문을 담지 않는다.** 목록에서 전부 읽으면 일기가 늘수록 느려진다.
 */
export type DiaryListItem = { day: DayDate; readable: boolean };

/**
 * 저장된 일기의 목록을 읽는다 (006 FR-017·017a).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **읽기 실패가 목록에서 날짜를 지우지 않는다**(원칙 V).
 *
 * `load()`가 `null`을 주는 날짜를 조용히 빼면 「그날 일기가 없다」와 구분이 사라지고,
 * 사용자는 일기를 쓴 기억과 화면이 어긋나는 것을 설명할 방법이 없다.
 *
 * **날짜는 파일 이름에서 온다** — `listDays()`가 파일명을 파싱하므로 내용이 깨져도
 * 어느 날인지는 안다. 그것이 `readable: false`를 만들 수 있는 이유다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function listDiaries(store: DiaryStore): Promise<DiaryListItem[]> {
  const days = await store.listDays();

  const items = await Promise.all(
    days.map(async (day): Promise<DiaryListItem> => {
      try {
        return { day, readable: (await store.load(day)) !== null };
      } catch {
        // 읽다가 무너져도 그 날짜를 잃지 않는다. 「읽을 수 없다」가 결론이다.
        return { day, readable: false };
      }
    }),
  );

  // 최근 것이 먼저 보인다. 날짜 문자열은 사전순이 곧 시간순이다(YYYY-MM-DD).
  return items.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
}

/* ─────────────────────────── 메모리 구현 ─────────────────────────── */

/** 테스트와 파이프라인 검증용 저장소. 실패를 흉내 낼 수 있다. */
export interface MemoryStore extends DiaryStore {
  /** 다음 저장 한 번만 실패시킨다. FR-023b(실패해도 기존 일기 보존)를 검증하기 위한 것 */
  failNextWith(reason: string): void;
}

export type MemoryStoreOptions = {
  /** 모든 저장을 이 까닭으로 실패시킨다 */
  failWith?: string;
  /** 실제 직렬화를 거친다. 왕복에서 값이 변하지 않는지 확인할 때 쓴다 */
  serialized?: boolean;
};

/**
 * 메모리 저장소.
 *
 * 제품 경로가 아니다 — 앱이 죽으면 사라진다. 테스트와 파이프라인 검증에만 쓴다.
 */
export function memoryStore(options: MemoryStoreOptions = {}): MemoryStore {
  const entries = new Map<DayDate, DiaryEntry | string>();
  let failNext: string | undefined;

  const put = (entry: DiaryEntry) =>
    entries.set(entry.date, options.serialized ? serializeEntry(entry) : entry);

  const get = (day: DayDate): DiaryEntry | null => {
    const stored = entries.get(day);
    if (stored === undefined) return null;
    return typeof stored === "string" ? deserializeEntry(stored) : stored;
  };

  return {
    async save(entry) {
      const reason = failNext ?? options.failWith;
      if (reason !== undefined) {
        failNext = undefined;
        // 실패해도 기존 일기를 건드리지 않는다(FR-023b).
        return { ok: false, reason };
      }

      const overwrote = entries.has(entry.date);
      put(entry);
      return { ok: true, overwrote };
    },

    async load(day) {
      return get(day);
    },

    async has(day) {
      return entries.has(day);
    },

    async listDays() {
      return [...entries.keys()];
    },

    failNextWith(reason) {
      failNext = reason;
    },
  };
}

/* ──────────────────────────── 파일 구현 ──────────────────────────── */

/**
 * 파일 저장이 쓰는 통로.
 *
 * `expo-file-system`을 직접 부르지 않고 이 모양을 주입받는다. 그래야 기기 없이 테스트할
 * 수 있고, 저장 방식이 바뀌어도 파이프라인이 그대로 남는다.
 */
export interface FileSystemPort {
  /** 날짜 파일을 읽는다. 없으면 null */
  read(name: string): Promise<string | null>;
  /** 임시 이름으로 쓰고 제자리로 옮긴다. 원자적이어야 한다 */
  writeAtomically(name: string, contents: string): Promise<void>;
  /** 있는 파일 이름 전부 */
  list(): Promise<string[]>;
}

/** 날짜 → 파일 이름. 파일명이 곧 날짜 키다(contracts/storage.md). */
function fileNameFor(day: DayDate): string {
  return `${day}.json`;
}

/** 파일 이름 → 날짜. 일기 파일이 아니면 null */
function dayFromFileName(name: string): DayDate | null {
  const match = /^(\d{4}-\d{2}-\d{2})\.json$/.exec(name);
  return match ? match[1] : null;
}

/**
 * 파일 저장소.
 *
 * 날짜별 JSON 파일 하나씩 둔다(research.md §3):
 *  - 파일명이 곧 날짜 키 → `has`와 `listDays`가 디렉터리 조회로 끝난다
 *  - 일기 하나 저장에 전체를 다시 쓰지 않는다
 *  - 임시 파일에 쓰고 옮기므로 새 저장이 실패해도 기존 일기가 남는다(FR-023b)
 *
 * **실기기에서 확인됨** (2026-08-13, Galaxy S20+ / SM-G986N / Android 13 / arm64-v8a):
 * 저장·조회·덮어쓰기·`listDays`가 실제로 돌고, **`unknown`이 파일 왕복에서 살아남는다.**
 * 확인 경로는 `src/diagnostics/storage-check.ts`이며 진단 화면에 결과가 뜬다.
 * 직렬화를 일부러 깨뜨렸을 때 그 점검이 실패로 뒤집히는 것까지 확인했다.
 */
export function fileStore(fs: FileSystemPort): DiaryStore {
  return {
    async save(entry) {
      // 덮어쓰는지 먼저 확인한다. 조용히 덮어쓰지 않는다(FR-023a).
      const overwrote = (await fs.read(fileNameFor(entry.date))) !== null;

      try {
        await fs.writeAtomically(fileNameFor(entry.date), serializeEntry(entry));
        return { ok: true, overwrote };
      } catch (error) {
        // 예외를 삼키지 않는다(FR-024). 실패는 값으로 드러난다.
        return { ok: false, reason: error instanceof Error ? error.message : String(error) };
      }
    },

    async load(day) {
      const contents = await fs.read(fileNameFor(day));
      if (contents === null) return null;

      try {
        return deserializeEntry(contents);
      } catch {
        // 읽을 수 없는 파일을 빈 일기로 만들지 않는다. 없는 것과 같이 다룬다.
        return null;
      }
    },

    async has(day) {
      return (await fs.read(fileNameFor(day))) !== null;
    },

    async listDays() {
      const names = await fs.list();
      return names
        .map(dayFromFileName)
        .filter((day): day is DayDate => day !== null)
        .sort();
    },
  };
}

/**
 * `expo-file-system` 57로 위 통로를 구현한다.
 *
 * `Paths.document` 아래에 둔다 — 시스템이 저장 공간 부족 시 지우지 않는 자리다
 * (`Paths.cache`와 다름). 일기는 사라지면 안 되는 값이다.
 *
 * 지연 import 하는 이유: 001의 on-device 어댑터와 같다. 모듈 해석 자체가 실패할 수 있는
 * 환경(웹·테스트)에서 이 파일을 불러오는 것만으로 무너지지 않게 한다.
 */
export function expoFileSystemPort(directoryName = "diary"): FileSystemPort {
  const openDirectory = async () => {
    const { Directory, File, Paths } = await import("expo-file-system");
    const dir = new Directory(Paths.document, directoryName);
    if (!dir.exists) dir.create({ intermediates: true });
    return { dir, File };
  };

  return {
    async read(name) {
      const { dir, File } = await openDirectory();
      const file = new File(dir, name);
      return file.exists ? file.text() : null;
    },

    /**
     * 임시 파일에 쓰고 제자리로 옮긴다.
     *
     * 바로 덮어쓰면 쓰기 도중 앱이 죽었을 때 반쯤 쓰인 파일이 남아 기존 일기를 잃는다.
     * 옮기기는 원자적이므로 실패해도 기존 파일이 그대로 남는다(FR-023b).
     */
    async writeAtomically(name, contents) {
      const { dir, File } = await openDirectory();

      const temporary = new File(dir, `${name}.writing`);
      if (temporary.exists) temporary.delete();
      temporary.create();
      temporary.write(contents);

      const target = new File(dir, name);
      if (target.exists) target.delete();
      temporary.moveSync(target);
    },

    async list() {
      const { dir } = await openDirectory();
      return dir.list().map((item) => item.name ?? "");
    },
  };
}
