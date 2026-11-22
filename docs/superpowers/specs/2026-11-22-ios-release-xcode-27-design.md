# iOS 릴리스를 Xcode 27(iOS 27 SDK)로 빌드한다 — 설계

로드맵 「iOS 릴리스를 iOS 27 SDK(Xcode 27)로 빌드한다 — ITMS-90725」의 경량 트랙 설계다.

## 목적

2027년 4월부터 App Store Connect는 iOS 27 SDK 미만으로 만든 빌드의 업로드·제출을 거절한다(ITMS-90725). 지금 릴리스 워크플로(`macos-latest`)는 Xcode 26.6(iOS 26.5 SDK)로 빌드한다. 러너를 Xcode 27로 올려 마감 전에 막힘을 없앤다.

## 규모 판정 (경량)

- 새 데이터 모델·외부 연동·계약 변경 없음.
- 변경 파일 2개: `.github/workflows/ios-release.yml`, `__tests__/ci/ios-release-workflow.test.ts`.
- 수용 기준 3개.

## 수용 기준

1. 워크플로 러너가 `xcode-27`이고, 사전 점검이 Xcode 27 미만이면 아카이브 전에 실패한다.
2. 실행 요약 제목이 러너 라벨을 따라가고(`macos-latest` 글자가 워크플로에 남지 않는다) 계약 테스트가 새 값(`xcode-27`·`-lt 27`)을 잠근다.
3. (실행 확인) 새 빌드의 실행 요약에 Xcode 27이 찍히고 같은 경고 메일이 오지 않는다 — 스토어에 빌드를 올려야 알 수 있어 이 과제의 구현 범위 밖 확인 항목이다.

## 결정

- 러너는 `runs-on: xcode-27`(러너 이미지 문서의 프리뷰 라벨)로 한다. 프리뷰라 안 쓰이면 로컬 Xcode 27 아카이브가 대안이고 그때 다시 정한다.
- SDK 버전은 워크플로에 적지 않는다(`-sdk iphoneos`는 러너 Xcode를 따른다) — 바꿀 것이 없다.
- 앱 설정(`app.json`, 배포 목표 16.4, `enableSceneSupport`)은 건드리지 않는다. 로컬 Xcode 27.2 Release가 iPhone 14에서 이미 돈다(094).

## 못 보는 것

러너 Xcode 27에서 `pod install`·아카이브가 통과하는지(이미지 공지의 OpenSSL 3→4 항목 포함)와 `xcode-27` 라벨의 실사용 가능 여부는 새 빌드를 올려야 안다. 이 PR에서는 확인하지 않는다.
