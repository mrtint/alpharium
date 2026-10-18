// 090 — iOS 백그라운드 태스크의 시간 예산 만료를 JS로 넘긴다.
//
// expo-background-task는 BGTask의 expirationHandler에서 Notification.Name("onTasksExpired")를 게시하지만, 자기 모듈의 관찰자가
// userInfo["url"] 가드로 버려 JS에 오지 않는다(node_modules/expo-background-task/ios/BackgroundTaskModule.swift). 같은 알림을 여기서
// 직접 받아 이벤트 하나로 넘긴다 — 시도 기록에 「시간 예산이 끝남」을 남기기 위해서다(앱 동작 기록). 판정·재예약은 하지 않는다.
import ExpoModulesCore

/// expo-background-task가 게시하는 이름과 같아야 한다 — __tests__/config/bg-expiry-module.test.ts가 대조한다
private let expoTasksExpired = Notification.Name("onTasksExpired")

public class PocketlogBgExpiryModule: Module {
  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("PocketlogBgExpiry")

    Events("onExpired")

    OnStartObserving("onExpired") {
      guard self.observer == nil else { return }
      self.observer = NotificationCenter.default.addObserver(
        forName: expoTasksExpired, object: nil, queue: nil
      ) { [weak self] _ in
        // 만료 시각은 여기서 잰다 — expo가 곧바로 setTaskCompleted를 불러 iOS가 앱을 멈추므로, JS는 다음에 깨어날 때에야
        // 이 이벤트를 처리할 수 있다(그 시각을 쓰면 만료가 아니라 재개 시각이 남는다). 밀리초 epoch.
        self?.sendEvent("onExpired", ["at": Date().timeIntervalSince1970 * 1000])
      }
    }

    OnStopObserving("onExpired") {
      if let observer = self.observer {
        NotificationCenter.default.removeObserver(observer)
        self.observer = nil
      }
    }
  }
}
