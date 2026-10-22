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
