# 📱 Alpharium (알파리움)

> **개인정보 보호 우선(Privacy-First) 온디바이스 AI 일기 작성 스마트폰 앱**

**Alpharium**은 스마트폰의 하루 일상 신호(위치, 걸음 수, 사진 타임스탬프, 캘린더 일정)를 외부 서버 전송 없이 **100% 온디바이스 AI(On-Device AI)**로 처리하여 따뜻한 1인칭 한국어 일기를 자동으로 완성해 주는 모바일 앱입니다.

---

## 🛠️ 기술 스택 (Tech Stack)

* **Core:** Expo SDK 57 (`~57.0.9`), React Native (`0.86.2`), TypeScript (`~5.8.2`)
* **AI Model:** LG EXAONE 4.0 1.2B Instruct (Pure On-Device) / Moondream 1.6B (Vision)
* **Testing:** Jest (`jest-expo`), React Native Testing Library (`@testing-library/react-native`), Maestro E2E
* **Code Quality:** Prettier, TypeScript Strict Lint
* **CI/CD:** GitHub Actions (4-Stage Pipeline: `test` ➔ `build` ➔ `release` ➔ `deploy`)

---

## 🚀 시작하기 (Getting Started)

### 1. 의존성 패키지 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
# 웹 브라우저 미리보기 실행
npm run web

# Expo Go / 모바일 에뮬레이터 실행
npm start
```

### 3. 테스트 및 품질 검사
```bash
# Jest 단위 및 UI 컴포넌트 테스트 실행
npm test

# TypeScript 타입 오류 검사 (Lint)
npm run lint

# Prettier 코드 포맷팅 정돈
npm run format
```

---

## 📁 프로젝트 구조 (Project Structure)

```text
alpharium/
├── .env.development       # 개발용 환경 변수 (맥북 API 호스트 세팅)
├── .env.production        # 상용 온디바이스 AI 환경 변수
├── .github/workflows/
│   └── ci.yml             # GitHub Actions 4-Stage CI/CD 워크플로우
├── .maestro/              # Maestro E2E 모바일 자동화 시나리오
├── __tests__/             # Jest & RNTL 단위/UI 테스트 스위트
├── src/
│   ├── types/             # 개인 신호 & 일기 데이터 규격 (TypeScript)
│   ├── services/          # AI 추론 어댑터 (Cloud / Mobile On-Device)
│   └── screens/           # UI 화면 컴포넌트
└── App.tsx                # 앱 메인 진입점 & 다크모드 메인 화면
```

---

## 📄 라이선스 (License)

이 프로젝트는 [MIT License](LICENSE)를 따릅니다.
