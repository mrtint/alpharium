# Quickstart: 화면 문구를 사실대로

## 기기 없이

```bash
npx jest __tests__/i18n __tests__/ui/home-text.test.ts __tests__/ui/overwrite-confirm.test.tsx __tests__/ui/settings-this-phone.test.tsx __tests__/ui/place-name-dialog.test.tsx __tests__/ui/settings-screen.test.tsx __tests__/privacy --maxWorkers=2
npm test && npm run lint
```

기대: 모두 통과. 위반 주입 — 슬라이드 3 본문을 조건 없는 알림 약속으로 되돌리면 CP1 테스트가 실패해야 한다.

## 실기기(SM-S901N, dev, 잠금 해제)

모델(~2GB)은 지우지 않는다(`pm clear` 금지, 074 절차). Metro 번들만 올린다.

1. 내려받기 화면 슬라이드 3 문구(074 절차로 화면을 다시 띄운다).
2. 설정 → 장소 이름으로 보기: 「켬」·「자동」 보조 줄.
3. 쓴 날·오늘의 「다시 쓰기」 확인 본문. 취소해 일기가 그대로임을 본다.
4. 안 쓴 날 홈 장소 칸: TalkBack으로 「사진이 찍힌 자리 N곳」. 글꼴 2.0배에서 슬라이드 3·지우기 확인이 잘리지 않는지.
5. 「일기 모두 지우기」 확인 본문. 지우기 전후 `files/models` md5와 `/sdcard/DCIM` 사진 수를 비교한다(`adb shell`).
6. 지원 페이지는 게시 뒤 URL 200 (PR 머지 이후 소유자 몫).

## 실측 (2026-10-22, SM-S901N dev, 모델 보존)

- 확인함: 「다시 쓰기」 확인(오늘) 본문 「다 쓰면 지금 일기가 새 글로 바뀌어요. 바뀐 뒤에는 되돌릴 수 없어요.」+`todayNote`, 설정 장소 이름 대화상자의 「자동」·「켬」 보조 줄과 `placeNotice`(겹치지 않음), 「일기 모두 지우기」 확인 본문 「되돌릴 수 없어요. 휴대폰의 사진과 이름·설정은 남아요.」(일기 3편, 취소로 닫음), 안 쓴 날(19일)의 장소 칸 「0 곳」.
- 같은 날 추가 확인(백업 후 복원): 글꼴 2.0배에서 안 쓴 날의 재료 칸·「일기 모두 지우기」 확인 본문이 잘리지 않고 다 읽힌다. **실제로 「지우기」를 눌러** 일기 3편과 `vision-cache`가 비고 설정 파일(`onboarding.json` 등)은 남았으며, `files/models` md5 셋(v1·v2·a1)과 `/sdcard/DCIM` 사진 수(13)는 전후 같았다. 일기·`vision-cache`는 미리 받아 둔 사본으로 되돌렸다(일기 셋은 바이트 같음 확인 — macOS 부스러기 `._2026-10-07.json` 하나는 되돌리지 않음).
- 내려받기 슬라이드 3: 개발자 「온보딩부터 다시」는 `onboarding.json`을 바꾸지 않아, `App.tsx`의 첫 실행 분기를 **임시로**(커밋하지 않고 `git checkout`으로 되돌림) 내려받기 진행 화면에 고정해 확인했다. 「03 / 04」 카드에 제목 「열면 바로 그날 일기를 써요」, 본문 「자동으로 쓰기를 켜 두면 쓸 차례에 알림이 오고, 먼저 써 두기도 해요.」가 잘림 없이 보인다(글꼴 1.0배).
- 확인하지 못함: TalkBack 낭독(삼성 TalkBack을 `adb`로 켰으나 서비스가 묶이지 않았고 `uiautomator dump`는 다른 패키지 창만 돌려줌 — 사람이 TalkBack으로 들어야 함. 라벨의 존재는 `material-grid.test.tsx` CP3가 잠근다).
