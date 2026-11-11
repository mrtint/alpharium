# Quickstart: 이어받기 확인

## 기기 없이

```bash
npx jest __tests__/models --selectProjects logic
npm test && npm run lint
```

## iPhone 실기기 (개발 서명 빌드, 안드로이드는 쓰지 않는다)

전제: iPhone 14, 개발 빌드가 깔려 있고 모델이 없는 상태(앱 데이터에서 `models/`를 앱 안에서 지운다 — `devicectl … --remove-existing-content`는 쓰지 않는다, AGENTS 097).

1. 첫 실행 받기 시작 → 진행 중간(약 30~50%)에 `devicectl device process terminate`로 앱을 죽인다.
2. `state.json`(`devicectl device copy from`)에서 `segmented[].doneIndices`가 남았는지 본다.
3. 앱을 다시 열어 받기를 이어 간다 → 끝난 구간을 다시 받지 않는지(받은 양의 시작점이 0이 아님) 본다.
4. 끝나면 검증이 통과하고 「준비됨」이 되는지 본다(지문 일치).
5. 비행기 모드로 끊은 뒤 풀어서 같은 확인.
