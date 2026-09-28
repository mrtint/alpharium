# Research: 대화상자 기반 (050)

조사일 2026-09-28. 분해 설계 §1 C1에 따라 라이브러리는 문서(ctx7)와 **설치본(npm tarball)** 을 함께 봤다.
tarball은 `npm pack`으로 받아 풀어 읽었다(세션 scratchpad, 저장소에 두지 않음).

## R1. 새 패키지에 네이티브 코드가 딸려 오는가 — 없다 (C1·C2)

| 패키지 | 판 | 의존성 | 네이티브 코드 |
| --- | --- | --- | --- |
| `@rn-primitives/alert-dialog` | 1.5.2 | `@radix-ui/react-alert-dialog`(웹 전용 파일에서만 import), `hooks`·`slot`·`types` | 없음 |
| `@rn-primitives/dialog` | 1.5.2 | `@radix-ui/react-dialog`(웹 전용), `hooks`·`slot`·`types` | 없음 |
| `@rn-primitives/dropdown-menu` | 1.5.2 | `@radix-ui/react-dropdown-menu`(웹 전용), `hooks`·`slot`·`utils`·`types` | 없음 |
| `@rn-primitives/portal` | 1.5.3 | `zustand` | 없음 |
| `@rn-primitives/slot`·`hooks`·`types`·`utils` | 1.5.2 | — | 없음 |
| `react-native-ui-datepicker` | 3.3.0 | `dayjs`·`clsx`·`tailwind-merge`·`lodash`·`jalali-plugin-dayjs` | 없음 |
| `class-variance-authority` | 0.7.1 | `clsx` | 없음 |
| `clsx` 2.1.1, `tailwind-merge` 3.x, `dayjs` 1.11.x | — | — | 없음 |

- 확인 방법: 각 tarball에서 `android/`·`*.podspec`·`expo-module.config.json`·`*.java`·`*.kt`를 찾았다 — **0건**.
- **결론**: 새 네이티브 모듈이 없다 → dev(debug) 1회 실기기 검증으로 끝낸다(spec FR-025, C2). release 태스크 없음.
- 출처: `npm view <pkg> version dependencies peerDependencies`, `npm pack <pkg>` 설치본.

## R2. RNR 레지스트리 원본이 네이티브 의존성을 끌고 온다 — 복사할 때 걷어낸다

RNR은 컴포넌트 소스를 복사해 넣는 방식이다(ctx7 `/founded-labs/react-native-reusables`, `installation/manual.mdx`·
`components/alert-dialog.mdx`). 레지스트리 원본(`packages/registry/src/nativewind/components/ui/*.tsx`, GitHub main)을 읽었더니:

- `alert-dialog.tsx`·`dialog.tsx`·`dropdown-menu.tsx`가 **`react-native-screens`의 `FullWindowOverlay`** 를 import한다. iOS에서만 쓰고
  안드로이드는 `React.Fragment`다. 이 저장소에 `react-native-screens`는 없다(네이티브 모듈).
- `dialog.tsx`(닫기 X)·`dropdown-menu.tsx`(하위 메뉴 화살표·체크)가 **`lucide-react-native`**(→ `react-native-svg`, 네이티브)를 import한다.

**Decision**: 복사본에서 `FullWindowOverlay`와 `lucide` 아이콘을 걷어낸다. 보드 `2d`·`2j`에 닫기 X가 없고, 메뉴에 하위 메뉴·체크가 없으므로
잃는 것이 없다. 걷어낸 사실을 복사본 머리 주석에 적고, 계약 테스트가 `src/`에서 `react-native-screens`·`lucide-react-native`·
`react-native-svg` import를 막는다(C2의 전제를 잠근다).
**Alternatives**: 두 패키지 설치 — 네이티브 모듈이 들어와 release 재확인 문제가 생기고(C2) 보드가 쓰지 않는 기능을 위한 것이라 기각.

## R3. 안드로이드 뒤로 가기 — 프리미티브가 스스로 처리한다 (설계 §1 「미확인(짐작)」 해소)

설치본 `dist/*.mjs`를 읽었다.

- `AlertDialog.Content`: 마운트 시 `BackHandler.addEventListener("hardwareBackPress", () => { onOpenChange(false); return true; })`.
  `Overlay`는 `View`라 **누름을 받지 않는다** → 덮개 탭으로 닫히지 않는다. 보드 `2d`와 같다.
- `Dialog.Content`: 같은 BackHandler. `Overlay`는 `Pressable`, `closeOnPress = true`가 기본 → 덮개 탭으로 닫힌다. 보드 `2j`와 같다.
- `DropdownMenu.Content`: 같은 BackHandler + `Overlay` `closeOnPress`. 048 메뉴의 「바깥 누름·뒤로 가기로 닫힘」과 같다.
- 세 핸들러 모두 `useEffect(..., [])`라 **마운트 시점의 `onOpenChange`를 붙잡는다**. 그래서 `onOpenChange`는 매 렌더 새로 만들어도 상관없는
  함수여야 한다 — 상태 setter를 부르거나 ref를 읽는 모양으로 둔다(data-model §4).
- 핸들러가 `true`를 돌려주므로 대화상자가 떠 있는 동안 뒤로 가기는 앱을 닫지 않는다(FR-005).

**다운로드 동의(045)**: 뒤로 가기로도 닫히면 안 된다. `open`을 부모가 쥐고(`visible`) `onOpenChange`를 **무시**하면, 프리미티브의
BackHandler가 `true`로 소비하되 아무것도 바뀌지 않는다 — 지금 `Modal onRequestClose={() => {}}`와 같은 결과다.

## R4. 포털 — 루트에 `PortalHost` 하나

ctx7 `installation/manual.mdx`: 「Render the PortalHost … as the last child of your providers」. `@rn-primitives/*`의 `Portal`은 열려 있을 때만
`RNPPortal`로 내용을 호스트에 올린다(`dist` 확인). **Decision**: `App.tsx`의 `SafeAreaProvider` 안 마지막 자식으로 `<PortalHost />`를 둔다
(설계 §3.1 「새로 생김」). jest에서는 렌더 도우미가 화면 옆에 `PortalHost`를 함께 그린다(목으로 대체하지 않는다 — 실제 포털 경로를 검증).

## R5. datepicker — 날짜 칸만 쓰고, 머리는 직접 만든다

설치본 `src/`를 읽었다.

- `components.Day(day)`를 주면 datepicker가 **`<Pressable disabled={isDisabled} onPress={() => onSelectDate(date)}>`로 감싸** 그린다
  (`components/day.tsx:169-178`). `isDisabled`는 `minDate`·`maxDate`·`enabledDates`·`disabledDates`에서 온다(`utils.ts:189-230`).
  → **미래 칸이 눌리지 않는 것은 `disabledDates` 함수에 우리 판정을 넘겨** 만든다. 칸 모양은 `Day`가 그린다.
- **`›` 버튼은 `maxDate`를 보지 않는다**(`components/header/next-button.tsx` — `disabled={calendarView === 'time'}`뿐). 오늘이 든 달에서도
  다음 달로 넘어간다. `month`/`year` 제어 prop은 `useEffect([month])`로만 반영돼(`datetime-picker.tsx:606-617`) 「같은 값으로 되돌리기」가
  동작하지 않는다.
- 월·연 목록(`months.tsx`·`years.tsx`)은 `maxDate` 이후 달·해를 비활성화하지만, 목록에서 같은 달을 다시 고르면 `onMonthChange`가 불리지
  않아(`datetime-picker.tsx:545-560`, 「Only call onMonthChange if the month actually changed」) 바깥에서 「지금 어느 보기인가」를 알 수 없다.

**Decision**: datepicker는 **날짜 격자 하나**로만 쓴다 — `hideHeader`, `mode="single"`, `firstDayOfWeek={0}`, `locale="ko"`,
`showOutsideDays={false}`, `components.Day`, `disabledDates`(우리 판정), `maxDate`(오늘, 이중 방어), 보이는 달은 `month`/`year` + `key`
재마운트로 정한다. **머리(‹ 9월 2026년 ›)와 월·연 목록은 직접 그린다** — ‹ ›의 비활성, 월·연 목록의 미래 비활성, 보기 전환이 모두 우리
순수 함수(`src/app/calendar.ts`)에서 나온다. 머리 문구는 홈 문구 모듈이 만든다(FR-021 — dayjs 로캘 문자열에 기대지 않는다).
**Alternatives**: (a) datepicker 머리를 그대로 두고 `›`를 덮개 View로 막기 — 위치를 픽셀로 맞춰야 하고 월/연 보기에서 뜻이 달라져 기각.
(b) 제어 prop으로 되돌리기 — 위 `useEffect` 때문에 동작하지 않아 기각. (c) datepicker를 빼고 격자까지 직접 — 사용자 지시(새 의존성 =
RNR + datepicker)와 설계 §3.1이 datepicker를 정했으므로 격자는 datepicker에 맡긴다.
**연 목록의 과거 폭**(spec FR-015): 한계 없음(Q2). 연 목록은 오늘이 든 해로 끝나는 12년 한 쪽을 보이고 ‹로 12년씩 앞으로 간다. ›는 오늘이
든 쪽에서 비활성.

## R6. 색 이름 — 토큰에서 별칭을 만든다 (Clarifications Q3)

RNR 복사본은 `bg-background`·`text-foreground`·`text-muted-foreground`·`border-border`·`bg-primary`·`text-primary-foreground`·`border-input`·
`bg-popover` 등 shadcn 색 이름을 쓴다. 이 저장소는 `tailwind.config.js`가 `tokens.ts`의 `COLORS`를 그대로 색으로 쓴다(032 BC5).

- **충돌**: RNR의 `accent`(눌림 배경)와 우리 `accent`(빨강)가 이름이 같다. `border`는 둘 다 있지만 뜻이 같다(구분선).
- **Decision**: `tokens.ts`에 `RNR_COLOR_ALIASES`를 두고 **값은 `COLORS`를 참조만** 한다(새 hex 0개). 복사본이 실제로 쓰는 이름만
  (`background`·`foreground`·`muted-foreground`·`primary`·`primary-foreground`·`input`·`popover`·`popover-foreground`) 넣는다.
  복사본 안의 RNR식 `accent`(눌림 배경) 클래스는 `bg-surface`로 바꾼다. `tailwind.config.js`는 `{ ...COLORS, ...RNR_COLOR_ALIASES }`.
  전역 스타일시트(`global.css`)에는 아무것도 더하지 않는다(FR-022a).
- 반경: `RADIUS.control = 6`(버튼) 추가, tailwind `rounded-control`. 대화상자 면은 `rounded-none`(보드 `--radius: 0`).
- 덮개 `rgba(0,0,0,.5)`·그림자 `0 10px 30px rgba(0,0,0,.18)`: `tokens.ts`에 `OVERLAY` 상수로 둔다(COLORS는 `#rrggbb`만 허용 — DT1).
- `tailwindcss-animate`는 **설치하지 않는다** — 복사본에서 그것을 쓰는 클래스는 `Platform.select({ web: … })` 안뿐이다. 앱은 안드로이드만 낸다.
**Alternatives**: CSS 변수(`global.css`) — 단일 출처가 둘로 갈라져 기각(Q3). 복사본 클래스를 우리 이름으로 전부 바꿔 쓰기 — 이후 조각이
RNR 부품을 더 복사할 때마다 같은 치환을 반복해야 해 기각.

## R7. RNR 부품의 범위 (Clarifications Q3·Q4)

- 복사해 넣는 것: `alert-dialog`·`dialog`·`dropdown-menu`·`button`·`text`·`native-only-animated-view`·`lib/utils`(`cn`). 자리는 `src/ui/rnr/`.
  `@/` 경로 별칭이 이 저장소에 없으므로 상대 경로로 고친다.
- RNR `Button`·`Text`는 `src/ui/rnr/`와 대화상자·메뉴 부품 안에서만 쓴다. 기존 `src/ui/components/Button.tsx`·`Text.tsx`와 그것을 쓰는
  화면은 바꾸지 않는다. 계약 테스트가 「`src/ui/rnr/` 밖에서 RNR `button`·`text`를 import하는 곳은 대화상자 부품 파일뿐」을 잠근다.
- 홈 메뉴(Q4): `DropdownMenu`를 쓴다. `Popover`보다 메뉴 뜻(항목 누르면 닫힘 — `Item`의 `closeOnPress`)이 맞다. 위치는 트리거 측정
  (`side="top"`, `align="end"`)으로 잡는다. 048이 실기기에서 고친 「목록이 하단 바 윗선을 덮음」이 되살아나는지는 실기기에서 본다.

## R8. jest

- reanimated 목(`jest/setup-ui.ts`)에 `FadeIn`·`FadeOut`·`ReduceMotion`이 없다. `NativeOnlyAnimatedView`가 `entering`/`exiting`에 쓴다.
  **Decision**: 목에 체이닝 가능한 최소 스텁(`.duration()`·`.delay()`·`.reduceMotion()`이 자기 자신을 돌려줌)을 더한다. 움직임은 jest로
  검증하지 않는다(C9).
- `BackHandler.mockPressBack()`은 이 jest-expo 판에 없다(diary-home.test 실측). `BackHandler.addEventListener`를 스파이해 등록된 핸들러를
  직접 부른다(기존 관용구).
- 포털: 렌더 도우미가 `<>{ui}<PortalHost /></>`를 그린다. `@rn-primitives/portal`은 zustand 저장소를 쓰므로 테스트 사이에 남지 않도록
  `unmount`를 확실히 한다.
- datepicker: 순수 JS라 jest-expo에서 그대로 그린다. png 자산은 `hideHeader`라 쓰이지 않는다.

## R9. 달력 칸 판정 — 049 판정을 한 날 단위로 뗀다 (FR-017)

049 `weekCellsFor(items, prompt, now)`는 `weekOf(prompt.day).map(day => ({ day, hasDiary, isToday, selectable, selected }))`다.
**Decision**: 한 날 판정 `cellFor(day, items, selectedDay, now): StripCell`을 `state.ts`에 떼고, `weekCellsFor`는 그것을 7번 부른다.
달력 `Day`와 `disabledDates`도 `cellFor`만 부른다. 칸 타입은 이름을 바꾸지 않고 `StripCell`을 그대로 쓴다(한 판정에 한 타입).
datepicker가 넘기는 날짜를 `DayDate`로 바꾸는 자리는 `src/app/calendar.ts` 하나다. 두 모양이 온다(설치본 확인):
- `components.Day(day)`의 `day.date`는 `CALENDAR_FORMAT = 'YYYY-MM-DD HH:mm'` 문자열 → 앞 10글자(시간대 계산 없음).
- `onChange({ date })`는 `dayjs.tz(getStartOfDay(selected), timeZone).toDate()`(`datetime-picker.tsx:409-423`) → 기기 로컬 자정의 `Date`이므로
  `dayOf(date)`로 바꾼다. `timeZone` prop은 주지 않는다(기기 시간대). 이 변환이 하루를 밀지 않는지는 jest(실제 datepicker 렌더)와 실기기에서 본다. 하루 경계는 여전히 `day-boundary.ts`의 `dayOf`·`isDayWritable`뿐이다(049 DB11).
