// 실제 iPhone의 사진 보관함에 합성 하루의 사진을 넣는 네이티브 조각 (087).
//
// **앱의 일부가 아니다** — 개발 기계에서 따로 빌드·서명해 기기 컨테이너에 올리고, lldb가 앱 프로세스 안에서 `dlopen`해 부른다.
// 앱 번들·`ios/`·`package.json` 의존성에 들어갈 길이 없다(scripts/seed/README.md의 010 FR-001과 같은 방어).
//
// 계약: scripts/ios-seed/README.md. 일기를 만들지도 읽지도 않는다 — 넣는 것은 입력(사진)뿐이다(원칙 IV).
//
// plan.json: { "statusPath": "Documents/seed-ios/status.json", "assets": [ { "path": "Documents/seed-ios/photos/p1.jpg", "takenAt": "<ISO 8601>", "lat": 0, "lon": 0 } ] }
//   경로는 앱 컨테이너(`NSHomeDirectory()`) 기준 상대 경로다 — 컨테이너 UUID는 재설치·업데이트마다 바뀌므로 계획에 적지 않는다(066). 절대 경로도 받는다.
//   lat·lon은 둘 다 있을 때만 쓴다. 상태 파일은 시작할 때와 사진마다, 끝날 때 다시 쓴다.
#import <Foundation/Foundation.h>
#import <Photos/Photos.h>

static void WriteStatus(NSString *path, BOOL done, NSArray *results, NSString *fatal) {
  NSMutableDictionary *status = [@{ @"done": @(done), @"results": results } mutableCopy];
  if (fatal) status[@"fatal"] = fatal;
  NSData *data = [NSJSONSerialization dataWithJSONObject:status options:0 error:nil];
  [data writeToFile:path atomically:YES];
}

static NSString *Resolve(NSString *path) {
  if (![path isKindOfClass:[NSString class]] || path.length == 0) return nil;
  return [path hasPrefix:@"/"] ? path : [NSHomeDirectory() stringByAppendingPathComponent:path];
}

static NSDate *ParseDate(NSString *text) {
  NSISO8601DateFormatter *f = [NSISO8601DateFormatter new];
  f.formatOptions = NSISO8601DateFormatWithInternetDateTime | NSISO8601DateFormatWithFractionalSeconds;
  NSDate *d = [f dateFromString:text];
  if (d) return d;
  f.formatOptions = NSISO8601DateFormatWithInternetDateTime;
  return [f dateFromString:text];
}

__attribute__((visibility("default")))
int PocketSeedStart(const char *planPathC) {
  NSString *planPath = Resolve([NSString stringWithUTF8String:planPathC]);
  NSData *raw = [NSData dataWithContentsOfFile:planPath];
  NSDictionary *plan = raw ? [NSJSONSerialization JSONObjectWithData:raw options:0 error:nil] : nil;
  NSString *statusPath = Resolve(plan[@"statusPath"]);
  NSArray *assets = plan[@"assets"];
  if (!statusPath || ![assets isKindOfClass:[NSArray class]]) return 0;
  WriteStatus(statusPath, NO, @[], nil);

  dispatch_async(dispatch_get_global_queue(QOS_CLASS_UTILITY, 0), ^{
    // 읽기·쓰기가 허용돼 있어야 한다 — 권한 창을 띄우지 않는다(허용되지 않았으면 그대로 실패로 적는다)
    PHAuthorizationStatus auth = [PHPhotoLibrary authorizationStatusForAccessLevel:PHAccessLevelReadWrite];
    if (auth != PHAuthorizationStatusAuthorized && auth != PHAuthorizationStatusLimited) {
      WriteStatus(statusPath, YES, @[], [NSString stringWithFormat:@"photo-auth-%ld", (long)auth]);
      return;
    }
    NSMutableArray *results = [NSMutableArray array];
    for (NSDictionary *a in assets) {
      NSString *path = Resolve(a[@"path"]);
      NSDate *date = ParseDate(a[@"takenAt"] ?: @"");
      NSMutableDictionary *entry = [@{ @"path": path ?: @"" } mutableCopy];
      if (!path || !date || ![[NSFileManager defaultManager] fileExistsAtPath:path]) {
        entry[@"ok"] = @NO;
        entry[@"error"] = !date ? @"bad-date" : @"missing-file";
        [results addObject:entry];
        WriteStatus(statusPath, NO, results, nil);
        continue;
      }
      __block NSString *localId = nil;
      dispatch_semaphore_t sem = dispatch_semaphore_create(0);
      [[PHPhotoLibrary sharedPhotoLibrary] performChanges:^{
        PHAssetCreationRequest *req = [PHAssetCreationRequest creationRequestForAsset];
        PHAssetResourceCreationOptions *opts = [PHAssetResourceCreationOptions new];
        opts.shouldMoveFile = NO;
        [req addResourceWithType:PHAssetResourceTypePhoto fileURL:[NSURL fileURLWithPath:path] options:opts];
        req.creationDate = date;
        NSNumber *lat = a[@"lat"], *lon = a[@"lon"];
        if (lat && lon) req.location = [[CLLocation alloc] initWithLatitude:lat.doubleValue longitude:lon.doubleValue];
        localId = req.placeholderForCreatedAsset.localIdentifier;
      } completionHandler:^(BOOL ok, NSError *error) {
        entry[@"ok"] = @(ok);
        if (ok) entry[@"id"] = localId ?: @"";
        else entry[@"error"] = error.localizedDescription ?: @"unknown";
        dispatch_semaphore_signal(sem);
      }];
      dispatch_semaphore_wait(sem, dispatch_time(DISPATCH_TIME_NOW, 60 * NSEC_PER_SEC));
      if (!entry[@"ok"]) { entry[@"ok"] = @NO; entry[@"error"] = @"timeout"; }
      [results addObject:entry];
      WriteStatus(statusPath, NO, results, nil);
    }
    WriteStatus(statusPath, YES, results, nil);
  });
  return 1;
}
