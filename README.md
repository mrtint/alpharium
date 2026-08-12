# 📱 Alpharium (알파리움)

> **상태: 백지.** 2026-08-12에 이전 작업 전체를 되돌렸다.

앱이 무엇인지는 아직 정해지지 않았다. 헌법·컨셉·스펙을 새로 쓰는 중이며, 이 문서는
그것이 정해진 뒤에 다시 쓴다.

되돌린 경위와 이전 작업에서 실측으로 확인된 사실은 [AGENTS.md](AGENTS.md)에 있다.

## 남아 있는 것

Expo 프로젝트 뼈대와 빌드 설정뿐이다. 앱 코드는 없다.

* **Core:** Expo SDK 54 (`~54.0.36`), React Native (`0.81.5`), React (`19.1.0`), TypeScript (`~5.9.2`)
* **Runtime:** Node.js `20.19.x` 이상
* **CI/CD:** GitHub Actions

SDK는 이전 작업의 관측(Expo 57 + development build가 필요했다)과 다르다. 어느 쪽으로
갈지는 새로 판단한다 — [AGENTS.md](AGENTS.md) 참조.

## 설치

```bash
npm install
```
