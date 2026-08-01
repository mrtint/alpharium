// 1. 하루 수집 개인 신호 패키지 스펙
export interface PhotoLog {
  id: string;
  time: string;
  locationName: string;
  visionCaption: string;
}

export interface DeviceSignalPackage {
  date: string;
  totalSteps: number;
  sleepDuration: string;
  wifiLocation: string;
  timelineLogs: PhotoLog[];
}

// 2. AI 일기 출력 데이터 스펙 (JSON Format)
export interface DiaryOutput {
  title: string;
  content: string;
  moodTag: string;
  keyLocations: string[];
  generationSpeedTps?: number;
  totalDurationMs?: number;
}
