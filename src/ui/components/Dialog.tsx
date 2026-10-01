/**
 * 050 — 대화상자 기반 (보드 `2d`·`2j`, 설계 §3.1).
 *
 * 계약: specs/050-dialog-foundation/contracts/dialogs.md DLG1~DLG7, data-model.md §4
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * **두 종류다**(spec FR-002).
 * - `ConfirmDialog` — 확인 대화상자(RNR AlertDialog). 덮개를 눌러도 닫히지 않는다 — 반드시 둘 중 하나를
 *   고른다. 안드로이드 뒤로 가기는 `onCancel`과 같다. `onCancel`이 없으면(다운로드 동의 — 045) 뒤로 가기가
 *   아무것도 바꾸지 않지만 앱을 닫지도 않는다.
 * - `DismissibleDialog` — 일반 대화상자(RNR Dialog). 덮개·뒤로 가기로 닫힌다.
 *
 * **보드 모양은 여기 한 곳이 준다**(FR-003·FR-008) — 면은 직선(반경 0)·2px 글자색 테두리·그림자·여백 24·
 * 간격 16·좌우 20, 버튼만 반경 6·높이 48. 이후 조각(`2f`·`2m`)이 같은 부품을 쓴다(FR-004).
 *
 * **색은 토큰에서만 온다**(C5, DLG7) — 이 파일에 색 리터럴이 없다. 동작 버튼 글자는 `accentForeground`
 * (보드의 오프화이트)다.
 *
 * **닫기 콜백은 ref로 읽는다**(research R3) — 프리미티브는 뒤로 가기 핸들러를 마운트 시점에 한 번 등록해
 * 그때의 `onOpenChange`를 붙잡는다. 부르는 쪽이 매 렌더 새 함수를 넘겨도 최신 것이 불리게 한다.
 *
 * `className`과 인라인 `style`을 함께 준다 — jest에는 NativeWind 변환이 없다(034).
 *
 * ★ 056 — **화면보다 높아지면 안전 영역 안에서 본문이 스크롤된다**(DLG8). 글꼴 2.0배에서 장소 이름 대화상자(`6l`)가 화면보다
 * 높아져 위는 상태 표시줄, 아래는 내비게이션 바 밑으로 들어갔다(2026-10-02 실기기). 덮개는 위·아래에도 안전 영역 + 바깥 여백을
 * 두고, 면은 그 안에서 줄어들 수 있으며, `DismissibleDialog`의 본문(제목·부제 밖)은 스크롤 뷰에 담긴다. 안전 영역은 루트의
 * `SafeAreaProvider`에서 읽는다 — 없으면(jest) 0이다. 대화상자는 edge-to-edge 포털에 그려지므로 인셋을 직접 더해야 한다.
 * 부제(`subtitle`)는 제목과 간격 6의 한 묶음이다(보드 `6f`의 시간대 줄) — 본문 첫 줄로 두면 스크롤 뷰 위쪽에서 잘린다.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useContext, useLayoutEffect, useRef, type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "../rnr/alert-dialog";
import { Button } from "../rnr/button";
import { Dialog, DialogContent, DialogTitle } from "../rnr/dialog";
import { Text } from "../rnr/text";
import { AppText } from "./Text";
import { COLORS, DIALOG, OVERLAY, RADIUS } from "../theme/tokens";

/**
 * 최신 값을 담는 ref — 마운트 시점에 붙잡힌 콜백도 지금의 함수를 부르게 한다. 렌더 중에 ref를 쓰지
 * 않도록(react-hooks/refs) 커밋 직후에 옮긴다 — 뒤로 가기·덮개 누름은 언제나 커밋 뒤에 온다.
 */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

export type ConfirmDialogProps = {
  open: boolean;
  /** 뒤로 가기가 부른다. 없으면 뒤로 가기는 아무것도 바꾸지 않는다(앱도 닫지 않는다) */
  onCancel?: () => void;
  title: string;
  description?: string;
  /** 설명 아래 덧붙는 내용 (예: 오늘 안내 한 줄 — 050 FR-007a) */
  children?: ReactNode;
  /** 버튼들 — 위에서 아래로 쌓인다(동작이 위) */
  actions: ReactNode;
  /** 면의 testID. 덮개는 `<testID>-overlay`, 버튼 줄은 `<testID>-footer` */
  testID: string;
};

export function ConfirmDialog({
  open,
  onCancel,
  title,
  description,
  children,
  actions,
  testID,
}: ConfirmDialogProps) {
  const cancel = useLatest(onCancel);
  const overlayStyle = useOverlayStyle();
  return (
    <AlertDialog
      onOpenChange={(next) => {
        if (!next) cancel.current?.();
      }}
      open={open}
    >
      <AlertDialogContent
        className="border-2 border-foreground"
        overlayStyle={overlayStyle}
        overlayTestID={`${testID}-overlay`}
        style={FACE}
        testID={testID}
      >
        <AlertDialogTitle style={TITLE}>{title}</AlertDialogTitle>
        {description !== undefined && (
          <AlertDialogDescription style={DESCRIPTION}>{description}</AlertDialogDescription>
        )}
        {children}
        <View style={FOOTER} testID={`${testID}-footer`}>
          {actions}
        </View>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export type DismissibleDialogProps = {
  open: boolean;
  /** 덮개·뒤로 가기가 부른다 */
  onClose: () => void;
  title: string;
  /** 056 — 제목 바로 아래(간격 6) 보조 줄. 스크롤 밖에 제목과 한 묶음으로 선다(보드 `6f`의 시간대 줄) */
  subtitle?: string;
  subtitleTestID?: string;
  children?: ReactNode;
  /** 면의 testID. 덮개는 `<testID>-overlay`, 본문 스크롤은 `<testID>-body` */
  testID: string;
};

export function DismissibleDialog({
  open,
  onClose,
  title,
  subtitle,
  subtitleTestID,
  children,
  testID,
}: DismissibleDialogProps) {
  const close = useLatest(onClose);
  const overlayStyle = useOverlayStyle();
  return (
    <Dialog
      onOpenChange={(next) => {
        if (!next) close.current();
      }}
      open={open}
    >
      <DialogContent
        className="border-2 border-foreground"
        overlayStyle={overlayStyle}
        overlayTestID={`${testID}-overlay`}
        style={FACE}
        testID={testID}
      >
        <View style={HEAD} testID={`${testID}-head`}>
          <DialogTitle style={TITLE}>{title}</DialogTitle>
          {subtitle !== undefined && (
            <AppText style={SUBTITLE} testID={subtitleTestID}>
              {subtitle}
            </AppText>
          )}
        </View>
        {children !== undefined && (
          <ScrollView contentContainerStyle={BODY} style={BODY_SCROLL} testID={`${testID}-body`}>
            {children}
          </ScrollView>
        )}
      </DialogContent>
    </Dialog>
  );
}

type ButtonProps = { onPress: () => void; children: string; testID?: string };

/** 동작 버튼 — accent 배경, 검정 글자(C5). 보드 `AlertDialogAction` */
export function DialogActionButton({ onPress, children, testID }: ButtonProps) {
  return (
    <Button onPress={onPress} style={ACTION} testID={testID} variant="default">
      <Text style={[LABEL, { color: COLORS.accentForeground }]}>{children}</Text>
    </Button>
  );
}

/** 취소 버튼 — 1px 글자색 테두리, 전폭. 보드 `AlertDialogCancel`·`2j` 취소 */
export function DialogCancelButton({ onPress, children, testID }: ButtonProps) {
  return (
    <Button onPress={onPress} style={CANCEL} testID={testID} variant="outline">
      <Text style={[LABEL, { color: COLORS.text }]}>{children}</Text>
    </Button>
  );
}

/** 설명 아래 덧붙는 한 줄 — 설명과 같은 모양 (예: 오늘 안내, 050 FR-007a) */
export function DialogNote({ children, testID }: { children: string; testID?: string }) {
  return (
    <Text style={DESCRIPTION} testID={testID}>
      {children}
    </Text>
  );
}

/**
 * 덮개 — 좌우 바깥 여백 20, 위·아래는 안전 영역(상태 표시줄·내비게이션 바) + 20(056 DLG8). 포털은 edge-to-edge 화면 전체에
 * 그려지므로 인셋을 여기서 더한다. `SafeAreaProvider`가 없으면(jest) 인셋은 0이다.
 */
function useOverlayStyle() {
  const insets = useContext(SafeAreaInsetsContext);
  return {
    ...OVERLAY_STYLE,
    paddingTop: (insets?.top ?? 0) + DIALOG.inset,
    paddingBottom: (insets?.bottom ?? 0) + DIALOG.inset,
  };
}

const OVERLAY_STYLE = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: DIALOG.inset,
  backgroundColor: OVERLAY.scrim,
} as const;

const FACE = {
  width: "100%",
  backgroundColor: COLORS.bg,
  borderWidth: DIALOG.borderWidth,
  borderColor: COLORS.text,
  borderRadius: 0,
  padding: DIALOG.padding,
  gap: DIALOG.gap,
  boxShadow: OVERLAY.faceShadow,
  // 056 DLG8 — 덮개 높이를 넘으면 줄어든다(안의 본문 스크롤이 나머지를 맡는다).
  flexShrink: 1,
} as const;

/** 056 — 제목과 부제의 한 묶음(간격 6) */
const HEAD = { gap: DIALOG.subtitleGap } as const;

/** 056 — 부제 13·보조색·줄높이 1.55(보드 `6f` 시간대 줄, body 기본 줄높이) */
const SUBTITLE = {
  fontSize: DIALOG.subtitleSize,
  lineHeight: DIALOG.subtitleSize * DIALOG.lineHeightRatio,
  color: COLORS.textMuted,
} as const;

/** 056 — 본문 스크롤. 넘칠 때만 줄어든다 */
const BODY_SCROLL = { flexGrow: 0, flexShrink: 1 } as const;

/** 본문 요소 사이도 면과 같은 간격 16 */
const BODY = { gap: DIALOG.gap } as const;

/** 제목 20/700, 줄높이 1.3 */
const TITLE = { fontSize: 20, fontWeight: "700", lineHeight: 26, color: COLORS.text } as const;

/** 설명 16, 줄높이 1.5, 보조색 */
const DESCRIPTION = { fontSize: 16, lineHeight: 24, color: COLORS.textMuted } as const;

const FOOTER = { flexDirection: "column", gap: DIALOG.buttonGap } as const;

const BUTTON_BASE = {
  width: "100%",
  height: DIALOG.buttonHeight,
  borderRadius: RADIUS.control,
  alignItems: "center",
  justifyContent: "center",
} as const;

const ACTION = { ...BUTTON_BASE, backgroundColor: COLORS.accent } as const;

const CANCEL = {
  ...BUTTON_BASE,
  backgroundColor: COLORS.bg,
  borderWidth: 1,
  borderColor: COLORS.text,
} as const;

/** 버튼 글자 16/600 */
const LABEL = { fontSize: 16, fontWeight: "600" } as const;
