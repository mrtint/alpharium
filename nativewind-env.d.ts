/// <reference types="nativewind/types" />

// 032 — `className` prop을 RN 코어 컴포넌트의 타입에 더한다(research.md R2).
//
// `tsconfig.json`에 `include`가 없어 이 저장소의 `tsc`는 (base의 `exclude`를 뺀)
// 모든 `.ts`/`.tsx`를 컴파일한다 — 저장소 루트의 이 `.d.ts`도 자동 포함된다.
// 그래서 `include`/`files`를 새로 쓰지 않는다(쓰면 검사 범위가 좁아질 위험 — F8).

// `App.tsx`의 `import "./global.css"` 부수 효과 import를 `tsc`가 알게 한다.
// NativeWind 타입은 `.css` 모듈을 선언하지 않아 직접 둔다(TS2882 방지).
declare module "*.css" {
  const content: { readonly [key: string]: string };
  export default content;
}
