# Quickstart: 제약 띠 검증

## 기기 불필요 (항상)

```sh
npx jest __tests__/app/constraint-band.test.ts __tests__/app/use-constraint-band.test.tsx __tests__/ui/constraint-band.test.tsx __tests__/config/notice-rules.test.ts
npm test && npm run lint
```

위반 주입: ① `DiaryListScreen`에 `Notices`를 되살린다 ② `ConstraintBand`에 `onDismiss` 프롭을 더한다 ③ 판정에서 사진 권한 우선을 뒤집는다 — 각각 계약 테스트가 실패해야 한다. 확인 뒤 되돌린다.

## 실기기 (SM-S901N dev, Metro 번들)

1. 설정에서 사진 권한을 거부 → 홈: 쓰기 바 위에 띠 한 줄 + 버튼. 스트립 아래에 아무것도 없다. 버튼 → 권한 창/설정 안내. 허용 후 돌아오면 띠가 사라진다.
2. 사진 권한 허용 + 자동 쓰기 켬 + 배터리 예외 없음 → 배터리 띠. 버튼 → 배터리 예외 목록. 예외를 주고 돌아오면 사라진다. 자동 쓰기를 끄면 사라진다.
3. 둘 다 걸림 → 사진 권한 띠 하나.
4. 쓰기 실패 토스트가 뜨는 동안 띠가 흐려지고 3초 뒤 돌아온다.
5. 쓴 날: 스크롤하면 바와 띠가 함께 내려가고, 맨 끝에서 함께 올라온다. 마지막 문단이 띠에 가리지 않는다.
6. 글꼴 2.0배: 띠가 한 줄, 버튼이 보이고 눌린다. 첫 화면 본문 줄 수를 적는다.
7. iOS 시뮬레이터: 사진 권한 띠만(배터리 띠 없음).

못 본 것은 기록에 「미확인」으로 남긴다.
