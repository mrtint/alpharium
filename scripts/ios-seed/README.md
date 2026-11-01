# ios-seed — 실제 iPhone에 합성 하루의 사진을 심는다 (087)

안드로이드 `npm run seed:day`(010)의 iOS 짝이다. **입력(사진)만 심고 일기는 만들지도 읽지도 않는다**(헌법 원칙 IV). 앱의 일부가 아니다 — 번들·`ios/`·`package.json` 의존성에 들어가지 않는다.

```
npm run ios:seed -- --day 2026-10-17 --count 8 --photos <JPEG 폴더> [--no-gps] [--device <UDID>]
```

여러 날은 `--range N`(요청 당일 앞뒤 N일, 오늘 포함 2N+1일, `--day`와 함께 쓰지 않는다)로 한 번에 심는다 — 앱을 한 번만 띄우고 lldb도 한 번만 붙는다. 예: `npm run ios:seed -- --range 15 --count 4 --photos scripts/e2e-sample/.cache --device <UDID>`.

마지막 줄은 항상 JSON이다: `{"ok":true,"days":…,"requested":8,"seeded":8,"runDir":…,"errors":[]}`. 종료 코드 0/1.

## 왜 이렇게 하는가

iOS 실기기의 사진 보관함에는 `devicectl`로 파일을 넣을 통로가 없다(`simctl addmedia`는 시뮬레이터 전용, AFC의 `/DCIM`은 iOS 16+에서 보관함에 안 잡힌다고 알려져 있으나 재지 않았다). 그래서 **앱 프로세스 안에서** `PHPhotoLibrary`를 부른다:

1. `PocketSeed.m`을 `PocketSeed.dylib`로 빌드하고 개발 인증서로 서명한다(팀 `PGNGG84B39` — 앱과 같은 팀이어야 `dlopen`된다).
2. 사진·계획·dylib을 앱 컨테이너 `Documents/seed-ios/<실행 id>/`에 `devicectl device copy to`로 올린다.
3. 앱을 새로 띄우고 lldb가 붙어 `dlopen` → `PocketSeedStart(계획)`을 부른다. 함수는 백그라운드 큐에서 사진을 하나씩 `PHAssetCreationRequest`로 넣고 `status.json`을 갱신한 뒤 곧바로 돌아온다.
4. 도구가 `status.json`을 읽어 끝을 기다린다.

촬영 시각과 좌표는 EXIF를 고치지 않고 요청의 `creationDate`·`location`으로 준다(실측: 보관함에서 읽은 `creationDate`·`location`이 계획과 같았다).

## 전제

- 개발 서명 빌드(`get-task-allow`)가 깔려 있다. TestFlight 빌드에는 lldb가 못 붙는다.
- 앱에 사진 **읽기·쓰기**가 허용돼 있다(`authorizationStatusForAccessLevel:ReadWrite`가 3·4). 권한 창을 띄우지 않고, 아니면 `photo-auth-N`으로 실패한다. 앱에 `NSPhotoLibraryAddUsageDescription`이 없어도 읽기·쓰기가 허용돼 있으면 된다(실측).
- **Xcode를 꺼 둔다.** 켜 두면 `device process attach`가 3분 넘게 멈췄다(087). 처음 한 번은 Xcode의 Devices and Simulators에서 기기 심볼을 받아야 한다(`~/Library/Developer/Xcode/iOS DeviceSupport/`) — 없으면 lldb가 공유 캐시를 USB로 읽느라 5분 넘게 걸린다.
- 기기 잠금이 풀려 있고 맥에 꽂혀 있다. 서명 키 접근을 처음 한 번 허용하는 키체인 창이 맥에 뜬다(「항상 허용」).
- `POCKETLOG_IOS_DEV_IDENTITY`(SHA1)로 서명 ID를, `POCKETLOG_IOS_DEVICE`로 기기를 고정할 수 있다. 페어링된 iPhone이 둘 이상이면 `--device`가 필요하다.

## 한계

- **지우는 도구가 없다.** 사진 보관함에서 지우면 시스템 확인 창이 뜬다(사람이 누른다). 합성 사진은 `--day`로 정한 날짜에 들어가니 쓰지 않는 날짜를 고른다.
- 사진 원본은 `--photos`로 준다(이 도구는 사진을 내려받지 않는다). 시험 때는 앱 컨테이너의 `vision-cache/`나 `.cache/e2e-sample/`을 썼다.
- lldb attach는 가끔 30~60초 걸린다. 실패하면 도구가 `PocketSeedStart를 부르지 못했다`와 lldb 출력 끝을 낸다.
- 시도 한 번이 앱을 새로 띄우므로, 앱 열기 자동 쓰기(057)가 그 사이에 돌 수 있다 — 심은 뒤의 일은 호출한 쪽이 정한다.
