# Quickstart: 앱 요구 권한 실측 및 통합 신청 절차

이 기능이 끝났다고 말하려면 아래가 전부 통과해야 한다. 기기 없는 테스트는 항상 돌고,
실기기 검증은 최소 1회(원칙 V, 새 네이티브 모듈 없으므로 debug 1회).

## 사전 조건

- `npm ci` 완료.
- 실기기 검증: Android 실기기(가능하면 Android 14 기기 — §D3 부분 허용 확인), USB 연결,
  `adb` 접근. 기기 백업 `C:/Users/mrtin/alpharium-device-backup-20260828`, 샘플 사진
  08-26·27·28 각 3장 심겨 있음(010).
- Metro: `EXPO_PUBLIC_APP_ENV=dev npx expo start --dev-client` (AGENTS.md 도구 절).

## 기기 없는 검증 (`npm test`)

```
npm run test:logic     # 순수 판정 — decision / flag / requirements 계약
npm run test:ui        # OnboardingScreen / PermissionsSection / 거부 안내
npm run lint           # eslint + tsc + 헌법 검사(checkOnboardingFile 포함) + prettier
npm test               # 전체 (커밋 전)
```

기대:

- `onboarding-decision.test.ts` — `planOnboardingSteps`가 5개 `PermissionState` ×
  건너뜀 여부 × 목록 항목의 조합을 직접 센다(SC-007). `nextStep`이 `blocked`도 다음
  단계로 고른다.
- `onboarding-flag.test.ts` — 시드(FR-010a): `onboarding.json` 없음 + `auto-diary.json`
  `batteryExceptionPrompted:true` → `batteryNoticeShown:true`. 부분 손상 관대.
- `onboarding-requirements.test.ts` — `order` 1..5 연속, `battery-exception`이 최대,
  `rationale`/`ifDenied`에 모델 토큰 0건, `PERMISSION_REQUIREMENTS`가 `readonly`.
- `constitution-onboarding.test.ts` — 위반 주입: `flag.ts`에 `Date` 넣기 → 헌법 검사가
  잡음. `src/onboarding/`에서 `diary/prompt` import → 잡음.
- `npm run lint` 통과(tsc가 020 `AutoDiarySettings`에서 `batteryExceptionPrompted`
  참조가 남아 있으면 잡는다 — 014의 이중 정의처럼).

## 실기기 검증 (debug 1회, 원칙 V)

### D0 — FR-001 실측: 필수 권한 목록 확정

`adb shell pm revoke`로 모든 런타임 권한을 끈 상태에서 앱 설치·실행. 각 기능이 실제로
요구하는 권한을 `adb logcat`·`dumpsys package <패키지>`로 확인:

- 사진 수집 → `READ_MEDIA_IMAGES` 없이 조회 시 빈 결과 / 권한 프롬프트.
- 알림 → `POST_NOTIFICATIONS` 없이 `scheduleNotificationAsync` 시 트레이에 안 뜸.
- 배터리 예외 → `dumpsys deviceidle whitelist`에 패키지 없음.

`requirements.ts`의 목록·`order`가 관측과 일치하는지 확인. 불일치 시 상수를 고친다
(코드가 아니라 데이터).

### D1 — SC-001: 새 설치 시 온보딩 선행

1. 앱 데이터 삭제(`pm clear`) 또는 새 설치.
2. 앱 실행 → **일기 목록이 아니라 온보딩 화면**이 먼저 뜬다.
3. 첫 단계가 `photos`(사진). `rationale` 문구에 모델 이름·숫자 없음(SC-008 눈으로 확인).

### D2 — SC-002: 온보딩 후 사진이 실린 일기 (010 합성 하루)

1. 온보딩에서 사진·사진 좌표·알림 전부 [허용], 배터리 예외까지 진행 → [시작하기].
2. 일기 탭에서 08-27(합성 하루, 사진 3장) 선택해 수동 생성.
3. `adb logcat | grep -i "has_media"` → **`has_media` > 0**. 020 release에서 겪은
   `has_media=0`이 재발하지 않는다.
4. 생성된 일기 본문/캡션이 심은 사진 내용을 반영(피크닉 등, 010 계약 — "경로가
   도는가"만).

### D3 — §3 실측: Android 14 부분 허용

1. 사진 권한 요청 시 "선택한 사진만 허용" 선택.
2. `adb logcat`에서 `getPermissionsAsync` 응답의 `accessPrivileges` 관측.
   - `"limited"`가 오면 → `PermissionState === "limited"` → 온보딩 통과 + "그날 사진
     전부를 보지 못할 수 있다" 표시 + [전체 허용] 링크.
   - 안 오면 → research.md §3 대비책(조회 결과로 갈음) 적용 확인.

### D4 — SC-003: 전부 거부해도 죽지 않음

1. 새 설치 → 온보딩의 모든 단계 [건너뛰기] → [시작하기].
2. 앱이 크래시 없이 일기 목록으로 진입.
3. 앱 재실행 → 온보딩이 **다시 뜨지 않는다**(`completed: true` 저장됨).
4. 자동 생성 토글을 켜면 `AutoDiarySettingsScreen`에 "알림 권한이 없어 …" + 배터리
   지연 안내가 뜬다(FR-014).

### D5 — SC-005·006: 재요청 경로 + 포그라운드 복귀

1. "설정" 탭 → "권한" 섹션. 거부한 권한이 "거부됨"으로 표시.
2. `denied` 행의 [허용] → OS 프롬프트. `blocked` 행의 [설정 열기] → 앱 상세 설정 화면.
3. 배터리 [배터리 예외 설정] → 배터리 최적화 목록 화면.
4. OS 설정에서 사진 권한을 켜고 앱으로 복귀 → "권한" 섹션의 사진 행이 즉시 "허용됨"으로
   갱신(SC-006, `AppState` 재조회).
5. [온보딩 다시 하기] → 온보딩 화면이 다시 뜨고, 마치면 탭 UI로. 플래그는 여전히
   `completed: true`.

### D6 — FR-010: 020 배터리 로직 제거 확인

1. `batteryExceptionPrompted`가 있던 기존 설치(업그레이드 시나리오)에서 앱 실행.
2. `auto-diary.json`에 그 값이 `true`였다면 → 온보딩의 배터리 단계가 "이미 안내됨"으로
   건너뛰어짐(시드, FR-010a). 배터리 인텐트가 자동으로 안 뜬다.
3. 자동 생성 토글을 껐다 켜도 배터리 인텐트가 **안 뜬다**(020의 로직 제거됨).

## Maestro 흐름 등록

`.maestro/unified-permission-onboarding.yml`을 만들고 **`scripts/run-device-tests.mjs`의
`FLOWS`에 등록**(AGENTS.md 경고 — 등록 안 하면 초록불인데 안 돎). 최소 흐름:

- 새 설치 → 온보딩 화면 텍스트 확인 → 각 단계 [건너뛰기] → [시작하기] → 일기 목록
  도달. `testID`로 단계·버튼 식별(R8·ProGuard 생존).

## 완료 기준 체크리스트

- [ ] `npm test` 전부 통과 (신규 테스트 포함)
- [ ] `npm run lint` 통과 (checkOnboardingFile 등록됨, 020 잔재 tsc 클린)
- [ ] D0 — 필수 권한 목록이 실측과 일치
- [ ] D1 — 새 설치 시 온보딩 선행 (SC-001)
- [ ] D2 — 온보딩 후 `has_media > 0` (SC-002, 010 합성 하루)
- [ ] D3 — Android 14 부분 허용 동작 (§3, `limited` 또는 대비책)
- [ ] D4 — 전부 거부해도 크래시 없음 + 재노출 안 됨 (SC-003)
- [ ] D5 — 재요청 경로 + 포그라운드 복귀 갱신 (SC-005·006)
- [ ] D6 — 020 배터리 로직 제거 + 시드 (FR-010·010a)
- [ ] 문안 리뷰 — 온보딩·설정·거부 안내에 모델 정보 0건, 단언 문장 없음 (SC-008)
- [ ] Maestro 흐름 `FLOWS`에 등록됨
