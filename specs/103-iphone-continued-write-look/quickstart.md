# Quickstart: 103 검증

## 기기 불필요

- `npx jest __tests__/app/continued-write.test.ts __tests__/app/app-continued-write-source.test.ts --selectProjects logic`
- 위반 주입: `BEAT_SHARE.token`을 1/400으로 되돌리면 PB3 테스트가 실패하는지 확인하고 되돌린다.
- `npm test`, `npm run lint`.

## iPhone 14 실기기 (사람이 누른다)

전제: 개발 환경 Release 빌드가 깔려 있다(`specs/087-ios-real-device-verify/quickstart.md` 26행). `devicectl device copy to … --remove-existing-content true`는 쓰지 않는다. 자기 Metro는 8081이 아닌 포트. 시작 전 102 세션(`alpharium-a7`)에 알린다.

1. `devicectl device process launch --console`로 앱을 띄워 `[continued-write]` 줄을 본다.
2. 사진 있는 날의 「쓰기」를 사람이 누르고, `submitted`가 뜬 뒤 `devicectl … launch com.apple.Preferences`로 앱을 뒤로 보낸다.
3. 충전 없는 회차는 USB를 분리한다(로그가 끊기므로 시각은 사람이 적는다).
4. 끝나면 `close success=true`·완성 알림·일기 저장을 확인한다.

## 결과 기록 (실측 뒤 채운다)

| 회차 | 조건 | 비율 | 시작→끝 | report | 90% 도달 | 90% 뒤 정체 | 종료 |
|------|------|------|---------|--------|----------|-------------|------|
| 094 충전 중(옛) | 사진 5장 | 1/400 | 08:10:54→08:27:48 | 210 | (기록 없음) | 949k에서 약 10분 | success |

## ③ `all-written` 재현 (결과 기록)

(재현 순서·읽은 「최근 자동 쓰기 시도」·「최근 실패」 시각·결론을 적는다.)
