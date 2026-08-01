import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { DeviceSignalPackage, DiaryOutput } from "./src/types/signals";
import { defaultAIEngine } from "./src/services/aiService";

// 샘플 테스트 신호 (Working Skeleton용 Mock 데이터)
const sampleSignals: DeviceSignalPackage = {
  date: "2026년 8월 1일 (토)",
  totalSteps: 10245,
  sleepDuration: "7시간 20분",
  wifiLocation: "Starbucks_Seongsu_5G",
  timelineLogs: [
    {
      id: "1",
      time: "08:45 AM",
      locationName: "성수동 카페거리",
      visionCaption: "나무 테이블 위 하트 라떼아트가 그려진 아메리카노와 녹색 식물들",
    },
    {
      id: "2",
      time: "12:30 PM",
      locationName: "강남역 식당",
      visionCaption: "원목 가구와 대형 창문이 어우러진 모던한 식당 내부",
    },
    {
      id: "3",
      time: "07:50 PM",
      locationName: "한강 시민공원",
      visionCaption: "노을 지는 청록색 호수와 지나가는 나무 보트 풍경",
    },
  ],
};

export default function App() {
  const [loading, setLoading] = useState(false);
  const [diary, setDiary] = useState<DiaryOutput | null>(null);

  const handleGenerateDiary = async () => {
    setLoading(true);
    setDiary(null);
    try {
      const result = await defaultAIEngine.generateDiary(sampleSignals);
      setDiary(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 헤더 타이틀 */}
        <View style={styles.header}>
          <Text style={styles.badgeText}>PURE ON-DEVICE AI DIARY</Text>
          <Text style={styles.title}>ALPHARIUM</Text>
          <Text style={styles.subtitle}>스마트폰 일상 신호 기반 온디바이스 AI 일기</Text>
        </View>

        {/* 1. 수집된 신호 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>📊 오늘의 수집된 신호 (Collected Signals)</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>오늘의 걸음 수</Text>
              <Text style={styles.statValue}>{sampleSignals.totalSteps.toLocaleString()} 보</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>수면 시간</Text>
              <Text style={styles.statValue}>{sampleSignals.sleepDuration}</Text>
            </View>
          </View>

          <Text style={styles.subSectionTitle}>📸 사진 및 장소 타임라인</Text>
          {sampleSignals.timelineLogs.map((log) => (
            <View key={log.id} style={styles.timelineItem}>
              <Text style={styles.timelineTime}>{log.time}</Text>
              <View style={styles.timelineBody}>
                <Text style={styles.locationText}>{log.locationName}</Text>
                <Text style={styles.visionText}>🤖 시각분석: {log.visionCaption}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 2. 생성 버튼 */}
        <TouchableOpacity
          style={[styles.generateButton, loading && styles.buttonDisabled]}
          onPress={handleGenerateDiary}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.buttonText}>온디바이스 EXAONE 4.0 일기 작성 중...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>✨ 온디바이스 AI 일기 자동 작성하기</Text>
          )}
        </TouchableOpacity>

        {/* 3. AI 완성 일기 결과 카드 */}
        {diary && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultBadge}>✨ AI 작성 완료</Text>
              <Text style={styles.moodBadge}>🏷️ {diary.moodTag}</Text>
            </View>

            <Text style={styles.diaryTitle}>{diary.title}</Text>
            <Text style={styles.diaryContent}>{diary.content}</Text>

            <View style={styles.locationTagsRow}>
              {diary.keyLocations.map((loc, idx) => (
                <View key={idx} style={styles.locationChip}>
                  <Text style={styles.locationChipText}>📍 {loc}</Text>
                </View>
              ))}
            </View>

            {diary.totalDurationMs && (
              <Text style={styles.timingText}>
                ⏱️ 생성 소요시간: {(diary.totalDurationMs / 1000).toFixed(2)} 초
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
    marginTop: 10,
  },
  badgeText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#F8FAFC",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 20,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F1F5F9",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statBox: {
    flex: 0.48,
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  statLabel: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#38BDF8",
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#CBD5E1",
    marginBottom: 12,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 12,
    backgroundColor: "#0F172A",
    borderRadius: 10,
    padding: 12,
  },
  timelineTime: {
    fontSize: 12,
    fontWeight: "700",
    color: "#38BDF8",
    width: 70,
  },
  timelineBody: {
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 2,
  },
  visionText: {
    fontSize: 12,
    color: "#94A3B8",
    lineHeight: 16,
  },
  generateButton: {
    backgroundColor: "#6366F1",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resultCard: {
    backgroundColor: "#1E1B4B",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#818CF8",
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  resultBadge: {
    color: "#A7F3D0",
    fontSize: 12,
    fontWeight: "700",
  },
  moodBadge: {
    color: "#FDE047",
    fontSize: 13,
    fontWeight: "700",
  },
  diaryTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#F8FAFC",
    marginBottom: 12,
  },
  diaryContent: {
    fontSize: 15,
    color: "#E2E8F0",
    lineHeight: 24,
    marginBottom: 16,
  },
  locationTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  locationChip: {
    backgroundColor: "#312E81",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  locationChipText: {
    color: "#C7D2FE",
    fontSize: 12,
    fontWeight: "600",
  },
  timingText: {
    fontSize: 11,
    color: "#818CF8",
    textAlign: "right",
  },
});
