import ExpoModulesCore
import ObjectiveC
import UIKit

/// iPad 창 모드(iPhone 앱 호환 실행)의 두 가지를 바로잡는다 (139).
///
/// 1. 창 조절 점(빨강·노랑·초록)이 앱 왼쪽 위를 덮어 뒤로 가기 글자를 가렸다. 기본 안전 영역(위 32·왼쪽 0)에는 점 자리가 없다(시뮬레이터
///    실측). 점을 「최소」 모양으로 두면 상태 표시줄 줄로 올라가 화면 배치를 바꾸지 않고 겹침이 사라진다.
/// 2. 가로로 돌리면 세로 전용 앱이 옆으로 누운 채 눌려 그려졌다. 장면이 네 방향을 지원한다고 답하면 바로 선 iPhone 크기 창이 된다
///    (iOS 27부터 부르는 메서드 — 그 아래에서는 불리지 않는다).
///
/// 장면 대리자는 expo의 것이라 상속·교체하지 않고 **iPad에서만** 메서드를 붙인다 — iPhone에서는 아무것도 붙지 않는다.
/// 호환 실행의 userInterfaceIdiom은 iPad에서도 phone이라 model로 가른다(실측). 장면이 붙기 전인 앱 시작에서 불려야 한다.
public class PocketlogIpadWindowSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    Self.adaptSceneDelegateForPad()
    return true
  }

  /// 설정에서 「전체 화면 앱」↔「윈도우형 앱」을 바꾸고 돌아오면 켜져 있던 앱은 옛 답을 계속 쓴다 — 가로에서 누웠다(실측).
  /// 앞으로 올 때마다 지원 방향을 다시 묻게 한다.
  public func applicationDidBecomeActive(_ application: UIApplication) {
    guard UIDevice.current.model.hasPrefix("iPad") else { return }
    for case let scene as UIWindowScene in application.connectedScenes {
      for window in scene.windows {
        window.rootViewController?.setNeedsUpdateOfSupportedInterfaceOrientations()
      }
    }
  }

  private static func adaptSceneDelegateForPad() {
    guard UIDevice.current.model.hasPrefix("iPad") else { return }
    guard let sceneDelegate: AnyClass = NSClassFromString("EXExpoAppSceneDelegate") else { return }

    // 창 조절 점 모양 (iOS 26 SDK부터 있는 타입)
    #if compiler(>=6.2)
    if #available(iOS 26.0, *) {
      let style: @convention(block) (AnyObject, UIWindowScene) -> AnyObject = { _, _ in
        UIWindowScene.WindowingControlStyle.minimal
      }
      class_addMethod(
        sceneDelegate,
        NSSelectorFromString("preferredWindowingControlStyleForScene:"),
        imp_implementationWithBlock(style),
        "@@:@")
    }
    #endif

    // 지원 방향 — 창 모드에서만 네 방향. 「전체 화면 앱」 설정에서는 화면이 iPhone 크기로 흉내 나고(실측 667×375), 세로만 답해야
    // 가로에서도 세로 화면이 바로 선다(네 방향이면 낮고 넓은 화면이 되어 홈이 잘렸다). 그때의 답은 Info.plist와 같은 값이다.
    // 셀렉터를 문자열로 써서 iOS 27 SDK가 아니어도 컴파일된다.
    // 700pt는 사람이 정한 값이다 — iPad의 짧은 변(가장 작은 mini가 744)과 iPhone(440 안팎) 사이.
    let realPadScreenShortSide: CGFloat = 700
    let orientations: @convention(block) (AnyObject, UIWindowScene) -> UInt = { _, scene in
      let bounds = scene.screen.bounds
      if min(bounds.width, bounds.height) >= realPadScreenShortSide {
        return UIInterfaceOrientationMask.all.rawValue
      }
      let portraitOnly: UIInterfaceOrientationMask = [.portrait, .portraitUpsideDown]
      return portraitOnly.rawValue
    }
    class_addMethod(
      sceneDelegate,
      NSSelectorFromString("supportedInterfaceOrientationsForWindowScene:"),
      imp_implementationWithBlock(orientations),
      "Q@:@")
  }
}
