# Phase 1 Quickstart: 073-photo-caption-gc-guard 검증 가이드

**Feature**: `073-photo-caption-gc-guard`
**Date**: 2026-10-10

## 1. 정적 소스 계약 테스트 검증

`expo-media-library`의 `Asset` 인스턴스에 임시 비동기 체이닝이 없음을 검증한다.

```bash
npx jest --testMatch="**/__tests__/**/expo-asset-scope.test.ts"
```

**기대 결과**:
- PASS `__tests__/signals/expo-asset-scope.test.ts`
- 검사 대상 파일 수 >= 1

---

## 2. VLM 전량 실패 가드 단위 테스트 검증

`readPhotos` 및 `generate`가 캡션 0장 상황에서 `vision-failed`로 거절하는지 검증한다.

```bash
npx jest --testMatch="**/__tests__/**/on-device.test.ts"
```

**기대 결과**:
- 사진 1장 이상 주어졌으나 `captionAll`이 빈 캡션 반환 시 `generate`가 `{ kind: "vision-failed" }`를 반환함을 검증하는 테스트 통과.

---

## 3. 전체 린트 및 헌법 무결성 검증

```bash
npm run lint
```

**기대 결과**:
- `eslint`, `tsc --noEmit`, `check:constitution`, `prettier` 모두 에러 0건 통과.

---

## 4. 실기기(Android) 검증

1. SM-G986N(또는 실기기)에서 사진이 있는 날짜 선택.
2. 일기 쓰기(또는 포그라운드 다시 쓰기) 실행.
3. 캡션과 캐러셀이 정상적으로 포함되어 저장되는지 확인.
