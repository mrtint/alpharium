import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

import { currentEnvironment } from "./src/config/environment";
import { showsOnScreen } from "./src/diagnostics/sink";
import { DiagnosticsScreen } from "./src/ui/DiagnosticsScreen";

/**
 * 루트 컴포넌트(FR-002).
 *
 * 진단 화면은 local·dev에서만 보인다(FR-007a). prod에서 이 화면에 도달하는 경로가
 * 존재하지 않아야 한다(SC-013) — 그 판단을 sinksFor()에 위임한다.
 *
 * 이 단계의 화면은 앱이 살아 있음을 확인할 수 있는 최소한이면 된다.
 * 화면 디자인은 이 기능의 범위 밖이다(명세 「가정」).
 */
export default function App() {
  const environment = currentEnvironment();

  return (
    <SafeAreaView style={styles.container}>
      {showsOnScreen(environment) ? (
        <DiagnosticsScreen />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.title}>Alpharium</Text>
        </View>
      )}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
  },
});
