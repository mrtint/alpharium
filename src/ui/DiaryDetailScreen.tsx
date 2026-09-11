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

import { useEffect, useRef, useState } from "react";
import {
  Image,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { topicParticleFor } from "../diary/particle";
import { PERSONA_NAMES } from "../diary/persona";
import type { DiaryEntry } from "../diary/types";
import type { DaySignals, SignalValue } from "../signals/types";
import { AppText } from "./components/Text";
import { TypewriterText } from "./components/TypewriterText";
import { COLORS, RADIUS, REVEAL } from "./theme/tokens";

/**
 * 032 — 풀스크린 사진 뷰어의 배경/글자.
 *
 * 갤러리는 **미디어 뷰어**라 앱 팔레트를 따르지 않고 관례대로 검은 배경 +
 * 흰 글자를 쓴다(사진을 방해 없이 보이기 위함 — 025 설계). 앱 라이트 톤과
 * 별개이며 `tokens.ts`의 9역할에 들어가지 않는 의도적 예외다.
 */
const PHOTO_VIEWER = { bg: "black", fg: "white" } as const;

export type DiaryDetailScreenProps = {
  entry: DiaryEntry;
  /**
   * 이 일기의 작성자를 지금 뭐라 부르는가 (035 FR-018·FR-026b).
   *
   * **조립부가 만든 문자열만 받는다** — 화면은 사용자 지정 이름의 저장·폴백
   * 규칙을 모른다(FR-017의 단일 통과 지점). 주지 않으면 `entry.authorName`
   * (생성 시점 스냅샷)을 쓰고, 그것도 없으면(옛 일기) 코드 안 기본 이름으로
   * 떨어진다 — 어느 경우에도 빈 이름이 나오지 않는다(SC-005).
   */
  currentAuthorName?: string;
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
  /**
   * 생성 직후 첫 표시인가 (038 FR-001, contracts/diary-reveal.md A).
   *
   * **`{ kind: "written" }` 케이스에서만 참으로 전달된다** — 목록에서 연
   * `{ kind: "detail" }` 경로는 이 prop을 안 넘긴다(FR-007, SC-004 회귀).
   * 참이면 제목→본문을 글자 단위로 노출하고, 본문 노출이 끝나기 전에는
   * "이 일기가 본 것" 절·사진 슬라이더·갤러리가 화면에 없다(FR-003).
   */
  reveal?: boolean;
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
function SignalsTitle({
  entry,
  currentAuthorName,
}: {
  entry: DiaryEntry;
  currentAuthorName?: string;
}) {
  if (entry.timing === undefined) {
    return (
      <AppText variant="caption" style={{ marginBottom: 4 }}>
        이 일기가 본 것
      </AppText>
    );
  }

  /*
   * 035 — **생성 시점 이름이 우선이다**(FR-026a·b). 사용자가 나중에 이름을 바꿔도
   * 이 일기는 그때 그 이름으로 쓴 것이 사실이다. 스냅샷이 없는 옛 일기만 현재
   * 이름으로 폴백하며, **소급 생성하지 않는다**(원칙 V — 그 시점 이름은 관측된
   * 적이 없다).
   *
   * ★ 037 — **로스터에서 빠진 캐릭터가 쓴 일기도 읽혀야 한다**(FR-008, 계약 C4).
   *
   * `entry.character`는 파일에서 오는 값이라 로스터에 없는 식별자일 수 있다
   * (037로 넷이 나갔고, 그 캐릭터들이 쓴 일기는 기기에 그대로 남아 있다).
   * `authorName`은 옵셔널이므로(035 이전 일기에 없다) 둘이 겹치면 `personaOf()`가
   * 페르소나를 못 찾는다.
   *
   * **`personaOf()`를 고쳐 기본값을 돌려주지 않는다** — 로스터 밖 캐릭터에 페르소나가
   * 돌아오면 "로스터에 없는데 성격은 있다"가 되어 원칙 III의 경계가 흐려진다.
   * 방어는 읽는 쪽인 여기에 둔다.
   *
   * 이름을 못 찾으면 **작성자 줄만 빼고 나머지(날짜·본문·사진·신호)는 그대로
   * 보인다** — 사용자의 기록을 잃게 하지 않는 것이 이 방어의 목적이며, 내부
   * 식별자를 대신 보이거나 이름을 지어내지 않는다.
   */
  const persona = PERSONA_NAMES[entry.character];
  const name = entry.authorName ?? currentAuthorName ?? persona;
  if (name === undefined) return null;

  const particle = topicParticleFor(name);

  return (
    <AppText variant="caption" style={{ marginBottom: 4 }}>
      {name}
      {particle} 이렇게 일기를 작성했어요.
    </AppText>
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
        <AppText variant="body" style={{ opacity: 0.8 }}>
          사진을 {photoCount}장을 분석하는 데 {formatDuration(timing.visionMs)}가 걸렸어요.
        </AppText>
      )}
      <AppText variant="body" style={{ opacity: 0.8 }}>
        일기를 작성하는 데 {formatDuration(timing.writingMs)}가 걸렸어요.
      </AppText>
    </>
  );
}

/** 이 일기가 실제로 분석한 사진 하나의 참조 (017, `DiaryEntry.photos[]`의 항목). */
type PhotoRef = { photoId: string; takenAt: Date; resizedPath: string };

/** 사본을 못 불러왔을 때 그 자리에 남기는 문구 (017 FR-002). 두 곳이 공유한다. */
const PHOTO_MISSING = "이 사진은 이제 없다";

/**
 * 가로 페이저의 스크롤 위치에서 현재 페이지 인덱스를 낸다 (025, contracts/
 * photo-gallery.md C3·C14).
 *
 * `contentOffset.x`를 컨테이너 폭으로 나눠 반올림한다 — 스크롤 도중 값이 흘러도
 * 가장 가까운 페이지로 수렴하고, `pagingEnabled` 스냅이 끝나면 정확히 맞는다.
 * `width`가 아직 0이면(첫 `onLayout` 전) 0을 돌려준다. `count`로 범위를 클램프해
 * 마지막 다음으로 넘어가지 않는다(C13).
 */
function pageIndexFromScroll(e: NativeSyntheticEvent<NativeScrollEvent>, count: number): number {
  const { contentOffset, layoutMeasurement } = e.nativeEvent;
  const width = layoutMeasurement.width;
  if (width <= 0) return 0;
  const raw = Math.round(contentOffset.x / width);
  return Math.max(0, Math.min(count - 1, raw));
}

/**
 * 사진 한 장 — 리사이즈 사본이 놓인 로컬 파일을 그린다 (017 FR-001, 025 FR-004).
 *
 * **개별 실패가 나머지를 무너뜨리지 않는다**(FR-002, contracts/
 * photo-preservation.md P6, 011의 E4와 같은 원칙이 화면 레벨에서 반복). 보존된
 * 사본 자체를 못 불러오면(드문 경우 — 저장소 손상 등) 그 사진 하나만 "이제
 * 없다"로 대체한다.
 *
 * **025 — 슬라이더·갤러리가 공유한다.** `style`로 크기를 주입받고
 * `resizeMode="contain"`으로 세로/가로 긴 사진도 잘리지 않게 한다(025 Edge
 * Cases). 실패 대체 뷰에 `testID="diary-photo-missing"`을 새로 달았다 — 기존
 * `testID="diary-photo"`와 문구는 그대로다(017 회귀).
 */
function DiaryPhoto({ resizedPath, style }: { resizedPath: string; style?: object }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View testID="diary-photo-missing" style={[style ?? styles.photo, styles.photoMissing]}>
        <Text style={styles.photoMissingText}>{PHOTO_MISSING}</Text>
      </View>
    );
  }

  return (
    <Image
      testID="diary-photo"
      source={{ uri: `file://${resizedPath}` }}
      style={style ?? styles.photo}
      resizeMode="contain"
      onError={() => setFailed(true)}
    />
  );
}

/**
 * 본문 가로 사진 슬라이더 (025 User Story 1, contracts/photo-gallery.md §A).
 *
 * 017의 `flexWrap` 격자를 대체한다 — 한 번에 한 장이 화면 폭에 맞춰 보이고,
 * 좌우 스와이프로 넘긴다. 사진을 탭하면 `onOpen(index)`로 풀스크린 갤러리를
 * 연다. 위치 표시는 `{현재} / {전체}` 순번이며 성능 지표가 아니다(FR-018).
 */
function PhotoSlider({ photos, onOpen }: { photos: PhotoRef[]; onOpen: (index: number) => void }) {
  const window = useWindowDimensions();
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [current, setCurrent] = useState(0);

  // `onLayout` 전에는 창 폭을 폴백으로 쓴다 — 셀 폭이 0이면 사진이 안 보인다(C7).
  const width = layoutWidth > 0 ? layoutWidth : window.width;

  return (
    <View style={styles.sliderFrame} onLayout={(e) => setLayoutWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        testID="photo-slider-pager"
        horizontal
        pagingEnabled
        disableIntervalMomentum
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => setCurrent(pageIndexFromScroll(e, photos.length))}
        onMomentumScrollEnd={(e) => setCurrent(pageIndexFromScroll(e, photos.length))}
      >
        {photos.map((photo, index) => (
          <Pressable
            key={photo.photoId}
            testID={`photo-slider-cell-${index}`}
            accessibilityRole="imagebutton"
            onPress={() => onOpen(index)}
            style={{ width }}
          >
            <DiaryPhoto resizedPath={photo.resizedPath} style={[styles.sliderPhoto, { width }]} />
          </Pressable>
        ))}
      </ScrollView>

      <Text
        testID="photo-slider-position"
        accessibilityLabel={`${current + 1} / ${photos.length}`}
        style={styles.photoPosition}
      >
        {`${current + 1} / ${photos.length}`}
      </Text>
    </View>
  );
}

/**
 * 풀스크린 사진 갤러리 (025 User Story 2, contracts/photo-gallery.md §B).
 *
 * 코어 `Modal` 위에 슬라이더와 같은 가로 페이저를 얹는다. `onRequestClose`가
 * 안드로이드 뒤로 가기를, `testID="photo-gallery-close"` 버튼이 명시적 닫기를
 * 받는다 — 아래로 쓸어 닫기·배경 탭 닫기는 넣지 않는다(FR-013).
 *
 * **부모가 `gallery.open`으로 마운트를 제어한다** — 이 컴포넌트가 살아 있는
 * 동안은 항상 열린 상태다. 부모가 리렌더돼도(회전·백그라운드) `gallery.open`이
 * 유지되므로 이 컴포넌트와 `current` 상태가 언마운트되지 않는다(FR-015a, C18a).
 * `initialIndex`로의 첫 스크롤은 `layoutWidth`가 정해진 뒤에만 한다(C11 타이밍
 * 함정 — `layoutWidth`는 첫 `onLayout` 전엔 0이라 `x = index * 0 = 0`으로 잘못
 * 스크롤된다).
 */
function PhotoGalleryModal({
  photos,
  initialIndex,
  onClose,
}: {
  photos: PhotoRef[];
  initialIndex: number;
  onClose: () => void;
}) {
  const window = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [current, setCurrent] = useState(initialIndex);
  const scrolledTo = useRef<number | null>(null);

  const width = layoutWidth > 0 ? layoutWidth : window.width;

  // `layoutWidth`가 정해진 뒤에만 초기 위치로 스크롤한다(C11).
  useEffect(() => {
    if (layoutWidth <= 0) return;
    if (scrolledTo.current === initialIndex) return;
    scrollRef.current?.scrollTo({ x: initialIndex * layoutWidth, animated: false });
    scrolledTo.current = initialIndex;
  }, [layoutWidth, initialIndex]);

  return (
    <Modal testID="photo-gallery" visible animationType="fade" onRequestClose={onClose}>
      <View
        style={styles.galleryFrame}
        onLayout={(e) => setLayoutWidth(e.nativeEvent.layout.width)}
      >
        <ScrollView
          testID="photo-gallery-pager"
          ref={scrollRef}
          horizontal
          pagingEnabled
          disableIntervalMomentum
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => setCurrent(pageIndexFromScroll(e, photos.length))}
          onMomentumScrollEnd={(e) => setCurrent(pageIndexFromScroll(e, photos.length))}
        >
          {photos.map((photo) => (
            <View key={photo.photoId} style={[styles.galleryPage, { width }]}>
              <DiaryPhoto resizedPath={photo.resizedPath} style={styles.galleryPhoto} />
            </View>
          ))}
        </ScrollView>

        <Text
          testID="photo-gallery-position"
          accessibilityLabel={`${current + 1} / ${photos.length}`}
          style={styles.galleryPosition}
        >
          {`${current + 1} / ${photos.length}`}
        </Text>

        <Pressable
          testID="photo-gallery-close"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.galleryClose}
        >
          <Text style={styles.galleryCloseText}>닫기</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

/** 갤러리 표시 상태 (025, data-model.md §2). 화면 로컬 — 파일에 저장하지 않는다. */
type GalleryState = { open: false } | { open: true; index: number };

export function DiaryDetailScreen({
  entry,
  currentAuthorName,
  saved = true,
  overwrote = false,
  reveal = false,
}: DiaryDetailScreenProps) {
  // 025 — 갤러리 표시 상태. 화면 로컬이며 파일·스토리지에 저장하지 않는다(SC-006).
  // 회전·백그라운드 전환에서 React state가 유지되므로 갤러리가 같은 사진에서
  // 살아남는다(FR-015a) — 별도 복원 로직 없음.
  const [gallery, setGallery] = useState<GalleryState>({ open: false });
  const photos = entry.photos;
  const hasPhotos = photos !== undefined && photos.length > 0;

  const hasTitle = entry.title !== undefined;

  /*
   * 038 — 첫 표시 타자기 연출(data-model.md §2, contracts/diary-reveal.md A).
   *
   * `reveal`이 거짓이면(목록 재진입 `detail` 경로) 둘 다 초기값부터 `true`라
   * 이 기능 도입 전과 100% 동일하게 렌더된다(SC-004 회귀) — 코드 추가 없이
   * 초기값 계산만으로 성립한다(009 FR-008 대응, T026).
   *
   * 제목이 없으면 `titleDone`이 처음부터 `true`라 본문부터 시작한다(FR-002).
   */
  const [titleDone, setTitleDone] = useState(!(reveal && hasTitle));
  const [revealDone, setRevealDone] = useState(!reveal);

  /*
   * skip 시 두 상태를 함께 설정한다(U1, analyze 지적) — 제목이 아직 안 끝난
   * 시점에 탭해도 본문 `TypewriterText`가 다음 렌더에서 `skipToEnd=true`로
   * 첫 마운트되어 즉시 전체로 이어진다("한 박자 늦게 채워짐" 방지).
   */
  const onSkip = () => {
    setTitleDone(true);
    setRevealDone(true);
  };

  const showBottomSection = revealDone;

  return (
    <ScrollView
      className="bg-bg"
      contentContainerStyle={styles.page}
      style={{ backgroundColor: COLORS.bg }}
    >
      <AppText variant="caption">{entry.date}</AppText>

      {/* 014 — 제목이 있으면 날짜 아래에 보인다(FR-011). 없으면 아무것도 없다.
          038 — reveal 중에는 타자기로, 아니면(또는 완료 후) 즉시 전체. */}
      {hasTitle &&
        (reveal ? (
          <TypewriterText
            text={entry.title as string}
            charMs={REVEAL.charMs}
            skipToEnd={titleDone}
            onDone={() => setTitleDone(true)}
            variant="title"
          />
        ) : (
          <AppText variant="title">{entry.title}</AppText>
        ))}

      {/* **저장하지 못했으면 남지 않는다는 것을 말한다**(FR-012b). 038 —
          reveal 여부와 무관하게 즉시 렌더(FR-012, C18) — 사용자가 즉시 알아야
          하는 정보다. */}
      {!saved && <AppText variant="body">저장하지 못했다. 앱을 나가면 이 일기는 사라진다</AppText>}

      {/* **덮어썼다는 사실을 알린다**(FR-034) — 사라진 일기는 되돌릴 수 없다.
          038 — 마찬가지로 reveal과 무관하게 즉시. */}
      {overwrote && <AppText variant="caption">이전 일기를 덮어썼다</AppText>}

      {/* 일기가 길면 스크롤된다. 038 — reveal 중이고 제목이 아직 안 끝났으면
          본문은 렌더하지 않는다(제목 먼저, C3). 제목이 끝났으면(또는 제목이
          없으면) 본문을 타자기로, reveal이 없으면 즉시 전체(회귀). */}
      {(!reveal || titleDone) &&
        (reveal ? (
          <TypewriterText
            text={entry.text}
            charMs={REVEAL.charMs}
            skipToEnd={revealDone}
            onDone={() => setRevealDone(true)}
            variant="body"
            style={{ fontSize: 16, lineHeight: 26 }}
          />
        ) : (
          <AppText variant="body" style={{ fontSize: 16, lineHeight: 26 }}>
            {entry.text}
          </AppText>
        ))}

      {/* 038 — reveal 중이고 아직 안 끝났으면(revealDone === false) 화면을
          덮는 투명 오버레이로 탭 건너뛰기를 받는다(U2, analyze 지적). 루트
          `ScrollView`를 통째로 `Pressable`로 감싸지 않는다 — 스크롤 제스처
          충돌을 피한다. 완료되면 렌더 자체가 사라져 슬라이더·갤러리 탭이
          정상 도달한다(FR-006). */}
      {reveal && !revealDone && (
        <Pressable
          testID="diary-reveal-skip"
          accessibilityRole="button"
          onPress={onSkip}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/*
        025 — VLM이 실제로 분석한 사진들을 가로 슬라이더로 보인다(FR-001).
        017의 `flexWrap` 격자를 대체한다. `entry.photos`가 없으면(옛 일기,
        또는 사진을 안 본 생성) 이 영역 자체가 없다 — 기존 "사진: N장" 텍스트만
        남는다(FR-006·FR-007, 회귀 없음).

        `screen.kind === "writing"`(생성 중)은 `DiaryHomeScreen`의 별도 `View`라
        이 화면(따라서 슬라이더·갤러리)을 거치지 않는다 — 생성 중 미노출은
        구조적으로 성립한다(FR-017, SC-005).

        038 — reveal 중 본문 노출이 끝나기 전에는(showBottomSection === false)
        렌더하지 않는다(FR-003, SC-002) — `hidden`이 아니라 부재 자체다.
      */}
      {hasPhotos && showBottomSection && (
        <PhotoSlider photos={photos} onOpen={(index) => setGallery({ open: true, index })} />
      )}

      {/* 025 — 슬라이더의 사진을 탭하면 풀스크린 갤러리가 그 사진에서 열린다
          (FR-008·FR-009). 사진이 없거나 갤러리가 닫혀 있으면 모달을 마운트하지
          않는다 — 닫으면 상세 화면으로 돌아온다(FR-013). 갤러리가 열린 채
          부모가 리렌더돼도(회전·백그라운드) `gallery.open`이 유지되므로 모달과
          그 내부 상태가 살아남는다(FR-015a, C18a). */}
      {hasPhotos && showBottomSection && gallery.open && (
        <PhotoGalleryModal
          photos={photos}
          initialIndex={gallery.index}
          onClose={() => setGallery({ open: false })}
        />
      )}

      {/*
        무엇을 보고 썼는가(002 FR-011). **모르는 것과 없는 것이 구분된다**(원칙 V).
        038 — reveal 중 본문 노출이 끝나기 전에는 이 절 전체가 없다(FR-003).
      */}
      {showBottomSection && (
        <View style={styles.signals}>
          <SignalsTitle currentAuthorName={currentAuthorName} entry={entry} />
          {signalLines(entry.signalsUsed, entry.placeName)
            // 017 — `timing.visionMs`가 있으면 아래 TimingLines의 "사진을 N장을
            // 분석하는 데 ..." 문장이 이미 장수를 말하므로 "사진: N장" 줄은
            // 같은 사실의 중복이다(사용자 실기기 확인). visionMs가 없을 때만
            // (사진 0장·옛 일기) 여기가 유일한 정보원이므로 남긴다.
            .filter((line) => !(line.label === "사진" && entry.timing?.visionMs !== undefined))
            .map((line) => (
              <AppText key={line.label} variant="body" style={{ opacity: 0.8 }}>
                {line.label}: {line.value}
              </AppText>
            ))}
          {/*
            017 US3 — 소요 시간 사후 기록(헌법 1.2.0). `entry.timing`이 없으면
            (옛 일기) 문장 자체가 없다(FR-018, 회귀 없음).
          */}
          <TimingLines entry={entry} />
        </View>
      )}
    </ScrollView>
  );
}

// 032 — 색은 전부 `tokens.ts`에서. 레이아웃 숫자·`hairlineWidth`만 남는다.
// 025 슬라이더·갤러리 구조는 그대로이고 색만 토큰/뷰어 상수로 바꿨다(SM2).
const styles = StyleSheet.create({
  page: { padding: 20, gap: 16 },
  // 017 격자 잔재. `DiaryPhoto`가 style 미주입 시 폴백으로 쓴다(회귀 안전).
  photo: { width: 96, height: 96, borderRadius: RADIUS.card, backgroundColor: COLORS.border },
  photoMissing: { alignItems: "center", justifyContent: "center", padding: 4 },
  photoMissingText: { fontSize: 11, color: COLORS.textMuted, textAlign: "center" },
  // 025 — 본문 슬라이더.
  sliderFrame: { gap: 6 },
  sliderPhoto: { height: 240, borderRadius: RADIUS.card, backgroundColor: COLORS.border },
  photoPosition: { fontSize: 13, color: COLORS.textMuted, textAlign: "center" },
  // 025 — 풀스크린 갤러리(미디어 뷰어 — 검은 배경, PHOTO_VIEWER 참조).
  galleryFrame: { flex: 1, backgroundColor: PHOTO_VIEWER.bg },
  galleryPage: { flex: 1, alignItems: "center", justifyContent: "center" },
  galleryPhoto: { flex: 1, width: "100%" },
  galleryPosition: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    color: PHOTO_VIEWER.fg,
    fontSize: 14,
    opacity: 0.85,
  },
  galleryClose: {
    position: "absolute",
    top: 8,
    right: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  galleryCloseText: { color: PHOTO_VIEWER.fg, fontSize: 15 },
  signals: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    gap: 4,
  },
});
