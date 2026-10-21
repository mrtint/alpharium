// 092 — 홈이 시작한 쓰기를 앱 밖에서 이어 돌린다(iOS 26 BGContinuedProcessingTask).
//
// 091 실측: iOS는 처리 작업을 충전 중에만 깨운다. 충전 없이 일기가 써지는 길은 사용자가 앞에서 시작한 쓰기를 시스템이 이어 돌리게 하는
// 것뿐이다. 이 모듈은 신청(begin)·진행 보고(report)·닫기(finish)·만료(onExpired)만 맡는다 — 쓰기를 판정하거나 돌리지 않는다.
//
// API 세부는 Xcode SDK 헤더(iPhoneOS27.1.sdk `BackgroundTasks.framework/Headers`)와 Apple DTS 답(developer.apple.com/forums/thread/799126)으로
// 확인했다:
// - 시스템이 진행 UI를 띄우고 task.progress(NSProgressReporting)를 보인다. 멈춘 것처럼 보이는 작업은 끝낼 수 있다(BGTask.h).
// - 처리기는 앱 시작 뒤에 등록해도 된다(이 작업만 예외, BGTaskScheduler.h). 와일드카드는 Info.plist에만 두고 처리기는 꼬리를 붙인 온전한
//   식별자로 등록한다 — 와일드카드 처리기 등록은 막혀 있다(DTS). 같은 식별자를 두 번 등록하면 오류라 신청마다 새 꼬리(UUID)다.
// - strategy 기본값은 .queue다 — .fail이면 곧바로 못 돌 때 제출이 실패한다(「거절이면 종전대로 앞을 벗어나면 끊는다」).
// - expirationHandler가 없으면 시스템이 경고 없이 실패로 끝낸다. 만료 뒤 setTaskCompleted를 늦추면 앱이 죽을 수 있다(BGTask.h).
import BackgroundTasks
import ExpoModulesCore

/// Info.plist 와일드카드(`plugins/with-battery-bg-task.js`의 `com.a810labs.pocketlog.write.*`)의 접두
private let identifierPrefix = "com.a810labs.pocketlog.write."

/// 앱 동작 기록(신청·처리기·보고·닫기·만료의 갈래와 값) — 실기기에서 `devicectl … launch --console`로 읽는다. 측정이 아니다(원칙 IV는 모델 성능 측정만 막는다).
private func trace(_ message: String) {
  NSLog("[continued-write] %@", message)
}

/// 쓰기 하나. 처리기가 서기 전에 온 보고·닫기를 들고 있다가 서는 순간 반영한다.
private final class Session {
  let identifier: String
  var title: String
  var subtitle: String
  var completed: Int64 = 0
  var total: Int64 = 1_000_000
  /// 닫혔으면 그 성패. 처리기가 서기 전에 닫혔으면 처리기가 곧바로 이 값으로 끝낸다.
  var finished: Bool?
  /// 처리기가 받은 작업(BGContinuedProcessingTask). 배포 대상이 16.4라 타입을 지운 채 든다.
  var task: AnyObject?

  init(identifier: String, title: String, subtitle: String) {
    self.identifier = identifier
    self.title = title
    self.subtitle = subtitle
  }
}

public class PocketlogContinuedWriteModule: Module {
  private let lock = NSLock()
  /// 지금의 쓰기 — 쓰기는 한 번에 하나다(080 등록부)
  private var current: Session?

  public func definition() -> ModuleDefinition {
    Name("PocketlogContinuedWrite")

    Events("onExpired")

    // 신청. 받아들여졌으면 그 식별자, 아니면 nil — 받아들여졌을 때만 JS가 앞을 벗어나도 쓰기를 끊지 않는다. 제출 결과를 기다린다.
    // 만료 이벤트에 같은 식별자를 실어, 앞 쓰기의 늦은 만료가 다음 쓰기를 끊지 않게 한다(코드 리뷰).
    AsyncFunction("begin") { (title: String, subtitle: String) async -> String? in
      guard #available(iOS 26, *) else { return nil }
      return await self.submit(title: title, subtitle: subtitle)
    }

    // 단계 문구와 막대(completed/total). 끝난 쓰기에는 아무 일도 없다.
    Function("report") { (subtitle: String, completed: Double, total: Double) in
      self.report(subtitle: subtitle, completed: completed, total: total)
    }

    // 닫기. 두 번째부터는 아무 일도 없다.
    Function("finish") { (success: Bool) in
      self.finish(success: success)
    }
  }

  @available(iOS 26, *)
  private func submit(title: String, subtitle: String) async -> String? {
    let identifier = identifierPrefix + UUID().uuidString
    let session = Session(identifier: identifier, title: title, subtitle: subtitle)

    // 닫히지 않은 앞 쓰기가 있으면(JS가 닫기 전에 다시 신청했다) 실패로 닫는다 — 둘을 들지 않는다.
    // async 함수 안이라 lock()/unlock() 대신 범위 잠금(withLock)을 쓴다(Swift 6에서는 오류)
    let stale = lock.withLock { () -> Session? in
      let previous = current
      current = session
      return previous
    }
    if let stale = stale { close(stale, success: false) }

    let registered = BGTaskScheduler.shared.register(forTaskWithIdentifier: identifier, using: nil) {
      [weak self] task in
      guard let task = task as? BGContinuedProcessingTask, let self = self else {
        task.setTaskCompleted(success: false)
        return
      }
      // 만료 처리기를 가장 먼저 단다 — 처리기가 없는 틈에 만료되면 시스템이 알리지 않고 실패로 끝낸다(BGTask.h, 코드 리뷰)
      task.expirationHandler = { [weak self] in
        self?.expire(session)
      }
      self.attach(task, to: session)
    }
    guard registered else {
      trace("register failed")
      drop(session)
      return nil
    }

    let request = BGContinuedProcessingTaskRequest(identifier: identifier, title: title, subtitle: subtitle)
    request.strategy = .fail
    do {
      // iOS 27 SDK(Swift 6.4, Xcode 27)에만 비동기 `submitTaskRequest`가 있다 — 동기 `submit`은 거기서 deprecated이고 모든 거절을 알리지
      // 않는다(BGTaskScheduler.h). 26 SDK(CI의 Xcode 26.6)에는 그 이름이 없어 컴파일 자체가 막히므로 컴파일러 버전으로 가른다.
      #if compiler(>=6.4)
      if #available(iOS 27, *) {
        try await BGTaskScheduler.shared.submitTaskRequest(request)
      } else {
        try BGTaskScheduler.shared.submit(request)
      }
      #else
      try BGTaskScheduler.shared.submit(request)
      #endif
      trace("submitted \(identifier)")
      return identifier
    } catch {
      trace("rejected \(error)")
      drop(session)
      return nil
    }
  }

  /// 처리기가 섰다 — 들고 있던 값을 반영하고 만료를 듣는다.
  @available(iOS 26, *)
  private func attach(_ task: BGContinuedProcessingTask, to session: Session) {
    lock.lock()
    if let finished = session.finished {
      lock.unlock()
      trace("attach after finish \(finished)")
      task.setTaskCompleted(success: finished)
      return
    }
    session.task = task
    let title = session.title
    let subtitle = session.subtitle
    let completed = session.completed
    let total = session.total
    lock.unlock()

    task.progress.totalUnitCount = total
    task.progress.completedUnitCount = completed
    task.updateTitle(title, subtitle: subtitle)
    trace("attached completed=\(completed)/\(total) subtitle=\(subtitle)")
  }

  /// 시스템이 끝냈다(시간·자원·사용자가 진행 UI에서 취소). JS에 알리고 곧바로 실패로 끝낸다 — 늦추면 앱이 죽을 수 있다.
  private func expire(_ session: Session) {
    lock.lock()
    let open = session.finished == nil
    lock.unlock()
    guard open else { return }
    trace("expired")
    sendEvent("onExpired", ["identifier": session.identifier])
    close(session, success: false)
  }

  private func report(subtitle: String, completed: Double, total: Double) {
    lock.lock()
    guard let session = current, session.finished == nil else {
      lock.unlock()
      return
    }
    let changed = session.subtitle != subtitle
    session.subtitle = subtitle
    if total.isFinite && total >= 1 { session.total = Int64(total) }
    if completed.isFinite && completed >= 0 { session.completed = min(Int64(completed), session.total) }
    let task = session.task
    let title = session.title
    let done = session.completed
    let all = session.total
    lock.unlock()

    if #available(iOS 26, *), let task = task as? BGContinuedProcessingTask {
      task.progress.totalUnitCount = all
      task.progress.completedUnitCount = done
      if changed { task.updateTitle(title, subtitle: subtitle) }
      trace("report completed=\(done)/\(all) subtitle=\(subtitle)")
    }
  }

  private func finish(success: Bool) {
    lock.lock()
    let session = current
    lock.unlock()
    if let session = session { close(session, success: success) }
  }

  /// 한 번만 닫는다. 처리기가 아직 안 섰으면 성패를 들고 있다가 서는 순간 끝낸다(`attach`).
  private func close(_ session: Session, success: Bool) {
    lock.lock()
    guard session.finished == nil else {
      lock.unlock()
      return
    }
    session.finished = success
    let task = session.task
    // 끝난 작업을 들고 있지 않는다 — 처리기 등록은 지울 수 없어 세션은 남는다(코드 리뷰)
    session.task = nil
    if current === session { current = nil }
    lock.unlock()

    trace("close success=\(success) attached=\(task != nil)")
    if #available(iOS 26, *), let task = task as? BGContinuedProcessingTask {
      task.setTaskCompleted(success: success)
    }
  }

  /// 신청이 받아들여지지 않았다 — 처리기가 설 일이 없으니 닫힌 것으로 둔다.
  private func drop(_ session: Session) {
    lock.lock()
    session.finished = false
    if current === session { current = nil }
    lock.unlock()
  }
}
