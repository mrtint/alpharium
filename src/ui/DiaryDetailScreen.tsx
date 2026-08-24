/**
 * 일기 전문 화면.
 *
 * 계약: specs/006-first-diary-app/contracts/screens.md §2
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **여기서 지키는 것**:
 *  - 모델 식별자·파라미터·양자화·파일 이름을 보이지 않는다(S4, 원칙 III). **캐릭터
 *    이름조차 보이지 않는다** — 관측 근거가 없어 표시 문안을 아직 짓지 않았고(003·005),
 *    내부 식별자를 그대로 보이면 그것으로 모델을 역추적할 수 있다
 *  - 생성 시간·속도·토큰 수를 보이지 않는다(S5, 원칙 IV)
 *  - **`unknown`과 `none`을 다른 말로 옮긴다**(FR-032, 원칙 V) — 004가 값에서 지킨
 *    구분이 화면에서 무너지면 무의미해진다
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { topicParticleFor } from "../diary/particle";
import { personaOf } from "../diary/persona";
import type { DiaryEntry } from "../diary/types";
import type { DaySignals, SignalValue } from "../signals/types";

export type DiaryDetailScreenProps = {
  entry: DiaryEntry;
  /**
   * 저장됐는가 (006 FR-012b).
   *
   * 목록에서 연 일기는 이미 저장된 것이므로 기본값이 `true`다. 방금 생성했는데 저장에
   * 실패한 경우에만 `false`가 온다.
   */
  saved?: boolean;
  /**
   * 이전 일기를 덮어썼는가 (006 FR-034, 002 FR-023a).
   *
   * **조용히 덮어쓰면 사용자는 이전 일기가 사라진 줄도 모른다.** 목록에서 연 일기는
   * 방금 쓴 것이 아니므로 기본값이 `false`다.
   */
  overwrote?: boolean;
};

/**
 * 신호 하나를 사람이 읽는 말로 옮긴다 (FR-032).
 *
 * **세 갈래가 서로 다른 문장이 된다.** `none`은 「없었다」이고 `unknown`은 「모른다」이며,
 * 둘을 같은 말로 적으면 004가 지킨 구분이 여기서 무너진다 — 모르는 것을 「없었다」로
 * 적으면 화면이 거짓을 말한다.
 *
 * **`unknown`에 까닭을 싣지 않는다.** 「권한이 없다」·「안드로이드가 안 준다」는
 * 프롬프트가 모델에게 하는 말이고(005 `prompt.ts`), 화면에는 「모른다」로 충분하다.
 */
function describe<T>(signal: SignalValue<T>, known: (value: T) => string): string {
  switch (signal.kind) {
    case "known":
      return known(signal.value);
    case "none":
      return "없었다";
    case "unknown":
      return "모른다";
  }
}

/**
 * 그 일기가 무엇을 보고 쓰였는가 (002 FR-011).
 *
 * **012 — 걸음·배터리·연결이 빠졌다**(`USER_VISIBLE_SIGNAL_AXES`, FR-006·007).
 * 이 화면에는 원래도 배터리·연결 줄이 없었다 — 여기서 새로 빠진 것은 걸음뿐이다.
 * 사진·다닌 자리는 실제로 수집되는 축이라 그대로 남는다(FR-008).
 *
 * **017 — `placeName`이 있으면 "다닌 자리" 줄이 "대표 장소 · N곳" 형태로
 * 바뀐다**(contracts/place-name.md L2·L6·L7). 없으면(설정이 꺼져 있거나
 * 좌표가 없음) 기존 그대로다 — 회귀가 없다.
 */
function signalLines(
  signals: DaySignals,
  placeName?: DiaryEntry["placeName"],
): { label: string; value: string }[] {
  const placesValue = describe(signals.places, (places) => {
    if (placeName === undefined) return `${places.trace.visitCount}곳`;
    const name = placeName.kind === "known" ? placeName.value : "모른다";
    return `대표 장소 · ${name} · ${places.trace.visitCount}곳`;
  });

  return [
    {
      label: "사진",
      value: describe(signals.photos, (observation) => `${observation.photos.length}장`),
    },
    { label: "다닌 자리", value: placesValue },
  ];
}

/**
 * 밀리초를 "M분 SS초" 또는(1분 미만) "SS초"로 옮긴다 (017 T10,
 * contracts/elapsed-time.md).
 *
 * 초 단위로 내림한다 — 사후 서술이 "약 2분 10초 걸렸다"는 감각과 맞으면
 * 충분하고, 밀리초 단위 정밀도는 "측정 장치" 인상을 준다(원칙 IV의 정신).
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`;
}

/**
 * "이 일기가 본 것" 절의 제목 (017 US3, contracts/elapsed-time.md T5~T9, 헌법 1.2.0).
 *
 * **고정 타이틀 대신 캐릭터 문장이 그 자리를 대신한다** — `{이름}는 이렇게 일기를
 * 작성했어요.`가 곧 절 제목이며, 소요 시간 문장(있으면)은 그 아래 본문에만 있다.
 * `entry.timing`이 없으면(옛 일기) 원래 고정 타이틀로 되돌아간다(FR-018, 회귀 없음).
 */
function SignalsTitle({ entry }: { entry: DiaryEntry }) {
  if (entry.timing === undefined) {
    return <Text style={styles.signalsTitle}>이 일기가 본 것</Text>;
  }

  const name = personaOf(entry.character).name;
  const particle = topicParticleFor(name);

  return (
    <Text style={styles.signalsTitle}>
      {name}
      {particle} 이렇게 일기를 작성했어요.
    </Text>
  );
}

/**
 * 소요 시간 문장 (017 US3, contracts/elapsed-time.md T5~T9, 헌법 1.2.0).
 *
 * **완료된 생성 1건의 사실만 담는다** — 비교·평균·모델 식별자는 문장 틀
 * 자체에 자리가 없다(T8). 캐릭터 이름 문장은 `SignalsTitle`이 타이틀 자리로
 * 가져갔으므로 여기서는 되풀이하지 않는다.
 */
function TimingLines({ entry }: { entry: DiaryEntry }) {
  const timing = entry.timing;
  if (timing === undefined) return null;

  // T6 — `timing.visionMs`가 있을 때만 유의미한 장수이므로 `entry.photos?.length`
  // (캡션 성공한 사진 수, User Story 1과 공유하는 값)를 그대로 쓴다.
  const photoCount = entry.photos?.length ?? 0;

  return (
    <>
      {timing.visionMs !== undefined && (
        <Text style={styles.signal}>
          사진을 {photoCount}장을 분석하는 데 {formatDuration(timing.visionMs)}가 걸렸어요.
        </Text>
      )}
      <Text style={styles.signal}>
        일기를 작성하는 데 {formatDuration(timing.writingMs)}가 걸렸어요.
      </Text>
    </>
  );
}

/**
 * 사진 한 장 — 리사이즈 사본이 놓인 로컬 파일을 그린다 (017 FR-001).
 *
 * **개별 실패가 나머지를 무너뜨리지 않는다**(FR-002, contracts/
 * photo-preservation.md P6, 011의 E4와 같은 원칙이 화면 레벨에서 반복). 보존된
 * 사본 자체를 못 불러오면(드문 경우 — 저장소 손상 등) 그 사진 하나만 "이제
 * 없다"로 대체한다.
 */
function DiaryPhoto({ resizedPath }: { resizedPath: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View style={[styles.photo, styles.photoMissing]}>
        <Text style={styles.photoMissingText}>이 사진은 이제 없다</Text>
      </View>
    );
  }

  return (
    <Image
      testID="diary-photo"
      source={{ uri: `file://${resizedPath}` }}
      style={styles.photo}
      onError={() => setFailed(true)}
    />
  );
}

export function DiaryDetailScreen({
  entry,
  saved = true,
  overwrote = false,
}: DiaryDetailScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.day}>{entry.date}</Text>

      {/* 014 — 제목이 있으면 날짜 아래에 보인다(FR-011). 없으면 아무것도 없다 */}
      {entry.title !== undefined && <Text style={styles.title}>{entry.title}</Text>}

      {/* **저장하지 못했으면 남지 않는다는 것을 말한다**(FR-012b) */}
      {!saved && (
        <Text style={styles.unsaved}>저장하지 못했다. 앱을 나가면 이 일기는 사라진다</Text>
      )}

      {/* **덮어썼다는 사실을 알린다**(FR-034) — 사라진 일기는 되돌릴 수 없다 */}
      {overwrote && <Text style={styles.overwrote}>이전 일기를 덮어썼다</Text>}

      {/* 일기가 길면 스크롤된다 */}
      <Text style={styles.text}>{entry.text}</Text>

      {/*
        017 — VLM이 실제로 분석한 사진들(FR-001). `entry.photos`가 없으면(옛
        일기, 또는 사진을 안 본 생성) 이 영역 자체가 없다 — 기존 "사진: N장"
        텍스트만 남는다(FR-003, 회귀 없음).
      */}
      {entry.photos !== undefined && entry.photos.length > 0 && (
        <View style={styles.photos}>
          {entry.photos.map((photo) => (
            <DiaryPhoto key={photo.photoId} resizedPath={photo.resizedPath} />
          ))}
        </View>
      )}

      {/*
        무엇을 보고 썼는가(002 FR-011). **모르는 것과 없는 것이 구분된다**(원칙 V).
      */}
      <View style={styles.signals}>
        <SignalsTitle entry={entry} />
        {signalLines(entry.signalsUsed, entry.placeName)
          // 017 — `timing.visionMs`가 있으면 아래 TimingLines의 "사진을 N장을
          // 분석하는 데 ..." 문장이 이미 장수를 말하므로 "사진: N장" 줄은
          // 같은 사실의 중복이다(사용자 실기기 확인). visionMs가 없을 때만
          // (사진 0장·옛 일기) 여기가 유일한 정보원이므로 남긴다.
          .filter((line) => !(line.label === "사진" && entry.timing?.visionMs !== undefined))
          .map((line) => (
            <Text key={line.label} style={styles.signal}>
              {line.label}: {line.value}
            </Text>
          ))}
        {/*
          017 US3 — 소요 시간 사후 기록(헌법 1.2.0). `entry.timing`이 없으면
          (옛 일기) 문장 자체가 없다(FR-018, 회귀 없음).
        */}
        <TimingLines entry={entry} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 16 },
  day: { fontSize: 14, opacity: 0.6 },
  title: { fontSize: 20, fontWeight: "600" },
  unsaved: { fontSize: 14 },
  overwrote: { fontSize: 13, opacity: 0.7 },
  text: { fontSize: 16, lineHeight: 26 },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photo: { width: 96, height: 96, borderRadius: 8, backgroundColor: "#eee" },
  photoMissing: { alignItems: "center", justifyContent: "center", padding: 4 },
  photoMissingText: { fontSize: 11, opacity: 0.6, textAlign: "center" },
  signals: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ccc",
    gap: 4,
  },
  signalsTitle: { fontSize: 13, opacity: 0.6, marginBottom: 4 },
  signal: { fontSize: 14, opacity: 0.8 },
});
