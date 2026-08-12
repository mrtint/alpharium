import { registerRootComponent } from "expo";

import App from "./App";

// registerRootComponent는 AppRegistry.registerComponent를 부르고,
// Expo Go와 네이티브 빌드 양쪽에서 알맞은 환경을 준비한다.
registerRootComponent(App);
