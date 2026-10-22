// 099 — 모델 디렉터리를 iCloud 백업에서 뺀다.
//
// expo-file-system 57에는 백업 제외 API가 없다. 모델(약 2GB)은 `Documents/models`에 있어 기본값으로는 iCloud 백업 대상이다.
// 경로를 옮기면 이미 받은 사용자가 2GB를 다시 받으므로, 같은 경로의 디렉터리에 제외 속성만 건다(멱등). 디렉터리에 건 속성은 안의
// 파일에 적용된다. JS는 모델 디렉터리를 확인할 때마다(프로세스당 한 번) 부른다 — src/models/backup-exclusion-port.ts.
import ExpoModulesCore
import Foundation

private func fileURL(_ path: String) -> URL? {
  if path.hasPrefix("file://") { return URL(string: path) }
  return URL(fileURLWithPath: path)
}

public class PocketlogBackupExclusionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PocketlogBackupExclusion")

    // 성공이면 true. 경로가 없거나 속성을 못 걸면 false — 던지지 않는다(제외 실패가 모델 받기를 막으면 안 된다).
    Function("setExcludedFromBackup") { (path: String) -> Bool in
      guard var url = fileURL(path) else { return false }
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      do {
        try url.setResourceValues(values)
        return true
      } catch {
        return false
      }
    }

    // 읽기(확인용). 읽지 못하면 nil.
    Function("isExcludedFromBackup") { (path: String) -> Bool? in
      guard let url = fileURL(path) else { return nil }
      return try? url.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup
    }
  }
}
