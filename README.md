# 📱 Alpharium (알파리움)

> **휴대폰이 자기 주인의 하루를 추측해 쓰는 온디바이스 AI 일기 앱**

**Alpharium**에서 일기를 쓰는 주체는 사용자가 아니라 **휴대폰**입니다. 휴대폰이 하루
동안 관측한 신호(위치, 걸음 수, 사진, 캘린더 일정)를 외부 서버 전송 없이 **100%
온디바이스 AI(On-Device AI)**로 해석해, 「주인은 이랬을 것이다」를 추측한 1인칭 한국어
일기를 씁니다. 화자는 휴대폰이고 사용자는 3인칭으로 등장합니다.

목적은 **정확한 기록이 아니라 유희**입니다. 휴대폰의 추측이 실제와 어긋나는 것은 결함이
아니라 콘텐츠이므로, 일기의 사실 일치도를 품질 기준으로 삼지 않습니다. 재미는 본문과
그 근거가 된 관측을 **나란히 놓고 대조**하는 데서 나옵니다.

자세한 컨셉은 [docs/concept.md](docs/concept.md), 규범은
[.specify/memory/constitution.md](.specify/memory/constitution.md)에 있습니다.

---

## 🛠️ 기술 스택 (Tech Stack)

* **Core:** Expo SDK 54 (`~54.0.36`), React Native (`0.81.5`), React (`19.1.0`), TypeScript (`~5.9.2`)
* **Runtime:** Node.js `20.19.x` 이상 (SDK 54 요구사항)
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
